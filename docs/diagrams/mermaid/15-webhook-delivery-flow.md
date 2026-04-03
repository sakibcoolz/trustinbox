# 15 — Webhook Delivery Flow

> Event-driven webhook subscriptions, HMAC-SHA256 signing, delivery, retry logic, and failure handling.

## Webhook Architecture

```mermaid
graph TB
    subgraph "Event Sources (Services)"
        NS["notification-service<br/>notification.created/delivered/read"]
        CS["communication-service<br/>callback.requested/approved/rejected"]
        BS["bot-service<br/>bot.action.executed/escalated"]
        OS["org-service<br/>team.member.invited/joined"]
    end

    subgraph "Redis Streams"
        Stream["trustinbox:events<br/>All domain events"]
    end

    subgraph "webhook-service (:50060)"
        Consumer["Event Consumer<br/>Listen for all events"]
        Matcher["Subscription Matcher<br/>Match event → subscriptions"]
        Signer["HMAC-SHA256 Signer<br/>Sign payload + timestamp"]
        Deliverer["HTTP Deliverer<br/>POST to target URL"]
        Retry["Retry Manager<br/>Exponential backoff<br/>Max 5 attempts"]
    end

    subgraph "External Systems"
        WH1["CRM Webhook<br/>https://crm.example.com/hooks"]
        WH2["Analytics Platform<br/>https://analytics.example.com/events"]
        WH3["Custom Integration<br/>https://api.customer.com/webhooks"]
    end

    NS & CS & BS & OS --> Stream
    Stream --> Consumer --> Matcher --> Signer --> Deliverer
    Deliverer --> WH1 & WH2 & WH3
    Deliverer -->|Failed| Retry
    Retry --> Deliverer
```

## Webhook Subscription Management

```mermaid
sequenceDiagram
    participant SP as Service Provider
    participant GW as Gateway
    participant WH as webhook-service
    participant DB as PostgreSQL

    SP->>GW: POST /api/v1/webhooks<br/>{url, events[], secret, description}
    GW->>WH: gRPC CreateSubscription()

    WH->>WH: Validate URL (HTTPS required)
    WH->>WH: Validate events against catalog
    WH->>WH: Hash secret: SHA256(secret)

    WH->>DB: INSERT INTO webhook_subscriptions<br/>(id, sp_id, url, secret_hash,<br/>events, is_active, description, created_at)

    WH-->>GW: {subscription}
    GW-->>SP: 201 Created

    Note over SP: Subscription is now active<br/>Matching events will be delivered
```

## Webhook Event Delivery

```mermaid
sequenceDiagram
    participant Svc as Backend Service
    participant Redis as Redis Streams
    participant WH as webhook-service
    participant DB as PostgreSQL
    participant Target as External URL

    Svc->>Redis: XADD trustinbox:events<br/>{type: notification.delivered, data: {...}}

    Redis-->>WH: Event received by consumer

    WH->>DB: SELECT * FROM webhook_subscriptions<br/>WHERE sp_id = $1 AND is_active = true<br/>AND $2 = ANY(events)
    Note over WH: Match event type against<br/>subscription event filters

    loop For each matching subscription
        WH->>WH: Build webhook payload
        Note over WH: payload = {<br/>  id: event_id,<br/>  type: "notification.delivered",<br/>  timestamp: ISO8601,<br/>  data: {notification details}<br/>}

        WH->>WH: Sign payload:<br/>timestamp = unix_epoch<br/>body = timestamp + "." + JSON(payload)<br/>sig = HMAC-SHA256(body, secret)

        WH->>Target: POST subscription.url<br/>Headers:<br/>  Content-Type: application/json<br/>  X-Webhook-Event: notification.delivered<br/>  X-Webhook-Signature-256: sha256=<sig><br/>  X-Webhook-Timestamp: <timestamp><br/>  X-Webhook-Delivery-ID: <delivery_id><br/>Body: payload

        alt Success (2xx)
            Target-->>WH: 200 OK
            WH->>DB: INSERT INTO webhook_deliveries<br/>(subscription_id, event_type,<br/>status='SUCCESS', response_code=200,<br/>delivered_at)
        else Failure
            Target-->>WH: 500 / timeout
            WH->>DB: INSERT INTO webhook_deliveries<br/>(status='FAILED', response_code,<br/>error_message, attempt=1)
            WH->>WH: Schedule retry
        end
    end
```

