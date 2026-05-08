# TrustInbox — GitHub Copilot Instructions

> **Role**: Act as a Principal Engineer building a privacy-first enterprise communication platform.
> **Stack**: Go 1.24 microservices · gRPC · GraphQL (gqlgen) · PostgreSQL 16 · Redis 7 · Next.js 15/14 · React 19/18 · TypeScript 5 · Tailwind 3 · OpenTelemetry · Docker.
> **Repository**: Monorepo — 13 Go services, 1 GraphQL gateway, 3 Next.js apps, shared proto + cornerstone packages.

---

## 1 · Project Overview

TrustInbox is a **privacy-first enterprise communication platform** where **users** control when and how **service providers** (organizations) can contact them. Communication categories (Personal, Service Provider, Advertisement) are governed by a mandatory **policy engine** that evaluates every interaction against user preferences, DND rules, spam scores, verification status, and ad caps.

### Core Capabilities

| Domain | Description |
|--------|-------------|
| **Policy Engine** | Mandatory gatekeeper — evaluates every communication and callback request |
| **Notifications** | Multi-channel delivery (in-app, SMS, email, push) with policy gating |
| **Callbacks** | User-approved callback scheduling with availability slots |
| **Conversations** | Secure messaging between users and service providers |
| **Campaigns** | Bulk notification campaigns with target fan-out and analytics |
| **AI Bots** | Configurable AI assistants with tool permissions, knowledge sources, and LLM integration |
| **Webhooks** | Event-driven webhook subscriptions with HMAC-SHA256 signing |
| **Documents** | Secure document sharing with presigned URLs via MinIO |
| **Analytics** | Dashboard, daily breakdowns, per-domain analytics (notification, callback, campaign, bot) |
| **Industry Profiles** | Pre-configured templates for banking, healthcare, real estate, hospitality, logistics |

### Architecture Style

- **Microservices** with gRPC inter-service communication
- **Event-driven** via Redis Streams (durable) and Pub/Sub (fire-and-forget)
- **Clean Architecture** in every Go service (domain → usecase → delivery → infrastructure)
- **GraphQL BFF** gateway aggregating all backend services
- **REST API layer** in the provider portal's Next.js API routes proxying to the gateway

---

## 2 · Repository Structure

```
trustinbox/
├── apps/
│   ├── provider/          # [provider-ui] Next.js 15 + React 19 — Service provider portal (:6060)
│   ├── web/               # [web-app]     Next.js 14 + React 18 — Customer-facing app (:3000)
│   └── admin/             # [admin]       Next.js 14 + React 18 — Platform admin dashboard (:3001)
├── gateway/
│   └── graphql-bff/       # Go gqlgen GraphQL gateway + REST provider API (:4000)
├── services/
│   ├── auth-service/      # Authentication, JWT tokens, sessions (:50051)
│   ├── user-service/      # User profiles, privacy, DND, encryption (:50052)
│   ├── policy-service/    # MANDATORY policy evaluation engine (:50053)
│   ├── organization-service/  # Service provider lifecycle, team (:50054)
│   ├── notification-service/  # Notification creation, delivery (:50055)
│   ├── communication-service/ # Callbacks, conversations, messages (:50056)
│   ├── ai-service/        # LLM integration, RAG, classification (:50057)
│   ├── worker-service/    # Background job processing (:50058)
│   ├── bot-service/       # AI bot lifecycle, config, permissions (:50059)
│   ├── webhook-service/   # Webhook subscriptions, delivery (:50060)
│   ├── analytics-service/ # Metrics, dashboards, breakdowns (:50061)
│   ├── document-service/  # File storage, presigned URLs (:50062)
│   └── industry-service/  # Industry templates, defaults (:50063)
├── packages/
│   ├── cornerstone/       # Shared Go library (auth, config, errors, events, logging, tracing, middleware, crypto, metrics, tenant, webhook)
│   └── proto/             # Shared protobuf definitions + generated Go code
├── infra/
│   ├── docker/            # Service Dockerfiles
│   ├── migrations/        # PostgreSQL migration files (NNN_description.up/down.sql)
│   ├── ejabberd/          # XMPP server config
│   ├── grafana/           # Grafana dashboards
│   ├── otel/              # OpenTelemetry Collector config
│   └── prometheus/        # Prometheus scrape config
├── scripts/
│   └── dev.sh             # Full local dev startup script
├── docs/                  # Architecture, business flows, diagrams, API docs, ADRs
├── tests/                 # Cross-service integration tests
├── go.work                # Go workspace linking all 16 modules
├── Makefile               # Build, test, codegen, infra targets
├── docker-compose.yml     # Full stack deployment
└── docker-compose.infra.yml  # Infrastructure only (Postgres, Redis, MinIO, OTel, Jaeger, Prometheus, Grafana)
```

### Layer Responsibilities

| Layer | Location | Responsibility |
|-------|----------|---------------|
| **Domain/Entity** | `services/*/internal/domain/entity/` | Pure Go structs — no tags, no logic, just data shapes |
| **Repository Interface** | `services/*/internal/domain/repository/` | Interface contracts for persistence — never implementation |
| **Use Case** | `services/*/internal/usecase/` | All business logic — validation, policy, orchestration, events |
| **Delivery (gRPC)** | `services/*/internal/delivery/grpc/` | Thin handlers — proto mapping and error translation only |
| **Infrastructure** | `services/*/internal/infra/postgres/` | SQL implementations of repository interfaces |
| **Gateway** | `gateway/graphql-bff/` | BFF aggregation — routes requests to backend services via gRPC |
| **Frontend** | `apps/*/src/` | UI rendering, client state, API route proxies |

