use std::collections::HashMap;
use std::pin::Pin;
use std::time::Instant;

use tokio::sync::mpsc;
use tokio_stream::{wrappers::ReceiverStream, Stream, StreamExt};
use tonic::{Request, Response, Status, Streaming};

use crate::backups::{BackupExecutor, BackupProgress};
use crate::builds::{BuildOrchestrator, BuildOutput};
use crate::cron::{CronJobOutput, CronRunner};
use crate::docker::DockerClient;
use crate::exec::ExecSession;
use crate::grpc::proto::agent_service_server::AgentService;
use crate::grpc::proto::*;
use crate::health::HealthMonitor;
use crate::logs::LogCapture;
use crate::proxy::ProxyManager;

pub struct AgentServiceImpl {
    started_at: Instant,
    docker: Option<DockerClient>,
    proxy: ProxyManager,
}

impl AgentServiceImpl {
    pub fn new(caddy_admin_url: &str) -> Self {
        let docker = match DockerClient::new() {
            Ok(c) => Some(c),
            Err(e) => {
                tracing::warn!(
                    error = %e,
                    "Docker not available; heartbeat will report unavailable docker version"
                );
                None
            }
        };
        Self {
            started_at: Instant::now(),
            docker,
            proxy: ProxyManager::new(caddy_admin_url),
        }
    }

    fn require_docker(&self) -> Result<&DockerClient, Status> {
        self.docker
            .as_ref()
            .ok_or_else(|| Status::unavailable("Docker is not available on this agent"))
    }
}

#[tonic::async_trait]
impl AgentService for AgentServiceImpl {
    type BuildImageStream = Pin<Box<dyn Stream<Item = Result<BuildEvent, Status>> + Send>>;
    type StreamLogsStream = Pin<Box<dyn Stream<Item = Result<LogLine, Status>> + Send>>;
    type RunCronJobStream = Pin<Box<dyn Stream<Item = Result<CronJobEvent, Status>> + Send>>;
    type ExecInContainerStream = Pin<Box<dyn Stream<Item = Result<ExecOutput, Status>> + Send>>;
    type QueryLogsStream = Pin<Box<dyn Stream<Item = Result<LogLine, Status>> + Send>>;
    type CreateBackupStream = Pin<Box<dyn Stream<Item = Result<BackupEvent, Status>> + Send>>;
    type RestoreBackupStream = Pin<Box<dyn Stream<Item = Result<RestoreEvent, Status>> + Send>>;

    async fn build_image(
        &self,
        request: Request<BuildRequest>,
    ) -> Result<Response<Self::BuildImageStream>, Status> {
        let req = request.into_inner();
        let (build_tx, mut build_rx) = mpsc::channel::<BuildOutput>(256);
        let (out_tx, out_rx) = mpsc::channel::<Result<BuildEvent, Status>>(256);

        let git_url = req.git_url.clone();
        let branch = req.branch.clone();
        let commit_sha = req.commit_sha.clone();
        let build_method = req.build_method.clone();
        let dockerfile_path = req.dockerfile_path.clone();
        let build_args = req.build_args.clone();
        let image_tag = req.image_tag.clone();

        tokio::spawn(async move {
            let work_dir = format!("/tmp/vesta-build-{}", uuid::Uuid::new_v4());

            let clone_result = BuildOrchestrator::clone_repo(
                &git_url,
                &branch,
                if commit_sha.is_empty() {
                    None
                } else {
                    Some(commit_sha.as_str())
                },
                &work_dir,
                build_tx.clone(),
            )
            .await;

            if let Err(e) = clone_result {
                let _ = build_tx
                    .send(BuildOutput {
                        line: format!("Clone failed: {}", e),
                        stream: "stderr".to_string(),
                        timestamp: chrono::Utc::now().timestamp(),
                    })
                    .await;
                return;
            }

            let build_result = match build_method.as_str() {
                "dockerfile" => {
                    let df_path = if dockerfile_path.is_empty() {
                        format!("{}/Dockerfile", work_dir)
                    } else {
                        format!("{}/{}", work_dir, dockerfile_path)
                    };
                    BuildOrchestrator::build_dockerfile(
                        &work_dir,
                        &df_path,
                        &image_tag,
                        &build_args,
                        build_tx.clone(),
                    )
                    .await
                }
                _ => {
                    BuildOrchestrator::build_nixpacks(
                        &work_dir,
                        &image_tag,
                        &build_args,
                        build_tx.clone(),
                    )
                    .await
                }
            };

            if let Err(e) = build_result {
                let _ = build_tx
                    .send(BuildOutput {
                        line: format!("Build failed: {}", e),
                        stream: "stderr".to_string(),
                        timestamp: chrono::Utc::now().timestamp(),
                    })
                    .await;
            }

            let _ = tokio::fs::remove_dir_all(&work_dir).await;
        });

        tokio::spawn(async move {
            while let Some(output) = build_rx.recv().await {
                let event = BuildEvent {
                    line: output.line,
                    stream: output.stream,
                    timestamp: output.timestamp,
                    done: false,
                    error: String::new(),
                };
                if out_tx.send(Ok(event)).await.is_err() {
                    break;
                }
            }
            let _ = out_tx
                .send(Ok(BuildEvent {
                    line: String::new(),
                    stream: String::new(),
                    timestamp: chrono::Utc::now().timestamp(),
                    done: true,
                    error: String::new(),
                }))
                .await;
        });

        Ok(Response::new(Box::pin(ReceiverStream::new(out_rx))))
    }

