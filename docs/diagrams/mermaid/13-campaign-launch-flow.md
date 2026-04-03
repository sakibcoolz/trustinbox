# 13 — Campaign Launch Flow

> Bulk notification campaigns with target fan-out, per-target policy evaluation, delivery tracking, and analytics.

## End-to-End Campaign Flow

```mermaid
sequenceDiagram
    participant SP as Service Provider<br/>(Provider Portal)
    participant GW as Gateway (:4000)
    participant NS as notification-service<br/>(:50055)
    participant DB as PostgreSQL
    participant Redis as Redis Streams
    participant Worker as worker-service<br/>(:50058)
    participant PS as policy-service<br/>(:50053)

    SP->>GW: POST /api/v1/campaigns<br/>{name, category, title, body, targetUserIds[],<br/>channels[], scheduledAt, metadata}
    GW->>NS: gRPC CreateCampaign()

    NS->>NS: Validate: name, category, title, body required
    NS->>NS: Validate: at least 1 target user

    NS->>DB: INSERT INTO campaigns<br/>(id, sp_id, name, category, title, body,<br/>channels, status='DRAFT', target_count,<br/>scheduled_at, metadata, created_at)

    NS->>DB: INSERT INTO campaign_targets<br/>(campaign_id, user_id, status='PENDING')<br/>-- batch insert for all target users

    NS-->>GW: {campaign, status: DRAFT}
    GW-->>SP: 201 Created

    Note over SP: Provider reviews and launches

    SP->>GW: POST /api/v1/campaigns/:id/launch
    GW->>NS: gRPC LaunchCampaign()

    NS->>DB: UPDATE campaigns<br/>SET status = 'LAUNCHED', launched_at = NOW()

    NS->>Redis: XADD trustinbox:events<br/>{type: campaign.launched, campaign_id, sp_id}

    NS-->>GW: {campaign, status: LAUNCHED}
    GW-->>SP: 200 OK

    Note over Worker: CampaignSendProcessor picks up

    Redis-->>Worker: campaign.launched event

    Worker->>DB: SELECT * FROM campaign_targets<br/>WHERE campaign_id = $1 AND status = 'PENDING'<br/>LIMIT 100 -- batch processing

    loop For each target user (batched)
        Worker->>PS: gRPC EvaluatePolicy(targetUserID, spID, category)

        alt Policy Allowed
            PS-->>Worker: {allowed: true}
            Worker->>DB: INSERT INTO notifications<br/>(campaign_id, user_id, sp_id, ...)
            Worker->>DB: UPDATE campaign_targets<br/>SET status = 'SENT'
        else Policy Denied
            PS-->>Worker: {allowed: false, reason}
            Worker->>DB: UPDATE campaign_targets<br/>SET status = 'POLICY_DENIED',<br/>denial_reason = reason
        end
    end

    Worker->>DB: UPDATE campaigns<br/>SET sent_count, denied_count,<br/>status = 'COMPLETED' (when all processed)

    Worker->>Redis: XADD {type: campaign.completed}
```

## Campaign State Machine

```mermaid
stateDiagram-v2
    [*] --> DRAFT: Campaign created with targets
    DRAFT --> LAUNCHED: SP launches campaign
    DRAFT --> CANCELLED: SP cancels before launch
    LAUNCHED --> IN_PROGRESS: Worker starts processing targets
    IN_PROGRESS --> COMPLETED: All targets processed
    IN_PROGRESS --> PARTIALLY_COMPLETED: Some targets failed
    LAUNCHED --> CANCELLED: SP cancels during processing
    COMPLETED --> [*]
    PARTIALLY_COMPLETED --> [*]
    CANCELLED --> [*]
```

## Campaign Target Processing

```mermaid
flowchart TB
    Start(["campaign.launched event"])

    FetchTargets["Fetch pending targets<br/>batch of 100"]

    HasMore{"More targets?"}

    subgraph "Per Target"
        Policy{"EvaluatePolicy<br/>(userID, spID, category)"}
        CreateNotif["Create notification<br/>(linked to campaign)"]
        MarkSent["target.status = SENT"]
        MarkDenied["target.status = POLICY_DENIED<br/>Store denial_reason"]
    end

    UpdateCounts["Update campaign counters<br/>sent_count, denied_count,<br/>failed_count"]

    Complete["campaign.status = COMPLETED<br/>Publish campaign.completed event"]

    Start --> FetchTargets --> HasMore
    HasMore -->|Yes| Policy
    Policy -->|Allowed| CreateNotif --> MarkSent --> HasMore
    Policy -->|Denied| MarkDenied --> HasMore
    HasMore -->|No more| UpdateCounts --> Complete
```

## Campaign Target States

```mermaid
stateDiagram-v2
    [*] --> PENDING: Added to campaign
    PENDING --> SENT: Policy passed, notification created
    PENDING --> POLICY_DENIED: Policy rejected
    PENDING --> FAILED: Delivery error
    SENT --> DELIVERED: Notification delivered
    DELIVERED --> READ: User reads notification
```

## Campaign Analytics

```mermaid
graph TB
    subgraph "Campaign Detail View (/campaigns/[id])"
        Summary["Campaign Summary<br/>Name · Category · Status<br/>Launched At · Completed At"]

        subgraph "Metrics Cards"
            Total["📊 Total Targets<br/>target_count"]
            Sent["✅ Sent<br/>sent_count"]
            Denied["🚫 Policy Denied<br/>denied_count"]
            Failed["❌ Failed<br/>failed_count"]
            Delivered["📬 Delivered<br/>delivered_count"]
            Read["👁️ Read<br/>read_count"]
        end

        subgraph "Charts"
            Funnel["Delivery Funnel<br/>Targets → Sent → Delivered → Read"]
            DenialPie["Denial Reasons<br/>Pie chart of policy denial codes"]
            Timeline["Delivery Timeline<br/>Messages sent over time"]
        end
    end

    Summary --> Total & Sent & Denied & Failed & Delivered & Read
    Total --> Funnel
    Denied --> DenialPie
    Sent --> Timeline
```

## Scheduled Campaign Flow

```mermaid
sequenceDiagram
    participant SP as Provider Portal
    participant GW as Gateway
    participant NS as notification-service
    participant DB as PostgreSQL
    participant Worker as worker-service

    SP->>GW: POST /api/v1/campaigns<br/>{..., scheduledAt: "2024-03-01T10:00:00Z"}
    GW->>NS: gRPC CreateCampaign()
    NS->>DB: INSERT INTO campaigns<br/>(status='DRAFT', scheduled_at)
    NS-->>GW: {campaign}

    SP->>GW: POST /api/v1/campaigns/:id/launch
    GW->>NS: gRPC LaunchCampaign()
    NS->>DB: UPDATE campaigns SET status = 'SCHEDULED'
    NS-->>GW: {campaign, status: SCHEDULED}

    Note over Worker: Worker checks for scheduled campaigns periodically

    loop Every minute
        Worker->>DB: SELECT * FROM campaigns<br/>WHERE status = 'SCHEDULED'<br/>AND scheduled_at <= NOW()
        alt Found scheduled campaign
            Worker->>DB: UPDATE campaigns SET status = 'LAUNCHED'
            Worker->>Worker: Begin target processing<br/>(same as immediate launch)
        end
    end
```