---

## 3 · Coding Standards

### 3.1 General Rules

- **Clean code**: single responsibility, small focused functions (< 40 lines preferred), meaningful names.
- **DRY**: check for existing utilities in `packages/cornerstone/` and `src/lib/` before creating new ones.
- **No dead code**: remove unused imports, functions, and variables immediately.
- **Comments**: only for **why**, never for **what**. Code should be self-documenting.
- **Section headers**: use ASCII box drawing for section delineation:
  ```go
  // ─── Repository Methods ──────────────────────────────────
  ```

### 3.2 File & Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| **Go files** | `snake_case.go` | `notification_repo.go`, `bot_test.go` |
| **Go packages** | `lowercase`, no underscores | `usecase`, `postgres`, `grpc` |
| **Go types** | `PascalCase` | `BotUseCase`, `NotificationHandler` |
| **Go interfaces** | Descriptive, suffix-free | `BotRepository`, `PolicyChecker` |
| **Go constructors** | `NewXxx()` | `NewBotUseCase(...)` |
| **Proto files** | `snake_case.proto` in `<domain>/v1/` | `notification/v1/notification.proto` |
| **Proto packages** | `<domain>.v1` | `notification.v1` |
| **Proto Go alias** | `<domain>v1` | `notificationv1` |
| **Proto RPCs** | `PascalCase` verbs | `CreateNotification`, `ListNotifications` |
| **Proto fields** | `snake_case` | `user_id`, `service_provider_id` |
| **SQL tables** | `snake_case` plural | `notifications`, `bot_configurations` |
| **SQL columns** | `snake_case` | `created_at`, `service_provider_id` |
| **SQL indexes** | `idx_<table>_<columns>` | `idx_notifications_user_id_status` |
| **Migrations** | `NNN_description.up.sql` / `.down.sql` | `015_tenant_model.up.sql` |
| **TS/TSX files** | `PascalCase` for components, `camelCase` for utils | `Card.tsx`, `useData.ts` |
| **React components** | Named exports, `PascalCase` | `export function Card()` |
| **GraphQL types** | `PascalCase` | `Notification`, `ServiceProvider` |
| **GraphQL fields** | `camelCase` | `fullName`, `createdAt` |
| **GraphQL inputs** | `<Action><Entity>Input` | `UpdatePrivacyPreferenceInput` |
| **Event types** | `<domain>.<action>` snake_case | `notification.delivered`, `bot.action.executed` |
| **Env vars** | `UPPER_SNAKE_CASE` | `BOT_SERVICE_ADDR`, `JWT_SECRET` |

### 3.3 Backend Standards (Go)

#### Error Handling
```go
// ALWAYS use typed business errors from cornerstone/errors
return bizerr.NotFound("bot", botID)
return bizerr.InvalidInput("name is required")
return bizerr.Forbidden("bot does not belong to this service provider")
return bizerr.Internal("failed to query database", err)
return bizerr.PolicyDenied(reason)

// NEVER: panic, log.Fatal in business code, return nil error when something failed
// NEVER: swallow errors silently — always return or log
```

#### Context Propagation
```go
// ALWAYS propagate context as first parameter
func (uc *XxxUseCase) DoSomething(ctx context.Context, ...) error {
    // ALWAYS start a tracing span
    ctx, span := tracing.StartSpan(ctx, "service-name", "MethodName",
        attribute.String("entity_id", id),
    )
    defer span.End()
    // ...
}
```

#### Logging
```go
// ALWAYS use structured zap logging — never fmt.Println or log.Printf
uc.log.Info("notification created",
    zap.String("notification_id", notif.ID),
    zap.String("user_id", notif.UserID),
    zap.String("service_provider_id", notif.ServiceProviderID),
)
uc.log.Error("failed to create notification", zap.Error(err))
```

#### Dependency Injection
```go
// Define external service interfaces locally in the usecase package
type PolicyChecker interface {
    EvaluateBotAction(ctx context.Context, botID, userID, toolName string) (allowed bool, reason string, err error)
}

// Inject via constructor — NEVER create dependencies inside use cases
func NewBotUseCase(botRepo repository.BotRepository, policy PolicyChecker, ...) *BotUseCase
```

#### gRPC Handlers
```go
// Keep handlers THIN — map proto → usecase input, call usecase, map result → proto
func (h *NotificationHandler) CreateNotification(ctx context.Context, req *pb.CreateNotificationRequest) (*pb.CreateNotificationResponse, error) {
    result, err := h.uc.Create(ctx, usecase.CreateInput{...})
    if err != nil {
        return nil, mapError(err)
    }
    return &pb.CreateNotificationResponse{...}, nil
}

// ALWAYS use mapError() — business errors → gRPC status codes
func mapError(err error) error {
    switch {
    case bizerr.IsNotFound(err):     return status.Error(codes.NotFound, err.Error())
    case bizerr.IsInvalidInput(err): return status.Error(codes.InvalidArgument, err.Error())
    case bizerr.IsForbidden(err):    return status.Error(codes.PermissionDenied, err.Error())
    case bizerr.IsPolicyDenied(err): return status.Error(codes.PermissionDenied, err.Error())
    default:                          return status.Error(codes.Internal, err.Error())
    }
}
```

