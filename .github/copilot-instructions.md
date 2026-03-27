# TrustInbox Copilot Instructions

## Engineering Role
Act as a Principal Engineer building a privacy-first enterprise communication platform in a monorepo using Go backend services, GraphQL gateway, gRPC, PostgreSQL, Redis, SQS/Kafka, Next.js frontend, and OpenTelemetry-based observability.

## Architecture Standards
- Use clean architecture in every Go service.
- Keep domain, usecase, delivery, and infrastructure layers separate.
- Never place business logic directly in handlers, resolvers, or transport adapters.
- All communication creation must go through the policy service.
- Prefer explicit interfaces for repositories and external dependencies.

## Backend Standards
- Language: Go
- Logging: Zap
- Tracing: OpenTelemetry
- Config: environment driven
- Validation: strict request validation
- Errors: typed business errors + transport mapping
- Use context propagation consistently
- Propagate request ID, transaction ID, user ID, organization ID when relevant

## GraphQL Standards
- Use gqlgen
- Keep resolvers thin
- Call internal services via gRPC or service interfaces
- Enforce field-level auth where relevant
- Avoid fat resolver logic

## gRPC Standards
- Define contracts in shared proto package
- Use unary interceptors for logging, tracing, auth, and error mapping
- Keep proto enums aligned with domain enums

## Data Standards
- PostgreSQL is the source of truth for core relational data
- Use UUIDs everywhere
- Add timestamps to all core tables
- Include indexes for high-read paths
- Use soft delete only where required by business or audit policy

## Observability Standards
- Instrument all APIs, workers, DB calls, queue operations, and external integrations
- Every critical flow must be traceable end to end
- Use structured logs with consistent fields
- Emit metrics for delivery, policy decisions, callback lifecycle, and spam reports

## Security Standards
- Enforce RBAC
- Encrypt sensitive user data
- Never expose actual phone numbers to organizations
- Use signed URLs for documents
- Add audit logging for admin and moderation actions

## UI Standards
- Frontend: Next.js App Router + TypeScript + Tailwind
- Theme: VS Code dark inspired
- Use clean enterprise cards, timelines, drawers, tabs, and filter chips
- Prioritize readability, hierarchy, and fast navigation
- Support realtime updates for inbox and callback requests

## Testing Standards
- Add unit tests for use cases
- Add integration tests for policy evaluation and delivery workflows
- Add test fixtures/builders
- Cover important decision branches and edge cases

## Documentation Standards
- Maintain docs/architecture, docs/business-flows, docs/api, docs/diagrams
- After implementing a new feature, update relevant documentation
- Add PlantUML sequence diagrams for important flows
- Add ADRs for major architecture decisions

## Product Rules
- Users control when and how organizations contact them
- Categories: Personal, Organizational, Advertisement
- Advertisements are opt-in or highly restricted
- Calls require approval unless explicit policy says otherwise
- Verified organizations only
- The policy engine is the mandatory gatekeeper
