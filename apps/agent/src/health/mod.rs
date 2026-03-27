use anyhow::{Context, Result};
use bollard::container::{InspectContainerOptions, ListContainersOptions, StatsOptions};
use bollard::Docker;
use futures_util::StreamExt;
use std::collections::HashMap;

pub struct HealthMonitor;

#[derive(Debug, Clone)]
#[allow(dead_code)]
pub struct ContainerHealth {
    pub container_id: String,
    pub status: String,
    pub health: String,
    pub cpu_percent: f64,
    pub memory_usage_mb: u64,
}

impl HealthMonitor {
    pub async fn check_container_health(
        docker: &Docker,
        container_id: &str,
    ) -> Result<ContainerHealth> {
        let inspect = docker
            .inspect_container(container_id, Some(InspectContainerOptions { size: false }))
            .await
            .with_context(|| format!("failed to inspect container '{}'", container_id))?;

        let state = inspect.state.as_ref();
        let status = state
            .and_then(|s| s.status)
            .map(|s| format!("{:?}", s).to_lowercase())
            .unwrap_or_else(|| "unknown".to_string());

        let health = state
            .and_then(|s| s.health.as_ref())
            .and_then(|h| h.status)
            .map(|s| format!("{:?}", s).to_lowercase())
            .unwrap_or_else(|| "none".to_string());

        let opts = StatsOptions {
            stream: false,
            one_shot: true,
        };
        let mut stats_stream = docker.stats(container_id, Some(opts));

        let (cpu_percent, memory_usage_mb) = if let Some(Ok(stats)) = stats_stream.next().await {
            let cpu = calculate_cpu_percent(&stats);
            let mem_mb = stats.memory_stats.usage.unwrap_or(0) / 1024 / 1024;
            (cpu, mem_mb)
        } else {
            (0.0, 0)
        };

        Ok(ContainerHealth {
            container_id: container_id.to_string(),
            status,
            health,
            cpu_percent,
            memory_usage_mb,
        })
    }

    #[allow(dead_code)]
    pub async fn check_all_containers(
        docker: &Docker,
        label_filter: HashMap<String, String>,
    ) -> Result<Vec<ContainerHealth>> {
        let label_strs: Vec<String> = label_filter
            .iter()
            .map(|(k, v)| {
                if v.is_empty() {
                    k.clone()
                } else {
                    format!("{}={}", k, v)
                }
            })
            .collect();

        let mut filters: HashMap<String, Vec<String>> = HashMap::new();
        if !label_strs.is_empty() {
            filters.insert("label".to_string(), label_strs);
        }

        let opts = ListContainersOptions {
            all: true,
            filters,
            ..Default::default()
        };

        let containers = docker
            .list_containers(Some(opts))
            .await
            .context("failed to list containers")?;

        let mut results = Vec::with_capacity(containers.len());
        for container in containers {
            if let Some(id) = container.id {
                match Self::check_container_health(docker, &id).await {
                    Ok(health) => results.push(health),
                    Err(e) => {
                        tracing::warn!(container_id = %id, error = %e, "failed to check container health");
                    }
                }
            }
        }

        Ok(results)
    }
}

fn calculate_cpu_percent(stats: &bollard::container::Stats) -> f64 {
    let cpu_delta = stats.cpu_stats.cpu_usage.total_usage as f64
        - stats.precpu_stats.cpu_usage.total_usage as f64;

    let system_delta = stats.cpu_stats.system_cpu_usage.unwrap_or(0) as f64
        - stats.precpu_stats.system_cpu_usage.unwrap_or(0) as f64;

    if system_delta > 0.0 && cpu_delta >= 0.0 {
        let num_cpus = stats
            .cpu_stats
            .online_cpus
            .unwrap_or(1) as f64;
        (cpu_delta / system_delta) * num_cpus * 100.0
    } else {
        0.0
    }
}
