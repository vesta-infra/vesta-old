mod grpc;
mod docker;
mod proxy;
mod builds;
mod health;
mod logs;
mod secrets;
mod system;
mod cron;
mod exec;
mod maintenance;
mod backups;

use std::net::SocketAddr;

use anyhow::Context;
use clap::Parser;
use grpc::proto::agent_service_server::AgentServiceServer;
use grpc::service::AgentServiceImpl;
use tonic::transport::Server;

#[derive(clap::Parser)]
#[command(name = "vesta-agent", about = "Vesta system agent")]
struct Args {
    #[arg(long, default_value = "50051")]
    grpc_port: u16,
    #[arg(long, default_value = "http://localhost:2019")]
    caddy_admin_url: String,
    #[arg(long)]
    ca_cert: Option<String>,
    #[arg(long)]
    server_cert: Option<String>,
    #[arg(long)]
    server_key: Option<String>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "vesta_agent=info,info".into()),
        )
        .init();

    if args.ca_cert.is_some() || args.server_cert.is_some() || args.server_key.is_some() {
        tracing::warn!(
            "TLS certificate paths were provided; mTLS for the gRPC server is not implemented yet"
        );
    }
    // TODO: configure TLS / mTLS when `ca_cert`, `server_cert`, and `server_key` are provided.

    let addr = SocketAddr::from(([0, 0, 0, 0], args.grpc_port));
    let agent = AgentServiceImpl::new(&args.caddy_admin_url);

    tracing::info!(
        port = args.grpc_port,
        listen = %addr,
        "vesta-agent gRPC server starting (plain TCP; mTLS not yet enabled)"
    );

    Server::builder()
        .add_service(AgentServiceServer::new(agent))
        .serve(addr)
        .await
        .context("gRPC server failed")?;

    Ok(())
}
