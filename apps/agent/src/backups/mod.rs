use crate::docker::DockerClient;
use anyhow::{Context, Result};
use tokio::sync::mpsc;

pub struct BackupExecutor;

pub struct BackupProgress {
    pub line: String,
    pub progress_percent: u32,
    pub done: bool,
    pub error: Option<String>,
    pub size_bytes: u64,
}

#[allow(dead_code)]
fn now_unix() -> i64 {
    chrono::Utc::now().timestamp()
}

impl BackupExecutor {
    pub async fn backup_database(
        docker: &DockerClient,
        engine: &str,
        container_id: &str,
        connection_url: &str,
        output_path: &str,
        tx: mpsc::Sender<BackupProgress>,
    ) -> Result<u64> {
        let _ = tx
            .send(BackupProgress {
                line: format!("Starting {} database backup", engine),
                progress_percent: 0,
                done: false,
                error: None,
                size_bytes: 0,
            })
            .await;

        let cmd = match engine {
            "postgres" | "postgresql" => {
                vec![
                    "sh".to_string(),
                    "-c".to_string(),
                    format!("pg_dump '{}' > /tmp/backup.sql", connection_url),
                ]
            }
            "mysql" | "mariadb" => {
                vec![
                    "sh".to_string(),
                    "-c".to_string(),
                    format!("mysqldump --single-transaction -r /tmp/backup.sql '{}'", connection_url),
                ]
            }
            "mongo" | "mongodb" => {
                vec![
                    "sh".to_string(),
                    "-c".to_string(),
                    format!("mongodump --uri='{}' --archive=/tmp/backup.archive", connection_url),
                ]
            }
            "redis" => {
                vec![
                    "sh".to_string(),
                    "-c".to_string(),
                    "redis-cli BGSAVE && sleep 2 && cp /data/dump.rdb /tmp/backup.rdb".to_string(),
                ]
            }
            _ => anyhow::bail!("unsupported database engine: {}", engine),
        };

        let _ = tx
            .send(BackupProgress {
                line: "Executing backup command in container...".to_string(),
                progress_percent: 10,
                done: false,
                error: None,
                size_bytes: 0,
            })
            .await;

        let exec_result = docker
            .exec_in_container(container_id, cmd, None)
            .await
            .context("failed to exec backup command")?;

        // Read exec output
        match exec_result {
            bollard::exec::StartExecResults::Attached { mut output, .. } => {
                use futures_util::StreamExt;
                while let Some(Ok(msg)) = output.next().await {
                    let _ = tx
                        .send(BackupProgress {
                            line: msg.to_string(),
                            progress_percent: 50,
                            done: false,
                            error: None,
                            size_bytes: 0,
                        })
                        .await;
                }
            }
            bollard::exec::StartExecResults::Detached => {}
        }

        let _ = tx
            .send(BackupProgress {
                line: "Copying backup file from container...".to_string(),
                progress_percent: 70,
                done: false,
                error: None,
                size_bytes: 0,
            })
            .await;

        let backup_file_in_container = match engine {
            "mongo" | "mongodb" => "/tmp/backup.archive",
            "redis" => "/tmp/backup.rdb",
            _ => "/tmp/backup.sql",
        };

        // Use `docker cp` to copy the backup out
        let cp_status = tokio::process::Command::new("docker")
            .arg("cp")
            .arg(format!("{}:{}", container_id, backup_file_in_container))
            .arg(output_path)
            .status()
            .await
            .context("failed to run docker cp")?;

        if !cp_status.success() {
            anyhow::bail!("docker cp failed with exit code {:?}", cp_status.code());
        }

        let metadata = tokio::fs::metadata(output_path)
            .await
            .context("failed to read backup file metadata")?;
        let size = metadata.len();

        let _ = tx
            .send(BackupProgress {
                line: format!("Backup complete ({} bytes)", size),
                progress_percent: 100,
                done: true,
                error: None,
                size_bytes: size,
            })
            .await;

        Ok(size)
    }

