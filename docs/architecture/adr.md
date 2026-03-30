# ADR-001: Policy Engine as Mandatory Gatekeeper

## Status
Accepted

## Context
TrustInbox is a privacy-first platform. The core value proposition is that users control when and how organizations contact them. Every communication — notifications, callbacks, ads, messages — must be evaluated against user preferences before delivery.

## Decision
All communication creation flows through a centralized Policy Service. No service may deliver or create a communication without a policy evaluation. The policy service is the single source of truth for access control decisions.

## Consequences
- **Positive**: Single enforcement point prevents bypass
- **Positive**: All decisions are logged for audit
- **Positive**: Easy to add new policy rules without changing multiple services
- **Negative**: Policy service becomes a critical dependency (mitigated by caching and circuit breakers)
- **Negative**: Added latency for every communication (mitigated by fast evaluation chain)

---

# ADR-002: gRPC for Internal Communication

## Status
Accepted

## Context
Services need to communicate efficiently with type-safe contracts. REST adds overhead with JSON serialization and lacks strong typing.

## Decision
Use gRPC with Protocol Buffers for all internal service-to-service communication. Use GraphQL only at the BFF (Gateway) layer for frontend consumption.

## Consequences
- **Positive**: Strong typing with proto contracts
- **Positive**: Better performance than REST/JSON
- **Positive**: Built-in streaming support
- **Negative**: More complex debugging vs REST
- **Negative**: Proto file management overhead

---

# ADR-003: Clean Architecture in All Go Services

## Status
Accepted

## Context
Services need to be testable, maintainable, and have clear separation of concerns.

## Decision
Every Go service follows clean architecture with four layers:
1. **Domain**: Entities, repository interfaces, business types
2. **UseCase**: Business logic orchestration
3. **Delivery**: gRPC handlers, HTTP handlers
4. **Infrastructure**: Database implementations, external service clients

## Consequences
- **Positive**: Business logic is isolated and testable
- **Positive**: Infrastructure can be swapped without changing business logic
- **Positive**: Consistent structure across all services
- **Negative**: More boilerplate for simple services

---

# ADR-004: PostgreSQL as Source of Truth

## Status
Accepted

## Context
Need a reliable, ACID-compliant database for core relational data with strong consistency guarantees.

## Decision
PostgreSQL is the primary database. Redis is used only for caching, rate limiting, and session management. All authoritative data lives in PostgreSQL.

## Consequences
- **Positive**: ACID transactions for critical business operations
- **Positive**: Rich query capabilities, JSON support
- **Positive**: Mature ecosystem and tooling
- **Negative**: Vertical scaling limits (mitigated by read replicas and connection pooling)

---

# ADR-005: Redis Streams for Event-Driven Architecture

## Status
Accepted

## Context
Services need to communicate asynchronously for background processing (delivery, campaigns, analytics). We need reliable message delivery with replay capability, consumer groups for load balancing, and low-latency processing.

## Decision
Use Redis Streams as the primary event transport for all asynchronous service-to-service communication. Redis Pub/Sub is used only for ephemeral real-time notifications (presence, typing indicators). Each event follows a standardized envelope with trace correlation.

## Consequences
- **Positive**: At-least-once delivery with consumer group acknowledgment
- **Positive**: Message replay for recovery and debugging
- **Positive**: Fan-out to multiple consumer groups independently
- **Positive**: No additional infrastructure beyond existing Redis deployment
- **Negative**: No native dead-letter queue (implemented at application level)
- **Negative**: Stream trimming requires active management to prevent unbounded growth

---

# ADR-006: RBAC with gRPC Interceptor Enforcement

## Status
Accepted

## Context
TrustInbox serves multiple user types (platform admins, SP admins, agents, analysts, customers) with different access levels. Authorization must be enforced consistently across all services without duplicating logic in every handler.

## Decision
Implement Role-Based Access Control with 5 roles and 25+ granular permissions in a shared package (`packages/cornerstone/auth/rbac`). Enforce authorization via a gRPC unary interceptor that checks JWT claims against the permission matrix before the request reaches the handler. Field-level auth is applied at the GraphQL resolver layer.

