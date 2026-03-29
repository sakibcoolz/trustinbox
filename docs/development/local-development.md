# Local Development Guide

## Prerequisites

You will need:

- Go `1.23`
- Node.js `20`
- npm
- Docker with Compose
- PostgreSQL client tools if you want to run manual migration commands

## Environment Files

The repo already includes:

- `.env`
- `.env.example`
- `apps/web/.env.local`

Important values already used by local development include:

- `DATABASE_URL`
- `REDIS_ADDR`
- `JWT_SECRET`
- `GATEWAY_URL`
- `NEXT_PUBLIC_GRAPHQL_URL`
- `NEXT_PUBLIC_XMPP_WS_URL`

For most local browser-based work, the web app uses Next.js rewrites so you usually do not need to point the browser directly at the gateway.

## Fastest Startup Path

The easiest way to boot the stack locally is:

```bash
sh scripts/dev.sh
```

That script:

1. Starts infra from `docker-compose.infra.yml`
2. Waits for Postgres and Redis
3. Loads `.env`
4. Starts all Go services locally
5. Starts the web app on port `3000`

## Important Ports

| Component | Port |
| --- | --- |
| Web app | `3000` |
| Admin app | `3001` |
| Gateway | `4000` |
| Auth service | `50051` |
| User service | `50052` |
| Policy service | `50053` |
| Service-provider service | `50054` |
| Notification service | `50055` |
| Communication service | `50056` |
| AI service | `50057` |
| Worker service | `50058` |
| PostgreSQL | `5432` |
| Redis | `6379` |
| MinIO API | `9000` |
| MinIO console | `9001` |
| ejabberd | `5222`, `5280` |
| Jaeger | `16686` |
| OTEL collector | `4317`, `4318` |

## Docker Compose Options

### Full stack in Docker

```bash
make up
```

### Infra only

```bash
docker compose -f docker-compose.infra.yml up -d
```

Use infra-only mode when you want to run the Go services and Next.js app directly on your machine.

## Migrations: Important Caveat

There are two different migration behaviors in the repo today.

### Fresh Docker Postgres volume

When Postgres starts with an empty data volume, Docker automatically executes all SQL files in `infra/migrations/` because that directory is mounted into `/docker-entrypoint-initdb.d`.

### `make migrate`

`make migrate` currently runs only:

- `infra/migrations/001_initial_schema.up.sql`

So it does **not** apply later migrations such as:

- usernames
- friends
- chat extensions
- XMPP token support
- profile enrichment
- career tables
- `organization -> service_provider` rename

If you need the full schema, a fresh Docker-initialized database is the safest path right now.

## Useful Commands

```bash
make help
make up
make down
make logs
make dev-gateway
make dev-service SVC=policy-service
make dev-web
make test
make lint
```

## Frontend Runtime Notes

### Web app

- Runs on Next.js App Router
- Proxies `/api/*` to the Go gateway through `apps/web/next.config.js`
- Uses SSE for notifications
- Uses WebSocket and XMPP for chat/presence

### Admin app

- Starts independently on port `3001`
- Does not yet proxy to the gateway by default
- Mostly contains placeholder admin screens

## Chat And Realtime Notes

The chat stack is a little different from a typical CRUD app:

- The web app authenticates through the gateway
- The gateway also issues an XMPP token
- The browser connects to XMPP through the gateway proxy endpoint `/api/xmpp-ws`
- ejabberd uses internal gateway hooks for auth checks
- SSE is used for notification and backup realtime event delivery

If chat is failing locally, check:

- Gateway is running on `4000`
- ejabberd is healthy
- `JWT_SECRET` matches what the gateway expects
- The browser can reach `/api/xmpp-ws`

## Recommended Workflow For New Contributors

1. Start with `sh scripts/dev.sh`
2. Use the customer web app on `http://localhost:3000`
3. Use the seeded users from the SQL seed file if you need sample data
4. Inspect gateway handlers before changing frontend API calls
5. Inspect migrations before changing domain assumptions

## Current Development Reality

The repo is best approached as an actively evolving platform:

- The gateway is the most important runtime component today
- Some service binaries are still scaffolds
- Schema and terminology are moving toward `service_provider`

When in doubt, trust the gateway handlers, current migrations, and frontend hooks more than older architecture assumptions.
