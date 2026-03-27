use anyhow::{bail, Context, Result};
use std::collections::HashMap;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::Command;
use tokio::sync::mpsc;

pub struct BuildOrchestrator;

pub struct BuildOutput {
    pub line: String,
    pub stream: String,
    pub timestamp: i64,
}

fn now_unix() -> i64 {
    chrono::Utc::now().timestamp()
}

async fn stream_child_output(
    mut child: tokio::process::Child,
    tx: mpsc::Sender<BuildOutput>,
) -> Result<()> {
    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let tx2 = tx.clone();
    let stdout_handle = tokio::spawn(async move {
        if let Some(stdout) = stdout {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = tx2
                    .send(BuildOutput {
                        line,
                        stream: "stdout".to_string(),
                        timestamp: now_unix(),
                    })
                    .await;
            }
        }
    });

    let tx3 = tx.clone();
    let stderr_handle = tokio::spawn(async move {
        if let Some(stderr) = stderr {
            let mut reader = BufReader::new(stderr).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                let _ = tx3
                    .send(BuildOutput {
                        line,
                        stream: "stderr".to_string(),
                        timestamp: now_unix(),
                    })
                    .await;
            }
        }
    });

    let _ = tokio::join!(stdout_handle, stderr_handle);

    let status = child.wait().await.context("failed to wait for child process")?;
    if !status.success() {
        bail!(
            "process exited with code {}",
            status.code().unwrap_or(-1)
        );
    }
    Ok(())
}

impl BuildOrchestrator {
    pub async fn build_nixpacks(
        work_dir: &str,
        image_tag: &str,
        build_args: &HashMap<String, String>,
        tx: mpsc::Sender<BuildOutput>,
    ) -> Result<()> {
        let mut cmd = Command::new("nixpacks");
        cmd.arg("build")
            .arg(work_dir)
            .arg("--name")
            .arg(image_tag);

        for (key, value) in build_args {
            cmd.arg("--env").arg(format!("{}={}", key, value));
        }

        cmd.stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        let child = cmd
            .spawn()
            .context("failed to spawn nixpacks — is it installed?")?;

        stream_child_output(child, tx).await
    }

    pub async fn build_dockerfile(
        work_dir: &str,
        dockerfile_path: &str,
        image_tag: &str,
        build_args: &HashMap<String, String>,
        tx: mpsc::Sender<BuildOutput>,
    ) -> Result<()> {
        let mut cmd = Command::new("docker");
        cmd.arg("build")
            .arg("-f")
            .arg(dockerfile_path)
            .arg("-t")
            .arg(image_tag);

        for (key, value) in build_args {
            cmd.arg("--build-arg").arg(format!("{}={}", key, value));
        }

        cmd.arg(work_dir)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        let child = cmd
            .spawn()
            .context("failed to spawn docker build")?;

        stream_child_output(child, tx).await
    }

    pub async fn clone_repo(
        git_url: &str,
        branch: &str,
        commit_sha: Option<&str>,
        work_dir: &str,
        tx: mpsc::Sender<BuildOutput>,
    ) -> Result<()> {
        let _ = tx
            .send(BuildOutput {
                line: format!("Cloning {} (branch: {})", git_url, branch),
                stream: "stdout".to_string(),
                timestamp: now_unix(),
            })
            .await;

        let mut cmd = Command::new("git");
        cmd.arg("clone")
            .arg("--branch")
            .arg(branch)
            .arg("--depth")
            .arg("1")
            .arg("--single-branch")
            .arg(git_url)
            .arg(work_dir)
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        let child = cmd.spawn().context("failed to spawn git clone")?;
        stream_child_output(child, tx.clone()).await?;

        if let Some(sha) = commit_sha {
            if !sha.is_empty() {
                let _ = tx
                    .send(BuildOutput {
                        line: format!("Checking out commit {}", sha),
                        stream: "stdout".to_string(),
                        timestamp: now_unix(),
                    })
                    .await;

                // Fetch the specific commit (depth=1 clone may not have it)
                let fetch = Command::new("git")
                    .arg("fetch")
                    .arg("origin")
                    .arg(sha)
                    .current_dir(work_dir)
                    .stdout(std::process::Stdio::piped())
                    .stderr(std::process::Stdio::piped())
                    .spawn()
                    .context("failed to spawn git fetch")?;
                stream_child_output(fetch, tx.clone()).await.ok();

                let checkout = Command::new("git")
                    .arg("checkout")
                    .arg(sha)
                    .current_dir(work_dir)
                    .stdout(std::process::Stdio::piped())
                    .stderr(std::process::Stdio::piped())
                    .spawn()
                    .context("failed to spawn git checkout")?;
                stream_child_output(checkout, tx).await?;
            }
        }

        Ok(())
    }
}