    async fn deploy_container(
        &self,
        request: Request<DeployRequest>,
    ) -> Result<Response<DeployResponse>, Status> {
        let docker = self.require_docker()?;
        let req = request.into_inner();

        let env: Vec<String> = req
            .env_vars
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();

        let mut labels = req.labels.clone();
        labels.insert("vesta.managed".to_string(), "true".to_string());

        let (cpu_limit, memory_limit) = if let Some(ref limits) = req.resource_limits {
            (
                Some(limits.cpu_limit_millicores as i64),
                Some(limits.memory_limit_mb as i64),
            )
        } else {
            (None, None)
        };

        if !req.image_tag.is_empty() {
            docker
                .pull_image(&req.image_tag)
                .await
                .map_err(|e| Status::internal(format!("failed to pull image: {}", e)))?;
        }

        let container_id = docker
            .create_and_start_container(
                &req.container_name,
                &req.image_tag,
                env,
                req.ports,
                req.volumes,
                labels,
                cpu_limit,
                memory_limit,
            )
            .await
            .map_err(|e| Status::internal(format!("deploy failed: {}", e)))?;

        Ok(Response::new(DeployResponse {
            container_id,
            status: "running".to_string(),
        }))
    }

    async fn stop_container(
        &self,
        request: Request<ContainerRef>,
    ) -> Result<Response<Empty>, Status> {
        let docker = self.require_docker()?;
        let req = request.into_inner();

        docker
            .stop_container(&req.container_id)
            .await
            .map_err(|e| Status::internal(format!("stop failed: {}", e)))?;

        Ok(Response::new(Empty {}))
    }

    async fn remove_container(
        &self,
        request: Request<ContainerRef>,
    ) -> Result<Response<Empty>, Status> {
        let docker = self.require_docker()?;
        let req = request.into_inner();

        docker
            .remove_container(&req.container_id, true)
            .await
            .map_err(|e| Status::internal(format!("remove failed: {}", e)))?;

        Ok(Response::new(Empty {}))
    }

