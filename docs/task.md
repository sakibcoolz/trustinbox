# TrustInbox — Development Checklist

> Master tracking document for the full enterprise architecture expansion.
> Mark items with `[x]` when complete. Sub-items track individual deliverables.

---

## Phase 1: Foundation Hardening

- [x] **1.1 Terminology Normalization**
  - [x] Rename `organization` → `service_provider` across Go services
  - [x] Update proto definitions with unified naming
  - [x] Update gateway resolvers and REST routes
  - [x] Update frontend references (web, admin, provider)
  - [x] Migration to rename existing DB columns/tables

- [x] **1.2 Complete gRPC Handler Wiring**
  - [x] `auth-service` delivery/grpc/handler.go
  - [x] `user-service` delivery/grpc/handler.go
  - [x] `policy-service` delivery/grpc/handler.go
  - [x] `notification-service` delivery/grpc/handler.go
  - [x] `communication-service` delivery/grpc/handler.go
  - [x] `organization-service` delivery/grpc/handler.go
  - [x] Register handlers in each `main.go` (after proto gen)
  - [x] Run `make proto` to generate Go code from proto files
  - [x] Run `go mod tidy` in each service

- [x] **1.3 Gateway → gRPC Migration**
  - [x] Replace direct DB queries in gateway with gRPC calls
  - [x] Wire gateway to auth-service via gRPC
  - [x] Wire gateway to user-service via gRPC
  - [x] Wire gateway to policy-service via gRPC
  - [x] Wire gateway to notification-service via gRPC
  - [x] Wire gateway to communication-service via gRPC
  - [x] Wire gateway to organization-service via gRPC
  - [x] Wire gateway to bot-service via gRPC
  - [x] Wire gateway to webhook-service via gRPC
  - [x] Wire gateway to analytics-service via gRPC

- [x] **1.4 Worker Service Implementation**
  - [x] DeliveryProcessor (notification delivery jobs)
  - [x] CallbackReminderProcessor (reminder + expiry jobs)
  - [x] CampaignSendProcessor (campaign target fan-out)
  - [x] CleanupProcessor (expired tokens, old logs)
  - [x] Queue consumer integration (Redis Streams)

- [x] **1.5 Event Bus Foundation**
  - [x] Event envelope and interfaces (`packages/cornerstone/events/event.go`)
  - [x] Redis Pub/Sub adapter (`packages/cornerstone/events/redis.go`)
  - [x] Redis Streams adapter (durable delivery)
  - [x] 25+ domain event type constants

---

## Phase 2: New Domain Entities & Database

- [x] **2.1 Migration 011 — Industry Profiles**
  - [x] `industry_profiles` table with JSONB columns
  - [x] Seed 5 industry profiles (banking, healthcare, real estate, hospitality, logistics)

- [x] **2.2 Migration 012 — AI Bot Studio**
  - [x] `bots` table
  - [x] `bot_configurations` table
  - [x] `bot_permissions` table
  - [x] `bot_knowledge_sources` table
  - [x] `bot_action_logs` table
  - [x] `bot_analytics` table

- [x] **2.3 Migration 013 — Webhooks & Integrations**
  - [x] `webhook_subscriptions` table with GIN index on events
  - [x] `webhook_deliveries` table with retry tracking
  - [x] `api_keys` table (key_hash, scopes, rate_limit)
  - [x] `service_accounts` table (client_id, client_secret_hash)

- [x] **2.4 Migration 014 — Customer Relations & Campaign Targets**
  - [x] `customer_sp_relations` table
  - [x] `campaign_targets` table

- [x] **2.5 Migration 015 — Tenant Model**
  - [x] `tenants` table
  - [x] `tenant_id` FK on `service_providers`
  - [x] `analytics_daily` aggregation table
  - [x] Default tenant seed

---

## Phase 3: New Backend Services

- [x] **3.1 Bot Service (`services/bot-service`, port 50059)**
  - [x] go.mod with cornerstone replace directive
  - [x] cmd/server/main.go (gRPC skeleton)
  - [x] Domain entities (Bot, BotConfiguration, BotPermission, KnowledgeSource, BotActionLog, BotAnalytics)
  - [x] Repository interfaces (6 repositories)
  - [x] BotUseCase (CRUD + policy-gated ExecuteAction + knowledge + analytics)
  - [x] PostgreSQL repository implementations
  - [x] gRPC delivery handler

