# Vesta -- Project Specification

## 1. Vision

Vesta is an open-source, self-hosted Platform-as-a-Service (PaaS) that lets developers deploy applications, databases, and services to their own infrastructure with a single click. It is a Coolify alternative that differentiates on **security-first secrets management**, a **high-performance Rust system agent**, and a path toward **Kubernetes-native deployments**.

---

## 2. Target Audience

- Solo developers and indie hackers self-hosting side projects
- Small teams managing a handful of VPS/cloud servers
- Platform / DevOps teams running an internal PaaS for their organization

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  Control Plane (Main Server)             │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │ Frontend  │───▶│   API    │───▶│ PostgreSQL/SQLite│   │
│  │ (Next.js) │    │ (NestJS) │    └──────────────────┘   │
│  └──────────┘    └────┬─────┘    ┌──────────────────┐   │
│                       │          │  BullMQ (Redis)   │   │
│                       ├─────────▶│  Job Queue        │   │
│                       │          └──────────────────┘   │
│                       │                                  │
│                       │          ┌──────────────────┐   │
│                       ├─────────▶│ Secret Backends   │   │
│                       │          │ Built-in | Vault  │   │
│                       │          │ AWS SM | GCP SM   │   │
│                       │          │ Azure KV | Doppler│   │
│                       │          └──────────────────┘   │
└───────────────────────┼─────────────────────────────────┘
                        │ gRPC / mTLS
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Target Srv 1 │ │ Target Srv 2 │ │ Target Srv N │
│              │ │              │ │              │
│ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │
│ │  Agent   │ │ │ │  Agent   │ │ │ │  Agent   │ │
│ │  (Rust)  │ │ │ │  (Rust)  │ │ │ │  (Rust)  │ │
│ └────┬─────┘ │ │ └────┬─────┘ │ │ └────┬─────┘ │
│      │       │ │      │       │ │      │       │
│ ┌────▼─────┐ │ │ ┌────▼─────┐ │ │ ┌────▼─────┐ │
│ │  Docker  │ │ │ │  Docker  │ │ │ │  Docker  │ │
│ │  Engine  │ │ │ │  Engine  │ │ │ │  Engine  │ │
│ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │
│ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │
│ │  Caddy   │ │ │ │  Caddy   │ │ │ │  Caddy   │ │
│ │  Proxy   │ │ │ │  Proxy   │ │ │ │  Proxy   │ │
│ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Component Breakdown

| Component | Technology | Responsibility |
|-----------|------------|----------------|
| **Frontend** | Next.js (App Router) + Tailwind CSS + shadcn/ui | Dashboard, real-time logs, project management |
| **API** | NestJS (TypeScript) | REST + WebSocket API, auth, orchestration, job scheduling |
| **Agent** | Rust binary | Docker operations, proxy config, health checks, log streaming, system metrics |
| **Database** | PostgreSQL (default) / SQLite (lightweight) | Projects, deployments, users, audit log |
| **Queue** | BullMQ over Redis | Async deployment jobs, scheduled tasks, webhooks |
| **Proxy** | Caddy | Automatic HTTPS via Let's Encrypt, reverse proxy routing to containers |
| **Secrets** | Pluggable provider interface | Encrypted at-rest store + external vault integrations |

---

## 4. Core Features (MVP)

### 4.1 Application Deployment

- Deploy from **Git** (GitHub, GitLab, Bitbucket, Gitea) with push-to-deploy webhooks
- Deploy from **Docker image** (any registry)
- Deploy from **Docker Compose** files
- **Nixpacks** and **Buildpacks** for auto-detected builds (Node, Python, Go, Rust, PHP, Ruby, Java, .NET)
- **Dockerfile** support for custom builds
- Zero-downtime rolling deployments
- Rollback to any previous deployment

### 4.1.1 Container Scaling

Unlike Coolify, Vesta treats replica count as a first-class concept:

- Each application environment has a configurable **replica count** (number of container instances / pods)
- Default is 1; users can scale up from the dashboard, API, or (future) CLI
- The agent manages replicas via Docker service mode (single server) or distributes across servers in multi-server setups
- Caddy automatically load-balances across all healthy replicas
- Scale-to-zero is supported for non-production environments to save resources
- On Kubernetes (post-MVP), replica count maps directly to `spec.replicas` in the Deployment manifest
- Health-check-aware scaling: new replicas must pass health checks before old ones are drained

