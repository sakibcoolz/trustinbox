# 06 — RBAC & Security Model

> Roles, permissions, JWT lifecycle, encryption, Row-Level Security, and middleware chain.

## Role Hierarchy

```mermaid
graph TB
    PA["🛡️ PLATFORM_ADMIN<br/>Level 0 — Superuser<br/>ALL permissions including platform.admin"]
    SA["🏢 SP_ADMIN<br/>Level 1 — Organization Owner<br/>Team, settings, all SP operations"]
    AG["👤 AGENT<br/>Level 2 — Customer-Facing Staff<br/>Notifications, callbacks, conversations"]
    AN["📊 ANALYST<br/>Level 3 — Read-Only Staff<br/>Analytics, compliance, reports"]
    CU["👤 CUSTOMER<br/>Level 4 — End User<br/>Own inbox, preferences, settings"]

    PA --> SA --> AG
    SA --> AN
    CU

    style PA fill:#ef444420,stroke:#ef4444
    style SA fill:#f59e0b20,stroke:#f59e0b
    style AG fill:#3b82f620,stroke:#3b82f6
    style AN fill:#a855f720,stroke:#a855f7
    style CU fill:#22c55e20,stroke:#22c55e
```

## Permission Matrix

```mermaid
graph TB
    subgraph "Notification"
        NC["notification.create"]
        NV["notification.view"]
    end
    subgraph "Callback"
        CC["callback.create"]
        CV["callback.view"]
    end
    subgraph "Conversation"
        COC["conversation.create"]
        COV["conversation.view"]
    end
    subgraph "Document"
        DU["document.upload"]
        DS["document.share"]
        DV["document.view"]
    end
    subgraph "Campaign"
        CAC["campaign.create"]
        CAM["campaign.manage"]
        CAV["campaign.view"]
    end
    subgraph "Bot"
        BC["bot.create"]
        BM["bot.manage"]
        BV["bot.view"]
    end
    subgraph "Analytics"
        AV["analytics.view"]
    end
    subgraph "Compliance"
        CLV["compliance.view"]
        CLE["compliance.export"]
    end
    subgraph "Team"
        TM["team.manage"]
        TV["team.view"]
    end
    subgraph "Settings"
        SSM["sp.settings.manage"]
    end
    subgraph "Integration"
        IM["integration.manage"]
        IV["integration.view"]
    end
    subgraph "Webhook"
        WM["webhook.manage"]
        WV["webhook.view"]
    end
    subgraph "API Key"
        AKM["apikey.manage"]
        AKV["apikey.view"]
    end
    subgraph "Platform"
        PADM["platform.admin"]
    end
```

## Role → Permission Mapping

```mermaid
block-beta
    columns 6

    space:1 b1["PLATFORM_ADMIN"] b2["SP_ADMIN"] b3["AGENT"] b4["ANALYST"] b5["CUSTOMER"]

    a1["notification.create"]:1 c1["✅"]:1 c2["✅"]:1 c3["✅"]:1 c4["—"]:1 c5["—"]:1
    a2["notification.view"]:1 d1["✅"]:1 d2["✅"]:1 d3["✅"]:1 d4["✅"]:1 d5["own"]:1
    a3["callback.create"]:1 e1["✅"]:1 e2["✅"]:1 e3["✅"]:1 e4["—"]:1 e5["—"]:1
    a4["campaign.manage"]:1 f1["✅"]:1 f2["✅"]:1 f3["—"]:1 f4["—"]:1 f5["—"]:1
    a5["bot.manage"]:1 g1["✅"]:1 g2["✅"]:1 g3["—"]:1 g4["—"]:1 g5["—"]:1
    a6["team.manage"]:1 h1["✅"]:1 h2["✅"]:1 h3["—"]:1 h4["—"]:1 h5["—"]:1
    a7["analytics.view"]:1 i1["✅"]:1 i2["✅"]:1 i3["—"]:1 i4["✅"]:1 i5["—"]:1
    a8["platform.admin"]:1 j1["✅"]:1 j2["—"]:1 j3["—"]:1 j4["—"]:1 j5["—"]:1

    style b1 fill:#ef444430
    style b2 fill:#f59e0b30
    style b3 fill:#3b82f630
    style b4 fill:#a855f730
    style b5 fill:#22c55e30
```