- [x] **3.2 Webhook Service (`services/webhook-service`, port 50060)**
  - [x] go.mod with cornerstone replace directive
  - [x] cmd/server/main.go (gRPC skeleton)
  - [x] Domain entities (WebhookSubscription, WebhookDelivery)
  - [x] Repository interfaces
  - [x] WebhookUseCase (subscription CRUD + event dispatch + retry)
  - [x] PostgreSQL repository implementations
  - [x] HTTP delivery worker (POST to subscriber URLs with HMAC signing)
  - [x] Event consumer goroutine (Redis Streams → match subscriptions)
  - [x] gRPC delivery handler (pending proto gen)

- [x] **3.3 Analytics Service (`services/analytics-service`, port 50061)**
  - [x] go.mod with cornerstone replace directive
  - [x] cmd/server/main.go (gRPC skeleton)
  - [x] Domain entities (DashboardStats, DailyAnalytics, notification/callback/campaign/bot analytics)
  - [x] Repository interface
  - [x] AnalyticsUseCase (dashboard + daily + domain-specific queries)
  - [x] PostgreSQL repository implementations
  - [x] Event consumer goroutine (aggregate events into analytics_daily)
  - [x] gRPC delivery handler (pending proto gen)

- [x] **3.4 Document Service Enhancement**
  - [x] Presigned URL generation for secure downloads
  - [x] Document classification support
  - [x] Version tracking

- [x] **3.5 Industry Profile Service**
  - [x] Proto definition (`packages/proto/industry/v1/industry.proto`)
  - [x] UseCase layer (CRUD + seed data retrieval)
  - [x] gRPC handler
  - [x] Repository implementation

- [x] **3.6 AI Orchestration Layer**
  - [x] LLM integration abstraction (OpenAI/Anthropic)
  - [x] Tool execution framework for bot actions
  - [x] Knowledge source RAG pipeline
  - [x] Conversation summarization
  - [x] Smart categorization
  - [x] Spam detection model integration

---

## Phase 4: Event-Driven Architecture

- [x] **4.1 Event Catalog Definition**
  - [x] 25+ event types defined in `packages/cornerstone/events/event.go`

- [x] **4.2 Event Publishing Integration**
  - [x] Add EventPublisher to policy-service UseCases
  - [x] Add EventPublisher to notification-service UseCases
  - [x] Add EventPublisher to communication-service UseCases
  - [x] Add EventPublisher to organization-service UseCases
  - [x] Add EventPublisher to bot-service UseCases
  - [x] Add EventPublisher to auth-service UseCases

- [x] **4.3 Event Consumers**
  - [x] Worker service consumes delivery + campaign + cleanup events
  - [x] Webhook service consumes all subscribed events
  - [x] Analytics service consumes events for aggregation
  - [x] Notification service consumes events for real-time push

---

## Phase 5: API Layer Expansion

- [x] **5.1 GraphQL Schema Enhancement**
  - [x] Bot types and mutations
  - [x] Industry profile queries
  - [x] Webhook subscription CRUD mutations
  - [x] API key management mutations
  - [x] Campaign CRUD with policy preview
  - [x] Analytics queries
  - [x] Provider-specific real-time subscriptions

- [x] **5.2 Proto Definitions**
  - [x] `packages/proto/bot/v1/bot.proto` (14 RPCs)
  - [x] `packages/proto/webhook/v1/webhook.proto` (8 RPCs)
  - [x] `packages/proto/analytics/v1/analytics.proto` (5 RPCs)
  - [x] `packages/proto/industry/v1/industry.proto` (4 RPCs)
  - [x] Run `make proto` to generate Go code

- [x] **5.3 REST/OpenAPI for Provider Integrations**
  - [x] `/api/v1/notifications` endpoints
  - [x] `/api/v1/callbacks` endpoints
  - [x] `/api/v1/messages` endpoints
  - [x] `/api/v1/documents` endpoints
  - [x] `/api/v1/campaigns` endpoints
  - [x] `/api/v1/webhooks` endpoints
  - [x] `/api/v1/bots` endpoints
  - [x] OpenAPI 3.1 spec (`docs/api/openapi.yaml`)
  - [x] API key authentication middleware
  - [x] Rate limiting (token bucket per API key)

---

## Phase 6: Service Provider Portal (`apps/provider`)

- [x] **6.1 Provider App Setup**
  - [x] package.json, tsconfig.json, tailwind.config.js, next.config.js
  - [x] VS Code dark design system (matching web app)
  - [x] Root layout with sidebar navigation