    pub async fn backup_volume(
        docker: &DockerClient,
        container_id: &str,
        volume_path: &str,
        output_path: &str,
        tx: mpsc::Sender<BackupProgress>,
    ) -> Result<u64> {
        let _ = tx
            .send(BackupProgress {
                line: format!("Backing up volume at {}", volume_path),
                progress_percent: 0,
                done: false,
                error: None,
                size_bytes: 0,
            })
            .await;

        let cmd = vec![
            "sh".to_string(),
            "-c".to_string(),
            format!("tar czf /tmp/volume-backup.tar.gz -C {} .", volume_path),
        ];

        let exec_result = docker
            .exec_in_container(container_id, cmd, None)
            .await
            .context("failed to exec tar command")?;

        match exec_result {
            bollard::exec::StartExecResults::Attached { mut output, .. } => {
                use futures_util::StreamExt;
                while let Some(Ok(msg)) = output.next().await {
                    let _ = tx
                        .send(BackupProgress {
                            line: msg.to_string(),
                            progress_percent: 50,
                            done: false,
                            error: None,
                            size_bytes: 0,
                        })
                        .await;
                }
            }
            bollard::exec::StartExecResults::Detached => {}
        }

        let cp_status = tokio::process::Command::new("docker")
            .arg("cp")
            .arg(format!("{}:/tmp/volume-backup.tar.gz", container_id))
            .arg(output_path)
            .status()
            .await
            .context("failed to run docker cp")?;

        if !cp_status.success() {
            anyhow::bail!("docker cp failed with exit code {:?}", cp_status.code());
        }

        let metadata = tokio::fs::metadata(output_path)
            .await
            .context("failed to read backup file metadata")?;
        let size = metadata.len();

        let _ = tx
            .send(BackupProgress {
                line: format!("Volume backup complete ({} bytes)", size),
                progress_percent: 100,
                done: true,
                error: None,
                size_bytes: size,
            })
            .await;

        Ok(size)
    }

    pub async fn restore_database(
        docker: &DockerClient,
        engine: &str,
        container_id: &str,
        connection_url: &str,
        backup_path: &str,
        tx: mpsc::Sender<BackupProgress>,
    ) -> Result<()> {
        let _ = tx
            .send(BackupProgress {
                line: format!("Starting {} database restore", engine),
                progress_percent: 0,
                done: false,
                error: None,
                size_bytes: 0,
            })
            .await;

        let restore_file_in_container = match engine {
            "mongo" | "mongodb" => "/tmp/restore.archive",
            "redis" => "/tmp/restore.rdb",
            _ => "/tmp/restore.sql",
        };

        // Copy backup file into container
        let cp_status = tokio::process::Command::new("docker")
            .arg("cp")
            .arg(backup_path)
            .arg(format!("{}:{}", container_id, restore_file_in_container))
            .status()
            .await
            .context("failed to run docker cp")?;

        if !cp_status.success() {
            anyhow::bail!("docker cp failed with exit code {:?}", cp_status.code());
        }

        let _ = tx
            .send(BackupProgress {
                line: "Executing restore command...".to_string(),
                progress_percent: 30,
                done: false,
                error: None,
                size_bytes: 0,
            })
            .await;

        let cmd = match engine {
            "postgres" | "postgresql" => {
                vec![
                    "sh".to_string(),
                    "-c".to_string(),
                    format!("psql '{}' < /tmp/restore.sql", connection_url),
                ]
            }
            "mysql" | "mariadb" => {
                vec![
                    "sh".to_string(),
                    "-c".to_string(),
                    format!("mysql '{}' < /tmp/restore.sql", connection_url),
                ]
            }
            "mongo" | "mongodb" => {
                vec![
                    "sh".to_string(),
                    "-c".to_string(),
                    format!(
                        "mongorestore --uri='{}' --archive=/tmp/restore.archive",
                        connection_url
                    ),
                ]
            }
            "redis" => {
                vec![
                    "sh".to_string(),
                    "-c".to_string(),
                    "redis-cli SHUTDOWN NOSAVE; cp /tmp/restore.rdb /data/dump.rdb; redis-server"
                        .to_string(),
                ]
            }
            _ => anyhow::bail!("unsupported database engine: {}", engine),
        };

        let exec_result = docker
            .exec_in_container(container_id, cmd, None)
            .await
            .context("failed to exec restore command")?;

        match exec_result {
            bollard::exec::StartExecResults::Attached { mut output, .. } => {
                use futures_util::StreamExt;
                while let Some(Ok(msg)) = output.next().await {
                    let _ = tx
                        .send(BackupProgress {
                            line: msg.to_string(),
                            progress_percent: 70,
                            done: false,
                            error: None,
                            size_bytes: 0,
                        })
                        .await;
                }
            }
            bollard::exec::StartExecResults::Detached => {}
        }

        let _ = tx
            .send(BackupProgress {
                line: "Restore complete".to_string(),
                progress_percent: 100,
                done: true,
                error: None,
                size_bytes: 0,
            })
            .await;

        Ok(())
    }
}