## JWT Token Lifecycle

```mermaid
sequenceDiagram
    participant Client as Browser / App
    participant GW as Gateway (:4000)
    participant Auth as auth-service (:50051)
    participant DB as PostgreSQL

    Note over Client,DB: === LOGIN ===
    Client->>GW: POST /api/auth/login {email, password}
    GW->>Auth: gRPC Login(email, password)
    Auth->>DB: SELECT * FROM users WHERE email = $1
    Auth->>Auth: bcrypt.CompareHashAndPassword()
    Auth->>Auth: Generate Access Token (HS256, 15min)
    Auth->>Auth: Generate Refresh Token (HS256, 7d)
    Auth->>DB: INSERT refresh_tokens (token_hash, user_id, expires_at)
    Auth-->>GW: {accessToken, refreshToken, userID, role}
    GW-->>Client: Set-Cookie (provider) / JSON (web)

    Note over Client,DB: === AUTHENTICATED REQUEST ===
    Client->>GW: GET /api/notifications<br/>Authorization: Bearer <accessToken>
    GW->>GW: JWT Validate → extract user_id, role
    GW->>GW: RBAC Check → HasPermission(role, "notification.view")
    GW->>Auth: gRPC service call with context headers

    Note over Client,DB: === TOKEN REFRESH ===
    Client->>GW: POST /api/auth/refresh {refreshToken}
    GW->>Auth: gRPC RefreshToken(refreshToken)
    Auth->>Auth: Validate refresh JWT signature
    Auth->>DB: SELECT * FROM refresh_tokens WHERE token_hash = $1
    Auth->>Auth: Verify not revoked, not expired
    Auth->>DB: UPDATE refresh_tokens SET revoked = true (rotate)
    Auth->>Auth: Generate new Access + Refresh tokens
    Auth->>DB: INSERT new refresh_tokens
    Auth-->>GW: {newAccessToken, newRefreshToken}
    GW-->>Client: Updated tokens
```

## Provider vs Web App Auth Model

```mermaid
graph TB
    subgraph "Provider Portal (Next.js 15)"
        PCookie["httpOnly Cookies<br/>• accessToken (15m)<br/>• refreshToken (7d)<br/>• auth-status<br/>• activeSpId"]
        PRefresh["Auto-refresh<br/>Every 12 minutes<br/>via useEffect"]
        PServer["Server-side gatewayFetch()<br/>reads cookies → attaches Bearer"]
    end

    subgraph "Web App (Next.js 14)"
        WLocal["localStorage<br/>• token (accessToken)<br/>• refreshToken<br/>• xmppToken<br/>• xmppJid<br/>• user (JSON)"]
        WRefresh["Proactive refresh<br/>2 min before expiry<br/>via setTimeout"]
        WClient["Client-side fetch<br/>reads localStorage → attaches Bearer"]
    end

    PCookie --> PRefresh --> PServer
    WLocal --> WRefresh --> WClient
```

## Data Encryption Model

