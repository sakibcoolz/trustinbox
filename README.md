# TrustInbox

A privacy-first customer communication platform where people control **when**, **how**, and **why** organizations can contact them — without exposing their mobile number.

## Architecture

- **Backend**: Go (modular monolith, clean architecture)
- **Gateway**: GraphQL (gqlgen)
- **Internal RPC**: gRPC
- **Database**: PostgreSQL
- **Cache/Rate Limit**: Redis
- **Queue**: AWS SQS / Kafka
- **File Storage**: S3 (MinIO locally)
- **Frontend**: Next.js App Router + TypeScript + Tailwind
- **Observability**: OpenTelemetry + Zap + Prometheus

## Monorepo Structure

```
trustinbox/
├── apps/web/          # Customer-facing Next.js app
├── apps/admin/        # Admin portal Next.js app
├── services/          # Go backend services
├── gateway/           # GraphQL BFF gateway
├── packages/          # Shared packages (proto, cornerstone, ui, types)
├── infra/             # Docker, Terraform, K8s, monitoring
└── docs/              # Architecture, flows, diagrams, ADRs
```

## Quick Start

```bash
# Start all services locally
make up

# Run migrations
make migrate

# Start development
make dev
```

## Product Pillars

1. **Privacy** — Customer's real mobile number is never shared with organizations
2. **Consent** — Every communication governed by user preferences, DND, and category controls
3. **Scheduling** — Organizations request approved time slots, no unsolicited calls
4. **Relationship Continuity** — Messages, documents, chat, and scheduled callbacks
5. **Intelligence** — AI summarizes, prioritizes, and filters communication

## Communication Categories

| Category | Description | Default |
|---|---|---|
| Personal | User-specific notifications (appointments, transactions) | Allowed |
| Organizational | Business updates (service requests, announcements) | Allowed |
| Advertisement | Promotional content (offers, campaigns) | Restricted |

## License

Proprietary — All rights reserved.