### 4.2 Database & Service Management

- One-click deploy: PostgreSQL, MySQL/MariaDB, MongoDB, Redis, ClickHouse, MinIO
- Automatic scheduled backups to S3-compatible storage
- Secure remote access via TCP proxy or SSH tunnel

### 4.3 Multi-Server Management

- Add servers via SSH key (any VPS, bare metal, cloud VM)
- Per-server resource monitoring (CPU, RAM, disk, network)
- Server grouping and tagging
- Agent auto-install on target servers

### 4.4 Secrets Management (Differentiator)

- **Built-in encrypted store** (AES-256-GCM, master key derived via Argon2) as the default
- **Provider interface** (`SecretProvider`) with adapters for:
  - HashiCorp Vault (KV v2)
  - AWS Secrets Manager
  - GCP Secret Manager
  - Azure Key Vault
  - Doppler
  - Infisical
- Secrets injected at deploy time as env vars or mounted files
- Secret rotation support with zero-downtime re-injection
- Audit log for every secret read/write
- Scoped secrets: global, project-level, environment-level

#### Fine-Grained Secret Permissions

Secret access is controlled independently from the general RBAC roles. This allows teams to restrict who can view, edit, or use specific secrets even within the same project:

- **Secret ACLs**: Each secret (or secret scope) has an access-control list specifying which team members or roles can `read`, `write`, `use` (inject into deployments), or `manage` (change ACLs) it
- **Permission levels**:
  - `read` -- view the secret value in the dashboard/API
  - `write` -- create, update, or delete the secret
  - `use` -- secret is injected into deployments the user triggers (without necessarily being able to read the plaintext)
  - `manage` -- modify the ACL itself
- **Inheritance**: Permissions cascade from global -> project -> environment scope, but can be overridden (restricted or expanded) at any level
- **Defaults**: Owners and Admins get full access; Developers get `use` on project/environment secrets; Viewers get no secret access
- **API token scoping**: API tokens can be scoped to specific secrets or secret prefixes, enabling CI/CD pipelines to access only the secrets they need

### 4.5 Domain & SSL

- Custom domain management per application
- Automatic Let's Encrypt via Caddy
- Wildcard certificate support
- Redirect rules (www, HTTP-to-HTTPS)

### 4.6 Preview Environments

- Automatic deployment per pull request
- Unique subdomain per PR (e.g., `pr-42.app.example.com`)
- Auto-cleanup on PR merge/close

### 4.7 Authentication & Teams

#### Authentication
- Built-in email/password authentication
- OAuth/SSO: GitHub, Google, generic OIDC
- Optional 2FA/TOTP for dashboard login
- API tokens for CI/CD integration, scopeable to specific resources and operations

#### Teams
- Every resource (project, server, database, secret) belongs to a team
- Users can belong to multiple teams and switch between them in the dashboard
- Team creation with invite-by-email workflow
- Role-based access control per team: Owner, Admin, Developer, Viewer
- Fine-grained resource-level permissions (secrets, servers, projects) layered on top of RBAC roles
- Team-level audit log showing all member actions
- Transfer project ownership between teams

### 4.8 Backups

Vesta provides a unified backup system covering both managed databases and application volumes:

#### Database Backups
- Automatic scheduled backups for all managed databases (PostgreSQL, MySQL, MongoDB, Redis, ClickHouse)
- Engine-native dump tools (`pg_dump`, `mysqldump`, `mongodump`, etc.) executed by the agent
- Configurable schedule per database (cron expression) with sensible defaults (daily at 02:00 UTC)
- Retention policy: keep N most recent backups, or time-based (e.g., 7 daily + 4 weekly + 3 monthly)

#### Application Volume Backups
- Opt-in backup of persistent Docker volumes attached to application containers
- Snapshot-based: agent pauses writes (where supported), tars the volume, and uploads
- Same scheduling and retention policies as database backups

#### Storage Destinations
- **S3-compatible** storage as the primary target (AWS S3, MinIO, Backblaze B2, Cloudflare R2, DigitalOcean Spaces)
- Multiple storage destinations can be configured per team
- Backups encrypted before upload (AES-256-GCM, key managed via the secrets system)

#### Restore
- One-click restore from any backup point in the dashboard
- Restore to the same database/volume or to a new instance (clone)
- Point-in-time restore for PostgreSQL (via WAL archiving, optional advanced mode)

