# TrustInbox Documentation

TrustInbox is a privacy-first communication platform that lets people receive updates, callback requests, chat, and documents from trusted businesses without exposing their personal phone number.

The repo already contains the product shape end to end:

- A customer-facing web app
- An admin portal shell
- A Go gateway that currently serves most live HTTP APIs
- Domain services, proto contracts, and business rules for a future gRPC-first runtime
- Infra for PostgreSQL, Redis, MinIO, ejabberd, and observability

## Read This First

- [Business Idea](./business/business-idea.md)
- [Repository Guide](./architecture/repository-guide.md)
- [Service Catalog And Use Cases](./services/service-catalog.md)
- [Gateway API Reference](./api/graphql-reference.md)
- [Local Development Guide](./development/local-development.md)

## Existing Reference Docs

- [Architecture Overview](./architecture/overview.md)
- [Architecture Decisions](./architecture/adr.md)
- [Callback Request Flow](./business-flows/callback-request.md)
- [Notification Delivery Flow](./business-flows/notification-delivery.md)

## Current-State Snapshot

TrustInbox is partly in a transition from target architecture to current implementation:

- The intended architecture is `web/admin -> GraphQL BFF -> gRPC services -> Postgres/Redis/queue`.
- The current runtime is more pragmatic: the Go gateway directly owns most active REST, SSE, WebSocket, file upload, and chat orchestration behavior.
- Several backend services already have domain entities, use cases, and proto contracts, but their gRPC handlers are not registered yet.
- The codebase is also in the middle of a terminology migration from `organization` to `service_provider`.

That means the docs in this folder describe both:

- The business and platform direction
- The actual implementation state of this repository today

## Quick Orientation

If you are new to the repo, the shortest useful path is:

1. Read [Business Idea](./business/business-idea.md) for the product lens.
2. Read [Repository Guide](./architecture/repository-guide.md) for how the monorepo is laid out.
3. Read [Service Catalog And Use Cases](./services/service-catalog.md) to see which service owns which responsibility.
4. Read [Gateway API Reference](./api/graphql-reference.md) before wiring frontend work.
5. Read [Local Development Guide](./development/local-development.md) before booting the stack.
