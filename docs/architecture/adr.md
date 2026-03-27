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
