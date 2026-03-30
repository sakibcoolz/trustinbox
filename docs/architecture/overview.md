# TrustInbox Architecture

## System Overview

TrustInbox is a privacy-first, consent-based communication platform that puts users in control of when and how organizations contact them. It serves as a consent-aware communication layer between verified service providers and customers, enforcing user preferences through a centralized policy engine.

## Architecture Style

- **Monorepo**: Go backend services + Next.js frontends in a single repository
- **Clean Architecture**: Domain → UseCase → Delivery → Infrastructure in every Go service
- **Communication**: gRPC between services, GraphQL BFF + REST for frontends
- **Database**: PostgreSQL (source of truth), Redis (cache, rate-limit, pub/sub, streams)
- **Async**: Redis Streams for event-driven job processing
- **Object Storage**: MinIO (S3-compatible) for documents and media
- **Chat**: ejabberd (XMPP) for real-time messaging
- **Observability**: OpenTelemetry traces + Prometheus metrics + Zap structured logs + Grafana dashboards

## Service Map

| Service | Port | Responsibility |
|---------|------|---------------|
| auth-service | 50051 | Login, registration, JWT, token rotation, session management |
| user-service | 50052 | Profiles, privacy preferences, DND, availability, friend requests |
| policy-service | 50053 | Mandatory gatekeeper — evaluates all communication against user preferences |
| notification-service | 50054 | Notification lifecycle, campaigns, delivery queue, read tracking |
| communication-service | 50055 | Callbacks, conversations, messages, documents, spam reporting |
| organization-service | 50056 | SP CRUD, verification, team management, customer relations |
| document-service | 50057 | Document upload, secure sharing, signed URLs, download tracking |
| industry-service | 50058 | Industry profiles, workflow templates, compliance hints |
| bot-service | 50059 | AI bot management, conversation handling, tool execution, escalation |
| webhook-service | 50060 | Webhook subscriptions, HMAC-signed delivery, retry with backoff |
| analytics-service | 50061 | Delivery metrics, policy stats, campaign reports, time-series aggregation |
| worker-service | — | Background jobs: delivery, callbacks, cleanup, campaign fan-out |
| ai-service | — | Smart categorization, spam detection, intent recognition |
| graphql-gateway | 4000 | BFF for all frontend apps (GraphQL + REST + WebSocket + SSE) |

## Frontend Apps

| App | Port | Purpose |
|-----|------|---------|
| web | 3000 | Customer inbox — notifications, chat, callbacks, privacy, DND settings |
| admin | 3001 | Platform admin — verification, moderation, billing, system health |
| provider | 3002 | Service provider portal — campaigns, bots, webhooks, analytics, team |

## Shared Packages

| Package | Path | Purpose |
|---------|------|---------|
| cornerstone | `packages/cornerstone` | Shared Go library: events, tracing, metrics, middleware, crypto, RBAC, webhook signing, errors |
| proto | `packages/proto` | Protobuf contracts for all gRPC services |

## Data Flow

```
Frontend App → GraphQL Gateway → gRPC → Service → Policy Service → DB/Queue
                                                ↓
                                          Redis Streams → Worker Service → Delivery
```

All communication creation flows through the policy service. No exceptions.

## Event-Driven Architecture

Services communicate asynchronously via Redis Streams and Pub/Sub. 25+ event types cover the full lifecycle of notifications, callbacks, campaigns, documents, bots, and webhooks. See [Event Architecture](event-architecture.md) for the full catalog.

## Infrastructure

| Component | Purpose |
|-----------|---------|
| PostgreSQL | Source of truth for all relational data (15 migrations) |
| Redis | Cache, rate limiting, event streams (Pub/Sub + Streams) |
| MinIO | S3-compatible object storage for documents and media |
| ejabberd | XMPP server for real-time chat |
| OTel Collector | Receives OTLP traces (gRPC 4317 / HTTP 4318) and exports to Jaeger |
| Jaeger | Distributed tracing UI (port 16686) |
| Prometheus | Metrics collection and alerting (port 9090) |
| Grafana | Dashboards and visualization (port 3100) |

## Key Design Decisions

1. **Policy Engine as Gatekeeper**: Every notification, callback, and ad must pass policy evaluation before delivery. See [ADR-001](adr.md).
2. **Phone Number Privacy**: Real phone numbers are never exposed to organizations. All routing is identity-based.
3. **Category-Based Control**: Users configure preferences per category (Personal, Organizational, Advertisement).
4. **DND with Overnight Support**: DND rules handle overnight windows (e.g., 22:00-07:00).
5. **Ad Caps**: Per-org daily ad limits (3/org/day) enforced by policy engine.
6. **Spam Scoring**: ML-powered spam scores with configurable threshold (8.0).
7. **Event-Driven Processing**: Redis Streams for reliable async processing with consumer groups.
8. **Field-Level Encryption**: AES-256-GCM for PII, deterministic hashing for searchable fields. See [Security Model](security-model.md).
9. **RBAC Authorization**: 5 roles with 25+ granular permissions enforced via gRPC interceptors.
10. **Industry Profiles**: Configurable workflow templates per industry vertical (banking, healthcare, etc.).

## Sequence Diagrams

- [Auth Flow](../diagrams/auth-flow.puml)
- [Provider Notification Flow](../diagrams/provider-notification-flow.puml)
- [Notification Delivery Flow](../diagrams/notification-delivery-flow.puml)
- [Callback Request Flow](../diagrams/callback-request-flow.puml)
- [Campaign Launch Flow](../diagrams/campaign-launch-flow.puml)
- [Secure Chat Flow](../diagrams/secure-chat-flow.puml)
- [Bot Chat + Human Handoff](../diagrams/bot-chat-handoff-flow.puml)
- [Bot Action Execution](../diagrams/bot-action-execution-flow.puml)
- [Document Upload & Share](../diagrams/document-upload-share-flow.puml)
- [Policy Evaluation Flow](../diagrams/policy-evaluation-flow.puml)
- [Webhook Delivery Flow](../diagrams/webhook-delivery-flow.puml)
