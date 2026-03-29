# Service Catalog And Use Cases

This document maps each major repo component to its business responsibility, its main use cases, and its current implementation maturity.

## Product Apps

| Component | Primary Use Cases | Current Status |
| --- | --- | --- |
| `apps/web` | Customer login, inbox, friends, realtime chat, profile, career, privacy, DND, availability, settings | Active and most complete UI surface |
| `apps/admin` | Platform dashboard, provider verification, moderation, billing, analytics | Mostly shell and placeholder screens |

## Edge And Runtime Gateway

### `gateway/graphql-bff`

**Business role**

- Unified edge service for frontend traffic
- Authentication entrypoint
- Current owner of most live user-facing APIs
- Realtime bridge for SSE, WebSocket, and XMPP

**Primary use cases**

- User registration, login, refresh, and session restoration
- User search and friend-request flows
- Notification listing and read state
- Conversation creation, message send/edit/delete, reactions, read state
- File and avatar uploads through MinIO
- Profile, privacy, service-provider association, career, and sessions APIs
- Presence query and heartbeat
- ejabberd auth hooks and XMPP WebSocket proxy

**Current status**

- Fully central to the current runtime
- `/graphql` exists as a placeholder, but active frontend traffic is mostly REST plus realtime channels

## Domain Services

### `services/auth-service`

**Intended responsibility**

- Own account authentication, token issuance, validation, and logout

**Business use cases**

- Email/password login
- Registration
- Refresh token rotation
- Access token validation
- Session revocation

**Current status**

- Has domain entities, repository interfaces, and auth use case logic
- gRPC server starts, but handler registration is still TODO
- In practice, the gateway currently performs most auth flows directly

### `services/user-service`

**Intended responsibility**

- Own user profile and privacy controls

**Business use cases**

- Get/update profile
- Manage privacy preferences
- Manage DND rules
- Manage availability slots
- Block and unblock service providers

**Current status**

- Use case layer is present and coherent
- gRPC handler is not registered yet
- Gateway currently handles profile/privacy endpoints directly against the database

### `services/policy-service`

**Intended responsibility**

- Mandatory gatekeeper for communication decisions

**Business use cases**

- Check whether a notification is allowed
- Decide whether a callback requires approval
- Enforce category preferences
- Enforce DND rules
- Enforce ad caps
- Deny suspended, unverified, blocked, or high-spam providers

**Current status**

- Strongest backend business logic implementation in the repo
- Policy evaluator and tests are present
- gRPC service wiring is still incomplete
- The architecture clearly wants this service to become the control point for all outbound communication

### `services/organization-service`

**Intended responsibility**

- Own service-provider lifecycle and membership

**Business use cases**

- Create service provider
- Verify or reject service provider
- Suspend service provider
- Add and remove service-provider users
- List provider accounts and membership

**Current status**

- Use case layer exists
- Internal naming is still largely `organization`
- Proto surface has already moved toward `ServiceProviderService`
- gRPC handler wiring is not complete

### `services/notification-service`

**Intended responsibility**

- Own notification creation, persistence, and delivery orchestration

**Business use cases**

- Create notification after policy evaluation
- Queue delivery jobs
- List notifications
- Mark notifications as read
- Support campaigns and delivery tracking

**Current status**

- Use case layer exists and already models policy + queue integration
- Runtime ownership still sits mostly in the gateway
- gRPC handler registration is not in place yet

### `services/communication-service`

**Intended responsibility**

- Own callback requests, conversations, documents, and spam reporting

**Business use cases**

- Create and approve callback requests
- Reject callback requests
- Send messages
- List conversations and callback requests
- Report spam
- Support document sharing

**Current status**

- Domain entities and use cases are in place
- Gateway currently owns the live conversation and message APIs
- gRPC service is not fully wired yet

### `services/ai-service`

**Intended responsibility**

- AI assistance for classification, prioritization, summarization, and spam/risk support

**Business use cases**

- Smart categorization
- Spam detection support
- Suggestions and summarization

**Current status**

- Service binary exists as a stub
- No concrete handler or model workflow is implemented yet

### `services/worker-service`

**Intended responsibility**

- Background processing for async jobs

**Business use cases**

- Notification delivery jobs
- Callback reminders
- Cleanup and expiry jobs
- Scheduled campaign sends

**Current status**

- Job processor types are defined
- Delivery, reminder, and cleanup processors are still TODO implementations

## Shared Packages

### `packages/proto`

**Purpose**

- Defines intended gRPC service boundaries for auth, user, policy, notification, communication, and service-provider domains

**Why it matters**

- It is the clearest expression of the target modular architecture
- It also highlights naming drift between older `organization` concepts and newer `service_provider` concepts

### `packages/cornerstone`

**Purpose**

- Shared platform primitives used by Go services

**Key use cases**

- Environment/config loading
- JWT generation and validation
- Logging and tracing helpers
- gRPC context propagation middleware

## Supporting Infrastructure

| Infra Component | Why It Exists | Current Role |
| --- | --- | --- |
| PostgreSQL | Source of truth for users, preferences, providers, notifications, callbacks, chat, profile, and billing tables | Core persistent store |
| Redis | Lightweight cache and realtime/pubsub helper | Presence and gateway support |
| MinIO | S3-compatible object storage | Message attachments and avatar assets |
| ejabberd | XMPP server | Realtime chat transport |
| OpenTelemetry collector | Trace ingestion | Local observability |
| Jaeger | Trace UI | Local debugging |

## Ownership Summary

If you need to reason about the repo quickly, the safest ownership model today is:

- Product behavior: mostly `apps/web` plus `gateway/graphql-bff`
- Business rules: `services/*/internal/usecase`
- Long-term service boundaries: `packages/proto`
- Data model truth: `infra/migrations`

That split explains why some features are already usable in the UI while their dedicated backend service is still only partially wired.
