# Repository Guide

## What This Monorepo Contains

TrustInbox is a product monorepo with three layers of concern:

- User-facing apps in `apps/`
- Runtime services and gateway code in `gateway/` and `services/`
- Shared contracts and operational infrastructure in `packages/` and `infra/`

## Top-Level Layout

| Path | Purpose |
| --- | --- |
| `apps/web` | Main customer-facing Next.js application |
| `apps/admin` | Admin portal shell for moderation, analytics, and billing |
| `gateway/graphql-bff` | Current edge runtime; serves auth, profile, chat, SSE, WebSocket, file, and internal hook APIs |
| `services/*` | Domain-oriented Go services for auth, user, policy, service provider, notification, communication, AI, and workers |
| `packages/proto` | gRPC contracts for internal service boundaries |
| `packages/cornerstone` | Shared Go utilities: config, logging, tracing, auth helpers, middleware |
| `infra/migrations` | Database schema and feature migrations |
| `infra/docker` | Dockerfiles for Go and Next.js images |
| `infra/ejabberd` | Local XMPP server config for chat |
| `infra/otel` | OpenTelemetry collector config |
| `docs` | Product, architecture, API, and flow documentation |

## Runtime Shape Today

### Current working path

For most implemented features, the real runtime is:

`apps/web -> Next.js rewrite/proxy -> gateway/graphql-bff -> PostgreSQL / Redis / MinIO / ejabberd`

The gateway currently owns most live behavior:

- Login, registration, token refresh
- Friend requests and social graph APIs
- Notification listing and SSE fanout
- Conversation APIs and message persistence
- WebSocket chat coordination
- XMPP proxying and ejabberd integration
- Profile, privacy, sessions, avatar, and career APIs

### Target architecture

The repo also models a more service-oriented future runtime:

`apps -> GraphQL BFF -> gRPC services -> data stores / queue / workers`

Evidence for that target state already exists in:

- `packages/proto/*`
- `services/*/internal/usecase`
- `services/*/internal/domain`
- ADRs and architecture docs

## Important Current-State Reality

Several service binaries start gRPC servers, but many of them do not register handlers yet. In practice:

- The gateway is the most complete runtime component.
- The policy service has the strongest business logic implementation.
- The user, auth, notification, communication, and service-provider services have useful domain code but are not the primary runtime owners yet.
- The admin app is mostly a shell with placeholder data and pages.

## Request Flow By Feature

### Authentication

1. `apps/web` calls `/api/auth/login` or `/api/auth/register`.
2. The gateway validates credentials against PostgreSQL.
3. JWT access and refresh tokens are issued.
4. An XMPP JWT is also issued for chat.

### Notifications

1. The web app fetches `/api/notifications`.
2. Real-time updates arrive through `/api/notifications/stream` via SSE.
3. Unread state is updated client-side and persisted through `/api/notifications/read`.

### Chat

1. Conversations and messages are fetched through REST endpoints under `/api/conversations` and `/api/messages`.
2. Realtime delivery uses both WebSocket and XMPP.
3. Presence is handled through gateway endpoints and Redis-backed fanout.
4. Attachments and avatars are stored in MinIO and served back through the gateway.

### Profile And Settings

1. The web app loads profile, stats, service-provider links, privacy, sessions, and career data from gateway endpoints.
2. Updates go directly from the web app to the gateway.
3. The gateway writes those changes into PostgreSQL.

## Database Domains

The migration history shows the core product model clearly:

- Identity: `users`, `user_profiles`, `user_identities`, `refresh_tokens`
- Preferences: `privacy_preferences`, `dnd_rules`, `availability_slots`, `blocked_*`
- Service providers: provider records, verification, members, subscriptions
- Communication: `notifications`, `callback_requests`, `conversations`, `messages`, `documents`
- Trust and safety: `spam_reports`, `spam_scores`, `policy_decision_logs`, `audit_logs`
- Social and chat extensions: `friend_requests`, `friendships`, `conversation_participants`, `message_reactions`, `message_attachments`, `user_presence`
- Career and profile enrichment: `user_work_experience`, `user_education`, `user_skills`

## Terminology Migration: `organization` -> `service_provider`

One of the most important repo-wide details is the terminology migration introduced in migration `010`.

You will currently see both naming sets in the codebase:

- Older naming: `organization`, `organization_id`, `organization-service`
- Newer naming: `service_provider`, `service_provider_id`, `ServiceProviderService`

The migration is not finished across all layers yet:

- New UI copy and GraphQL schema use `service provider`
- Several Go entities, use cases, and tables still use `organization`
- Proto contracts are mixed but trending toward `service provider`

When adding features, do not assume the naming is fully normalized yet.

## Frontend Status

### `apps/web`

This is the most complete app in the repo. It currently covers:

- Landing page and auth
- Dashboard summary
- Inbox and notifications
- Friends and direct messaging
- Conversation threads with realtime chat
- Profile, privacy, sessions, avatar, and career editing
- Settings for privacy, DND, availability, and category preferences
- Service-provider and callbacks pages, currently lighter than chat/profile flows

### `apps/admin`

This app establishes the admin product surface but is still early:

- Dashboard metrics are mocked
- Organization moderation table is static
- Analytics, campaigns, spam reports, audit logs, and billing are placeholders

## Where To Edit For Common Work

| If you need to change... | Start here |
| --- | --- |
| Customer UI behavior | `apps/web/src/app`, `apps/web/src/components`, `apps/web/src/hooks`, `apps/web/src/lib` |
| Gateway HTTP APIs | `gateway/graphql-bff/cmd/server` |
| Policy logic | `services/policy-service/internal/usecase/evaluate.go` |
| Shared auth/token behavior | `packages/cornerstone/auth` |
| Proto contracts | `packages/proto` |
| Database schema | `infra/migrations` |
| Local infra/runtime behavior | `docker-compose*.yml`, `scripts/dev.sh`, `infra/*` |

## Recommended Mental Model

Treat the repo as a platform in transition:

- The product model is already clear.
- The gateway is the operational center today.
- The service layer is the long-term architecture direction.
- Documentation and new code should stay explicit about what is implemented now versus what is planned next.