#### SQL / Repository (PostgreSQL)
```go
// ALWAYS use parameterized queries: $1, $2, $3 — NEVER string concatenation
// ALWAYS use context variants: ExecContext, QueryContext, QueryRowContext
// ALWAYS defer rows.Close() after QueryContext
// Use sql.NullString for nullable columns
// Use json.Marshal/Unmarshal for JSONB columns
// Wrap errors: fmt.Errorf("create notification: %w", err)
// Return ([]Entity, total int, error) for list queries with count

row := r.db.QueryRowContext(ctx, `
    INSERT INTO notifications (id, user_id, service_provider_id, category, title, body, priority, status, metadata, created_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
    RETURNING id`, notif.ID, notif.UserID, ...)
```

#### Event Publishing
```go
// Use the shared event publisher — NEVER publish directly to Redis
// Log failures but do NOT propagate — events are best-effort
func (uc *XxxUseCase) publishEvent(ctx context.Context, eventType events.EventType, entityID, userID, spID string, payload interface{}) {
    data, _ := json.Marshal(payload)
    evt := events.NewEvent(eventType, data).
        WithEntity(entityID).
        WithUser(userID).
        WithServiceProvider(spID).
        WithTrace(tracing.TraceID(ctx))
    if err := uc.publisher.Publish(ctx, evt); err != nil {
        uc.log.Error("failed to publish event", zap.Error(err), zap.String("event_type", string(eventType)))
    }
}
```

#### Service Wiring (main.go)
```go
// Pattern: config → logger → DB → Redis → event publisher → repos → use case → gRPC handler → server → graceful shutdown
// ALWAYS: health.NewServer(), reflection.Register(srv)
// ALWAYS: signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM), srv.GracefulStop()
```

### 3.4 Frontend Standards (Next.js / React / TypeScript)

#### Provider Portal (Primary — `apps/provider/`)

**Server Components First**:
```tsx
// Page files: prefer async Server Components with Suspense
// File: src/app/page.tsx
export default async function DashboardPage() {
    const data = await fetchDashboardAnalytics();  // server-side fetch
    return (
        <Suspense fallback={<DashboardSkeleton />}>
            <DashboardClient initialData={data} />
        </Suspense>
    );
}
```

**Client Components**:
```tsx
'use client';
// ALWAYS: 'use client' directive at the very top for interactive components
// ALWAYS: named exports for components — never export default (except page.tsx)
// ALWAYS: interface for props, extending HTML attributes when wrapping native elements
// ALWAYS: cn() utility for conditional Tailwind classes
// ALWAYS: variant objects with `as const` for type-safe variant maps

import { cn } from '@/lib/utils';

const VARIANTS = {
    default: 'bg-bg-card border border-border-primary',
    elevated: 'bg-bg-elevated border border-border-secondary shadow-lg',
} as const;

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: keyof typeof VARIANTS;
}

export function Card({ variant = 'default', className, children, ...props }: CardProps) {
    return (
        <div className={cn('rounded-xl', VARIANTS[variant], className)} {...props}>
            {children}
        </div>
    );
}
```

**Data Fetching**:
```tsx
// Server-side: use gatewayFetch() from @/lib/server-fetch.ts
// Client-side: use useData() hook from @/lib/hooks/useData.ts (NOT Apollo useQuery)
// Mutations: use hooks from @/lib/mutations/*.ts
// API routes: proxy to gateway via /api/gateway/[...path] catch-all or domain-specific routes
```

**Auth & Permissions**:
```tsx
// Auth: httpOnly cookies (accessToken, refreshToken, auth-status, activeSpId)
// RBAC: usePermission() hook from @/lib/hooks/
// Protected routes: useRequireAuth() → redirects to /auth/login
// Permission gating: <PermissionGate permission="notifications:send">...</PermissionGate>
```

**Styling**:
```tsx
// ALWAYS: Tailwind utility classes inline — NEVER CSS modules or styled-components
// ALWAYS: use semantic color tokens from tailwind.config.js — NEVER raw hex values
// Background: bg-bg-primary, bg-bg-secondary, bg-bg-card, bg-bg-elevated
// Text: text-text-primary, text-text-secondary, text-text-muted
// Borders: border-border-primary, border-border-secondary
// Accents: accent-blue, accent-green, accent-red, accent-orange
// Status: status-success, status-warning, status-error, status-info
// Status opacity: bg-status-success/10 text-status-success (badge style)
```

**Real-time**:
```tsx
// Provider uses SSE (Server-Sent Events) via useSSE() hook — NOT WebSockets
// Live hooks: useLiveNotifications(), useLiveDashboard(), useLiveCallbacks()
```

#### Web App (`apps/web/`) — Different Stack
```
// Uses Apollo Client + React 18 + Next.js 14
// Auth: localStorage-based tokens (NOT cookies)
// Real-time: XMPP for chat, Apollo subscriptions for notifications
// Has @layer components classes in globals.css — provider does NOT
```

### 3.5 GraphQL Standards

```graphql
# Schema at: gateway/graphql-bff/graph/schema.graphqls
# Code generation: make gqlgen

# Type naming: PascalCase for types, camelCase for fields
type Notification {
    id: ID!
    userId: ID!
    serviceProvider: ServiceProvider!
    category: String!
    title: String!
    createdAt: Time!
}

# Connection pattern (NOT Relay cursor)
type NotificationConnection {
    nodes: [Notification!]!
    totalCount: Int!
}

# Input naming: <Action><Entity>Input
input SendNotificationInput {
    userId: ID!
    category: String!
    title: String!
    body: String!
}

# Custom scalars: Time, DateTime, JSON
```

### 3.6 Proto Standards

```protobuf
syntax = "proto3";
package notification.v1;
option go_package = "github.com/trustinbox/proto/gen/notification/v1;notificationv1";

// Service name: <Domain>Service
service NotificationService {
    rpc CreateNotification(CreateNotificationRequest) returns (CreateNotificationResponse);
    rpc GetNotification(GetNotificationRequest) returns (GetNotificationResponse);
    rpc ListNotifications(ListNotificationsRequest) returns (ListNotificationsResponse);
}

// Request/Response: <RPC>Request, <RPC>Response
// Fields: snake_case, IDs as string (UUIDs)
// Pagination: int32 limit + int32 offset in request, int32 total in response
// Timestamps: google.protobuf.Timestamp
// Metadata: map<string, string>
// Enums as string fields (not proto enums) for flexibility
```

---

## 4 · Architecture Guidelines

### 4.1 Adding a New Feature

1. **Proto first**: Define the gRPC contract in `packages/proto/<domain>/v1/`.
2. **Entity**: Add domain entity in `internal/domain/entity/`.
3. **Repository interface**: Define in `internal/domain/repository/`.
4. **Use case**: Implement business logic in `internal/usecase/` — inject repos + external interfaces.
5. **PostgreSQL repo**: Implement the interface in `internal/infra/postgres/`.
6. **gRPC handler**: Wire in `internal/delivery/grpc/` — keep thin.
7. **Migration**: Add SQL in `infra/migrations/NNN_description.up.sql`.
8. **Gateway**: Add the GraphQL type/resolver or REST endpoint in `gateway/graphql-bff/`.
9. **Frontend**: Add API route → data layer → hook → component.
10. **Tests**: Unit test the use case, integration test the Postgres repo if complex.
11. **Events**: Publish domain events for cross-service consumption.

### 4.2 Service Boundaries

```
[Frontend] ──HTTP──→ [Gateway :4000] ──gRPC──→ [Backend Service :500XX]
                                                       │
                                                       ├── [PostgreSQL] (source of truth)
                                                       ├── [Redis] (events, caching)
                                                       └── [MinIO] (files)
```

- **Gateway** aggregates; services own their domain data.
- **Policy service** is the mandatory gatekeeper — ALL communication must pass through it.
- **Worker service** processes background jobs from Redis Streams.
- **Event flow**: service publishes → Redis Stream → worker/consumer processes.

### 4.3 Cross-Cutting Concerns

| Concern | Implementation | Package |
|---------|---------------|---------|
| Auth/JWT | HS256 tokens, 15min access, 7d refresh | `cornerstone/auth/jwt` |
| RBAC | 5 roles, 30+ permissions, gRPC interceptor | `cornerstone/auth/rbac` |
| Context | `x-request-id`, `x-user-id`, `x-service-provider-id`, `x-role` | `cornerstone/auth/requestctx` |
| Logging | Zap structured JSON, `[service]` prefix | `cornerstone/logging` |
| Tracing | OpenTelemetry spans on every RPC + DB call | `cornerstone/tracing` |
| Metrics | OTel counters + histograms | `cornerstone/metrics` |
| Encryption | AES-256-GCM for PII, SHA-256 for searchable hashes | `cornerstone/crypto` |
| Tenant isolation | PostgreSQL RLS via `SET LOCAL app.current_sp_id` | `cornerstone/tenant` |
| Webhook signing | HMAC-SHA256 with timestamp | `cornerstone/webhook` |

### 4.4 Event-Driven Architecture

```go
// 25+ domain event types defined in cornerstone/events:
// notification.created, notification.delivered, notification.read
// callback.requested, callback.approved, callback.rejected
// bot.action.executed, campaign.launched, webhook.delivery.failed
// team.member.invited, service_provider.created, ...

// Publishing pattern:
evt := events.NewEvent(events.NotificationDelivered, payload).
    WithEntity(notifID).WithUser(userID).WithServiceProvider(spID).WithTrace(traceID)
publisher.Publish(ctx, evt)

// Consuming pattern (worker-service):
consumer := events.NewRedisStreamConsumer(rdb, log, "trustinbox:events", "workers", "worker-1")
consumer.Start(ctx, handler.Handle)
```

### 4.5 Real-Time Notification Architecture

The gateway hosts two SSE event subscribers that bridge Redis Pub/Sub domain events to connected frontend clients:

| Subscriber | Target | SSE Event Name | Scope |
|-----------|--------|---------------|-------|
| `startProviderEventSubscriber` | Provider portal (`apps/provider/`) | Domain-specific (e.g., `callback_created`, `notification_delivered`) | Service Provider (SP-scoped via `sendToSP()`) |
| `startConsumerEventSubscriber` | Web app (`apps/web/`) | `notification` (single event name) | User (user-scoped via `send()`) |

**Provider Subscriber Flow:**
```
Redis Pub/Sub → sseEventMap (17 domain→SSE mappings) → hub.sendToSP(spID) + hub.send(userID)
```

**Consumer Subscriber Flow:**
```
Redis Pub/Sub → consumerEventLabels (7 event types) → DND check → sound pref check → hub.send(userID, "notification", enrichedPayload)
```

**DND-Aware Delivery:**
- Gateway checks GLOBAL DND rules (`dnd_rules` table) and sound preference (`privacy_preferences.notification_sound_enabled`)
- Enriches SSE payload with `suppressed: bool` and `soundEnabled: bool` flags
- Web app respects these flags: suppressed → no toast/sound (still in dropdown); soundEnabled=false → no sound only
- Per-category/per-SP DND is enforced at notification creation time by the policy service

**Key Events (Consumer-Facing):**
`notification.created`, `notification.delivered`, `callback.approved`, `callback.rejected`, `callback.expired`, `message.sent`, `document.shared`

**Frontend Hooks:**
- Provider: `NotificationProvider` + `NotificationBell` (single SSE connection, `useSSE()` hook)
- Web app: `NotificationProvider` (SSE via EventSource, `notification` / `chat_message` / `presence_update` listeners)

---

## 5 · AI Behavior Rules

### ALWAYS

- **Follow existing patterns** — examine nearby files before writing new code.
- **Reuse existing utilities** — check `packages/cornerstone/` (Go) and `src/lib/` (TS) first.
- **Use the established layer structure** — entity → repository → usecase → delivery.
- **Use typed business errors** from `cornerstone/errors` — never raw errors in business code.
- **Start tracing spans** in every usecase method.
- **Use structured logging** with `zap.String()`, `zap.Error()`, `zap.Int()` — never `fmt.Sprintf`.
- **Use semantic Tailwind tokens** — `bg-bg-card`, `text-text-primary` — never raw hex.
- **Use named exports** for React components, `interface` for props.
- **Check for existing hooks** in `src/lib/hooks/` and `src/lib/graphql/` before creating new ones.
- **Propagate context** through all Go function calls.
- **Use parameterized SQL** — `$1`, `$2` — never string interpolation.

### NEVER

- **Never introduce new frameworks** without explicit approval (no ORM, no new CSS framework, no new state library).
- **Never put business logic** in gRPC handlers, GraphQL resolvers, or API route handlers.
- **Never use `export default`** for React components (only for `page.tsx` / `layout.tsx`).
- **Never use CSS modules** or `styled-components` — Tailwind utility classes only.
- **Never use `localStorage`** for auth in the provider app — it uses httpOnly cookies.
- **Never create a new service** without defining its proto contract first.
- **Never bypass the policy service** for communication or callback flows.
- **Never use `panic()`** or `log.Fatal()` in business/usecase code.
- **Never generate random placeholder code** — always use the real patterns from the codebase.
- **Never add dependencies** to `go.mod` or `package.json` without explicit need.
- **Never use `any`** type in TypeScript — use proper interfaces or generics.
- **Never swallow errors silently** — always return, log, or handle them.

---

## 6 · Database Rules

### Schema Standards

```sql
-- ALWAYS: UUID primary keys with auto-generation
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()

-- ALWAYS: Timestamps on every table
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

-- ALWAYS: Foreign keys with descriptive names
CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE

-- ALWAYS: Indexes for foreign keys and high-read paths
CREATE INDEX idx_notifications_user_id_status ON notifications(user_id, status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
```

### Data Types

| Use Case | Type | Example |
|----------|------|---------|
| IDs | `UUID` | `id UUID PRIMARY KEY DEFAULT uuid_generate_v4()` |
| Short strings | `VARCHAR(N)` | `name VARCHAR(255)`, `status VARCHAR(50)` |
| Long text | `TEXT` | `body TEXT NOT NULL` |
| Booleans | `BOOLEAN NOT NULL DEFAULT` | `is_allowed BOOLEAN NOT NULL DEFAULT TRUE` |
| Timestamps | `TIMESTAMPTZ` | `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` |
| JSON data | `JSONB` | `metadata JSONB NOT NULL DEFAULT '{}'` |
| Arrays | `TEXT[]`, `INT[]` | `supported_languages TEXT[] DEFAULT '{}'` |
| Scores | `NUMERIC(5,2)` | `spam_score NUMERIC(5,2) NOT NULL DEFAULT 0` |

### Migration Rules

- Sequential numbering: `001`, `002`, ..., `018`.
- Always provide both `.up.sql` and `.down.sql`.
- Never modify existing migrations — create a new one.
- Keep business logic out of SQL — use application-level validation.
- Extensions: `uuid-ossp`, `pgcrypto`.
- Run via: `make migrate` (psql against localhost).

---

## 7 · Observability & Logging

### Tracing

```go
// EVERY usecase method MUST start a span:
ctx, span := tracing.StartSpan(ctx, "bot-service", "BotUseCase.ExecuteAction",
    attribute.String("bot_id", botID),
    attribute.String("tool_name", toolName),
)
defer span.End()

// DB queries get their own spans:
tracing.TraceDBQuery(ctx, "notification-service", "GetByID", query)

// Business attributes for filtering in Jaeger:
// trustinbox.tenant_id, trustinbox.user_id, trustinbox.service_provider_id,
// trustinbox.bot_id, trustinbox.notification_id, trustinbox.policy_decision
```

### Logging

```go
// Structured JSON via Zap — ALWAYS use typed fields:
log.Info("notification delivered",
    zap.String("notification_id", id),
    zap.String("user_id", userID),
    zap.String("channel", channel),
    zap.Int("duration_ms", elapsed),
)
log.Error("delivery failed", zap.Error(err), zap.String("notification_id", id))

// Frontend structured logging:
// [provider-ui] prefix, levels: debug/info/warn/error
// Configurable via NEXT_PUBLIC_LOG_LEVEL
```

### Metrics

```go
// OTel counters emitted by cornerstone/metrics:
// trustinbox.notifications.{sent,delivered,read,rejected}
// trustinbox.callbacks.{requested,approved,rejected}
// trustinbox.policy.{evaluations,denials}
// trustinbox.bot.{actions,escalations}
// trustinbox.webhooks.{deliveries,failures}
// trustinbox.request.duration (histogram)
```

### Observability Stack

| Tool | Port | Purpose |
|------|------|---------|
| Jaeger | 16686 | Distributed tracing UI |
| Prometheus | 9091 | Metrics scraping |
| Grafana | 3100 | Dashboard visualization |
| OTel Collector | 4317/4318 | Telemetry aggregation |

---

## 8 · Testing Guidelines

### Unit Tests (Use Cases)

```go
// Location: services/<svc>/internal/usecase/<name>_test.go
// Naming: TestMethodName_Scenario
// Logger: zap.NewNop()
// Context: context.Background()
// Assertions: t.Fatalf / t.Errorf (standard library — no testify)
// Mocks: hand-written in-memory implementations — no codegen

func TestCreateBot_Success(t *testing.T) {
    uc := newTestUseCase(
        newMockBotRepo(), newMockConfigRepo(), ...,
        &mockPolicyChecker{}, &mockPublisher{},
    )
    bot, err := uc.Create(context.Background(), ...)
    if err != nil {
        t.Fatalf("unexpected error: %v", err)
    }
    if bot.Name != "TestBot" {
        t.Errorf("expected name TestBot, got %s", bot.Name)
    }
}
```

### Mock Pattern

```go
// Hand-written mocks implementing repository interfaces:
type mockBotRepo struct {
    bots map[string]*entity.Bot
}
func newMockBotRepo() *mockBotRepo { return &mockBotRepo{bots: map[string]*entity.Bot{}} }
func (m *mockBotRepo) Create(_ context.Context, bot *entity.Bot) error { m.bots[bot.ID] = bot; return nil }
func (m *mockBotRepo) GetByID(_ context.Context, id string) (*entity.Bot, error) { ... }

// Interface compliance verification:
var _ repository.BotRepository = (*mockBotRepo)(nil)
```

### Test Fixtures (Builder Pattern)

```go
// Location: services/<svc>/internal/testfixtures/
fixtures := testfixtures.NewBotBuilder().
    WithID("bot-test-001").
    WithName("Support Bot").
    WithStatus(entity.BotStatusActive).
    Build()
```

### Integration Tests

```go
// Location: services/<svc>/internal/infra/postgres/integration_test.go
// Tests against real PostgreSQL — use build tag or skip in CI
// Verify SQL queries, constraints, and edge cases
```

### Frontend Tests (Provider App)

```
# Runner: Vitest + Testing Library + jsdom
# Location: apps/provider/src/__tests__/
# Structure:
#   components/ — component rendering tests
#   hooks/ — hook behavior tests
#   unit/ — pure function tests
#   integration/ — multi-component flow tests
# E2E: Playwright in apps/provider/e2e/
# Commands: npm test, npm run test:watch, npm run test:coverage, npm run test:e2e
```

---

## 9 · Development Environment

### Prerequisites

- Go 1.24+, Node.js 18+, Docker, protoc, buf
- `make install-tools` — installs Go tools (gqlgen, protoc-gen-go, golangci-lint)
- `make install-provider` — installs npm dependencies

### Quick Start

```bash
make up-infra          # Start Postgres, Redis, MinIO, Jaeger, etc.
./scripts/dev.sh       # Start ALL services + gateway + frontend apps

# Or individually:
make dev-gateway       # Gateway only (:4000)
make dev-provider      # Provider UI only (:6060)
make dev-web           # Web app only (:3000)
make dev-service SVC=bot-service  # Single service
```

### Environment Variables

```bash
# .env at repo root (loaded by dev.sh and docker-compose)
DATABASE_URL=postgres://trustinbox:trustinbox_dev@localhost:5432/trustinbox?sslmode=disable
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-production
GRPC_PORT=50051       # Default — overridden per service in dev.sh
LOG_LEVEL=info
OPENAI_API_KEY=...    # For ai-service LLM integration

# Per-service addresses (used by gateway and cross-service clients):
AUTH_SERVICE_ADDR=localhost:50051
USER_SERVICE_ADDR=localhost:50052
POLICY_SERVICE_ADDR=localhost:50053
ORG_SERVICE_ADDR=localhost:50054
NOTIFICATION_SERVICE_ADDR=localhost:50055
COMMUNICATION_SERVICE_ADDR=localhost:50056
AI_SERVICE_ADDR=localhost:50057
BOT_SERVICE_ADDR=localhost:50059
WEBHOOK_SERVICE_ADDR=localhost:50060
ANALYTICS_SERVICE_ADDR=localhost:50061

# Frontend:
GATEWAY_URL=http://localhost:4000
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_LOG_LEVEL=info
```

### Key Make Targets

| Target | Purpose |
|--------|---------|
| `make up-infra` | Docker infra (Postgres, Redis, MinIO, OTel) |
| `make down` | Stop all containers |
| `make test` | Run all Go tests |
| `make test-service SVC=bot-service` | Run tests for one service |
| `make proto` | Regenerate proto stubs |
| `make gqlgen` | Regenerate GraphQL resolvers |
| `make migrate` | Run database migrations |
| `make seed` | Seed development data |
| `make lint` | golangci-lint for Go |
| `make build` | Build all Go services to `bin/` |
| `make clean` | Remove build artifacts |

---

## 10 · Security Rules

### Authentication & Authorization

- **JWT HS256** tokens with 15-minute access and 7-day refresh rotation.
- **5 RBAC roles**: `PLATFORM_ADMIN` > `SP_ADMIN` > `AGENT` > `ANALYST` > `CUSTOMER`.
- **30+ granular permissions** enforced at gRPC level via interceptor.
- Provider portal uses **httpOnly cookies** — never localStorage.
- Web app currently uses localStorage (legacy — migrate to cookies when upgrading to Next.js 15).

### Data Protection

- **AES-256-GCM encryption** for PII fields (phone, email) via `cornerstone/crypto`.
- **SHA-256 hash indexes** for searchable encrypted fields.
- **Tenant isolation** via PostgreSQL Row-Level Security (`SET LOCAL app.current_sp_id`).
- **Never expose real phone numbers** to service providers — use virtual IDs.
- **Presigned URLs** for all document access (MinIO) — never direct S3 paths.
- **HMAC-SHA256 signing** for webhook payloads with timestamp verification.

### Input Validation

- **Validate at system boundaries** — gRPC handlers and API routes.
- **Parameterized SQL only** — never interpolate user input into queries.
- **UUID format validation** before passing to database queries.
- **Sanitize all user input** before storage — especially for JSONB fields.
- **Rate limiting** on API endpoints (configured in gateway middleware).

### Secrets Management

- All secrets via environment variables — never hardcoded.
- `.env` file is `.gitignore`d — `.env.example` provided as template.
- JWT secret, encryption master key, API keys — all env-driven.
- Production: use proper secrets manager (Vault, AWS Secrets Manager).

---

## 11 · Performance Guidelines

### Database

- **Avoid N+1 queries** — use JOINs or batch subqueries for related data.
- **Use indexes** on all foreign keys and high-read path columns.
- **Pagination** — always `LIMIT $N OFFSET $M`, never unbounded selects.
- **Count queries** — use `COUNT(*) OVER()` window function or separate count query.
- **Connection pooling** — use `sql.DB` defaults, tune `SetMaxOpenConns` for production.
- **Use `TIMESTAMPTZ`** — never `TIMESTAMP` without timezone.

### Backend

- **gRPC deadlines** — set appropriate timeouts (5s for standard, 30s for AI/LLM calls).
- **Context cancellation** — respect `ctx.Done()` in long-running operations.
- **Event publishing** — fire-and-forget for non-critical events; Redis Streams for durable delivery.
- **Background processing** — offload heavy work to worker-service via Redis Streams.
- **Connection reuse** — gRPC client connections are long-lived, don't create per-request.

### Frontend

- **Server Components** — prefer async Server Components with Suspense for initial data loading.
- **Streaming SSR** — use `<Suspense>` boundaries to unblock rendering.
- **Image optimization** — use `OptimizedImage` component with lazy loading.
- **Virtual lists** — use `VirtualList` component for large data sets.
- **Debounce** — debounce search inputs and filter changes.
- **Web Vitals** — monitor LCP, FID, CLS, FCP, TTFB, INP via `usePerformanceMonitor()`.

---

## 12 · Command Patterns for Copilot

When asked to perform tasks, interpret these patterns:

### Feature Development

```
#FEATURE:CREATE:<ServiceName>
→ Create proto → entity → repository → usecase → handler → migration → gateway → frontend

#FEATURE:ADD_ENDPOINT:<ServiceName>:<RPCName>
→ Add RPC to proto → implement handler → wire in service → add gateway route

#FEATURE:ADD_PAGE:<AppName>:<RoutePath>
→ Create page.tsx → add components → add data fetching → add API route
```

### Bug Fixes

```
#BUG:FIX:<ServiceName>:<Description>
→ Identify root cause → fix in correct layer → add test → verify

#BUG:FIX:FRONTEND:<PageName>:<Description>
→ Check component → check hook → check API route → fix → test
```

### Refactoring

```
#REFACTOR:EXTRACT:<Target>
→ Extract into appropriate layer, maintain interfaces, update consumers

#REFACTOR:OPTIMIZE_QUERY:<ServiceName>:<QueryName>
→ Analyze query plan → add indexes → rewrite query → benchmark
```

### Infrastructure

```
#INFRA:ADD_MIGRATION:<Description>
→ Create NNN_description.up.sql + .down.sql in infra/migrations/

#INFRA:ADD_EVENT:<EventType>
→ Add to cornerstone/events → publish in service → consume in worker
```

---

## 13 · DO & DON'T Summary

### DO

- Follow the existing directory structure and layer separation
- Use `packages/cornerstone/` for all cross-cutting Go concerns
- Use `src/lib/` for all shared frontend utilities
- Write unit tests for every usecase method
- Use fluent test builders in `testfixtures/`
- Start tracing spans in every usecase method
- Use typed business errors from `cornerstone/errors`
- Propagate context (`x-request-id`, `x-user-id`, `x-service-provider-id`)
- Use semantic Tailwind tokens for all styling
- Publish domain events for important state changes
- Add database indexes for new foreign keys and filter columns
- Keep gRPC handlers and GraphQL resolvers thin
- Use `mapError()` for error translation at delivery boundaries
- Validate UUIDs before database queries
- Use `gatewayFetch()` for server-side data fetching in the provider app
- Use `useData()` hook for client-side data fetching in the provider app

### DON'T

- Don't put business logic in handlers, resolvers, or API routes
- Don't bypass the policy service for any communication flow
- Don't use an ORM — raw parameterized SQL with `database/sql`
- Don't use `panic()` or `log.Fatal()` in business code
- Don't use `export default` for React components
- Don't use CSS modules, styled-components, or raw hex colors
- Don't use `localStorage` for auth tokens in the provider app
- Don't use `any` type in TypeScript
- Don't use `fmt.Sprintf` for log messages — use `zap.String()` etc.
- Don't create new `go.mod` files — add to `go.work` if needed
- Don't modify existing database migrations — create new ones
- Don't add npm/Go dependencies without explicit need
- Don't duplicate logic that already exists in shared packages
- Don't skip error handling — every error must be returned, logged, or intentionally discarded with comment
- Don't use string concatenation in SQL queries

---

## 14 · Frontend App Reference

| Label | Path | Port | Stack | Auth | Data Fetching |
|-------|------|------|-------|------|---------------|
| `[provider-ui]` | `apps/provider/` | 6060 | Next.js 15, React 19 | httpOnly cookies | `useData()` + API routes |
| `[web-app]` | `apps/web/` | 3000 | Next.js 14, React 18 | localStorage | Apollo Client |
| `[admin]` | `apps/admin/` | 3001 | Next.js 14, React 18 | TBD | Apollo Client |

### Provider Portal Color System

```
Backgrounds:  bg-bg-primary (#0b0d0f) · bg-bg-secondary (#111418) · bg-bg-card (#151820)
              bg-bg-elevated (#1c2028) · bg-bg-hover (#1e2228) · bg-bg-input (#0d1017)
Text:         text-text-primary (#e4e7eb) · text-text-secondary (#8b929a) · text-text-muted (#545b65)
Borders:      border-border-primary (#1e2228) · border-border-secondary (#2a2f38)
Accents:      accent-blue (#3b82f6) · accent-green (#22c55e) · accent-red (#ef4444)
              accent-orange (#f59e0b) · accent-purple (#a855f7) · accent-cyan (#06b6d4)
Status:       status-success (#22c55e) · status-warning (#f59e0b) · status-error (#ef4444)
Fonts:        Inter (sans) · JetBrains Mono (mono)
```

### RBAC Roles & Key Permissions

| Role | Key Permissions |
|------|----------------|
| `PLATFORM_ADMIN` | All permissions including `platform.admin` |
| `SP_ADMIN` | Team management, settings, all SP operations |
| `AGENT` | Notifications, callbacks, conversations, customers |
| `ANALYST` | Analytics, compliance, read-only views |
| `CUSTOMER` | Own inbox, preferences, DND, availability |

---

## 15 · Product Rules (Non-Negotiable)

1. **Users control communication** — organizations can only contact users through policy-approved channels.
2. **Policy engine is mandatory** — every notification, callback, and campaign MUST pass policy evaluation.
3. **Three categories**: Personal, Service Provider, Advertisement — advertisements are opt-in or heavily restricted.
4. **Callbacks require approval** — unless the user's policy explicitly allows direct calls.
5. **Verified organizations only** — unverified service providers cannot send communications.
6. **Privacy by design** — real phone numbers never exposed; PII encrypted at rest; audit trails for all admin actions.
7. **DND enforcement** — communications blocked during user-defined Do Not Disturb windows.
8. **Spam protection** — spam scores tracked, ad caps enforced, block/report mechanisms available.
9. **One Manager AI bot per service provider** — every service provider has **exactly one** bot with `agent_type = 'MANAGER'`. The Manager is the only AI surface exposed to consumer apps (`apps/web/`, `apps/hybrid-app/`); all other bots (`CUSTOMER_SERVICE`, `APPOINTMENT_SCHEDULING`, `PAYMENT`, `ORDER_ACCEPTING`, `PRODUCT_SHOWCASE`, `DOCUMENTATION_WRITER`, `GENERAL`, …) are **sub-agents** and MUST set `manager_bot_id` to that Manager's id.
   - **Provider portal** (`apps/provider/`) — manages all bots (Manager + sub-agents) via the AI Studio.
   - **Web app + Hybrid app** — list/chat/handoff surfaces MUST only show the SP's Manager bot. Sub-agents are reachable only via Manager-driven delegation (capped at depth 3) on the backend.
   - **Gateway/services** — when resolving "the SP's bot" for a consumer surface, always select `WHERE service_provider_id = $1 AND agent_type = 'MANAGER' AND status = 'ACTIVE'` and never expose sub-agent IDs in consumer-facing payloads.
   - **Provisioning** — `bot-service.ProvisionAgentSuite` creates the Manager and its sub-agents atomically; uniqueness of the Manager per SP is enforced at the data layer.