#### Backup Monitoring
- Dashboard showing backup status, last success/failure, size, and duration per resource
- Notifications on backup failure via configured channels
- Backup verification: periodic test-restore to validate backup integrity (optional)

#### Schema

```
Backup
  id, team_id, resource_type (database|volume), resource_id,
  storage_destination_id, status (scheduled|running|completed|failed),
  size_bytes, encryption_key_ref,
  started_at, finished_at, expires_at, created_at

BackupSchedule
  id, resource_type, resource_id, cron_expression,
  retention_count, retention_days, enabled,
  storage_destination_id, created_at, updated_at

StorageDestination
  id, team_id, name, type (s3), config (JSON: bucket, region, endpoint, credentials_secret_id),
  created_at, updated_at
```

#### API Endpoints

```
Storage Destinations
  GET    /api/teams/:teamId/storage-destinations
  POST   /api/teams/:teamId/storage-destinations
  PATCH  /api/storage-destinations/:id
  DELETE /api/storage-destinations/:id
  POST   /api/storage-destinations/:id/test          (verify connectivity)

Backups
  GET    /api/backups?resourceType=...&resourceId=...
  POST   /api/backups                                 (trigger manual backup)
  GET    /api/backups/:id
  DELETE /api/backups/:id
  POST   /api/backups/:id/restore                     { targetId?: string }

Backup Schedules
  GET    /api/backup-schedules?resourceType=...&resourceId=...
  POST   /api/backup-schedules
  PATCH  /api/backup-schedules/:id
  DELETE /api/backup-schedules/:id
```

#### gRPC (Agent)

```protobuf
// Added to AgentService
rpc CreateBackup(BackupRequest) returns (stream BackupEvent);
rpc RestoreBackup(RestoreRequest) returns (stream RestoreEvent);
rpc ListVolumes(ContainerRef) returns (VolumeList);
```

### 4.9 Monitoring & Notifications

- Real-time log streaming (via WebSocket)
- Container health checks with auto-restart
- Resource usage dashboards
- Notification channels: Email, Slack, Discord, Telegram, generic webhook

---

## 5. Future Features (Post-MVP)

- **Kubernetes support**: Deploy to K8s clusters alongside Docker servers
- **Marketplace**: One-click app templates (WordPress, Ghost, Plausible, Gitea, etc.)
- **CLI tool**: `vesta deploy`, `vesta logs`, `vesta secrets set`
- **Terraform provider**: Infrastructure-as-code for Vesta resources
- **Multi-region**: Deploy the same app to multiple servers/regions with geo-routing

---

## 6. Technical Design

### 6.1 API (NestJS)

#### Directory Structure

```
apps/api/
  src/
    modules/
      auth/           # JWT + OAuth, guards, strategies
      users/          # User CRUD, roles
      teams/          # Team management, RBAC
      projects/       # Project CRUD, settings
      deployments/    # Deployment lifecycle, rollback
      servers/        # Server registration, health
      secrets/        # Secret provider abstraction
      databases/      # Managed DB provisioning
      domains/        # Domain + SSL management
      notifications/  # Notification channels
      webhooks/       # Git provider webhooks
    common/
      guards/
      interceptors/
      pipes/
      decorators/
    config/           # Environment-based config
    queue/            # BullMQ producers & consumers
    main.ts
    app.module.ts
```

#### Key Libraries

| Concern | Library |
|---------|---------|
| ORM | TypeORM (supports PostgreSQL + SQLite, better raw performance than Prisma) |
| Auth | Passport.js (local, GitHub, Google, OIDC) + JWT |
| Validation | class-validator + class-transformer |
| API Docs | Swagger / OpenAPI (auto-generated) |
| WebSocket | Socket.IO gateway |
| Queue | BullMQ |
| Config | @nestjs/config (env-based) |

### 6.2 Agent (Rust)

#### Directory Structure

```
apps/agent/
  src/
    grpc/             # gRPC server (tonic)
    docker/           # Docker Engine API client (bollard)
    proxy/            # Caddy config generation via admin API
    builds/           # Nixpacks / Dockerfile build orchestration
    health/           # Container health monitoring
    logs/             # Log capture and streaming
    secrets/          # Secret injection at container start
    system/           # Host metrics (CPU, RAM, disk)
    main.rs
  build.rs            # Protobuf compilation
  Cargo.toml
```

#### Key Crates

