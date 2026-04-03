# TrustInbox — Architecture & Flow Diagrams (Mermaid)

> Complete set of architecture and flow diagrams for the TrustInbox platform.
> All diagrams use [Mermaid](https://mermaid.js.org/) syntax and render natively in GitHub, GitLab, and VS Code.

---

## Architecture Diagrams

| # | Diagram | File | Description |
|---|---------|------|-------------|
| 01 | System Architecture (C4) | [01-system-architecture.md](01-system-architecture.md) | High-level system context — actors, apps, gateway, services, infra |
| 02 | Service Topology | [02-service-topology.md](02-service-topology.md) | All 13 services, ports, gRPC connections, data stores |
| 03 | Clean Architecture Layers | [03-clean-architecture-layers.md](03-clean-architecture-layers.md) | Per-service layer structure — entity → repo → usecase → delivery → infra |
| 04 | Data Model (ER Diagram) | [04-data-model.md](04-data-model.md) | PostgreSQL entity-relationship diagram — all tables and foreign keys |
| 05 | Event-Driven Architecture | [05-event-driven-architecture.md](05-event-driven-architecture.md) | Event types, publishers, consumers, Redis Streams/Pub-Sub topology |
| 06 | RBAC & Security Model | [06-rbac-security.md](06-rbac-security.md) | Roles, permissions, JWT flow, encryption, RLS |
| 07 | Frontend Architecture | [07-frontend-architecture.md](07-frontend-architecture.md) | Provider portal, web app, admin — component trees, data flow |
| 08 | Observability Stack | [08-observability-stack.md](08-observability-stack.md) | OpenTelemetry, Jaeger, Prometheus, Grafana pipeline |

## Flow Diagrams

| # | Flow | File | Description |
|---|------|------|-------------|
| 09 | Auth Flow | [09-auth-flow.md](09-auth-flow.md) | Login, register, token refresh, XMPP token — full JWT lifecycle |
| 10 | Policy Evaluation | [10-policy-evaluation-flow.md](10-policy-evaluation-flow.md) | 9-step mandatory evaluation — DND, blocking, ad caps, spam |
| 11 | Notification Delivery | [11-notification-delivery-flow.md](11-notification-delivery-flow.md) | Provider sends → policy gate → worker delivers → customer receives |
| 12 | Callback Request | [12-callback-request-flow.md](12-callback-request-flow.md) | Request → policy → user approval → scheduling → execution → expiry |
| 13 | Campaign Launch | [13-campaign-launch-flow.md](13-campaign-launch-flow.md) | Campaign create → target fan-out → per-target policy → delivery |
| 14 | Bot Action Execution | [14-bot-action-flow.md](14-bot-action-flow.md) | Bot trigger → permission check → policy gate → AI execution → response |
| 15 | Webhook Delivery | [15-webhook-delivery-flow.md](15-webhook-delivery-flow.md) | Event → subscription match → HMAC signing → HTTP delivery → retry |
| 16 | Document Upload & Share | [16-document-sharing-flow.md](16-document-sharing-flow.md) | Upload → MinIO → share → presigned URL → customer download |
| 17 | Conversation & Chat | [17-conversation-chat-flow.md](17-conversation-chat-flow.md) | SP starts → XMPP/WebSocket → message persist → real-time delivery |
| 18 | Team & Invitation | [18-team-invitation-flow.md](18-team-invitation-flow.md) | Invite → email token → accept → role assign → team lifecycle |
