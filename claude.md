# Vesta

Open-source, self-hosted PaaS (Coolify alternative). See [SPECIFICATION.md](SPECIFICATION.md) for the full project spec.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (App Router) + Tailwind CSS v4 + shadcn/ui |
| API | NestJS (TypeScript) |
| Agent | Rust (single static binary) |
| Database | PostgreSQL (default) / SQLite (lightweight option) |
| ORM | Prisma |
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
- `packages/db/` -- Prisma schema and migrations
- `packages/config/` -- Shared eslint/tsconfig
- `proto/` -- Protobuf definitions (consumed by API + Agent)
- `docker/` -- Dockerfiles and Compose files

## Conventions

- Use the frontend-design skill when building UI components.
- API modules live in `apps/api/src/modules/<name>/` with controller, service, and DTOs.
- Validation via `class-validator` + `class-transformer` on all DTOs.
- All API endpoints documented via Swagger decorators.
- Secrets are never stored in plaintext. The `SecretProvider` interface abstracts all secret backends.
- Agent communication is always over gRPC with mTLS -- never plain HTTP.
- Prisma is the single source of truth for the database schema. Migrations go in `packages/db/`.
- Environment config via `@nestjs/config`; never hardcode connection strings or credentials.
- Frontend state: TanStack Query for server state, Zustand for client state.
- Real-time features use Socket.IO (API gateway) and Socket.IO client (frontend).

## Security Principles

- Secrets encrypted at rest (AES-256-GCM, envelope encryption, Argon2id key derivation).
- RBAC enforced at the API guard level on every endpoint.
- Audit log every sensitive operation.
- SSH keys stored encrypted, decrypted only in memory.
- Rate limit auth endpoints. CSRF protection on dashboard.