| Concern | Crate |
|---------|-------|
| gRPC | tonic + prost |
| TLS | rustls |
| Docker | bollard (async Docker Engine API) |
| Async runtime | tokio |
| System metrics | sysinfo |
| Logging | tracing + tracing-subscriber |
| Serialization | serde + serde_json |

#### Design Decisions

- **gRPC with mTLS**: All communication between the NestJS API and the agent is encrypted and mutually authenticated. Certificates are provisioned during agent install.
- **Docker**: The `bollard` crate provides a fully async interface to the Docker Engine API via the local Unix socket.
- **Builds**: The agent shells out to the Nixpacks CLI for auto-detected builds or runs `docker build` for Dockerfiles.
- **Metrics**: Host-level metrics are collected via the `sysinfo` crate and streamed back to the API on a configurable interval.
- **Binary distribution**: Single statically-linked binary per architecture (x86_64, aarch64) compiled with `musl` for maximum portability.

### 6.3 Frontend (Next.js)

#### Directory Structure

```
apps/web/
  src/
    app/
      (auth)/
        login/         # Email/password login
        register/      # Registration
        callback/      # OAuth callback handler
      (dashboard)/
        projects/      # Project list, create
        [projectId]/
          overview/    # Project overview
          deployments/ # Deployment history, logs
          secrets/     # Secret management UI
          domains/     # Domain configuration
          databases/   # Managed databases
          settings/    # Project settings
        servers/       # Server list, add, monitor
        teams/         # Team list, create, switch active team
        [teamId]/
          members/     # Member list, invite, role management
          audit-log/   # Team-level audit log
          settings/    # Team settings, billing, danger zone
        settings/      # User profile, notifications, API tokens
    components/
      ui/              # shadcn/ui primitives
      layout/          # Shell, sidebar, header
      deploy/          # Deployment-specific components
      terminal/        # xterm.js terminal emulator
      charts/          # Resource monitoring charts
    lib/
      api.ts           # Type-safe API client (generated from OpenAPI spec)
      ws.ts            # WebSocket connection manager
      auth.ts          # Auth helpers, token management
    hooks/             # Custom React hooks
    stores/            # Zustand stores
```

#### Key Libraries

| Concern | Library |
|---------|---------|
| Styling | Tailwind CSS v4 + shadcn/ui |
| Server state | TanStack Query |
| Client state | Zustand |
| Real-time | Socket.IO client |
| Terminal | xterm.js |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| API client | Generated from OpenAPI spec |

### 6.4 Secrets Provider Interface

```typescript
type SecretScope = 'global' | 'project' | 'environment';

interface SecretValue {
  value: string;
  metadata?: Record<string, string>;
  version?: string;
  createdAt?: Date;
  expiresAt?: Date;
}

interface ProviderConfig {
  type: string;
  [key: string]: unknown;
}

type Unsubscribe = () => void;

interface SecretProvider {
  readonly id: string;
  readonly name: string;

  connect(config: ProviderConfig): Promise<void>;
  disconnect(): Promise<void>;

  getSecret(path: string): Promise<SecretValue>;
  setSecret(path: string, value: SecretValue): Promise<void>;
  deleteSecret(path: string): Promise<void>;
  listSecrets(prefix?: string): Promise<string[]>;

  rotateSecret?(path: string): Promise<SecretValue>;
  watchSecret?(path: string, cb: (val: SecretValue) => void): Unsubscribe;
}
```

Each provider (Vault, AWS SM, built-in, etc.) implements this interface. The API's secrets module resolves the active provider per project/environment and delegates all secret operations through it.

**Built-in provider specifics:**
- Secrets encrypted with AES-256-GCM
- Master key derived from a user-supplied passphrase via Argon2id
- Master key wrapped and stored in the database; unwrapped in memory at API startup
- Key rotation supported without re-encrypting all secrets (envelope encryption pattern)

### 6.5 Database Schema (Key Entities)

