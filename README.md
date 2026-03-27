# Vesta

Open-source, self-hosted Platform-as-a-Service. Deploy applications, databases, and services to your own infrastructure with a single click.

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 9+
- Docker & Docker Compose
- Rust toolchain (for the agent)
- protoc (Protocol Buffers compiler)

### Development Setup

```bash
# Clone and install dependencies
pnpm install

# Start PostgreSQL and Redis
docker compose -f docker/docker-compose.yml up -d

# Copy environment config
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Start all services in development mode
pnpm dev
```

This starts:
- **API** at http://localhost:3001 (Swagger docs at http://localhost:3001/api/docs)
- **Frontend** at http://localhost:3000
- **Agent** on gRPC port 50051

### Building the Agent

```bash
cd apps/agent
cargo build --release
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Control Plane (Main Server)          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐   │
│  │ Frontend  │──│   API    │──│  PostgreSQL   │   │
│  │ (Next.js) │  │ (NestJS) │  └──────────────┘   │
│  └──────────┘  └────┬─────┘  ┌──────────────┐   │
│                      │        │ Redis/BullMQ  │   │
│                      │        └──────────────┘   │
└──────────────────────┼───────────────────────────┘
                       │ gRPC / mTLS
           ┌───────────┼───────────┐
           ▼           ▼           ▼
     ┌──────────┐ ┌──────────┐ ┌──────────┐
     │  Agent   │ │  Agent   │ │  Agent   │
     │  (Rust)  │ │  (Rust)  │ │  (Rust)  │
     │  Docker  │ │  Docker  │ │  Docker  │
     │  Caddy   │ │  Caddy   │ │  Caddy   │
     └──────────┘ └──────────┘ └──────────┘
```

## Project Structure

```
vesta/
├── apps/
│   ├── api/          # NestJS backend
│   ├── web/          # Next.js frontend
│   └── agent/        # Rust system agent
├── packages/
│   ├── shared/       # Shared TypeScript types & constants
│   ├── db/           # TypeORM entities, migrations, data source
│   └── config/       # Shared tsconfig & eslint
├── proto/            # Protobuf definitions (API <-> Agent)
├── docker/           # Dockerfiles & Compose files
└── SPECIFICATION.md  # Full project specification
```

## License

MIT