    async fn rollback_container(
        &self,
        request: Request<RollbackRequest>,
    ) -> Result<Response<DeployResponse>, Status> {
        let docker = self.require_docker()?;
        let req = request.into_inner();

        // Find running containers for this service, stop them, then deploy the target image
        let mut filter = HashMap::new();
        filter.insert("vesta.service_id".to_string(), req.service_id.clone());

        let containers = docker
            .list_containers(Some(filter))
            .await
            .map_err(|e| Status::internal(format!("failed to list containers: {}", e)))?;

        for container in &containers {
            if let Some(ref id) = container.id {
                let _ = docker.stop_container(id).await;
                let _ = docker.remove_container(id, true).await;
            }
        }

        let container_name = format!("vesta-{}-rollback-{}", req.service_id, uuid::Uuid::new_v4().simple());
        let mut labels = HashMap::new();
        labels.insert("vesta.managed".to_string(), "true".to_string());
        labels.insert("vesta.service_id".to_string(), req.service_id);

        let container_id = docker
            .create_and_start_container(
                &container_name,
                &req.target_image_tag,
                Vec::new(),
                HashMap::new(),
                Vec::new(),
                labels,
                None,
                None,
            )
            .await
            .map_err(|e| Status::internal(format!("rollback deploy failed: {}", e)))?;

        Ok(Response::new(DeployResponse {
            container_id,
            status: "running".to_string(),
        }))
    }

    async fn scale_service(
        &self,
        request: Request<ScaleRequest>,
    ) -> Result<Response<ScaleResponse>, Status> {
        // TODO: Full scaling requires Docker Swarm service mode or managing multiple containers.
        // For now, report current state.
        let docker = self.require_docker()?;
        let req = request.into_inner();

        let mut filter = HashMap::new();
        filter.insert("vesta.service_id".to_string(), req.service_id.clone());

        let containers = docker
            .list_containers(Some(filter))
            .await
            .map_err(|e| Status::internal(format!("failed to list containers: {}", e)))?;

        let running = containers
            .iter()
            .filter(|c| c.state.as_deref() == Some("running"))
            .count() as u32;

        Ok(Response::new(ScaleResponse {
            service_id: req.service_id,
            running_replicas: running,
            desired_replicas: req.desired_replicas,
        }))
    }

    async fn get_replica_status(
        &self,
        request: Request<ContainerRef>,
    ) -> Result<Response<ReplicaStatus>, Status> {
        // TODO: Full replica tracking requires managing multiple containers per service.
        let docker = self.require_docker()?;
        let req = request.into_inner();

        let mut filter = HashMap::new();
        filter.insert("vesta.service_id".to_string(), req.service_id.clone());

        let containers = docker
            .list_containers(Some(filter))
            .await
            .map_err(|e| Status::internal(format!("failed to list containers: {}", e)))?;

        let mut replicas = Vec::new();
        for c in &containers {
            if let Some(ref id) = c.id {
                replicas.push(ReplicaInfo {
                    container_id: id.clone(),
                    status: c.state.clone().unwrap_or_default(),
                    health: String::new(),
                    started_at: c.created.unwrap_or(0) as u64,
                });
            }
        }

        let running = replicas
            .iter()
            .filter(|r| r.status == "running")
            .count() as u32;

        Ok(Response::new(ReplicaStatus {
            service_id: req.service_id,
            running,
            desired: running,
            replicas,
        }))
    }

    async fn stream_logs(
        &self,
        request: Request<ContainerRef>,
    ) -> Result<Response<Self::StreamLogsStream>, Status> {
        let docker = self.require_docker()?;
        let req = request.into_inner();

        let mut log_rx = LogCapture::stream_logs(docker.inner(), &req.container_id, true, Some(100))
            .await
            .map_err(|e| Status::internal(format!("failed to start log stream: {}", e)))?;

        let (tx, rx) = mpsc::channel(256);

        tokio::spawn(async move {
            while let Some(log_line) = log_rx.recv().await {
                let proto_line = LogLine {
                    line: log_line.line,
                    stream: log_line.stream,
                    timestamp: log_line.timestamp,
                    container_id: log_line.container_id,
                };
                if tx.send(Ok(proto_line)).await.is_err() {
                    break;
                }
            }
        });

        Ok(Response::new(Box::pin(ReceiverStream::new(rx))))
    }

    async fn configure_route(
        &self,
        request: Request<RouteConfig>,
    ) -> Result<Response<Empty>, Status> {
        let req = request.into_inner();

        let config = crate::proxy::RouteConfig {
            domain: req.domain,
            upstreams: req.upstream_targets,
            force_https: req.force_https,
            redirect_www: req.redirect_www,
        };

        self.proxy
            .configure_route(config)
            .await
            .map_err(|e| Status::internal(format!("failed to configure route: {}", e)))?;

        Ok(Response::new(Empty {}))
    }