```
User
  id, email, password_hash, name, avatar_url, totp_secret,
  created_at, updated_at

Team
  id, name, slug, created_at

TeamMember
  id, team_id, user_id, role (owner|admin|developer|viewer),
  invited_at, accepted_at

Project
  id, team_id, name, slug, description, git_provider, git_url,
  build_method (nixpacks|dockerfile|compose|image),
  build_config (JSON), default_branch,
  created_at, updated_at

Environment
  id, project_id, name (production|staging|preview),
  auto_deploy, domain_suffix,
  replicas (int, default 1), min_replicas, max_replicas,
  scale_to_zero (bool, default false)

Deployment
  id, environment_id, server_id, status (queued|building|deploying|running|failed|rolled_back),
  commit_sha, commit_message, image_tag, build_logs, deploy_logs,
  desired_replicas, running_replicas,
  started_at, finished_at, created_at

Server
  id, team_id, name, host, port, ssh_key_id, agent_version,
  agent_status (online|offline|installing),
  cpu_cores, memory_mb, disk_gb, tags (JSON),
  last_heartbeat_at, created_at

Domain
  id, project_id, environment_id, fqdn, ssl_status (pending|active|error),
  redirect_www, force_https, created_at

Secret
  id, scope (global|project|environment), scope_id,
  key, encrypted_value, provider_type, provider_ref,
  version, created_by, created_at, updated_at

SecretAcl
  id, secret_id (nullable -- null means scope-wide default),
  scope (global|project|environment), scope_id,
  grantee_type (user|role|api_token), grantee_id,
  permissions (bitmask or JSON: read|write|use|manage),
  created_by, created_at

ManagedDatabase
  id, server_id, team_id, name, engine (postgres|mysql|mongo|redis|clickhouse|minio),
  version, port, credentials_secret_id,
  status, created_at

SshKey
  id, team_id, name, encrypted_private_key, public_key, fingerprint,
  created_at

NotificationChannel
  id, team_id, type (email|slack|discord|telegram|webhook),
  config (JSON), events (JSON), enabled, created_at

ApiToken
  id, user_id, team_id, name, token_hash, scopes (JSON),
  last_used_at, expires_at, created_at

AuditLog
  id, team_id, actor_id, action, resource_type, resource_id,
  metadata (JSON), ip_address, created_at
```

### 6.6 gRPC Service Definition

```protobuf
syntax = "proto3";
package vesta.agent;

service AgentService {
  // Deployment
  rpc BuildImage(BuildRequest) returns (stream BuildEvent);
  rpc DeployContainer(DeployRequest) returns (DeployResponse);
  rpc StopContainer(ContainerRef) returns (Empty);
  rpc RemoveContainer(ContainerRef) returns (Empty);
  rpc RollbackContainer(RollbackRequest) returns (DeployResponse);

  // Scaling
  rpc ScaleService(ScaleRequest) returns (ScaleResponse);
  rpc GetReplicaStatus(ContainerRef) returns (ReplicaStatus);

  // Logs
  rpc StreamLogs(ContainerRef) returns (stream LogEntry);

  // Proxy
  rpc ConfigureRoute(RouteConfig) returns (Empty);
  rpc RemoveRoute(RouteRef) returns (Empty);

  // Health & Metrics
  rpc GetSystemMetrics(Empty) returns (SystemMetrics);
  rpc Heartbeat(Empty) returns (HeartbeatResponse);
  rpc GetContainerStatus(ContainerRef) returns (ContainerStatus);

  // Secrets
  rpc InjectSecrets(SecretInjection) returns (Empty);
}

message ScaleRequest {
  string service_id = 1;
  uint32 desired_replicas = 2;
}

message ScaleResponse {
  string service_id = 1;
  uint32 running_replicas = 2;
  uint32 desired_replicas = 3;
}

message ReplicaStatus {
  string service_id = 1;
  uint32 running = 2;
  uint32 desired = 3;
  repeated ReplicaInfo replicas = 4;
}

message ReplicaInfo {
  string container_id = 1;
  string status = 2;
  string health = 3;
  uint64 started_at = 4;
}
```

---

## 7. Monorepo Structure

```
vesta/
  apps/
    api/                # NestJS backend
    web/                # Next.js frontend
    agent/              # Rust system agent
  packages/
    shared/             # Shared TypeScript types, constants, enums
    db/                 # TypeORM entities, migrations, data source config
    config/             # Shared config (eslint, tsconfig bases)
  proto/                # Protobuf definitions (shared between API + Agent)
  docker/
    Dockerfile.api
    Dockerfile.web
    Dockerfile.agent
    docker-compose.yml          # Local dev environment
    docker-compose.prod.yml     # Production self-host
  docs/                 # Documentation (Nextra or similar)
  scripts/
    install.sh          # One-line installer for self-hosting
    dev-setup.sh        # Developer environment bootstrap
  .github/
    workflows/
      ci.yml            # Lint, test, build
      release.yml       # Build binaries + Docker images
  turbo.json            # Turborepo pipeline config
  package.json          # Root workspace config
  pnpm-workspace.yaml   # pnpm workspace definition
  Cargo.toml            # Rust workspace root
  .env.example          # Example environment variables
```