## Consequences
- **Positive**: Single enforcement point — authorization cannot be bypassed by adding new handlers
- **Positive**: Centralized permission matrix is easy to audit and update
- **Positive**: Consistent across all gRPC services
- **Negative**: Coarse-grained at interceptor level; fine-grained resource-level checks still needed in use cases
- **Negative**: Permission changes require shared package update and redeployment

---

# ADR-007: Field-Level Encryption for PII

## Status
Accepted

## Context
User PII (phone numbers, sensitive profile data) must be protected even if the database is compromised. Regulatory requirements (GDPR, RBI data localization) demand encryption of sensitive fields.

## Decision
Use AES-256-GCM field-level encryption via `packages/cornerstone/crypto` for all sensitive PII. A master key derives the cipher key via SHA-256. Each encryption uses a random nonce. Deterministic SHA-256 hashing is used for searchable encrypted fields (e.g., phone number lookup).

## Consequences
- **Positive**: Data protected at rest even with database access
- **Positive**: Authenticated encryption (GCM) prevents tampering
- **Positive**: Deterministic hashing enables search without full-table decryption
- **Negative**: Key rotation requires re-encryption of all encrypted fields
- **Negative**: Encrypted fields cannot be queried with SQL operators (only equality via hash)

---

# ADR-008: AI Bot Service with Policy-Gated Actions

## Status
Accepted

## Context
Service providers want automated bot conversations for common customer interactions (appointment booking, FAQ, order tracking). Bots need to execute actions (book appointments, send documents) but must respect user consent and platform policies.

## Decision
The bot-service manages bot configuration, conversation processing, and tool execution. Every bot action requiring side effects passes through the policy service before execution. Bots have configurable permissions per tool, and conversations escalate to human agents when confidence is low, permissions are insufficient, or the user requests it.

## Consequences
- **Positive**: Bots cannot bypass user consent — policy engine gates all actions
- **Positive**: Per-bot permission scoping limits blast radius
- **Positive**: Automatic escalation ensures human fallback
- **Negative**: Policy evaluation adds latency to bot responses
- **Negative**: Bot capability is limited by industry profile and configured permissions

---

# ADR-009: Webhook Delivery with HMAC Signing and Retry

## Status
Accepted

## Context
Service providers need real-time HTTP callbacks when events occur (notification delivered, callback approved, etc.). Webhook payloads must be tamper-proof, and delivery must be reliable with automatic retry for transient failures.

## Decision
The webhook-service matches events to active subscriptions, signs payloads using HMAC-SHA256 with per-subscription secrets, and delivers via HTTP POST with exponential backoff retry (5 attempts over ~2.5 hours). Subscriptions are auto-disabled after 10 consecutive failures.

## Consequences
- **Positive**: Tamper-proof payloads with replay attack prevention (timestamp tolerance)
- **Positive**: Reliable delivery with automatic retry and backoff
- **Positive**: Self-healing: auto-disable prevents wasted resources on dead endpoints
- **Negative**: At-least-once delivery means consumers must handle duplicates
- **Negative**: Maximum ~2.5 hour delay before permanent failure declaration

---

# ADR-010: Industry Profiles for Vertical Customization

## Status
Accepted

## Context
Different industries (banking, healthcare, real estate) have distinct compliance requirements, communication patterns, document types, and callback workflows. A one-size-fits-all approach creates friction for service providers.

## Decision
Introduce industry profiles as configurable JSONB-backed templates that provide industry-specific defaults for reason codes, notification templates, compliance hints, document types, callback workflows, bot system prompts, and analytics presets. Profiles are seeded for 5 initial industries and extensible without schema changes.

## Consequences
- **Positive**: SP onboarding is faster with industry-specific defaults
- **Positive**: Compliance hints guide SPs toward regulatory requirements
- **Positive**: Extensible via JSONB — new industries without migrations
- **Negative**: JSONB columns are harder to validate at the database level
- **Negative**: Profile drift possible if templates are not maintained
