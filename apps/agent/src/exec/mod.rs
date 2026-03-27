use anyhow::{Context, Result};
use bollard::exec::{CreateExecOptions, ResizeExecOptions};
use bollard::Docker;

pub struct ExecSession {
    pub session_id: String,
    pub exec_id: String,
}

impl ExecSession {
    pub async fn create(
        docker: &Docker,
        container_id: &str,
        command: Vec<String>,
    ) -> Result<Self> {
        let session_id = uuid::Uuid::new_v4().to_string();
        let cmd_refs: Vec<&str> = command.iter().map(|s| s.as_str()).collect();

        let create_opts = CreateExecOptions {
            cmd: Some(cmd_refs),
            attach_stdin: Some(true),
            attach_stdout: Some(true),
            attach_stderr: Some(true),
            tty: Some(true),
            ..Default::default()
        };

        let exec = docker
            .create_exec(container_id, create_opts)
            .await
            .with_context(|| {
                format!("failed to create exec session in container '{}'", container_id)
            })?;

        Ok(Self {
            session_id,
            exec_id: exec.id,
        })
    }

    pub async fn resize(&self, docker: &Docker, rows: u32, cols: u32) -> Result<()> {
        let opts = ResizeExecOptions {
            height: rows as u16,
            width: cols as u16,
        };

        docker
            .resize_exec(&self.exec_id, opts)
            .await
            .with_context(|| format!("failed to resize exec '{}'", self.exec_id))?;

        Ok(())
    }
}