- **Monorepo tool**: Turborepo for JS/TS packages, Cargo workspace for Rust
- **Package manager**: pnpm
- **Proto sharing**: The `proto/` directory is consumed by both the NestJS API (via `@grpc/proto-loader` or `ts-proto`) and the Rust agent (via `tonic-build` in `build.rs`)

---

## 8. Deployment Model (Self-Hosting Vesta Itself)

Users install Vesta on their main server via a single command:

```bash
curl -fsSL https://get.vesta.sh | bash
```

This script:
1. Checks system requirements (Docker, Docker Compose, minimum resources)
2. Pulls the Vesta Docker Compose stack (API + Frontend + PostgreSQL + Redis)
3. Generates TLS certificates for agent communication
4. Installs the Vesta Agent binary on the local server
5. Starts all services and prints the dashboard URL

Additional target servers are added from the dashboard. Vesta SSHs into the target, installs only the Agent binary, provisions mTLS certificates, and registers the server.

### Minimum Requirements

| Resource | Control Plane | Target Server |
|----------|--------------|---------------|
| CPU | 2 cores | 1 core |
| RAM | 2 GB | 512 MB (agent only) |
| Disk | 20 GB | Depends on workloads |
| OS | Linux (Ubuntu 22+, Debian 12+, Fedora 38+) | Same |
| Docker | 24.0+ | 24.0+ |

---

## 9. Security Considerations

### Transport Security
- All agent communication over **gRPC with mutual TLS** (mTLS)
- Dashboard served over HTTPS (Caddy auto-provisions certificates)
- WebSocket connections authenticated via JWT

### Data at Rest
- Secrets encrypted with **AES-256-GCM** using envelope encryption
- Master key derived from passphrase via **Argon2id** (time=3, memory=64MB, parallelism=4)
- SSH private keys stored encrypted in the database, decrypted only in memory
- Database backups encrypted before upload to S3

### Access Control
- **RBAC** enforced at the API layer via NestJS guards
- Four roles: Owner > Admin > Developer > Viewer
- **Fine-grained secret ACLs**: per-secret or per-scope access control with `read`, `write`, `use`, and `manage` permissions, independent of RBAC role
- API tokens scoped to specific operations and optionally to specific secrets/prefixes
- Optional **2FA/TOTP** for dashboard login

### Operational Security
- **Audit logging** for all sensitive operations (secret access, deployments, server changes)
- **Rate limiting** on authentication endpoints (10 attempts / 15 min)
- **CSRF protection** on all state-changing dashboard requests
- Container isolation via Docker namespaces, cgroups, and resource limits
- Agent binary runs as a dedicated `vesta` system user with minimal privileges

---

## 10. API Design

### REST Endpoints (Summary)

