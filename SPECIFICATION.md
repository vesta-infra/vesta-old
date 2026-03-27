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

### 4.10 Cron Jobs / Scheduled Tasks

Run recurring tasks using the same image as the deployed application without keeping a container running permanently:

- Define cron jobs per environment with a cron expression and a command (e.g., `npm run cleanup`)
- The agent spins up a one-shot container from the environment's current image, runs the command, captures output, and exits
- Full execution history with logs, exit code, duration, and timestamps
- Configurable timeout per job (kill if exceeds limit)
- Configurable concurrency policy: `allow` (overlap OK), `forbid` (skip if previous still running), `replace` (kill previous, start new)
- Manual trigger from dashboard or API
- Failure notifications via configured channels
- On Kubernetes (post-MVP), maps to CronJob resources

### 4.11 Service Dependencies & Service Links

Define relationships between projects so Vesta understands the topology of your stack:

- **Dependency declaration**: A project can declare dependencies on other projects or managed databases within the same team
- **Auto-injected connection variables**: When App A depends on Database B, Vesta automatically injects `B_HOST`, `B_PORT`, `B_USER`, `B_PASSWORD` (resolved from secrets) into App A's environment
- **Dependency graph visualization**: Dashboard shows an interactive graph of all services and their connections
- **Health-aware deploys**: Vesta checks that dependencies are healthy before deploying a dependent service
- **Cascading restart**: Optionally restart dependents when a dependency is redeployed (configurable per link)
- **Circular dependency detection**: Prevented at the API level

### 4.12 Log Aggregation & Search

Go beyond real-time streaming with persistent, searchable log storage:

- **Log persistence**: All container stdout/stderr captured by the agent and forwarded to the API
- **Storage backends**: Local disk (default, with rotation), or S3-compatible object storage for long-term retention
- **Full-text search**: Search across all logs by keyword, regex, time range, project, environment, or severity level
- **Structured logging support**: Auto-parse JSON log lines into searchable fields
- **Log retention policies**: Configurable per environment (e.g., 7 days for preview, 90 days for production)
- **Log export**: Download logs as plain text or JSON for a given time range
- **Dashboard UI**: Filterable log viewer with infinite scroll, syntax highlighting, and timestamp-based navigation
- **Log forwarding** (optional): Forward logs to external systems (Loki, Elasticsearch, Datadog) via configurable sinks

### 4.13 Deployment Pipelines & Build Hooks

Extend the deployment lifecycle with customizable pre- and post-deploy steps:

- **Pre-deploy hooks**: Run commands before the new version goes live (e.g., database migrations, schema validation, asset compilation)
- **Post-deploy hooks**: Run commands after successful deployment (e.g., cache warming, smoke tests, Slack notification)
- **Hook execution**: Each hook runs as a one-shot container from the new image, with access to the environment's secrets
- **Failure behavior**: If a pre-deploy hook fails (non-zero exit), the deployment is aborted and rolled back automatically
- **Hook configuration**: Defined per environment as an ordered list of commands with optional timeout
- **Hook logs**: Full output captured and displayed alongside build/deploy logs in the dashboard
- **Built-in hook templates**: Common patterns (run migrations, seed data, run tests) available as one-click presets

### 4.14 Resource Limits & Quotas

Control resource consumption at the container and team level:

#### Container Resource Limits
- Per-environment CPU limit (cores or millicores) and memory limit (MB)
- Configurable from the dashboard, API, or environment settings
- Enforced by the agent via Docker `--cpus` and `--memory` flags
- Defaults: no limit (inherits server capacity), but recommended to set for production

#### Team Quotas
- Admins can set team-wide quotas: max total CPU, max total RAM, max number of containers, max number of projects
- Quota enforcement at the API level -- deployment rejected if it would exceed the team's quota
- Dashboard shows current usage vs. quota with visual indicators
- Quota alerts: notify when usage exceeds 80% of quota

#### Server Capacity Planning
- Dashboard shows per-server resource allocation vs. actual usage
- Over-commitment warnings when allocated resources exceed server capacity
- Suggested server sizing based on current workloads

### 4.15 Environment Variable Templating

Reference secrets, service links, and built-in variables in environment variable values:

- **Template syntax**: `{{secrets.DB_PASSWORD}}`, `{{services.postgres.host}}`, `{{project.name}}`, `{{environment.name}}`
- **Built-in variables**:
  - `{{project.name}}`, `{{project.slug}}`
  - `{{environment.name}}` (production, staging, pr-42)
  - `{{deployment.commit_sha}}`, `{{deployment.commit_short}}`
  - `{{server.host}}`, `{{server.name}}`
- **Service link variables**: `{{services.<dependency_name>.host}}`, `{{services.<dependency_name>.port}}`
- **Secret references**: `{{secrets.<key>}}` resolves the secret value at deploy time without storing plaintext in the environment config
- **Validation**: Templates are validated at save time; unresolvable references produce a clear error
- **Escaping**: Use `\{{` to produce a literal `{{` in the output

### 4.16 Maintenance Mode

Put any environment behind a maintenance page without stopping the containers:

- **One-click toggle** from dashboard or API per environment
- **Maintenance page**: Caddy serves a static HTML page (customizable per team) with a configurable HTTP status code (503 by default)
- **IP allowlist**: Specify IPs or CIDR ranges that bypass maintenance mode (so the team can still access the app)
- **Scheduled maintenance**: Set a future time window for automatic enable/disable
- **Maintenance banner**: Optionally inject a banner into the running app via a response header (`X-Maintenance-Scheduled: 2026-04-01T02:00Z`) so the frontend can warn users
- **API/webhook bypass**: Requests with a valid maintenance bypass token in the header are forwarded to the app

### 4.17 Outbound Webhooks & Event System

Emit events for everything that happens in Vesta, enabling integration with any external system:

- **Event types**: `deployment.started`, `deployment.succeeded`, `deployment.failed`, `deployment.rolled_back`, `backup.completed`, `backup.failed`, `server.online`, `server.offline`, `secret.accessed`, `secret.rotated`, `cronjob.completed`, `cronjob.failed`, `scaling.changed`, `maintenance.enabled`, `maintenance.disabled`
- **Webhook configuration**: Per team, register one or more HTTPS endpoints with optional secret for HMAC signature verification
- **Payload**: JSON body with event type, timestamp, resource details, actor, and metadata
- **Retry policy**: Exponential backoff (1s, 5s, 30s, 5m) with max 5 retries; dead-letter queue for persistently failing webhooks
- **Webhook logs**: Dashboard shows delivery history per endpoint with status codes and response times
- **Filtering**: Each webhook endpoint can subscribe to specific event types or all events

### 4.18 Container Shell Access

Exec into any running container directly from the dashboard:

- **Web terminal**: xterm.js-based terminal in the browser that opens an interactive shell inside a running container
- **Implementation**: API sends an `ExecInContainer` gRPC call to the agent, which runs `docker exec -it` and streams stdin/stdout/stderr over a bidirectional gRPC stream, relayed to the frontend via WebSocket
- **Access control**: Only Owner, Admin, and Developer roles can exec into containers; Viewers cannot
- **Audit logging**: Every shell session is logged (who, which container, start/end time)
- **Session timeout**: Configurable idle timeout (default 30 minutes)
- **Read-only mode**: Option to exec with a read-only filesystem for safer debugging

### 4.19 Activity Feed / Timeline

A unified, real-time timeline of all events across the team:

- **Unified view**: Single chronological feed showing deployments, scaling events, secret changes, backup completions, server status changes, cron job executions, team member actions
- **Filtering**: Filter by event type, project, environment, server, or actor
- **Search**: Full-text search across event descriptions and metadata
- **Real-time updates**: New events appear instantly via WebSocket
- **Per-resource timelines**: Each project, environment, and server has its own filtered timeline view
- **Powered by AuditLog**: The activity feed is a read-friendly view over the existing AuditLog table with additional event metadata

---

## 5. Future Features (Post-MVP)

