# Vesta

Open-source, self-hosted PaaS (Coolify alternative). See [SPECIFICATION.md](SPECIFICATION.md) for the full project spec.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) + Tailwind CSS v4 + shadcn/ui |
| API | NestJS (TypeScript) |
| Agent | Rust (single static binary) |
| Database | PostgreSQL (default) / SQLite (lightweight option) |
| ORM | TypeORM |
| Queue | BullMQ over Redis |
| Proxy | Caddy |
| IPC | gRPC with mTLS (API <-> Agent) |
| Monorepo | Turborepo (JS/TS) + Cargo workspace (Rust) |
| Package manager | pnpm |

## Repo Layout

- `apps/api/` -- NestJS backend
- `apps/web/` -- Next.js frontend
- `apps/agent/` -- Rust system agent
- `packages/shared/` -- Shared TS types and constants
- `packages/db/` -- TypeORM entities, migrations, data source config
- `packages/config/` -- Shared eslint/tsconfig
- `proto/` -- Protobuf definitions (consumed by API + Agent)
- `docker/` -- Dockerfiles and Compose files

## Conventions

- Use the frontend-design skill when building UI components.
- API modules live in `apps/api/src/modules/<name>/` with controller, service, and DTOs.
- Validation via `class-validator` + `class-transformer` on all DTOs.
- All API endpoints documented via Swagger decorators.
- Secrets are never stored in plaintext. The `SecretProvider` interface abstracts all secret backends.
- Secret access is governed by fine-grained ACLs (read/write/use/manage) independent of RBAC roles. Always check `SecretAcl` before returning or injecting secrets.
- Container scaling (replica count) is a first-class concept on every environment. The agent manages replicas via Docker service mode.
- Agent communication is always over gRPC with mTLS -- never plain HTTP.
- TypeORM is the single source of truth for the database schema. Entity classes live in `packages/db/` alongside migrations.
- Environment config via `@nestjs/config`; never hardcode connection strings or credentials.
- Environment variables support `{{...}}` template syntax. Use the template engine in `common/templates/` to resolve secrets, service links, and built-in variables at deploy time.
- Frontend state: TanStack Query for server state, Zustand for client state.
- Real-time features use Socket.IO (API gateway) and Socket.IO client (frontend).
- Every resource belongs to a team. Always scope queries by `team_id`.
- Backups are encrypted before upload. Use the secrets system for backup encryption keys.
- Cron jobs run as one-shot containers from the environment's current image. The agent manages lifecycle; the API manages scheduling via BullMQ repeatable jobs.
- Deploy hooks (pre/post) run as one-shot containers. If a pre-deploy hook fails, the deployment is aborted and rolled back.
- Service links inject connection variables automatically. Use `ServiceLink` entity to resolve `{{services.*}}` templates.
- All state-changing operations emit events via the internal event bus (`apps/api/src/events/`). Outbound webhooks subscribe to these events.
- Container exec sessions are bidirectional gRPC streams relayed to the frontend via WebSocket. Always audit-log shell sessions.
- Maintenance mode is enforced at the Caddy proxy level. The agent reconfigures Caddy when maintenance is toggled.
- Log persistence is handled by the agent (capture) and API (storage/search). Use `LogRetentionPolicy` to control per-environment retention.

## Security Principles

- Secrets encrypted at rest (AES-256-GCM, envelope encryption, Argon2id key derivation).
- RBAC enforced at the API guard level on every endpoint.
- Fine-grained secret ACLs layered on top of RBAC -- Developers can `use` secrets in deployments without being able to `read` plaintext values.
- Team quotas enforced at the API level -- reject deployments/scaling that would exceed limits.
- Audit log every sensitive operation (secret access, deployments, shell sessions, config changes).
- SSH keys stored encrypted, decrypted only in memory.
- Rate limit auth endpoints. CSRF protection on dashboard.
- Container exec sessions require Developer+ role and are logged with actor, container, and timestamps.
- Outbound webhook payloads are signed with HMAC-SHA256 using a per-webhook secret.
