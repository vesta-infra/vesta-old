use crate::docker::DockerClient;
use anyhow::{Context, Result};
use std::collections::HashMap;
use tokio::sync::mpsc;

pub struct CronRunner;

pub struct CronJobOutput {
    pub line: String,
    pub stream: String,
    pub timestamp: i64,
    pub exit_code: Option<i32>,
    pub done: bool,
}

fn now_unix() -> i64 {
    chrono::Utc::now().timestamp()
}

impl CronRunner {
    pub async fn run_job(
        docker: &DockerClient,
        image_tag: &str,
        command: &str,
        env_vars: HashMap<String, String>,
        timeout_seconds: u32,
        cpu_limit: Option<i64>,
        memory_limit: Option<i64>,
        tx: mpsc::Sender<CronJobOutput>,
    ) -> Result<i32> {
        let container_name = format!("vesta-cron-{}", uuid::Uuid::new_v4());
        let env: Vec<String> = env_vars
            .iter()
            .map(|(k, v)| format!("{}={}", k, v))
            .collect();

        let mut labels = HashMap::new();
        labels.insert("vesta.managed".to_string(), "true".to_string());
        labels.insert("vesta.type".to_string(), "cron".to_string());

        let _ = tx
            .send(CronJobOutput {
                line: format!("Starting cron job container from image {}", image_tag),
                stream: "stdout".to_string(),
                timestamp: now_unix(),
                exit_code: None,
                done: false,
            })
            .await;

        let cmd = vec!["sh".to_string(), "-c".to_string(), command.to_string()];

        let container_id = docker
            .create_and_start_container_with_cmd(
                &container_name,
                image_tag,
                Some(cmd),
                env,
                HashMap::new(),
                Vec::new(),
                labels,
                cpu_limit,
                memory_limit,
            )
            .await
            .context("failed to create cron job container")?;

        // Stream logs from the container
        let log_tx = tx.clone();
        let cid = container_id.clone();
        let docker_inner = docker.inner().clone();
        let log_handle = tokio::spawn(async move {
            use bollard::container::LogsOptions;
            use futures_util::StreamExt;

            let opts = LogsOptions::<String> {
                follow: true,
                stdout: true,
                stderr: true,
                ..Default::default()
            };

            let mut stream = docker_inner.logs(&cid, Some(opts));
            while let Some(Ok(output)) = stream.next().await {
                let (stream_name, text) = match &output {
                    bollard::container::LogOutput::StdOut { message } => {
                        ("stdout", String::from_utf8_lossy(message).to_string())
                    }
                    bollard::container::LogOutput::StdErr { message } => {
                        ("stderr", String::from_utf8_lossy(message).to_string())
                    }
                    _ => continue,
                };

                let _ = log_tx
                    .send(CronJobOutput {
                        line: text.trim_end().to_string(),
                        stream: stream_name.to_string(),
                        timestamp: now_unix(),
                        exit_code: None,
                        done: false,
                    })
                    .await;
            }
        });

        // Wait for container to finish with timeout
        let wait_result = tokio::time::timeout(
            std::time::Duration::from_secs(timeout_seconds as u64),
            wait_for_container(docker.inner(), &container_id),
        )
        .await;

        // Cancel log streaming
        log_handle.abort();

        let exit_code = match wait_result {
            Ok(Ok(code)) => code,
            Ok(Err(e)) => {
                let _ = tx
                    .send(CronJobOutput {
                        line: format!("Container error: {}", e),
                        stream: "stderr".to_string(),
                        timestamp: now_unix(),
                        exit_code: Some(-1),
                        done: true,
                    })
                    .await;
                // Cleanup
                let _ = docker.stop_container(&container_id).await;
                let _ = docker.remove_container(&container_id, true).await;
                return Err(e);
            }
            Err(_) => {
                let _ = tx
                    .send(CronJobOutput {
                        line: format!("Cron job timed out after {}s", timeout_seconds),
                        stream: "stderr".to_string(),
                        timestamp: now_unix(),
                        exit_code: Some(-1),
                        done: true,
                    })
                    .await;
                let _ = docker.stop_container(&container_id).await;
                let _ = docker.remove_container(&container_id, true).await;
                anyhow::bail!("cron job timed out after {}s", timeout_seconds);
            }
        };

        let _ = tx
            .send(CronJobOutput {
                line: format!("Cron job finished with exit code {}", exit_code),
                stream: "stdout".to_string(),
                timestamp: now_unix(),
                exit_code: Some(exit_code),
                done: true,
            })
            .await;

        // Cleanup container
        let _ = docker.remove_container(&container_id, true).await;

        Ok(exit_code)
    }
}

async fn wait_for_container(docker: &bollard::Docker, container_id: &str) -> Result<i32> {
    use bollard::container::WaitContainerOptions;
    use futures_util::StreamExt;

    let opts = WaitContainerOptions {
        condition: "not-running",
    };

    let mut stream = docker.wait_container(container_id, Some(opts));
    if let Some(result) = stream.next().await {
        let response = result.context("error waiting for container")?;
        Ok(response.status_code as i32)
    } else {
        anyhow::bail!("wait stream ended without result")
    }
}
