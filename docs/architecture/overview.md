# TrustInbox Architecture

## System Overview

TrustInbox is a privacy-first, consent-based communication platform that puts users in control of when and how organizations contact them.

## Architecture Style

- **Monorepo**: Go backend services + Next.js frontends
- **Clean Architecture**: Domain → UseCase → Delivery → Infrastructure
- **Communication**: gRPC between services, GraphQL BFF for frontends
- **Database**: PostgreSQL (source of truth), Redis (cache/rate-limit)
- **Async**: SQS/Kafka for job processing
- **Observability**: OpenTelemetry traces + Zap structured logs

## Service Map

| Service | Port | Responsibility |
|---------|------|---------------|
| auth-service | 50051 | Login, registration, JWT, token rotation |
| user-service | 50052 | Profiles, privacy preferences, DND, availability |
| policy-service | 50053 | Mandatory gatekeeper — evaluates all communication |
| organization-service | 50054 | Org CRUD, verification, user management |
| notification-service | 50055 | Notification lifecycle, campaigns, delivery queue |
| communication-service | 50056 | Callbacks, conversations, messages, documents, spam |
| ai-service | 50057 | Smart categorization, spam detection, suggestions |
| worker-service | 50058 | Background jobs: delivery, reminders, cleanup |
| graphql-gateway | 4000 | BFF for web/admin frontends |
| web | 3000 | User-facing Next.js app |
| admin | 3001 | Platform admin Next.js app |

## Data Flow

```
User App → GraphQL Gateway → gRPC → Service → Policy Service → DB/Queue
```

All communication creation flows through the policy service. No exceptions.

## Key Design Decisions

1. **Policy Engine as Gatekeeper**: Every notification, callback, and ad must pass policy evaluation before delivery.
2. **Phone Number Privacy**: Real phone numbers are never exposed to organizations. All routing is identity-based.
3. **Category-Based Control**: Users configure preferences per category (Personal, Organizational, Advertisement).
4. **DND with Overnight Support**: DND rules handle overnight windows (e.g., 22:00-07:00).
5. **Ad Caps**: Per-org daily ad limits enforced by policy engine.
6. **Spam Scoring**: ML-powered spam scores with configurable thresholds.
