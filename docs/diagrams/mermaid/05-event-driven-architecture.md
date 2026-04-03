# 05 — Event-Driven Architecture

> Redis Streams (durable) and Pub/Sub (fire-and-forget) event topology with all 40+ event types.

## Event Flow Overview

```mermaid
graph TB
    subgraph "Event Publishers (Services)"
        Auth["auth-service"]
        User["user-service"]
        Org["organization-service"]
        Notif["notification-service"]
        Comm["communication-service"]
        Bot["bot-service"]
        Webhook["webhook-service"]
        Doc["document-service"]
        Policy["policy-service"]
    end

    subgraph "Event Transport"
        Stream[("Redis Streams<br/><b>trustinbox:events</b><br/>Durable · Consumer Groups<br/>XADD / XReadGroup")]
        PubSub[("Redis Pub/Sub<br/>trustinbox:events:*<br/>Fire-and-Forget<br/>PUBLISH / SUBSCRIBE")]
    end

    subgraph "Event Consumers"
        Worker["⚙️ worker-service<br/>Consumer Group: worker-service<br/>• DeliveryProcessor<br/>• CallbackReminderProcessor<br/>• CampaignSendProcessor<br/>• CleanupProcessor"]
        WebhookConsumer["🔗 webhook-service<br/>Consumer: webhook-consumer<br/>• Match subscriptions<br/>• Enqueue deliveries"]
        AnalyticsConsumer["📊 analytics-service<br/>Consumer: analytics-consumer<br/>• Increment daily metrics<br/>• Upsert analytics_daily"]
        NotifConsumer["📬 notification-service<br/>Consumer: notification-consumer<br/>• Push real-time updates<br/>• SSE to connected users"]
    end

    Auth & User & Org & Notif & Comm & Bot & Doc & Policy -->|XADD| Stream
    Auth & User & Org & Notif & Comm & Bot & Doc & Policy -->|PUBLISH| PubSub

    Stream -->|XReadGroup| Worker
    Stream -->|XReadGroup| WebhookConsumer
    Stream -->|XReadGroup| AnalyticsConsumer
    PubSub -->|SUBSCRIBE| NotifConsumer
```

## Complete Event Type Catalog

```mermaid
graph LR
    subgraph "Service Provider Events"
        E1["service_provider.created"]
        E2["service_provider.verified"]
        E3["service_provider.suspended"]
    end

    subgraph "Customer Events"
        E4["customer.synced"]
        E5["customer.blocked_sp"]
        E6["customer.unblocked_sp"]
    end

    subgraph "Consent Events"
        E7["consent.updated"]
    end

    subgraph "Policy Events"
        E8["policy.evaluated"]
    end

    subgraph "Notification Events"
        E9["notification.created"]
        E10["notification.delivered"]
        E11["notification.read"]
        E12["notification.archived"]
    end

    subgraph "Callback Events"
        E13["callback.requested"]
        E14["callback.approved"]
        E15["callback.rejected"]
        E16["callback.expired"]
    end

    subgraph "Message Events"
        E17["message.sent"]
        E18["message.read"]
    end

    subgraph "Document Events"
        E19["document.shared"]
        E20["document.opened"]
    end

    subgraph "Campaign Events"
        E21["campaign.launched"]
        E22["campaign.completed"]
    end

    subgraph "Bot Events"
        E23["bot.created"]
        E24["bot.action.executed"]
        E25["bot.escalated"]
    end

    subgraph "Webhook Events"
        E26["webhook.delivery.succeeded"]
        E27["webhook.delivery.failed"]
    end

    subgraph "Spam Events"
        E28["spam.reported"]
    end

    subgraph "Team Events"
        E29["team.member.invited"]
        E30["team.member.role_changed"]
        E31["team.member.removed"]
        E32["invitation.accepted"]
        E33["invitation.revoked"]
    end
```

## Event Structure