```
Auth
  POST   /api/auth/register
  POST   /api/auth/login
  POST   /api/auth/refresh
  POST   /api/auth/logout
  GET    /api/auth/oauth/:provider
  GET    /api/auth/oauth/:provider/callback

Users
  GET    /api/users/me
  PATCH  /api/users/me
  POST   /api/users/me/totp/enable
  DELETE /api/users/me/totp/disable

Teams
  GET    /api/teams
  POST   /api/teams
  GET    /api/teams/:id
  PATCH  /api/teams/:id
  DELETE /api/teams/:id
  GET    /api/teams/:id/members
  POST   /api/teams/:id/members/invite
  PATCH  /api/teams/:id/members/:memberId
  DELETE /api/teams/:id/members/:memberId

Projects
  GET    /api/teams/:teamId/projects
  POST   /api/teams/:teamId/projects
  GET    /api/projects/:id
  PATCH  /api/projects/:id
  DELETE /api/projects/:id

Environments
  GET    /api/projects/:projectId/environments
  POST   /api/projects/:projectId/environments
  PATCH  /api/environments/:id
  DELETE /api/environments/:id

Deployments
  GET    /api/environments/:envId/deployments
  POST   /api/environments/:envId/deployments
  GET    /api/deployments/:id
  POST   /api/deployments/:id/rollback
  POST   /api/deployments/:id/cancel

Scaling
  GET    /api/environments/:envId/scale
  PATCH  /api/environments/:envId/scale          { replicas: number }
  GET    /api/environments/:envId/replicas

Servers
  GET    /api/teams/:teamId/servers
  POST   /api/teams/:teamId/servers
  GET    /api/servers/:id
  PATCH  /api/servers/:id
  DELETE /api/servers/:id
  GET    /api/servers/:id/metrics

Secrets
  GET    /api/secrets?scope=global|project|environment&scopeId=:id
  POST   /api/secrets
  PATCH  /api/secrets/:id
  DELETE /api/secrets/:id
  POST   /api/secrets/:id/rotate

Secret Permissions
  GET    /api/secrets/:id/acl
  PUT    /api/secrets/:id/acl                    { granteeType, granteeId, permissions[] }
  DELETE /api/secrets/:id/acl/:aclId
  GET    /api/secrets/acl?scope=...&scopeId=...  (scope-wide defaults)

Domains
  GET    /api/projects/:projectId/domains
  POST   /api/projects/:projectId/domains
  PATCH  /api/domains/:id
  DELETE /api/domains/:id

Databases
  GET    /api/teams/:teamId/databases
  POST   /api/teams/:teamId/databases
  GET    /api/databases/:id
  DELETE /api/databases/:id
  POST   /api/databases/:id/backup

Notifications
  GET    /api/teams/:teamId/notifications
  POST   /api/teams/:teamId/notifications
  PATCH  /api/notifications/:id
  DELETE /api/notifications/:id

Webhooks (Git providers call these)
  POST   /api/webhooks/github
  POST   /api/webhooks/gitlab
  POST   /api/webhooks/bitbucket
  POST   /api/webhooks/gitea
```

### WebSocket Events

```
Client -> Server:
  subscribe:logs       { deploymentId }
  subscribe:metrics    { serverId }
  subscribe:deployment { deploymentId }

Server -> Client:
  log:line             { deploymentId, line, timestamp, stream }
  metrics:update       { serverId, cpu, memory, disk, network }
  deployment:status    { deploymentId, status, message }
  deployment:complete  { deploymentId, status, url }
```

---

## 11. Development Priorities

### Phase 1 -- Foundation (Weeks 1-4)

- Monorepo setup (Turborepo + pnpm + Cargo workspace)
- NestJS API scaffolding with auth module (email/password + JWT)
- TypeORM entities + PostgreSQL setup + initial migration
- Rust agent with gRPC skeleton + Docker connectivity via bollard
- Protobuf definitions for agent communication
- Next.js dashboard shell with login/register flow
- Docker Compose for local development (API + DB + Redis)

### Phase 2 -- Core Deploy (Weeks 5-8)

- Git integration (GitHub webhooks, repo clone, branch detection)
- Nixpacks + Dockerfile builds orchestrated by the agent
- Deployment lifecycle (queue -> build -> deploy -> running/failed)
- Rollback to previous deployment
- Caddy reverse proxy configuration from agent
- Real-time build/deploy log streaming (Agent -> API -> WebSocket -> Frontend)
- Project and environment CRUD in dashboard

### Phase 3 -- Secrets, Databases & Backups (Weeks 9-12)

- Built-in encrypted secret store (AES-256-GCM + Argon2id)
- SecretProvider interface + HashiCorp Vault adapter
- AWS Secrets Manager adapter
- Secret injection into containers at deploy time
- Fine-grained secret ACL enforcement
- Secrets management UI in dashboard
- One-click database provisioning (PostgreSQL, MySQL, Redis, MongoDB)
- Storage destination configuration (S3-compatible)
- Database backup scheduling, retention policies, and encrypted upload
- Application volume backup (opt-in)
- One-click restore from backup in dashboard
- Backup monitoring and failure notifications

### Phase 4 -- Multi-Server & Polish (Weeks 13-16)

- Multi-server registration and agent auto-install via SSH
- Server monitoring dashboards (CPU, RAM, disk, network)
- Preview environments for pull requests
- OAuth/SSO login (GitHub, Google, OIDC)
- RBAC enforcement across all endpoints
- Notification channels (Email, Slack, Discord, Telegram, webhook)
- Domain management + automatic SSL via Caddy
- Audit log UI

### Phase 5 -- Kubernetes (Post-MVP)

- K8s cluster registration and authentication
- Helm chart generation from Vesta project configuration
- K8s deployment strategy alongside Docker servers
- Service mesh integration considerations
