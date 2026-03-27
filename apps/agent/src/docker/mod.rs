use anyhow::{Context, Result};
use bollard::container::{
    Config, CreateContainerOptions, InspectContainerOptions, ListContainersOptions, LogsOptions,
    RemoveContainerOptions, StartContainerOptions, StopContainerOptions,
};
use bollard::exec::{CreateExecOptions, StartExecResults};
use bollard::image::CreateImageOptions;
use bollard::models::HostConfig;
use bollard::service::{ContainerInspectResponse, ContainerSummary, PortBinding};
use bollard::Docker;
use futures_util::StreamExt;
use std::collections::HashMap;

pub struct DockerClient {
    client: Docker,
}

impl DockerClient {
    pub fn new() -> Result<Self> {
        let client = Docker::connect_with_local_defaults()?;
        Ok(Self { client })
    }

    pub fn inner(&self) -> &Docker {
        &self.client
    }

    pub fn clone_ref(&self) -> Self {
        Self {
            client: self.client.clone(),
        }
    }

    pub async fn create_and_start_container(
        &self,
        name: &str,
        image: &str,
        env: Vec<String>,
        ports: HashMap<String, String>,
        volumes: Vec<String>,
        labels: HashMap<String, String>,
        cpu_limit: Option<i64>,
        memory_limit: Option<i64>,
    ) -> Result<String> {
        self.create_and_start_container_with_cmd(
            name,
            image,
            None,
            env,
            ports,
            volumes,
            labels,
            cpu_limit,
            memory_limit,
        )
        .await
    }

    pub async fn create_and_start_container_with_cmd(
        &self,
        name: &str,
        image: &str,
        cmd: Option<Vec<String>>,
        env: Vec<String>,
        ports: HashMap<String, String>,
        volumes: Vec<String>,
        labels: HashMap<String, String>,
        cpu_limit: Option<i64>,
        memory_limit: Option<i64>,
    ) -> Result<String> {
        let mut port_bindings: HashMap<String, Option<Vec<PortBinding>>> = HashMap::new();
        let mut exposed_ports: HashMap<String, HashMap<(), ()>> = HashMap::new();

        for (container_port, host_port) in &ports {
            let key = if container_port.contains('/') {
                container_port.clone()
            } else {
                format!("{}/tcp", container_port)
            };
            exposed_ports.insert(key.clone(), HashMap::new());
            port_bindings.insert(
                key,
                Some(vec![PortBinding {
                    host_ip: Some("0.0.0.0".to_string()),
                    host_port: Some(host_port.clone()),
                }]),
            );
        }

        let host_config = HostConfig {
            port_bindings: Some(port_bindings),
            binds: Some(volumes),
            nano_cpus: cpu_limit.map(|c| c * 1_000_000),
            memory: memory_limit.map(|m| m * 1024 * 1024),
            restart_policy: Some(bollard::models::RestartPolicy {
                name: Some(bollard::models::RestartPolicyNameEnum::UNLESS_STOPPED),
                maximum_retry_count: None,
            }),
            ..Default::default()
        };

        let config: Config<String> = Config {
            image: Some(image.to_string()),
            cmd,
            env: Some(env),
            exposed_ports: Some(exposed_ports),
            labels: Some(labels),
            host_config: Some(host_config),
            ..Default::default()
        };

        let create_opts = CreateContainerOptions { name, platform: None };
        let response = self
            .client
            .create_container(Some(create_opts), config)
            .await
            .with_context(|| format!("failed to create container '{}'", name))?;

        let container_id = response.id;

        self.client
            .start_container(&container_id, None::<StartContainerOptions<String>>)
            .await
            .with_context(|| format!("failed to start container '{}'", container_id))?;

        tracing::info!(container_id = %container_id, name = %name, "container created and started");
        Ok(container_id)
    }

    pub async fn stop_container(&self, id: &str) -> Result<()> {
        let opts = StopContainerOptions { t: 30 };
        self.client
            .stop_container(id, Some(opts))
            .await
            .with_context(|| format!("failed to stop container '{}'", id))?;
        tracing::info!(container_id = %id, "container stopped");
        Ok(())
    }

