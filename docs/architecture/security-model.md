# Security Model

TrustInbox implements defense-in-depth security across authentication, authorization, data protection, and communication integrity.

## Authentication

### JWT-Based Auth
- **Access tokens**: Short-lived JWTs (15 min) issued by auth-service
- **Refresh tokens**: Long-lived tokens (7 days) stored in httpOnly cookies
- **Token rotation**: Refresh tokens are single-use; old tokens are revoked on refresh
- **Password storage**: bcrypt with cost factor 10

### API Key Auth
- Service accounts authenticate via API keys (header: `X-API-Key`)
- Keys are hashed (SHA-256) before storage; plaintext is returned only at creation
- Keys can be scoped to specific permissions and have configurable expiry
- Rate-limited independently from JWT-authenticated requests

## Authorization (RBAC)

Role-Based Access Control is enforced at the gRPC interceptor level via `packages/cornerstone/auth/rbac`.

### Roles

| Role | Scope | Description |
|------|-------|-------------|
| `PLATFORM_ADMIN` | Global | Full access to all platform operations |
| `SP_ADMIN` | Tenant | Service provider admin — manages team, bots, webhooks, campaigns |
| `AGENT` | Tenant | SP agent — creates communications, manages conversations |
| `ANALYST` | Tenant | Read-only analytics + compliance data export |
| `CUSTOMER` | User | End user — views own notifications, callbacks, conversations |

### Permission Matrix

| Domain | Permissions | PLATFORM_ADMIN | SP_ADMIN | AGENT | ANALYST | CUSTOMER |
|--------|------------|:-:|:-:|:-:|:-:|:-:|
| Notifications | create, view | ✓ | ✓ | ✓ | ✓ | ✓ (own) |
| Callbacks | create, view, approve | ✓ | ✓ | ✓ | ✓ | ✓ (own) |
| Conversations | create, view | ✓ | ✓ | ✓ | ✓ | ✓ (own) |
| Documents | upload, share, view | ✓ | ✓ | ✓ | — | ✓ (own) |
| Campaigns | create, launch, view | ✓ | ✓ | — | ✓ | — |
| Bots | create, configure, manage | ✓ | ✓ | — | — | — |
| Analytics | view, export | ✓ | ✓ | ✓ | ✓ | — |
| Compliance | view, export | ✓ | ✓ | — | ✓ | — |
| Team | invite, manage, view | ✓ | ✓ | ✓ (view) | ✓ (view) | — |
| SP Settings | manage | ✓ | ✓ | — | — | — |
| Integrations | manage | ✓ | ✓ | — | — | — |
| Webhooks | create, manage | ✓ | ✓ | — | — | — |
| API Keys | create, manage | ✓ | ✓ | — | — | — |
| Platform Admin | all | ✓ | — | — | — | — |

### Enforcement Points

1. **gRPC Interceptor**: `RequirePermission` unary interceptor checks JWT claims against RBAC on every service call
2. **GraphQL Gateway**: Field-level auth annotations on resolvers
3. **Bot Service**: Bot permissions are checked before tool execution
4. **Webhook Service**: API key permissions validated on subscription creation

## Data Protection

### Field-Level Encryption (AES-256-GCM)

Sensitive PII is encrypted at the application layer using `packages/cornerstone/crypto`:

```
Master Key → SHA-256 derive → 32-byte cipher key
Plaintext → Random nonce + AES-256-GCM → Base64-encoded ciphertext
```

**Encrypted fields:**
- Customer real phone numbers
- Sensitive profile data (as configured per industry)
- Document content metadata

**Deterministic hashing** (`HashField`): SHA-256 produces consistent hashes for searchable encrypted fields (e.g., phone number lookup without decrypting all records).

### Data at Rest
- PostgreSQL: Encrypted volumes in production
- MinIO: Server-side encryption (SSE-S3) for stored documents
- Redis: Password-protected, TLS in production

### Data in Transit
- gRPC: TLS between services in production
- HTTPS: TLS termination at load balancer for all external traffic
- WebSocket: WSS for real-time chat connections

## Multi-Tenant Isolation

- Every entity includes a `tenant_id` column
- Queries are scoped by tenant at the repository layer
- Events carry `TenantID` for tenant-aware processing
- Webhook subscriptions are isolated per tenant
- Analytics are aggregated per tenant

## Communication Integrity

### Webhook Signing (HMAC-SHA256)

All outbound webhooks are signed using `packages/cornerstone/webhook/signing.go`:

```
Signature = HMAC-SHA256(secret, timestamp + "." + payload)
Header: X-Webhook-Signature: t=<unix_timestamp>,v1=<hex_signature>
```

Recipients verify by:
1. Extracting timestamp and signature from header
2. Recomputing `HMAC-SHA256(secret, timestamp + "." + body)`
3. Comparing signatures (constant-time)
4. Checking timestamp freshness (configurable tolerance, default 5 min)

This prevents payload tampering and replay attacks.

### Signed URLs for Documents

Documents are never served directly. Access requires:
1. Authenticated request to document-service
2. Ownership/share verification in database
3. Time-limited presigned URL from MinIO (15 min expiry)

## Privacy Controls

### User-Side Protections
- **Phone number masking**: Real phone numbers never exposed to service providers
- **DND (Do Not Disturb)**: Configurable quiet hours with overnight window support
- **Category controls**: Per-category enable/disable (Personal, Organizational, Advertisement)
- **SP blocking**: Users can block individual service providers
- **Spam reporting**: Increments SP spam scores; threshold (8.0) triggers policy denial

### SP-Side Controls
- **Verification required**: Only verified SPs can send communications
- **Ad caps**: Maximum 3 advertisements per SP per user per day
- **Frequency limits**: Configurable per category and industry profile
- **Campaign targeting**: Policy evaluation per target user (no bulk bypass)

## Audit Logging

- All policy decisions are logged with full context (user, SP, category, decision, reason)
- Admin and moderation actions are tracked
- Bot actions are logged with input/output for compliance review
- Webhook deliveries are recorded with response details
- Document access (open/download) is tracked with timestamps

## Security Headers

The GraphQL gateway and frontend apps enforce:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Strict-Transport-Security` (HSTS in production)
- CORS restricted to known origins
- CSRF protection via `SameSite` cookie attributes
