# TrustInbox — Engineering Observations & Architecture Findings

> Senior engineer review: what was built, what works well, what has known tradeoffs, and what to watch as the system scales.

---

## 1. Architecture Strengths

### Policy Engine as Universal Gatekeeper
Every communication path — notifications, callbacks, campaigns, bot actions — passes through `policy-service` before any work is done. The 9-step evaluation (SP verification → consent → category → DND → block → ad cap → spam → channel → per-category) is a single, auditable decision point. This makes compliance tracing trivial and ensures no bypass is possible by design.

### Event-Driven Decoupling
Redis Streams consumer groups (`XReadGroup`) provide durable, exactly-once-per-group event delivery. Publishers never wait for consumers. The 40+ event types cover the full domain lifecycle and enable: async delivery via worker-service, webhook fan-out, analytics aggregation, and SSE real-time push — all from the same event.

### Clean Architecture Enforcement
Every service strictly follows: `entity → repository interface → usecase → delivery (gRPC handler) → infra (postgres repo)`. Business logic never leaks into handlers or resolvers. This makes each layer independently testable and replaceable.

### PII Protection at Storage Layer
AES-256-GCM encryption on phone/email fields with SHA-256 hash indexes for search. Real phone numbers never reach service providers — virtual IDs are used throughout. This is architectural, not bolted on.

---

## 2. Feature-by-Feature Observations

### Authentication
- **Good**: httpOnly cookie auth on provider portal (XSS-safe). JWT HS256 with 15m access + 7d refresh rotation is standard and correct.
- **Tradeoff**: Web app still uses localStorage (legacy). Known issue, planned migration to cookies on Next.js 15 upgrade.
- **Watch**: `auth-status` non-httpOnly cookie is intentional for middleware reads but must never contain sensitive data.

### Notification Delivery
- **Good**: Ad cap enforcement via Redis counter (not DB query) keeps policy evaluation fast under load.
- **Good**: `suppressed` flag in SSE payload decouples DND from inbox visibility — users still see suppressed notifications in dropdown without toast/sound.
- **Tradeoff**: Worker-service delivery is best-effort (no guaranteed retry on notification delivery failure). For high-reliability use cases, a dead-letter queue is needed.

### Callback Flow
- **Good**: 72h expiry via CleanupProcessor protects against zombie pending callbacks.
- **Good**: Virtual phone number system ensures real numbers are never exposed.
- **Watch**: 30-minute reminder scheduling is done via Redis Streams TTL. If Redis restarts during the 30-minute window, reminders can be lost. A persistent scheduler (DB-backed) would be more reliable.

### Campaign Fan-out
- **Good**: Fully async — launch API returns immediately; fan-out happens in worker-service. A 100k-target campaign never blocks the provider.
- **Good**: Per-target policy evaluation inside worker — SP never learns which users were blocked (privacy).
- **Tradeoff**: No campaign pause/cancel mid-fan-out in the current implementation. Once `campaign.launched` is on the stream, all targets will be processed.

### Chat (XMPP)
- **Good**: ejabberd MUC rooms provide real battle-tested real-time delivery. PostgreSQL is the persistent store.
- **Tradeoff**: Gateway acts as XMPP proxy — adds one hop latency. For very high volume chat this could be a bottleneck.
- **Watch**: Offline delivery relies on PostgreSQL message persistence, not XMPP offline storage. Verify ejabberd offline message store is disabled to avoid duplicate delivery.

### Document Sharing
- **Good**: 15-minute presigned URLs mean MinIO objects are never directly accessible without validation.
- **Good**: `last_opened_at` + `document.opened` event provide SP-side read receipt analytics.
- **Tradeoff**: Presigned URL expiry (15 min) means long document views (e.g., scrolling a large PDF) may expire mid-session. Consider longer TTL (1h) for document views vs. download links.