    async fn remove_route(&self, request: Request<RouteRef>) -> Result<Response<Empty>, Status> {
        let req = request.into_inner();

        self.proxy
            .remove_route(&req.domain)
            .await
            .map_err(|e| Status::internal(format!("failed to remove route: {}", e)))?;

        Ok(Response::new(Empty {}))
    }

    async fn get_system_metrics(
        &self,
        _request: Request<Empty>,
    ) -> Result<Response<SystemMetrics>, Status> {
        let metrics = tokio::task::spawn_blocking(collect_system_metrics)
            .await
            .map_err(|e| Status::internal(e.to_string()))??;
        Ok(Response::new(metrics))
    }

    async fn heartbeat(
        &self,
        _request: Request<Empty>,
    ) -> Result<Response<HeartbeatResponse>, Status> {
        let uptime_seconds = self.started_at.elapsed().as_secs();
        let docker_version = if let Some(ref docker) = self.docker {
            match docker.inner().version().await {
                Ok(v) => v.version.unwrap_or_else(|| "unknown".to_string()),
                Err(e) => {
                    tracing::debug!(error = %e, "failed to query Docker version");
                    "unavailable".to_string()
                }
            }
        } else {
            "unavailable".to_string()
        };

        Ok(Response::new(HeartbeatResponse {
            agent_version: env!("CARGO_PKG_VERSION").to_string(),
            uptime_seconds,
            docker_version,
        }))
    }

    async fn get_container_status(
        &self,
        request: Request<ContainerRef>,
    ) -> Result<Response<ContainerStatus>, Status> {
        let docker = self.require_docker()?;
        let req = request.into_inner();

        let health = HealthMonitor::check_container_health(docker.inner(), &req.container_id)
            .await
            .map_err(|e| Status::internal(format!("health check failed: {}", e)))?;

        let inspect = docker
            .inspect_container(&req.container_id)
            .await
            .map_err(|e| Status::internal(format!("inspect failed: {}", e)))?;

        let image = inspect
            .config
            .and_then(|c| c.image)
            .unwrap_or_default();

        let started_at = inspect
            .state
            .and_then(|s| s.started_at)
            .and_then(|s| chrono::DateTime::parse_from_rfc3339(&s).ok())
            .map(|dt| dt.timestamp())
            .unwrap_or(0);

        Ok(Response::new(ContainerStatus {
            container_id: req.container_id,
            status: health.status,
            health: health.health,
            image,
            started_at,
            cpu_percent: health.cpu_percent,
            memory_usage_mb: health.memory_usage_mb,
        }))
    }

    async fn inject_secrets(
        &self,
        request: Request<SecretInjection>,
    ) -> Result<Response<Empty>, Status> {
        // TODO: Implement full secret injection (restart container with new env, or use Docker secrets).
        // For now, we validate the request and log it.
        let docker = self.require_docker()?;
        let req = request.into_inner();

        let _inspect = docker
            .inspect_container(&req.container_id)
            .await
            .map_err(|e| {
                Status::not_found(format!("container '{}' not found: {}", req.container_id, e))
            })?;

        tracing::info!(
            container_id = %req.container_id,
            secret_count = req.secrets.len(),
            "secret injection requested (full implementation pending)"
        );

        Ok(Response::new(Empty {}))
    }