## Retry Strategy

```mermaid
graph TB
    subgraph "Exponential Backoff"
        A1["Attempt 1: Immediate"]
        A2["Attempt 2: 30 seconds"]
        A3["Attempt 3: 2 minutes"]
        A4["Attempt 4: 15 minutes"]
        A5["Attempt 5: 1 hour"]
        FAIL["❌ Mark permanently FAILED<br/>Alert webhook owner"]
    end

    A1 -->|Failed| A2 -->|Failed| A3 -->|Failed| A4 -->|Failed| A5 -->|Failed| FAIL

    A1 -->|2xx| S1["✅ SUCCESS"]
    A2 -->|2xx| S2["✅ SUCCESS"]
    A3 -->|2xx| S3["✅ SUCCESS"]
    A4 -->|2xx| S4["✅ SUCCESS"]
    A5 -->|2xx| S5["✅ SUCCESS"]
```

## Webhook Event Catalog

```mermaid
graph TB
    subgraph "Notification Events"
        NE1["notification.created"]
        NE2["notification.sent"]
        NE3["notification.delivered"]
        NE4["notification.read"]
        NE5["notification.failed"]
    end

    subgraph "Callback Events"
        CE1["callback.requested"]
        CE2["callback.approved"]
        CE3["callback.rejected"]
        CE4["callback.completed"]
        CE5["callback.expired"]
    end

    subgraph "Campaign Events"
        CAE1["campaign.launched"]
        CAE2["campaign.completed"]
        CAE3["campaign.cancelled"]
    end

    subgraph "Conversation Events"
        COE1["conversation.created"]
        COE2["conversation.closed"]
        COE3["message.sent"]
    end

    subgraph "Bot Events"
        BE1["bot.action.executed"]
        BE2["bot.escalated"]
        BE3["bot.error"]
    end

    subgraph "Team Events"
        TE1["team.member.invited"]
        TE2["team.member.joined"]
        TE3["team.member.removed"]
    end
```

## Webhook Delivery States

```mermaid
stateDiagram-v2
    [*] --> PENDING: Event matched subscription
    PENDING --> SUCCESS: 2xx response received
    PENDING --> RETRYING: Non-2xx / timeout
    RETRYING --> SUCCESS: Retry succeeds (2xx)
    RETRYING --> RETRYING: Still failing (< max attempts)
    RETRYING --> FAILED: Max 5 attempts exceeded
    SUCCESS --> [*]
    FAILED --> [*]
```

## Webhook Signature Verification (Consumer Side)

```mermaid
sequenceDiagram
    participant WH as webhook-service
    participant Target as Consumer (your server)

    WH->>Target: POST /hooks/trustinbox<br/>X-Webhook-Signature-256: sha256=abc123...<br/>X-Webhook-Timestamp: 1709251200<br/>Body: {"type":"notification.delivered",...}

    Target->>Target: 1. Extract timestamp from header
    Target->>Target: 2. Check timestamp freshness<br/>   (reject if > 5 min old → replay attack)
    Target->>Target: 3. Build signature body:<br/>   "1709251200.{json_body}"
    Target->>Target: 4. Compute expected sig:<br/>   HMAC-SHA256(body, webhook_secret)
    Target->>Target: 5. Compare: expected === received<br/>   (constant-time comparison)

    alt Valid
        Target-->>WH: 200 OK
    else Invalid signature
        Target-->>WH: 401 Unauthorized
        Note over Target: Log security event<br/>Do NOT process payload
    end
```