```mermaid
classDiagram
    class Event {
        +string ID
        +string Type
        +[]byte Data
        +string EntityID
        +string UserID
        +string ServiceProviderID
        +string TraceID
        +time.Time Timestamp
        +WithEntity(id) Event
        +WithUser(id) Event
        +WithServiceProvider(id) Event
        +WithTrace(traceID) Event
    }

    class RedisStreamPublisher {
        +redis.Client rdb
        +string stream
        +Publish(ctx, Event) error
    }

    class RedisPubSubPublisher {
        +redis.Client rdb
        +Publish(ctx, Event) error
    }

    class RedisStreamConsumer {
        +redis.Client rdb
        +string stream
        +string group
        +string consumer
        +int batchSize
        +Start(ctx, HandlerFunc) error
    }

    class EventHandler {
        <<interface>>
        +Handle(ctx, Event) error
    }

    RedisStreamPublisher ..|> Event : publishes
    RedisPubSubPublisher ..|> Event : publishes
    RedisStreamConsumer ..|> EventHandler : invokes
```

## Worker Service Event Routing

```mermaid
graph TB
    subgraph "Redis Stream: trustinbox:events"
        Events["Incoming Events"]
    end

    subgraph "worker-service Dispatcher"
        Dispatch["Dispatcher.Handle(event)"]
    end

    subgraph "Processors"
        DP["DeliveryProcessor<br/>• Fetch notification<br/>• Call delivery service<br/>• Update status"]
        CRP["CallbackReminderProcessor<br/>• Create reminder notification<br/>• Check slot timing<br/>• Send 30-min reminder"]
        CSP["CampaignSendProcessor<br/>• Load campaign targets<br/>• Create notification per target<br/>• Policy check each target<br/>• Track sent/failed counts"]
        CP["CleanupProcessor<br/>• Expire old refresh tokens<br/>• Expire PENDING callbacks (72h)<br/>• Archive READ notifications (90d)"]
    end

    Events --> Dispatch

    Dispatch -->|"notification.created"| DP
    Dispatch -->|"callback.requested"| CRP
    Dispatch -->|"callback.approved"| CRP
    Dispatch -->|"callback.expired"| CRP
    Dispatch -->|"campaign.launched"| CSP
    Dispatch -->|"(periodic ticker)"| CP
```

## Webhook Event Mapping

```mermaid
graph LR
    subgraph "Internal Events"
        I1["notification.created"]
        I2["notification.delivered"]
        I3["notification.read"]
        I4["callback.requested"]
        I5["callback.approved"]
        I6["callback.rejected"]
        I7["campaign.launched"]
        I8["campaign.completed"]
        I9["bot.action.executed"]
        I10["bot.escalated"]
        I11["message.sent"]
        I12["document.shared"]
    end

    subgraph "Webhook Event Names"
        W1["notification.sent"]
        W2["notification.delivered"]
        W3["notification.read"]
        W4["callback.created"]
        W5["callback.approved"]
        W6["callback.rejected"]
        W7["campaign.started"]
        W8["campaign.completed"]
        W9["bot.action"]
        W10["bot.escalation"]
        W11["message.received"]
        W12["document.shared"]
    end

    I1 --> W1
    I2 --> W2
    I3 --> W3
    I4 --> W4
    I5 --> W5
    I6 --> W6
    I7 --> W7
    I8 --> W8
    I9 --> W9
    I10 --> W10
    I11 --> W11
    I12 --> W12
```

## Analytics Event Aggregation

```mermaid
graph TB
    subgraph "Events Consumed"
        E1["notification.created<br/>→ notifications_sent++"]
        E2["notification.delivered<br/>→ notifications_delivered++"]
        E3["notification.read<br/>→ notifications_read++"]
        E4["callback.requested<br/>→ callbacks_requested++"]
        E5["callback.approved<br/>→ callbacks_approved++"]
        E6["callback.rejected<br/>→ callbacks_rejected++"]
        E7["message.sent<br/>→ messages_sent++"]
        E8["bot.action.executed<br/>→ bot_actions++"]
        E9["policy.evaluated (denied)<br/>→ policy_denials++"]
    end

    subgraph "analytics_daily Table"
        AD["UPSERT analytics_daily<br/>SET column = column + 1<br/>WHERE date = TODAY<br/>AND service_provider_id = event.sp_id"]
    end

    E1 & E2 & E3 & E4 & E5 & E6 & E7 & E8 & E9 --> AD
```