    async fn run_cron_job(
        &self,
        request: Request<CronJobRequest>,
    ) -> Result<Response<Self::RunCronJobStream>, Status> {
        let docker = self.require_docker()?.clone_ref();
        let req = request.into_inner();

        let (cron_tx, mut cron_rx) = mpsc::channel::<CronJobOutput>(256);
        let (out_tx, out_rx) = mpsc::channel::<Result<CronJobEvent, Status>>(256);

        let job_id = req.job_id.clone();
        let (cpu_limit, memory_limit) = if let Some(ref limits) = req.resource_limits {
            (
                Some(limits.cpu_limit_millicores as i64),
                Some(limits.memory_limit_mb as i64),
            )
        } else {
            (None, None)
        };

        let timeout = if req.timeout_seconds == 0 {
            3600
        } else {
            req.timeout_seconds
        };

        tokio::spawn(async move {
            let result = CronRunner::run_job(
                &docker,
                &req.image_tag,
                &req.command,
                req.env_vars,
                timeout,
                cpu_limit,
                memory_limit,
                cron_tx,
            )
            .await;

            if let Err(e) = result {
                tracing::warn!(error = %e, "cron job failed");
            }
        });

        let job_id_owned = job_id;
        tokio::spawn(async move {
            while let Some(output) = cron_rx.recv().await {
                let event = CronJobEvent {
                    job_id: job_id_owned.clone(),
                    line: output.line,
                    stream: output.stream,
                    timestamp: output.timestamp,
                    exit_code: output.exit_code.unwrap_or(0),
                    done: output.done,
                    error: String::new(),
                };
                if out_tx.send(Ok(event)).await.is_err() {
                    break;
                }
            }
        });

        Ok(Response::new(Box::pin(ReceiverStream::new(out_rx))))
    }

    async fn exec_in_container(
        &self,
        request: Request<Streaming<ExecInput>>,
    ) -> Result<Response<Self::ExecInContainerStream>, Status> {
        let docker = self.require_docker()?;
        let mut in_stream = request.into_inner();

        // Wait for the first message to get session setup info
        let first_msg = in_stream
            .next()
            .await
            .ok_or_else(|| Status::invalid_argument("empty exec stream"))?
            .map_err(|e| Status::internal(format!("stream error: {}", e)))?;

        let session_id = first_msg.session_id.clone();

        // TODO: The first message should specify the container_id. For now, use session_id as container ref.
        // In a full implementation, the API layer would pass container_id in metadata or the first message.
        let exec_session = ExecSession::create(
            docker.inner(),
            &session_id,
            vec!["sh".to_string()],
        )
        .await
        .map_err(|e| Status::internal(format!("failed to create exec session: {}", e)))?;

        if let Some(resize) = first_msg.resize {
            let _ = exec_session
                .resize(docker.inner(), resize.rows, resize.cols)
                .await;
        }

        let (out_tx, out_rx) = mpsc::channel::<Result<ExecOutput, Status>>(256);
        let sid = exec_session.session_id.clone();

        // Start the exec and stream output
        let exec_id = exec_session.exec_id.clone();
        let docker_clone = docker.inner().clone();

        tokio::spawn(async move {
            use bollard::exec::StartExecOptions;

            let start_opts = StartExecOptions {
                detach: false,
                tty: true,
                ..Default::default()
            };

            match docker_clone.start_exec(&exec_id, Some(start_opts)).await {
                Ok(bollard::exec::StartExecResults::Attached { mut output, .. }) => {
                    while let Some(Ok(msg)) = futures_util::StreamExt::next(&mut output).await {
                        let data = match msg {
                            bollard::container::LogOutput::StdOut { message } => message,
                            bollard::container::LogOutput::StdErr { message } => message,
                            bollard::container::LogOutput::Console { message } => message,
                            _ => continue,
                        };
                        let exec_out = ExecOutput {
                            session_id: sid.clone(),
                            data: data.to_vec(),
                            exit_code: 0,
                            done: false,
                        };
                        if out_tx.send(Ok(exec_out)).await.is_err() {
                            break;
                        }
                    }
                    let _ = out_tx
                        .send(Ok(ExecOutput {
                            session_id: sid.clone(),
                            data: Vec::new(),
                            exit_code: 0,
                            done: true,
                        }))
                        .await;
                }
                Ok(bollard::exec::StartExecResults::Detached) => {
                    let _ = out_tx
                        .send(Ok(ExecOutput {
                            session_id: sid.clone(),
                            data: Vec::new(),
                            exit_code: 0,
                            done: true,
                        }))
                        .await;
                }
                Err(e) => {
                    let _ = out_tx
                        .send(Err(Status::internal(format!("exec failed: {}", e))))
                        .await;
                }
            }
        });

        Ok(Response::new(Box::pin(ReceiverStream::new(out_rx))))
    }