- [x] **6.2 Skeleton Pages**
  - [x] `/` — Dashboard (KPI cards, charts placeholder, activity feed)
  - [x] `/bots` — Bot list with status filters and bot cards
  - [x] `/webhooks` — Webhook subscription table
  - [x] `/analytics` — Analytics summary + drill-down sections
  - [x] `/campaigns` — Campaign list with status and metrics
  - [x] `/customers` — Customer table with relationship filters
  - [x] `/settings` — Org profile, API keys, defaults

- [x] **6.3 Full Provider Portal Routes (remaining)**
  - [x] `/auth/login` — SP user login
  - [x] `/auth/register` — SP onboarding + org creation
  - [x] `/customers/[virtualId]` — Customer detail view
  - [x] `/notifications` — Notification center (compose + history)
  - [x] `/notifications/compose` — Notification composer
  - [x] `/conversations` — Conversation center with bot assist
  - [x] `/conversations/[id]` — Conversation detail
  - [x] `/callbacks` — Callback center (pending, approved, missed)
  - [x] `/documents` — Document center (upload, share, audit)
  - [x] `/campaigns/[id]` — Campaign detail
  - [x] `/campaigns/new` — Campaign builder wizard
  - [x] `/bots/[id]` — Bot detail/config editor
  - [x] `/bots/new` — Bot creator wizard
  - [x] `/bots/[id]/knowledge` — Knowledge source manager
  - [x] `/bots/[id]/analytics` — Bot performance dashboard
  - [x] `/compliance` — Compliance center (policy logs, audit, spam)
  - [x] `/integrations` — Integration center (API keys, webhooks, service accounts)
  - [x] `/settings/team` — Agent/team management
  - [x] `/settings/industry` — Industry profile configuration

- [x] **6.4 Key Provider UI Components**
  - [x] DashboardSummary — live stat cards connected to analytics API
  - [x] CustomerLookup — search by virtual ID + consent summary
  - [x] NotificationComposer — category, priority, channel, template, schedule, policy preview
  - [x] ConversationPanel — chat + bot assist toggle + handoff button
  - [x] CallbackRequestTable — filterable + approve/reject/reschedule actions
  - [x] DocumentManager — upload, classify, share, version, audit trail
  - [x] CampaignBuilder — segment, schedule, preview policy impact, launch
  - [x] BotStudioWizard — multi-step bot creation
  - [x] BotConfigEditor — structured settings form
  - [x] ComplianceViewer — policy decision log + audit log + export
  - [x] WebhookManager — subscription CRUD + delivery history + test
  - [x] APIKeyManager — create/revoke keys + view scopes
  - [x] TeamManager — invite users + assign roles + manage permissions

---

## Phase 7: Customer App Completion (`apps/web`)

- [x] **7.1 Settings Pages**
  - [x] Privacy preferences form (7 toggles → GraphQL mutation)
  - [x] DND rule manager (create/edit/delete + day/time picker)
  - [x] Availability slot manager (weekly calendar view)
  - [x] Blocked organizations list with unblock action

- [x] **7.2 Callback Request Center**
  - [x] Wire callback-request-list to GraphQL queries
  - [x] Approve/reject mutations with slot picker
  - [x] Status badges and timeline

- [x] **7.3 Service Provider Directory**
  - [x] Search/browse verified providers
  - [x] View provider profile (industry, trust score, policy)
  - [x] Block/unblock provider
  - [x] View relationship history

- [x] **7.4 Document Center**
  - [x] List received documents with share context
  - [x] Secure document viewer (presigned URLs)
  - [x] Download tracking

- [x] **7.5 AI Summary Widget**
  - [x] Dashboard conversation summaries
  - [x] Notification digest (daily/weekly)
  - [x] Smart categorization badges

---

## Phase 8: Security Hardening

- [x] **8.1 RBAC Enhancement**
  - [x] 5 roles defined (PLATFORM_ADMIN, SP_ADMIN, AGENT, ANALYST, CUSTOMER)
  - [x] 25+ granular permissions
  - [x] gRPC interceptor for RBAC enforcement
  - [x] Gateway resolver-level RBAC middleware

- [x] **8.2 Tenant Isolation**
  - [x] Row-level security policies in PostgreSQL
  - [x] service_provider_id check in all repository queries
  - [x] Gateway context propagation for tenant scope