- **Kubernetes support**: Deploy to K8s clusters alongside Docker servers
- **Marketplace**: One-click app templates (WordPress, Ghost, Plausible, Gitea, etc.)
- **CLI tool**: `vesta deploy`, `vesta logs`, `vesta secrets set`
- **Terraform provider**: Infrastructure-as-code for Vesta resources
- **Multi-region**: Deploy the same app to multiple servers/regions with geo-routing
- **Canary / Blue-Green Deployments**: Route a percentage of traffic to the new version, monitor error rates, auto-rollback if errors spike; leverages the replica count and Caddy weighted upstreams
- **Deployment Approvals / Gating**: Require manual approval from an Admin/Owner before a production deployment proceeds; integrates with Slack approval buttons and dashboard approval UI
- **Built-in Status Page**: Public-facing status page per team showing uptime for each project/environment, powered by health check data; customizable branding and incident management
- **Cost Estimation**: Estimate monthly cost based on server specs and resource usage; integrate with cloud provider pricing APIs (Hetzner, DigitalOcean, AWS) or allow manual cost-per-server entry; dashboard shows cost breakdown per project/team
- **Import from Coolify / Docker Compose**: Migration tool that reads a Coolify export or an existing `docker-compose.yml` on a server and creates the corresponding Vesta projects, environments, secrets, and service links automatically

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
      teams/          # Team management, RBAC, quotas
      projects/       # Project CRUD, settings, service links
      deployments/    # Deployment lifecycle, rollback, hooks
      servers/        # Server registration, health
      secrets/        # Secret provider abstraction, ACLs
      databases/      # Managed DB provisioning
      domains/        # Domain + SSL management
      notifications/  # Notification channels
      webhooks/       # Git provider webhooks + outbound webhooks
      cron-jobs/      # Cron job CRUD, execution, scheduling
      logs/           # Log aggregation, search, retention
      maintenance/    # Maintenance mode per environment
      activity/       # Activity feed / timeline
      backups/        # Backup scheduling, restore, storage destinations
      resource-limits/ # Per-environment limits, team quotas
      exec/           # Container shell sessions
    common/
      guards/
      interceptors/
      pipes/
      decorators/
      templates/      # Environment variable template engine
    config/           # Environment-based config
    queue/            # BullMQ producers & consumers
    events/           # Internal event bus for outbound webhook dispatch
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
    logs/             # Log capture, persistence, and streaming
    secrets/          # Secret injection at container start
    system/           # Host metrics (CPU, RAM, disk)
    cron/             # Cron job container lifecycle
    exec/             # Container shell exec (bidirectional stream)
    maintenance/      # Caddy maintenance mode config
    backups/          # Database dump + volume snapshot execution
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
          overview/    # Project overview, dependency graph
          deployments/ # Deployment history, logs, hooks
          secrets/     # Secret management UI, ACLs
          domains/     # Domain configuration
          databases/   # Managed databases
          cron-jobs/   # Cron job list, execution history
          logs/        # Persistent log viewer with search
          services/    # Service link management
          scaling/     # Replica count, resource limits
          maintenance/ # Maintenance mode toggle
          backups/     # Backup schedules, restore points
          settings/    # Project settings, env var templates
        servers/       # Server list, add, monitor
        teams/         # Team list, create, switch active team
        [teamId]/
          members/     # Member list, invite, role management
          activity/    # Team-wide activity feed / timeline
          quotas/      # Team quota management, usage dashboard
          webhooks/    # Outbound webhook configuration
          settings/    # Team settings, danger zone
        settings/      # User profile, notifications, API tokens
    components/
      ui/              # shadcn/ui primitives
      layout/          # Shell, sidebar, header
      deploy/          # Deployment-specific components
      terminal/        # xterm.js terminal emulator (server + container exec)
      charts/          # Resource monitoring charts
      logs/            # Log viewer, search, filters
      activity/        # Activity feed components
      graph/           # Service dependency graph visualization
    lib/
      api.ts           # Type-safe API client (generated from OpenAPI spec)
      ws.ts            # WebSocket connection manager
      auth.ts          # Auth helpers, token management
      templates.ts     # Env var template parser/validator (client-side preview)
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

CronJob
  id, environment_id, name, command, schedule (cron expression),
  timeout_seconds, concurrency_policy (allow|forbid|replace),
  enabled, created_at, updated_at

CronJobExecution
  id, cron_job_id, status (running|succeeded|failed|timed_out),
  exit_code, logs, duration_ms,
  started_at, finished_at

