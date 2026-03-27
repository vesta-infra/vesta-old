use anyhow::{Context, Result};
use bollard::container::LogsOptions;
use bollard::Docker;
use futures_util::StreamExt;
use tokio::sync::mpsc;

pub struct LogCapture;

#[derive(Debug, Clone)]
pub struct LogLine {
    pub container_id: String,
    pub line: String,
    pub stream: String,
    pub timestamp: i64,
}

impl LogCapture {
    pub async fn stream_logs(
        docker: &Docker,
        container_id: &str,
        follow: bool,
        tail: Option<usize>,
    ) -> Result<mpsc::Receiver<LogLine>> {
        let (tx, rx) = mpsc::channel(256);
        let cid = container_id.to_string();

        let opts = LogsOptions::<String> {
            follow,
            stdout: true,
            stderr: true,
            tail: tail
                .map(|t| t.to_string())
                .unwrap_or_else(|| "100".to_string()),
            timestamps: true,
            ..Default::default()
        };

        let mut stream = docker.logs(&cid, Some(opts));
        let container_id_owned = cid.clone();

        tokio::spawn(async move {
            while let Some(result) = stream.next().await {
                match result {
                    Ok(output) => {
                        let (stream_name, text) = match &output {
                            bollard::container::LogOutput::StdOut { message } => {
                                ("stdout", String::from_utf8_lossy(message).to_string())
                            }
                            bollard::container::LogOutput::StdErr { message } => {
                                ("stderr", String::from_utf8_lossy(message).to_string())
                            }
                            bollard::container::LogOutput::Console { message } => {
                                ("stdout", String::from_utf8_lossy(message).to_string())
                            }
                            bollard::container::LogOutput::StdIn { message } => {
                                ("stdin", String::from_utf8_lossy(message).to_string())
                            }
                        };

                        let log_line = LogLine {
                            container_id: container_id_owned.clone(),
                            line: text.trim_end().to_string(),
                            stream: stream_name.to_string(),
                            timestamp: chrono::Utc::now().timestamp(),
                        };

                        if tx.send(log_line).await.is_err() {
                            break;
                        }
                    }
                    Err(e) => {
                        tracing::warn!(error = %e, "error reading container logs");
                        break;
                    }
                }
            }
        });

        Ok(rx)
    }

    pub async fn query_logs(
        docker: &Docker,
        container_id: &str,
        since: Option<i64>,
        until: Option<i64>,
        limit: Option<usize>,
    ) -> Result<Vec<LogLine>> {
        let opts = LogsOptions::<String> {
            follow: false,
            stdout: true,
            stderr: true,
            since: since.unwrap_or(0),
            until: until.unwrap_or(0),
            tail: limit
                .map(|l| l.to_string())
                .unwrap_or_else(|| "all".to_string()),
            timestamps: true,
            ..Default::default()
        };

        let mut stream = docker.logs(container_id, Some(opts));
        let mut lines = Vec::new();

        while let Some(result) = stream.next().await {
            match result {
                Ok(output) => {
                    let (stream_name, text) = match &output {
                        bollard::container::LogOutput::StdOut { message } => {
                            ("stdout", String::from_utf8_lossy(message).to_string())
                        }
                        bollard::container::LogOutput::StdErr { message } => {
                            ("stderr", String::from_utf8_lossy(message).to_string())
                        }
                        bollard::container::LogOutput::Console { message } => {
                            ("stdout", String::from_utf8_lossy(message).to_string())
                        }
                        bollard::container::LogOutput::StdIn { message } => {
                            ("stdin", String::from_utf8_lossy(message).to_string())
                        }
                    };

                    lines.push(LogLine {
                        container_id: container_id.to_string(),
                        line: text.trim_end().to_string(),
                        stream: stream_name.to_string(),
                        timestamp: chrono::Utc::now().timestamp(),
                    });
                }
                Err(e) => {
                    return Err(e).context("error querying container logs");
                }
            }
        }

        Ok(lines)
    }
}
