# 11 — Notification Delivery Flow

> End-to-end flow from creation through policy, queuing, multi-channel delivery, and real-time updates.

## End-to-End Notification Flow

```mermaid
sequenceDiagram
    participant SP as Service Provider<br/>(Provider Portal)
    participant GW as Gateway (:4000)
    participant NS as notification-service<br/>(:50055)
    participant PS as policy-service<br/>(:50053)
    participant DB as PostgreSQL
    participant Redis as Redis Streams
    participant Worker as worker-service<br/>(:50058)
    participant SSE as SSE / Push
    participant User as End User<br/>(Web App)

    SP->>GW: POST /api/v1/notifications<br/>{userId, category, title, body, priority, channels[]}
    GW->>NS: gRPC CreateNotification()

    Note over NS: Start span: notification-service.Create

    NS->>PS: gRPC EvaluatePolicy(userID, spID, category)
    PS-->>NS: {allowed: true}

    NS->>DB: INSERT INTO notifications<br/>(id, user_id, sp_id, category, title,<br/>body, priority, status='PENDING',<br/>channels, metadata, created_at)

    NS->>Redis: XADD trustinbox:events *<br/>{type: notification.created, entity_id, user_id, sp_id, data}

    NS-->>GW: {notification}
    GW-->>SP: 201 Created

    Note over Worker: Consumer group: worker-service<br/>Consumer: worker-1<br/>Batch: 10, Block: 2s

    Redis-->>Worker: notification.created event
    Worker->>Worker: Route to DeliveryProcessor

    loop For each channel
        Worker->>Worker: Deliver via channel adapter
        Note over Worker: Channels:<br/>• IN_APP → mark delivered in DB<br/>• PUSH → Firebase/APNs<br/>• SMS → Twilio/provider<br/>• EMAIL → SMTP/SendGrid
    end

    Worker->>DB: UPDATE notifications<br/>SET status = 'DELIVERED',<br/>delivered_at = NOW()

    Worker->>Redis: PUBLISH sp:<spID>:events<br/>{type: notification.delivered}

    Redis-->>GW: SSE event
    GW-->>SP: SSE: notification.delivered

    Worker->>Redis: PUBLISH user:<userID>:events<br/>{type: notification.created}

    Redis-->>GW: WebSocket/subscription event
    GW-->>User: Real-time notification
```

## Notification State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Created & policy passed
    PENDING --> DELIVERED: Worker delivers<br/>(all channels succeed)
    PENDING --> PARTIALLY_DELIVERED: Some channels fail
    PENDING --> FAILED: All channels fail
    PARTIALLY_DELIVERED --> DELIVERED: Retry succeeds
    DELIVERED --> READ: User opens notification
    READ --> ARCHIVED: Auto-archive (90 days)<br/>or manual archive
    FAILED --> PENDING: Manual retry

    state PENDING {
        [*] --> Queued
        Queued --> Processing: Worker picks up
    }
```

## Multi-Channel Delivery

```mermaid
graph TB
    subgraph "DeliveryProcessor"
        Event["notification.created event"]
        Load["Load notification from DB"]
        Channels["Determine delivery channels"]
    end

    subgraph "Channel Adapters"
        InApp["📱 IN_APP<br/>Mark as delivered in DB<br/>Publish real-time event"]
        Push["🔔 PUSH<br/>Firebase Cloud Messaging<br/>APNs (iOS)"]
        SMS["📨 SMS<br/>Twilio / SMS gateway<br/>Virtual number mapping"]
        Email["📧 EMAIL<br/>SMTP / SendGrid<br/>Template rendering"]
    end

    subgraph "Post-Delivery"
        Update["Update notification status"]
        PublishEvt["Publish notification.delivered event"]
        Webhook["Trigger webhook: notification.sent"]
        Analytics["Record analytics:<br/>analytics_daily counters"]
    end

    Event --> Load --> Channels
    Channels --> InApp & Push & SMS & Email
    InApp & Push & SMS & Email --> Update --> PublishEvt --> Webhook & Analytics
```

## Notification Read Flow

```mermaid
sequenceDiagram
    participant User as Web App
    participant GW as Gateway
    participant NS as notification-service
    participant DB as PostgreSQL
    participant Redis as Redis

    User->>GW: PATCH /api/v1/notifications/:id/read
    GW->>NS: gRPC MarkAsRead(notificationID, userID)

    NS->>DB: UPDATE notifications<br/>SET status = 'READ', read_at = NOW()<br/>WHERE id = $1 AND user_id = $2

    NS->>Redis: XADD trustinbox:events<br/>{type: notification.read, entity_id, user_id}

    NS-->>GW: {notification: updated}
    GW-->>User: 200 OK

    Note over Redis: Worker processes notification.read
    Redis-->>Redis: Update analytics counters
    Redis-->>Redis: Trigger webhook: notification.read
```

## Notification Listing & Filtering

```mermaid
sequenceDiagram
    participant UI as Provider Portal
    participant GW as Gateway
    participant NS as notification-service
    participant DB as PostgreSQL

    UI->>GW: GET /api/v1/notifications?<br/>status=DELIVERED&category=service_provider<br/>&limit=20&offset=0&sort=created_at:desc

    GW->>NS: gRPC ListNotifications(filters)

    NS->>DB: SELECT n.*, COUNT(*) OVER() as total<br/>FROM notifications n<br/>WHERE n.service_provider_id = $1<br/>AND n.status = $2<br/>AND n.category = $3<br/>ORDER BY n.created_at DESC<br/>LIMIT $4 OFFSET $5

    DB-->>NS: [{notification}, ...], total=142

    NS-->>GW: {nodes: [...], totalCount: 142}
    GW-->>UI: JSON {nodes, totalCount}

    UI->>UI: Render DataTable with pagination
```

## Notification Priority Handling

```mermaid
graph TB
    subgraph "Priority Levels"
        LOW["🟢 LOW<br/>Standard delivery<br/>Batch-eligible<br/>Can be delayed"]
        MEDIUM["🟡 MEDIUM<br/>Normal delivery<br/>No batching<br/>Standard channels"]
        HIGH["🔴 HIGH<br/>Immediate delivery<br/>All channels<br/>Push + In-App"]
        URGENT["⚫ URGENT<br/>Bypass DND (if configured)<br/>All channels + SMS<br/>Escalation if unread"]
    end

    subgraph "DND Interaction"
        DNDCheck{"DND Active?"}
        UrgentBypass["URGENT: Deliver anyway<br/>(if user allows urgent bypass)"]
        DNDBlock["LOW/MEDIUM/HIGH:<br/>Queue until DND ends"]
    end

    LOW & MEDIUM & HIGH & URGENT --> DNDCheck
    DNDCheck -->|Yes + URGENT| UrgentBypass
    DNDCheck -->|Yes + Others| DNDBlock
    DNDCheck -->|No| MEDIUM
```

## Cleanup: Auto-Archive

```mermaid
sequenceDiagram
    participant Worker as worker-service<br/>(CleanupProcessor)
    participant DB as PostgreSQL

    Note over Worker: Runs periodically (cron or event-driven)

    Worker->>DB: UPDATE notifications<br/>SET status = 'ARCHIVED'<br/>WHERE status = 'READ'<br/>AND read_at < NOW() - INTERVAL '90 days'

    Worker->>DB: DELETE FROM notifications<br/>WHERE status = 'ARCHIVED'<br/>AND updated_at < NOW() - INTERVAL '180 days'

    Worker->>Worker: Log cleanup results:<br/>archived_count, deleted_count
```