### AI Bot System
- **Good**: Dual-phase spam detection on bot output closes the prompt injection vector.
- **Good**: Tool allowlist is enforced in `ToolExecutor`, not just in the prompt — LLM cannot invoke unapproved tools even if it tries.
- **Good**: n8n dispatcher enables complex automations without service code changes.
- **Watch**: RAG uses cosine similarity (pgvector `<->` operator). Without `pgvector` extension installed, queries will fail silently or fall back to full table scans. Verify extension is in migrations.
- **Watch**: Knowledge chunk embeddings are generated at ingestion time. If the embedding model changes, historical chunks become incomparable. Pin the embedding model version in config.
- **Tradeoff**: Each bot message makes at least 2 LLM calls (RAG query + completion). Tool use adds more. Monitor token costs per bot in production.

### Webhooks
- **Good**: HMAC-SHA256 with timestamp in signature prevents replay attacks.
- **Good**: 5-attempt exponential backoff (1m → 5m → 30m → 2h → 24h) is industry standard.
- **Watch**: After 5 failures, subscription status = FAILED. SP needs to manually re-enable. Add SP notification (email/in-app) on subscription failure.

### Analytics
- **Good**: Pre-aggregated `analytics_daily` table means dashboards never do expensive COUNT(*) queries.
- **Good**: 60s Redis cache prevents stampede.
- **Tradeoff**: Analytics are eventually consistent — there's a consumer lag between event and metric increment. Not suitable for real-time billing.

---

## 3. Cross-Cutting Observations

### Observability Coverage
Every usecase method opens a tracing span with relevant attributes. This means every request is traceable end-to-end in Jaeger: `Frontend → Gateway → Service → DB`. The AI pipeline is particularly well-instrumented: every LLM call, tool execution, RAG query, and spam detection emits its own span.

### Error Handling Consistency
`bizerr` typed errors are used throughout and `mapError()` in every gRPC handler translates them to correct status codes (NotFound→404, Forbidden→403, PolicyDenied→403, InvalidInput→400, Internal→500). No raw errors leak to clients.

### Tenant Isolation
PostgreSQL RLS via `SET LOCAL app.current_sp_id` provides row-level isolation. All SP-scoped queries are automatically filtered. This is the correct approach — no application-level filter forgetting is possible.

### Frontend Real-Time Architecture
Provider portal uses SSE (not WebSockets) for all real-time updates. This is simpler and more reliable than WebSockets for unidirectional server→client push. The SSE hub correctly routes events: `sendToSP(spID)` for provider events, `send(userID)` for user events.

---

## 4. Scaling Considerations

| Component | Current Approach | Scaling Path |
|---|---|---|
| Policy evaluation | In-process, DB queries | Redis cache for consent lookups; read replicas |
| Campaign fan-out | Single worker consumer | Multiple worker instances with consumer group |
| LLM calls | Direct per-request | Async queue + result cache for repeated queries |
| XMPP | Single ejabberd node | ejabberd cluster mode |
| PostgreSQL | Single node | Read replicas for analytics; pgBouncer for connection pooling |
| Redis Streams | Single instance | Redis Cluster for stream partitioning |
| Document storage | Single MinIO | MinIO distributed mode or S3 |

---

## 5. Security Posture Summary

| Control | Status | Notes |
|---|---|---|
| JWT HS256 + rotation | ✅ | 15m access / 7d refresh |
| RBAC at gRPC interceptor | ✅ | 30+ permissions, 5 roles |
| PII encryption (AES-256-GCM) | ✅ | Phone, email |
| SQL parameterized queries | ✅ | No interpolation anywhere |
| Tenant RLS | ✅ | PostgreSQL row-level security |
| HMAC webhook signing | ✅ | Timestamp replay protection |
| Presigned URLs (no direct S3 paths) | ✅ | 15-minute TTL |
| Bot output spam guard | ✅ | Prevents prompt injection reaching users |
| Tool execution allowlist | ✅ | Enforced in ToolExecutor, not just prompt |
| httpOnly auth cookies (provider) | ✅ | XSS-safe |
| localStorage auth (web app) | ⚠️ | Legacy — migrate to httpOnly cookies |
| Firebase/Push on main thread | ✅ Fixed | Was blocking runApp() on Android 13+ |
| Rate limiting | ✅ | 500 req/min per SP at gateway |