    async fn set_maintenance_mode(
        &self,
        request: Request<MaintenanceConfig>,
    ) -> Result<Response<Empty>, Status> {
        let req = request.into_inner();

        let config = crate::proxy::MaintenanceConfig {
            domain: req.domain,
            enabled: req.enabled,
            custom_html: if req.custom_html.is_empty() {
                None
            } else {
                Some(req.custom_html)
            },
            status_code: req.status_code,
            allowed_ips: req.allowed_ips,
            bypass_token: if req.bypass_token.is_empty() {
                None
            } else {
                Some(req.bypass_token)
            },
        };

        self.proxy
            .set_maintenance_mode(config)
            .await
            .map_err(|e| Status::internal(format!("failed to set maintenance mode: {}", e)))?;

        Ok(Response::new(Empty {}))
    }

    async fn query_logs(
        &self,
        request: Request<LogQuery>,
    ) -> Result<Response<Self::QueryLogsStream>, Status> {
        let docker = self.require_docker()?;
        let req = request.into_inner();

        let since = if req.from_timestamp > 0 {
            Some(req.from_timestamp)
        } else {
            None
        };
        let until = if req.to_timestamp > 0 {
            Some(req.to_timestamp)
        } else {
            None
        };
        let limit = if req.limit > 0 {
            Some(req.limit as usize)
        } else {
            None
        };

        let lines = LogCapture::query_logs(docker.inner(), &req.container_id, since, until, limit)
            .await
            .map_err(|e| Status::internal(format!("log query failed: {}", e)))?;

        let (tx, rx) = mpsc::channel(256);

        tokio::spawn(async move {
            for log_line in lines {
                let proto_line = LogLine {
                    line: log_line.line,
                    stream: log_line.stream,
                    timestamp: log_line.timestamp,
                    container_id: log_line.container_id,
                };
                if tx.send(Ok(proto_line)).await.is_err() {
                    break;
                }
            }
        });

        Ok(Response::new(Box::pin(ReceiverStream::new(rx))))
    }

    async fn update_resource_limits(
        &self,
        _request: Request<ResourceLimitConfig>,
    ) -> Result<Response<Empty>, Status> {
        // TODO: Updating resource limits on a running container requires Docker update API.
        // bollard supports container update but it's not commonly used in production.
        // For now, acknowledge the request.
        tracing::info!("update_resource_limits called (not yet implemented — requires container restart or Docker update API)");
        Err(Status::unimplemented(
            "resource limit updates on running containers are not yet supported; redeploy to apply new limits",
        ))
    }

    async fn create_backup(
        &self,
        request: Request<BackupRequest>,
    ) -> Result<Response<Self::CreateBackupStream>, Status> {
        let docker = self.require_docker()?.clone_ref();
        let req = request.into_inner();

        let (progress_tx, mut progress_rx) = mpsc::channel::<BackupProgress>(64);
        let (out_tx, out_rx) = mpsc::channel::<Result<BackupEvent, Status>>(64);

        let backup_id = req.backup_id.clone();
        let output_path = format!("/tmp/vesta-backup-{}", req.backup_id);

        tokio::spawn(async move {
            let result = match req.resource_type.as_str() {
                "database" => {
                    BackupExecutor::backup_database(
                        &docker,
                        &req.engine,
                        &req.container_id,
                        &req.connection_url,
                        &output_path,
                        progress_tx,
                    )
                    .await
                }
                "volume" => {
                    BackupExecutor::backup_volume(
                        &docker,
                        &req.container_id,
                        &req.connection_url,
                        &output_path,
                        progress_tx,
                    )
                    .await
                }
                other => Err(anyhow::anyhow!("unsupported resource type: {}", other)),
            };

            if let Err(e) = result {
                tracing::error!(error = %e, "backup failed");
            }
        });

        let bid = backup_id;
        tokio::spawn(async move {
            while let Some(progress) = progress_rx.recv().await {
                let event = BackupEvent {
                    backup_id: bid.clone(),
                    line: progress.line,
                    progress_percent: progress.progress_percent,
                    done: progress.done,
                    error: progress.error.unwrap_or_default(),
                    size_bytes: progress.size_bytes,
                };
                if out_tx.send(Ok(event)).await.is_err() {
                    break;
                }
            }
        });

        Ok(Response::new(Box::pin(ReceiverStream::new(out_rx))))
    }