ServiceLink
  id, project_id (dependent), dependency_type (project|database),
  dependency_id, injected_env_prefix,
  cascade_restart (bool, default false),
  created_at

DeployHook
  id, environment_id, phase (pre_deploy|post_deploy),
  command, timeout_seconds, order (int),
  enabled, created_at, updated_at

ResourceLimit
  id, environment_id, cpu_limit (millicores), memory_limit_mb,
  created_at, updated_at

TeamQuota
  id, team_id, max_cpu (millicores), max_memory_mb,
  max_containers, max_projects,
  created_at, updated_at

MaintenanceWindow
  id, environment_id, enabled (bool),
  allowed_ips (JSON array of CIDR), bypass_token_hash,
  custom_page_html, status_code (default 503),
  scheduled_start, scheduled_end,
  created_at, updated_at

OutboundWebhook
  id, team_id, name, url, secret_hash,
  event_types (JSON array), enabled,
  created_at, updated_at

WebhookDelivery
  id, webhook_id, event_type, payload (JSON),
  status_code, response_body, duration_ms,
  attempts, next_retry_at,
  created_at

LogEntry
  id, environment_id, container_id, stream (stdout|stderr),
  message, level (info|warn|error|debug),
  structured_fields (JSON), timestamp

LogRetentionPolicy
  id, environment_id, retention_days, storage_backend (local|s3),
  storage_destination_id (nullable),
  created_at, updated_at
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

  // Cron Jobs
  rpc RunCronJob(CronJobRequest) returns (stream CronJobEvent);

  // Container Shell
  rpc ExecInContainer(stream ExecInput) returns (stream ExecOutput);

  // Maintenance
  rpc SetMaintenanceMode(MaintenanceConfig) returns (Empty);

  // Logs
  rpc QueryLogs(LogQuery) returns (stream LogEntry);

  // Resource Limits
  rpc UpdateResourceLimits(ResourceLimitConfig) returns (Empty);
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

Cron Jobs
  GET    /api/environments/:envId/cron-jobs
  POST   /api/environments/:envId/cron-jobs
  GET    /api/cron-jobs/:id
  PATCH  /api/cron-jobs/:id
  DELETE /api/cron-jobs/:id
  POST   /api/cron-jobs/:id/trigger                 (manual run)
  GET    /api/cron-jobs/:id/executions
  GET    /api/cron-job-executions/:id/logs

Service Links
  GET    /api/projects/:projectId/service-links
  POST   /api/projects/:projectId/service-links
  PATCH  /api/service-links/:id
  DELETE /api/service-links/:id
  GET    /api/teams/:teamId/dependency-graph         (full team topology)

Logs
  GET    /api/environments/:envId/logs?q=...&from=...&to=...&level=...
  GET    /api/environments/:envId/logs/export        (download as file)
  GET    /api/environments/:envId/log-retention
  PUT    /api/environments/:envId/log-retention

Deploy Hooks
  GET    /api/environments/:envId/hooks
  POST   /api/environments/:envId/hooks
  PATCH  /api/hooks/:id
  DELETE /api/hooks/:id
  PUT    /api/environments/:envId/hooks/reorder      { orderedIds: string[] }

Resource Limits
  GET    /api/environments/:envId/resource-limits
  PUT    /api/environments/:envId/resource-limits    { cpuLimit, memoryLimitMb }

Team Quotas
  GET    /api/teams/:teamId/quota
  PUT    /api/teams/:teamId/quota                    { maxCpu, maxMemoryMb, maxContainers, maxProjects }
  GET    /api/teams/:teamId/quota/usage              (current usage vs quota)

Maintenance Mode
  GET    /api/environments/:envId/maintenance
  PUT    /api/environments/:envId/maintenance         { enabled, allowedIps, scheduledStart, scheduledEnd }
  POST   /api/environments/:envId/maintenance/toggle

Outbound Webhooks
  GET    /api/teams/:teamId/webhooks
  POST   /api/teams/:teamId/webhooks
  GET    /api/webhooks/outbound/:id
  PATCH  /api/webhooks/outbound/:id
  DELETE /api/webhooks/outbound/:id
  POST   /api/webhooks/outbound/:id/test             (send test event)
  GET    /api/webhooks/outbound/:id/deliveries