- [x] **8.3 Field Encryption**
  - [x] AES-256-GCM encryption in `packages/cornerstone/crypto/`
  - [x] HashField for deterministic search indexing
  - [x] Integrate encryption into user-service for PII fields
  - [x] Key management via env-injected master key

- [x] **8.4 API Security**
  - [x] HMAC-SHA256 webhook signing (`packages/cornerstone/webhook/signing.go`)
  - [x] API key authentication middleware
  - [x] Rate limiting (100 req/min per API key)
  - [x] Signed URLs for document downloads (15-min expiry)
  - [x] CORS configuration

- [x] **8.5 Bot Authorization**
  - [x] Bot tool permission system (allow/deny per tool)
  - [x] Policy evaluation gate on every bot action
  - [x] Audit log for every bot action
  - [x] Verify bot cannot bypass DND, consent, or block rules (integration test)

---

## Phase 9: Observability & Testing

- [x] **9.1 Metrics Layer**
  - [x] OTel metrics recorder (`packages/cornerstone/metrics/metrics.go`)
  - [x] 17 named counters (notifications, callbacks, campaigns, bots, webhooks, policy, spam)
  - [x] Request duration histogram + queue depth gauge
  - [x] HTTP metrics middleware
  - [x] Grafana dashboard configuration
  - [x] Prometheus scrape configuration

- [x] **9.2 Enhanced Tracing**
  - [x] OpenTelemetry tracing in cornerstone package
  - [x] Full trace propagation: GraphQL → gRPC → DB → queue → worker
  - [x] Span attributes: tenant_id, org_id, user_id, bot_id, notification_id

- [x] **9.3 Testing Strategy**
  - [x] Policy evaluator unit tests (reference implementation)
  - [x] Unit tests for bot-service use case
  - [x] Unit tests for webhook-service use case
  - [x] Unit tests for analytics-service use case
  - [x] Integration tests for DB round-trips
  - [x] E2E tests: notification delivery, callback approval, bot action
  - [x] Test fixtures/builders for domain entities
  - [x] Target: >60% coverage

---

## Phase 10: Documentation & Diagrams

- [ ] **10.1 PlantUML Sequence Diagrams**
  - [ ] Provider → notification delivery flow
  - [ ] Campaign launch with policy checks
  - [ ] Customer chat with bot + human handoff
  - [ ] Document upload and secure share
  - [ ] AI bot action execution
  - [ ] Webhook delivery flow

- [x] **10.2 Architecture Documentation**
  - [x] Service catalog updated (`docs/services/service-catalog.md`)
  - [ ] Update `docs/architecture/overview.md` with new services
  - [ ] Add `docs/architecture/event-architecture.md`
  - [ ] Add `docs/architecture/security-model.md`
  - [ ] Add `docs/api/openapi.yaml`
  - [ ] Add `docs/api/webhook-catalog.md`
  - [ ] Update ADRs with new decisions

- [ ] **10.3 Business Documentation**
  - [ ] `docs/business/industry-profiles.md`

---

## Phase 11: Deployment & Infrastructure

- [x] **11.1 Docker Compose Updates**
  - [x] Bot service container (port 50059)
  - [x] Webhook service container (port 50060)
  - [x] Analytics service container (port 50061)
  - [x] Provider app container (port 3002)
  - [x] Gateway env vars for new services

- [x] **11.2 Build System Updates**
  - [x] `go.work` updated with 3 new service modules
  - [x] Makefile build targets include new services
  - [x] Makefile proto targets include new proto dirs
  - [x] Makefile dev/build/install targets for provider app

- [ ] **11.3 Terraform Starters**
  - [ ] VPC module
  - [ ] RDS (PostgreSQL) module
  - [ ] ElastiCache (Redis) module
  - [ ] S3 bucket module
  - [ ] SQS queue module
  - [ ] ECS/EKS service definitions
  - [ ] ALB + Route53
  - [ ] CloudWatch + alarms
  - [ ] IAM roles and policies
  - [ ] Environment configs (dev, staging, production)

---

## Phase 12: Provider User Management

> Covers team/user management features within the Service Provider Portal, including
> invitation flows, role assignment, profile management, and the username system.