    async fn restore_backup(
        &self,
        request: Request<RestoreRequest>,
    ) -> Result<Response<Self::RestoreBackupStream>, Status> {
        let docker = self.require_docker()?.clone_ref();
        let req = request.into_inner();

        let (progress_tx, mut progress_rx) = mpsc::channel::<BackupProgress>(64);
        let (out_tx, out_rx) = mpsc::channel::<Result<RestoreEvent, Status>>(64);

        let backup_id = req.backup_id.clone();

        tokio::spawn(async move {
            let result = BackupExecutor::restore_database(
                &docker,
                &req.engine,
                &req.container_id,
                &req.connection_url,
                &req.backup_path,
                progress_tx,
            )
            .await;

            if let Err(e) = result {
                tracing::error!(error = %e, "restore failed");
            }
        });

        let bid = backup_id;
        tokio::spawn(async move {
            while let Some(progress) = progress_rx.recv().await {
                let event = RestoreEvent {
                    backup_id: bid.clone(),
                    line: progress.line,
                    progress_percent: progress.progress_percent,
                    done: progress.done,
                    error: progress.error.unwrap_or_default(),
                };
                if out_tx.send(Ok(event)).await.is_err() {
                    break;
                }
            }
        });

        Ok(Response::new(Box::pin(ReceiverStream::new(out_rx))))
    }

    async fn list_volumes(
        &self,
        request: Request<ContainerRef>,
    ) -> Result<Response<VolumeList>, Status> {
        let docker = self.require_docker()?;
        let req = request.into_inner();

        let inspect = docker
            .inspect_container(&req.container_id)
            .await
            .map_err(|e| Status::internal(format!("inspect failed: {}", e)))?;

        let volumes: Vec<VolumeInfo> = inspect
            .mounts
            .unwrap_or_default()
            .iter()
            .map(|m| VolumeInfo {
                name: m.name.clone().unwrap_or_default(),
                mount_point: m.destination.clone().unwrap_or_default(),
                size_bytes: 0,
            })
            .collect();

        Ok(Response::new(VolumeList { volumes }))
    }
}

fn collect_system_metrics() -> Result<SystemMetrics, Status> {
    use std::time::{SystemTime, UNIX_EPOCH};

    use sysinfo::{CpuRefreshKind, Disks, MemoryRefreshKind, Networks, RefreshKind, System};

    let mut sys = System::new_with_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
            .with_memory(MemoryRefreshKind::everything()),
    );
    sys.refresh_cpu_all();
    std::thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    sys.refresh_cpu_all();
    let cpu_usage_percent = f64::from(sys.global_cpu_usage());

    sys.refresh_memory();
    let memory_used_mb = sys.used_memory() / 1024 / 1024;
    let memory_total_mb = sys.total_memory() / 1024 / 1024;

    let disks = Disks::new_with_refreshed_list();
    let mut disk_total = 0u64;
    let mut disk_used = 0u64;
    for disk in disks.list() {
        let total = disk.total_space();
        let available = disk.available_space();
        disk_total = disk_total.saturating_add(total);
        disk_used = disk_used.saturating_add(total.saturating_sub(available));
    }
    let disk_total_gb = disk_total / 1024 / 1024 / 1024;
    let disk_used_gb = disk_used / 1024 / 1024 / 1024;

    let networks = Networks::new_with_refreshed_list();
    let mut network_in_bytes = 0u64;
    let mut network_out_bytes = 0u64;
    for (_iface, data) in networks.iter() {
        network_in_bytes = network_in_bytes.saturating_add(data.received());
        network_out_bytes = network_out_bytes.saturating_add(data.transmitted());
    }

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| Status::internal(e.to_string()))?
        .as_secs() as i64;

    Ok(SystemMetrics {
        cpu_usage_percent,
        memory_used_mb,
        memory_total_mb,
        disk_used_gb,
        disk_total_gb,
        network_in_bytes,
        network_out_bytes,
        timestamp,
    })
}
