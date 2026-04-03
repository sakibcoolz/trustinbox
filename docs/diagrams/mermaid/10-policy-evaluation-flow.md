# 10 — Policy Evaluation Flow

> Mandatory 9-step gatekeeper for all communication — notifications, callbacks, and campaigns.

## Policy Evaluation Overview

```mermaid
graph TB
    subgraph "Callers"
        NS["notification-service<br/>CreateNotification()"]
        CS["communication-service<br/>RequestCallback()"]
        CAS["worker-service<br/>CampaignSendProcessor"]
    end

    subgraph "policy-service (:50053)"
        EP["EvaluatePolicy(userID, spID, category, type)"]
        Steps["9-Step Evaluation Pipeline"]
        Result["PolicyDecision<br/>{allowed, reason, decisionCode}"]
    end

    NS & CS & CAS -->|gRPC| EP --> Steps --> Result

    Result -->|allowed=true| Allow["✅ PROCEED<br/>Continue with action"]
    Result -->|allowed=false| Deny["❌ DENY<br/>Return reason to caller"]
```

## 9-Step Evaluation Pipeline

```mermaid
flowchart TB
    Start(["EvaluatePolicy<br/>(userID, spID, category, communicationType)"])

    S1{"Step 1<br/>User Exists?"}
    S2{"Step 2<br/>SP Verified?"}
    S3{"Step 3<br/>SP Status Active?"}
    S4{"Step 4<br/>User Blocked SP?"}
    S5{"Step 5<br/>Category Allowed?"}
    S6{"Step 6<br/>DND Active?"}
    S7{"Step 7<br/>Callback Approved?<br/>(callback type only)"}
    S8{"Step 8<br/>Ad Cap Exceeded?<br/>(advertisement only)"}
    S9{"Step 9<br/>Spam Score OK?"}

    D1["❌ USER_NOT_FOUND"]
    D2["❌ SP_NOT_VERIFIED"]
    D3["❌ SP_INACTIVE"]
    D4["❌ USER_BLOCKED_SP"]
    D5["❌ CATEGORY_DENIED"]
    D6["❌ DND_ACTIVE"]
    D7["❌ CALLBACK_NOT_APPROVED"]
    D8["❌ AD_CAP_EXCEEDED"]
    D9["❌ SPAM_SCORE_TOO_HIGH"]
    OK["✅ ALLOWED"]

    Start --> S1
    S1 -->|No| D1
    S1 -->|Yes| S2
    S2 -->|No| D2
    S2 -->|Yes| S3
    S3 -->|No| D3
    S3 -->|Yes| S4
    S4 -->|Yes, blocked| D4
    S4 -->|No| S5
    S5 -->|Denied| D5
    S5 -->|Allowed| S6
    S6 -->|Active| D6
    S6 -->|Inactive| S7
    S7 -->|Not approved<br/>(callback only)| D7
    S7 -->|Approved / N/A| S8
    S8 -->|Over 3/org/day<br/>(ads only)| D8
    S8 -->|Under cap / N/A| S9
    S9 -->|Score ≥ 8.0| D9
    S9 -->|Score < 8.0| OK

    style D1 fill:#ef444420,stroke:#ef4444
    style D2 fill:#ef444420,stroke:#ef4444
    style D3 fill:#ef444420,stroke:#ef4444
    style D4 fill:#ef444420,stroke:#ef4444
    style D5 fill:#ef444420,stroke:#ef4444
    style D6 fill:#ef444420,stroke:#ef4444
    style D7 fill:#ef444420,stroke:#ef4444
    style D8 fill:#ef444420,stroke:#ef4444
    style D9 fill:#ef444420,stroke:#ef4444
    style OK fill:#22c55e20,stroke:#22c55e
```

## Detailed Step Evaluation

```mermaid
sequenceDiagram
    participant Caller as Calling Service
    participant Policy as policy-service
    participant UserDB as users table
    participant OrgDB as organizations table
    participant BlockDB as blocked_providers
    participant PrivDB as privacy_preferences
    participant DNDDB as dnd_schedules
    participant CBDB as callbacks
    participant SpamDB as spam_reports
    participant LogDB as policy_evaluation_logs

    Caller->>Policy: gRPC EvaluatePolicy()

    Note over Policy: Step 1: User Exists
    Policy->>UserDB: SELECT id, status FROM users<br/>WHERE id = $1
    UserDB-->>Policy: user row

    Note over Policy: Step 2: SP Verified
    Policy->>OrgDB: SELECT id, is_verified FROM organizations<br/>WHERE id = $1
    OrgDB-->>Policy: {is_verified: true}

    Note over Policy: Step 3: SP Status Active
    Policy->>OrgDB: SELECT status FROM organizations<br/>WHERE id = $1
    OrgDB-->>Policy: {status: "active"}

    Note over Policy: Step 4: Check Blocked
    Policy->>BlockDB: SELECT EXISTS FROM blocked_providers<br/>WHERE user_id = $1 AND sp_id = $2
    BlockDB-->>Policy: false (not blocked)

    Note over Policy: Step 5: Category Preference
    Policy->>PrivDB: SELECT is_allowed FROM privacy_preferences<br/>WHERE user_id = $1 AND category = $2
    PrivDB-->>Policy: {is_allowed: true}

    Note over Policy: Step 6: DND Window
    Policy->>DNDDB: SELECT * FROM dnd_schedules<br/>WHERE user_id = $1 AND is_active = true
    Policy->>Policy: Check current time against<br/>start_time — end_time, day_of_week
    DNDDB-->>Policy: No active DND

    Note over Policy: Step 7: Callback Approval (if callback)
    alt Communication type = callback
        Policy->>CBDB: SELECT status FROM callbacks<br/>WHERE sp_id = $1 AND user_id = $2<br/>AND status = 'approved'
        CBDB-->>Policy: Found approved callback
    end

    Note over Policy: Step 8: Ad Cap (if advertisement)
    alt Category = advertisement
        Policy->>LogDB: SELECT COUNT(*) FROM policy_evaluation_logs<br/>WHERE user_id = $1 AND sp_id = $2<br/>AND category = 'advertisement'<br/>AND created_at > NOW() - INTERVAL '24 hours'
        LogDB-->>Policy: count = 2 (under cap of 3)
    end

    Note over Policy: Step 9: Spam Score
    Policy->>SpamDB: SELECT AVG(score) FROM spam_reports<br/>WHERE sp_id = $1
    SpamDB-->>Policy: avg_score = 2.3 (under threshold 8.0)

    Note over Policy: ✅ ALL PASSED
    Policy->>LogDB: INSERT INTO policy_evaluation_logs<br/>(user_id, sp_id, category, decision,<br/>decision_code, steps_evaluated, reason)

    Policy-->>Caller: {allowed: true, reason: "", decisionCode: "ALLOWED"}
```