```mermaid
graph TB
    subgraph "Encryption at Rest (cornerstone/crypto)"
        MasterKey["ENCRYPTION_MASTER_KEY<br/>(env variable)"]
        Derive["SHA-256 Key Derivation<br/>key = SHA256(masterKey)"]
        AES["AES-256-GCM Encryption<br/>12-byte random nonce<br/>Encrypt(plaintext) → base64"]
        Hash["SHA-256 Deterministic Hash<br/>HashField(value) → hex<br/>For searchable encrypted fields"]
    end

    subgraph "Encrypted Fields (PII)"
        Phone["📱 Phone Number"]
        Email["📧 Email Address"]
        Name["👤 Full Name"]
    end

    subgraph "Hash Indexes"
        PhoneHash["phone_hash_idx"]
        EmailHash["email_hash_idx"]
    end

    MasterKey --> Derive --> AES
    MasterKey --> Derive --> Hash
    Phone --> AES
    Email --> AES
    Name --> AES
    Phone --> Hash --> PhoneHash
    Email --> Hash --> EmailHash
```

## Row-Level Security (PostgreSQL RLS)

```mermaid
sequenceDiagram
    participant GW as Gateway
    participant MW as Tenant Middleware
    participant DB as PostgreSQL

    GW->>MW: Request with x-service-provider-id header
    MW->>DB: SET LOCAL app.current_sp_id = '<sp-uuid>'
    MW->>DB: SELECT * FROM notifications WHERE ...

    Note over DB: RLS Policy Evaluates:<br/>current_sp_id() IS NULL<br/>OR service_provider_id = current_sp_id()

    DB-->>MW: Only rows for this SP returned
    MW-->>GW: Filtered results

    Note over GW,DB: 20+ tables protected:<br/>notifications, callbacks, conversations,<br/>messages, documents, campaigns, bots,<br/>webhooks, policy_logs, analytics_daily,<br/>invitations, customer_notes, customer_tags
```

## Gateway Middleware Chain

```mermaid
graph TB
    subgraph "HTTP Request Flow"
        Req["Incoming HTTP Request"]
        CORS["1. CORS Middleware<br/>Allow-Origin: localhost:3000,6060,3001"]
        RBACMid["2. RBAC Middleware<br/>Extract JWT → Validate → Extract role<br/>Check HasPermission(role, route)"]
        TenantMid["3. Tenant Middleware<br/>Extract x-service-provider-id<br/>SET LOCAL app.current_sp_id"]
        RateLim["4. Rate Limiter (API v1 only)<br/>500 req/min sustained<br/>50-req burst"]
        Handler["5. Route Handler<br/>gRPC call → response mapping"]
    end

    Req --> CORS --> RBACMid --> TenantMid --> RateLim --> Handler

    subgraph "gRPC Interceptor Chain (Per Service)"
        I1["1. ContextPropagationInterceptor<br/>Extract: x-request-id, x-user-id,<br/>x-service-provider-id, x-role"]
        I2["2. TracingInterceptor<br/>Create span: service + method<br/>Inject business attributes"]
        I3["3. LoggingInterceptor<br/>Log method + request_id (INFO)<br/>Log errors (ERROR)"]
        I4["4. RBACInterceptor (optional)<br/>Method → permission mapping<br/>Verify role has permission"]
    end

    I1 --> I2 --> I3 --> I4
```

## Webhook HMAC Signing

```mermaid
sequenceDiagram
    participant WH as webhook-service
    participant Sub as Subscription (DB)
    participant Target as External URL

    WH->>Sub: Load subscription (URL, secret, events[])
    WH->>WH: Build payload JSON
    WH->>WH: timestamp = Unix epoch seconds
    WH->>WH: signature_body = timestamp + "." + payload
    WH->>WH: sig = HMAC-SHA256(signature_body, secret)
    WH->>Target: POST url<br/>Headers:<br/>  X-Webhook-Event: notification.sent<br/>  X-Webhook-Signature-256: sha256=<sig><br/>  X-Webhook-Timestamp: <timestamp><br/>  Content-Type: application/json<br/>Body: payload

    alt 2xx Response
        Target-->>WH: 200 OK
        WH->>WH: Mark delivery SUCCESS
    else Non-2xx / Timeout
        Target-->>WH: 500 / timeout
        WH->>WH: Mark FAILED, schedule retry
        Note over WH: Max 5 retries with exponential backoff
    end
```