Container Shell
  POST   /api/environments/:envId/exec               (initiates WebSocket upgrade for shell session)

Activity Feed
  GET    /api/teams/:teamId/activity?type=...&projectId=...&actorId=...&from=...&to=...
  GET    /api/projects/:projectId/activity
  GET    /api/environments/:envId/activity
  GET    /api/servers/:serverId/activity

Webhooks (Git providers call these)
  POST   /api/webhooks/github
  POST   /api/webhooks/gitlab
  POST   /api/webhooks/bitbucket
  POST   /api/webhooks/gitea
```

### WebSocket Events

```
Client -> Server:
  subscribe:logs           { deploymentId }
  subscribe:metrics        { serverId }
  subscribe:deployment     { deploymentId }
  subscribe:activity       { teamId, filters? }
  subscribe:exec           { environmentId, containerId }

Server -> Client:
  log:line                 { deploymentId, line, timestamp, stream }
  log:search:result        { environmentId, entries[] }
  metrics:update           { serverId, cpu, memory, disk, network }
  deployment:status        { deploymentId, status, message }
  deployment:complete      { deploymentId, status, url }
  deployment:hook          { deploymentId, hookId, phase, status, output }
  cronjob:started          { cronJobId, executionId }
  cronjob:completed        { cronJobId, executionId, exitCode }
  cronjob:failed           { cronJobId, executionId, error }
  scaling:changed          { environmentId, desired, running }
  maintenance:toggled      { environmentId, enabled }
  activity:event           { teamId, event }
  exec:output              { sessionId, data }
  exec:exit                { sessionId, exitCode }
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
- Internal event bus skeleton for outbound webhook dispatch

### Phase 2 -- Core Deploy (Weeks 5-9)

- Git integration (GitHub webhooks, repo clone, branch detection)
- Nixpacks + Dockerfile builds orchestrated by the agent
- Deployment lifecycle (queue -> build -> deploy -> running/failed)
- Rollback to previous deployment
- Caddy reverse proxy configuration from agent
- Real-time build/deploy log streaming (Agent -> API -> WebSocket -> Frontend)
- Project and environment CRUD in dashboard
- Deploy hooks (pre-deploy / post-deploy) with failure-triggered rollback
- Environment variable templating engine (`{{secrets.*}}`, `{{services.*}}`, `{{project.*}}`)
- Service links and dependency declaration with auto-injected connection variables
- Dependency graph visualization in dashboard
- Resource limits per environment (CPU, memory) enforced by agent

### Phase 3 -- Secrets, Databases & Backups (Weeks 10-13)

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

### Phase 4 -- Multi-Server, Scheduling & Logs (Weeks 14-17)

- Multi-server registration and agent auto-install via SSH
- Server monitoring dashboards (CPU, RAM, disk, network)
- Preview environments for pull requests
- Cron jobs: CRUD, agent execution, execution history, manual trigger
- Log aggregation: persistent storage, full-text search, retention policies
- Log viewer UI with filters, search, and export
- Container shell access (exec) via xterm.js in dashboard
- Maintenance mode per environment with IP allowlist and scheduled windows

### Phase 5 -- Teams, Permissions & Events (Weeks 18-21)

- OAuth/SSO login (GitHub, Google, OIDC)
- Full RBAC enforcement across all endpoints
- Team quotas (CPU, memory, containers, projects) with usage dashboard
- Outbound webhooks: configuration, event filtering, delivery logs, retry
- Activity feed / timeline (team-wide and per-resource)
- Notification channels (Email, Slack, Discord, Telegram, webhook)
- Domain management + automatic SSL via Caddy
- Audit log UI

### Phase 6 -- Advanced Deployments & Kubernetes (Post-MVP)

- Canary / blue-green deployments with traffic splitting
- Deployment approvals / gating for production environments
- Built-in public status page per team
- Cost estimation dashboard
- Import from Coolify / Docker Compose
- K8s cluster registration and authentication
- Helm chart generation from Vesta project configuration
- K8s deployment strategy alongside Docker servers
- CronJob mapping to K8s CronJob resources
- Service mesh integration considerations