## Policy in Notification Flow

```mermaid
sequenceDiagram
    participant Provider as Provider Portal
    participant GW as Gateway
    participant NS as notification-service
    participant PS as policy-service
    participant DB as PostgreSQL
    participant Worker as worker-service

    Provider->>GW: POST /api/v1/notifications<br/>{userId, category, title, body}
    GW->>NS: gRPC CreateNotification()

    NS->>PS: gRPC EvaluatePolicy(userID, spID, category, "notification")

    alt Policy Denied
        PS-->>NS: {allowed: false, reason: "DND_ACTIVE"}
        NS-->>GW: PermissionDenied "policy denied: DND active"
        GW-->>Provider: 403 {error: "DND_ACTIVE"}
    end

    PS-->>NS: {allowed: true}

    NS->>DB: INSERT INTO notifications (...) VALUES (...)
    NS->>NS: Publish event: notification.created
    NS-->>GW: {notification}
    GW-->>Provider: 201 Created

    Note over Worker: Worker picks up notification.created
    Worker->>Worker: DeliveryProcessor.Process()
    Worker->>Worker: Determine delivery channels<br/>(in-app, push, SMS, email)
    Worker->>Worker: Execute multi-channel delivery
```

## Policy in Callback Flow

```mermaid
sequenceDiagram
    participant Provider as Provider Portal
    participant GW as Gateway
    participant CS as communication-service
    participant PS as policy-service
    participant DB as PostgreSQL

    Provider->>GW: POST /api/v1/callbacks<br/>{userId, reason, requestedTime}
    GW->>CS: gRPC RequestCallback()

    CS->>PS: gRPC EvaluatePolicy(userID, spID, "service_provider", "callback")

    alt Policy Denied
        PS-->>CS: {allowed: false, reason: "USER_BLOCKED_SP"}
        CS-->>GW: PermissionDenied
        GW-->>Provider: 403
    end

    PS-->>CS: {allowed: true}
    CS->>DB: INSERT INTO callbacks (status='PENDING', ...)
    CS->>CS: Publish event: callback.requested
    CS-->>GW: {callback, status: PENDING}
    GW-->>Provider: 201 Created

    Note over Provider,DB: User must approve/reject<br/>the callback via the web app
```

## Decision Codes Reference

```mermaid
graph TB
    subgraph "Decision Codes"
        ALLOWED["✅ ALLOWED<br/>All 9 steps passed"]
        UNF["❌ USER_NOT_FOUND<br/>Target user doesn't exist"]
        SNV["❌ SP_NOT_VERIFIED<br/>Organization not yet verified"]
        SIN["❌ SP_INACTIVE<br/>Organization suspended/deleted"]
        UBS["❌ USER_BLOCKED_SP<br/>User blocked this organization"]
        CD["❌ CATEGORY_DENIED<br/>User disabled this category"]
        DND["❌ DND_ACTIVE<br/>User in Do Not Disturb window"]
        CNA["❌ CALLBACK_NOT_APPROVED<br/>No approved callback exists"]
        ACE["❌ AD_CAP_EXCEEDED<br/>> 3 ads/org/day"]
        STH["❌ SPAM_SCORE_TOO_HIGH<br/>Avg spam score ≥ 8.0"]
    end

    style ALLOWED fill:#22c55e20,stroke:#22c55e
    style UNF fill:#ef444420,stroke:#ef4444
    style SNV fill:#ef444420,stroke:#ef4444
    style SIN fill:#ef444420,stroke:#ef4444
    style UBS fill:#ef444420,stroke:#ef4444
    style CD fill:#ef444420,stroke:#ef4444
    style DND fill:#ef444420,stroke:#ef4444
    style CNA fill:#ef444420,stroke:#ef4444
    style ACE fill:#ef444420,stroke:#ef4444
    style STH fill:#ef444420,stroke:#ef4444
```