- [ ] **12.1 Username System & Identity**
  - [x] DB column `users.username` VARCHAR(100), UNIQUE, NOT NULL
  - [x] Username patterns defined:
    - Customers: `c/<username>` (e.g. `c/alice`, `c/bob`) — derived from email local part
    - Service Providers: `o/<slug>` (e.g. `o/acmebank`, `o/cityhospital`) — derived from org name
  - [x] `virtual_public_id` format: `TI-<first-8-chars-of-uuid>` (never exposes real identity)
  - [x] `masked_phone` field on `user_identities` (real phone never exposed to SP)
  - [ ] Username validation regex enforcement in auth-service (`^(c|o)/[a-z0-9._-]{2,50}$`)
  - [ ] Username uniqueness conflict handling (append suffix: `c/alice-2`)
  - [ ] Username change/rename flow (admin-only, audit logged)
  - [ ] Display username in provider UI header and sidebar profile

- [ ] **12.2 Team Member Invitation Flow**
  - [x] `service_provider_users` table with `(service_provider_id, user_id)` UNIQUE
  - [x] `AddServiceProviderUser` gRPC RPC in organization proto
  - [x] `OrgUseCase.AddOrgUser()` creates user with ACTIVE status
  - [ ] Email invitation endpoint (generate invite token, send email)
  - [ ] Invite acceptance page (`/auth/invite/[token]`) — register or link existing account
  - [ ] Invitation expiry (48h) + resend capability
  - [ ] Invitation status tracking (PENDING, ACCEPTED, EXPIRED, REVOKED)
  - [ ] Migration: add `invitations` table (token_hash, email, role, sp_id, status, expires_at)