    pub async fn remove_container(&self, id: &str, force: bool) -> Result<()> {
        let opts = RemoveContainerOptions {
            force,
            v: true,
            ..Default::default()
        };
        self.client
            .remove_container(id, Some(opts))
            .await
            .with_context(|| format!("failed to remove container '{}'", id))?;
        tracing::info!(container_id = %id, force = force, "container removed");
        Ok(())
    }

    pub async fn list_containers(
        &self,
        label_filter: Option<HashMap<String, String>>,
    ) -> Result<Vec<ContainerSummary>> {
        let mut filters: HashMap<String, Vec<String>> = HashMap::new();
        if let Some(labels) = label_filter {
            let label_strs: Vec<String> = labels
                .iter()
                .map(|(k, v)| {
                    if v.is_empty() {
                        k.clone()
                    } else {
                        format!("{}={}", k, v)
                    }
                })
                .collect();
            filters.insert("label".to_string(), label_strs);
        }

        let opts = ListContainersOptions {
            all: true,
            filters,
            ..Default::default()
        };

        let containers = self
            .client
            .list_containers(Some(opts))
            .await
            .context("failed to list containers")?;

        Ok(containers)
    }

    pub async fn inspect_container(&self, id: &str) -> Result<ContainerInspectResponse> {
        let opts = InspectContainerOptions { size: true };
        let info = self
            .client
            .inspect_container(id, Some(opts))
            .await
            .with_context(|| format!("failed to inspect container '{}'", id))?;
        Ok(info)
    }

    #[allow(dead_code)]
    pub async fn get_container_logs(&self, id: &str, tail: Option<usize>) -> Result<Vec<String>> {
        let opts = LogsOptions::<String> {
            stdout: true,
            stderr: true,
            tail: tail
                .map(|t| t.to_string())
                .unwrap_or_else(|| "all".to_string()),
            timestamps: true,
            ..Default::default()
        };

        let mut stream = self.client.logs(id, Some(opts));
        let mut lines = Vec::new();

        while let Some(result) = stream.next().await {
            match result {
                Ok(output) => lines.push(output.to_string()),
                Err(e) => {
                    tracing::warn!(error = %e, "error reading log line");
                    break;
                }
            }
        }

        Ok(lines)
    }

    pub async fn pull_image(&self, image: &str) -> Result<()> {
        let (repo, tag) = match image.rsplit_once(':') {
            Some((r, t)) => (r.to_string(), t.to_string()),
            None => (image.to_string(), "latest".to_string()),
        };

        let opts = CreateImageOptions {
            from_image: repo.as_str(),
            tag: tag.as_str(),
            ..Default::default()
        };

        let mut stream = self.client.create_image(Some(opts), None, None);
        while let Some(result) = stream.next().await {
            match result {
                Ok(info) => {
                    if let Some(status) = info.status {
                        tracing::debug!(status = %status, "pull progress");
                    }
                }
                Err(e) => return Err(e).context(format!("failed to pull image '{}'", image)),
            }
        }

        tracing::info!(image = %image, "image pulled");
        Ok(())
    }

    pub async fn exec_in_container(
        &self,
        id: &str,
        cmd: Vec<String>,
        env: Option<Vec<String>>,
    ) -> Result<StartExecResults> {
        let cmd_refs: Vec<&str> = cmd.iter().map(|s| s.as_str()).collect();
        let create_opts = CreateExecOptions {
            cmd: Some(cmd_refs),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            env: env.as_ref().map(|e| e.iter().map(|s| s.as_str()).collect()),
            ..Default::default()
        };

        let exec = self
            .client
            .create_exec(id, create_opts)
            .await
            .with_context(|| format!("failed to create exec in container '{}'", id))?;

        let result = self
            .client
            .start_exec(&exec.id, None)
            .await
            .with_context(|| format!("failed to start exec in container '{}'", id))?;

        Ok(result)
    }

    #[allow(dead_code)]
    pub async fn get_docker_version(&self) -> Result<String> {
        let version = self.client.version().await.context("failed to get Docker version")?;
        Ok(version.version.unwrap_or_else(|| "unknown".to_string()))
    }
}
