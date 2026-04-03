# 12 — Callback Request Flow

> User-approved callback scheduling with availability slots, policy gating, and lifecycle management.

## End-to-End Callback Flow

```mermaid
sequenceDiagram
    participant SP as Service Provider<br/>(Provider Portal)
    participant GW as Gateway (:4000)
    participant CS as communication-service<br/>(:50056)
    participant PS as policy-service<br/>(:50053)
    participant DB as PostgreSQL
    participant Redis as Redis Streams
    participant Worker as worker-service
    participant User as End User<br/>(Web App)

    SP->>GW: POST /api/v1/callbacks<br/>{userId, reason, requestedTime, notes}
    GW->>CS: gRPC RequestCallback()

    CS->>PS: gRPC EvaluatePolicy(userID, spID, "service_provider", "callback")

    alt Policy Denied
        PS-->>CS: {allowed: false, reason: "USER_BLOCKED_SP"}
        CS-->>GW: PermissionDenied
        GW-->>SP: 403 Forbidden
    end

    PS-->>CS: {allowed: true}

    CS->>DB: INSERT INTO callbacks<br/>(id, user_id, sp_id, reason, requested_time,<br/>notes, status='PENDING', created_at)

    CS->>Redis: XADD trustinbox:events<br/>{type: callback.requested}

    CS-->>GW: {callback, status: PENDING}
    GW-->>SP: 201 Created

    Note over User: User receives notification<br/>about callback request

    Redis-->>Worker: callback.requested
    Worker->>Worker: Send notification to user<br/>(in-app + push)
    Worker->>User: "Organization X requests a callback"

    alt User Approves
        User->>GW: PATCH /api/v1/callbacks/:id/approve<br/>{approvedTime, availabilitySlot}
        GW->>CS: gRPC ApproveCallback()
        CS->>DB: UPDATE callbacks SET status='APPROVED',<br/>approved_time, approved_at
        CS->>Redis: XADD {type: callback.approved}
        CS-->>GW: {callback, status: APPROVED}
        GW-->>User: 200 OK
    else User Rejects
        User->>GW: PATCH /api/v1/callbacks/:id/reject<br/>{rejectionReason}
        GW->>CS: gRPC RejectCallback()
        CS->>DB: UPDATE callbacks SET status='REJECTED',<br/>rejection_reason, rejected_at
        CS->>Redis: XADD {type: callback.rejected}
        CS-->>GW: {callback, status: REJECTED}
        GW-->>User: 200 OK
    end

    Note over SP: Provider receives real-time update

    Redis-->>GW: SSE event
    GW-->>SP: SSE: callback.approved/rejected

    Note over Worker: If APPROVED, schedule reminder
    Worker->>Worker: CallbackReminderProcessor<br/>Schedule reminder 30min before
```

## Callback State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: SP requests callback
    PENDING --> APPROVED: User approves + picks time slot
    PENDING --> REJECTED: User declines
    PENDING --> EXPIRED: 72 hours with no response
    APPROVED --> COMPLETED: SP marks as completed after call
    APPROVED --> CANCELLED: SP or user cancels
    APPROVED --> MISSED: Scheduled time passes, no call made
    REJECTED --> [*]
    EXPIRED --> [*]
    COMPLETED --> [*]
    CANCELLED --> [*]
    MISSED --> PENDING: SP re-requests
```

## Availability Slots

```mermaid
sequenceDiagram
    participant User as Web App
    participant GW as Gateway
    participant CS as communication-service
    participant DB as PostgreSQL

    Note over User: User configures availability

    User->>GW: POST /api/v1/availability<br/>{dayOfWeek: "monday",<br/>startTime: "09:00",<br/>endTime: "17:00",<br/>timezone: "America/New_York"}

    GW->>CS: gRPC SetAvailability()
    CS->>DB: INSERT INTO availability_slots<br/>(user_id, day_of_week, start_time,<br/>end_time, timezone,<br/>is_active=true)
    CS-->>GW: {slot}
    GW-->>User: 201 Created

    Note over User: When approving a callback

    User->>GW: GET /api/v1/availability<br/>?date=2024-02-15
    GW->>CS: gRPC GetAvailability(userID, date)
    CS->>DB: SELECT * FROM availability_slots<br/>WHERE user_id = $1<br/>AND day_of_week = extract(dow from $2)
    CS-->>GW: Available time windows
    GW-->>User: [{09:00-12:00}, {14:00-17:00}]

    User->>GW: PATCH /api/v1/callbacks/:id/approve<br/>{approvedTime: "2024-02-15T10:00:00"}
```

## Callback Reminder Processing

```mermaid
sequenceDiagram
    participant Worker as worker-service<br/>(CallbackReminderProcessor)
    participant DB as PostgreSQL
    participant NS as notification-service
    participant Redis as Redis

    Note over Worker: Periodic check for upcoming callbacks

    Worker->>DB: SELECT * FROM callbacks<br/>WHERE status = 'APPROVED'<br/>AND approved_time BETWEEN NOW()<br/>AND NOW() + INTERVAL '30 minutes'<br/>AND reminder_sent = false

    loop For each upcoming callback
        Worker->>NS: gRPC CreateNotification<br/>(internal, bypasses policy)<br/>"Reminder: Callback with User in 30 min"
        Worker->>DB: UPDATE callbacks<br/>SET reminder_sent = true
    end

    Note over Worker: Also check for expired callbacks

    Worker->>DB: UPDATE callbacks<br/>SET status = 'EXPIRED'<br/>WHERE status = 'PENDING'<br/>AND created_at < NOW() - INTERVAL '72 hours'

    Worker->>Redis: XADD {type: callback.expired}<br/>for each expired callback
```

## Provider Callback Dashboard

```mermaid
graph TB
    subgraph "Callback List View (/callbacks)"
        Tabs["Status Tabs<br/>All · Pending · Approved · Completed · Rejected"]
        Table["DataTable<br/>User (virtual ID) · Reason · Status<br/>Requested Time · Approved Time"]
        Actions["Actions<br/>View Details · Mark Complete · Cancel"]
    end

    subgraph "Callback Detail (/callbacks/[id])"
        Info["Callback Info<br/>Status badge · Timeline<br/>Reason · Notes"]
        UserInfo["User Info (limited)<br/>Virtual number · Category"]
        Timeline["Activity Timeline<br/>Requested → Approved → Completed"]
    end

    Tabs --> Table --> Actions
    Actions -->|View| Info & UserInfo & Timeline
```