- [ ] **12.3 Provider User Roles & Permissions**
  - [x] 3 SP roles defined: `SP_ADMIN`, `AGENT`, `ANALYST`
  - [x] RBAC permission matrix in `packages/cornerstone/auth/rbac/rbac.go`
  - [x] SP_ADMIN: full access (team.manage, org.settings.manage, integration.manage, etc.)
  - [x] AGENT: create/view notifications, callbacks, conversations, documents; view campaigns, bots, analytics
  - [x] ANALYST: read-only analytics, compliance, and view all entities
  - [ ] Role change mutation (SP_ADMIN only → change another user's role)
  - [ ] Role-based UI feature gating in provider app (hide menu items per role)
  - [ ] Prevent last SP_ADMIN from being demoted or removed

- [ ] **12.4 Provider `/settings/team` Page**
  - [ ] Team member list table (name, email, username `o/<slug>`, role badge, status, joined date)
  - [ ] "Invite Team Member" modal (email input + role selector: SP_ADMIN / AGENT / ANALYST)
  - [ ] Inline role change dropdown (SP_ADMIN only)
  - [ ] Remove/deactivate team member action with confirmation dialog
  - [ ] Pending invitations section (email, role, sent date, status, resend/revoke actions)
  - [ ] Activity log per user (last login, actions performed)

- [ ] **12.5 Provider User Profile Page**
  - [ ] `/settings/profile` — current SP user's own profile
  - [ ] Edit full name, avatar, timezone, language
  - [ ] Change password form (current + new + confirm)
  - [ ] View own role and permissions (read-only)
  - [ ] Session management (list active sessions, revoke)

- [ ] **12.6 SP Onboarding Flow**
  - [x] `CreateOrganization` use case auto-creates ORG_ADMIN user for founding member
  - [x] Auth `RegisterRequest` proto includes username, email, mobile, password, full_name
  - [ ] `/auth/register` page wizard:
    - Step 1: Personal info (name, email, password) → creates user with `c/<username>`
    - Step 2: Organization info (name, industry, website) → creates SP with `o/<slug>`
    - Step 3: Verification submission (documents, legal name)
  - [ ] Auto-assign `SP_ADMIN` role to founding user
  - [ ] Generate `o/<slug>` from org name (lowercase, strip special chars, deduplicate)
  - [ ] JWT claims include `service_provider_id` after SP context is selected

- [ ] **12.7 Multi-SP User Support**
  - [x] `service_provider_users` allows one user in multiple SPs
  - [x] JWT `Claims.ServiceProviderID` field for active SP context
  - [ ] SP switcher component in provider sidebar (list user's SPs)
  - [ ] SP selection on login (if user belongs to multiple SPs)
  - [ ] Context switch API (re-issue JWT with different `service_provider_id`)

- [ ] **12.8 Backend Implementation**
  - [x] `OrganizationUserRepository` interface (Add, Remove, GetByID, ListByOrg, GetByOrgAndUser)
  - [ ] PostgreSQL repository implementation for `service_provider_users`
  - [ ] `InvitationRepository` interface + PostgreSQL implementation
  - [ ] `InviteUser` use case (validate email, check duplicates, create invitation, send email)
  - [ ] `AcceptInvitation` use case (validate token, create/link user, add to SP)
  - [ ] `ChangeUserRole` use case (validate caller is SP_ADMIN, prevent last-admin removal)
  - [ ] `DeactivateUser` use case (soft-delete from SP, revoke sessions)
  - [ ] GraphQL mutations: `inviteTeamMember`, `acceptInvitation`, `changeTeamMemberRole`, `removeTeamMember`
  - [ ] GraphQL queries: `teamMembers`, `pendingInvitations`, `myServiceProviders`

---

## Implementation Details

### Username Pattern

The platform uses a prefix-based username system to distinguish entity types:

| Prefix | Entity | Example | Source |
|--------|--------|---------|--------|
| `c/` | Customer | `c/alice`, `c/bob` | Derived from email local part on registration |
| `o/` | Service Provider | `o/acmebank`, `o/cityhospital` | Derived from org name (lowercased, stripped) |

**Rules:**
- Stored in `users.username` — VARCHAR(100), UNIQUE, NOT NULL
- Backfill: `c/` + `split_part(email, '@', 1)` for customers
- SP slug: `lower(replace(replace(name, ' ', ''), '.', ''))` → stored in `service_providers.slug`
- Validation: `^(c|o)/[a-z0-9._-]{2,50}$`
- Uniqueness enforced at DB level (`CREATE UNIQUE INDEX idx_users_username ON users(username)`)

### Virtual Public ID

- Format: `TI-<first-8-chars-of-uuid>` (e.g. `TI-a1b2c3d4`)
- Stored in `user_identities.virtual_public_id` — VARCHAR(100), UNIQUE
- This is the **only** identifier exposed to service providers
- Real phone/email never shared with SPs; `masked_phone` shown instead

### JWT Claims

```
{
  "user_id": "uuid",
  "role": "SP_ADMIN | AGENT | ANALYST | CUSTOMER | PLATFORM_ADMIN",
  "service_provider_id": "uuid (omitted for customers)",
  ...standard registered claims
}
```

### SP User Lifecycle

```
Register → c/<username> created → Create/Join SP → o/<slug> assigned to SP
         → JWT issued with service_provider_id
         → Role: SP_ADMIN (founder) or AGENT/ANALYST (invited)
         → Invite flow: email → token → accept → link user to SP
```

### Database Tables (Existing)

| Table | Key Columns |
|-------|-------------|
| `users` | id, email, mobile, password_hash, status, username |
| `user_profiles` | user_id, full_name, avatar_url, timezone, language |
| `user_identities` | user_id, virtual_public_id, masked_phone, is_active |
| `service_provider_users` | service_provider_id, user_id, role, status |

### Database Tables (To Be Created)

| Table | Key Columns |
|-------|-------------|
| `invitations` | id, token_hash, email, service_provider_id, role, status, invited_by, expires_at |

---

## Summary

| Phase | Status | Key Deliverables |
|-------|--------|-----------------|
| 1. Foundation Hardening | 🟡 Partial | gRPC handlers created, event bus done, proto gen + main.go wiring remaining |
| 2. Database Entities | ✅ Complete | 5 migrations (011–015) with up + down scripts |
| 3. New Services | 🟡 Partial | 3 service skeletons done, repo implementations + proto gen remaining |
| 4. Event Architecture | 🟡 Partial | Event catalog + bus done, publishing + consuming integration remaining |
| 5. API Layer | 🟡 Partial | Proto definitions done, GraphQL schema + REST/OpenAPI remaining |
| 6. Provider Portal | 🟡 Partial | Skeleton pages done, full routes + components remaining |
| 7. Customer App | ⬜ Not started | Settings, callbacks, directory, documents, AI widgets |
| 8. Security | 🟡 Partial | RBAC + encryption + webhook signing done, tenant isolation + API security remaining |
| 9. Observability & Testing | 🟡 Partial | Metrics recorder done, dashboards + tracing + tests remaining |
| 10. Documentation | 🟡 Partial | Service catalog updated, diagrams + architecture docs remaining |
| 11. Infrastructure | 🟡 Partial | Docker + build system done, Terraform remaining |
| 12. Provider User Mgmt | ⬜ Not started | Team invites, role management, onboarding wizard, multi-SP, username system |
