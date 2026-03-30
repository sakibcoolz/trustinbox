# Event Architecture

TrustInbox uses an event-driven architecture built on Redis Streams and Pub/Sub for asynchronous communication between services.

## Transport Layer

| Mechanism | Use Case | Guarantees |
|-----------|----------|------------|
| Redis Streams | Durable event processing, job queues | At-least-once delivery, consumer groups, replay |
| Redis Pub/Sub | Real-time notifications, presence | Fire-and-forget, fan-out to subscribers |

### Consumer Groups

Each service creates a consumer group per event stream it subscribes to. This ensures:
- **Load balancing**: Multiple instances of a service share the workload
- **Fault tolerance**: Unacknowledged messages are re-delivered to other consumers
- **Idempotency**: Event IDs enable deduplication on the consumer side

## Event Envelope

All events follow a standard envelope defined in `packages/cornerstone/events/event.go`:

```go
type Event struct {
    ID                string          // Unique event ID (UUID)
    Type              string          // Event type constant
    TenantID          string          // Multi-tenant isolation
    ActorID           string          // Who triggered the event
    ServiceProviderID string          // SP context (if applicable)
    UserID            string          // Target user (if applicable)
    EntityID          string          // Primary entity ID
    TraceID           string          // OpenTelemetry trace correlation
    Payload           json.RawMessage // Event-specific data
    OccurredAt        time.Time       // When the event occurred
}
```

Events are constructed using a builder pattern:

```go
events.NewEvent(events.EventNotificationCreated).
    WithTenant(tenantID).
    WithActor(spID).
    WithUser(userID).
    WithEntity(notificationID).
    WithPayload(payload)
```

## Event Catalog

### Service Provider Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `service_provider.created` | organization-service | webhook-service, analytics-service | New SP registered |
| `service_provider.verified` | organization-service | notification-service, webhook-service | SP verification approved |
| `service_provider.suspended` | organization-service | policy-service, webhook-service | SP suspended by platform |

### Customer Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `customer.synced` | user-service | analytics-service | Customer profile synced |
| `customer.blocked_sp` | user-service | policy-service | Customer blocked a SP |
| `customer.unblocked_sp` | user-service | policy-service | Customer unblocked a SP |

### Consent Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `consent.updated` | user-service | policy-service | User preference changed |

### Policy Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `policy.evaluated` | policy-service | analytics-service, webhook-service | Policy decision made (ALLOW/DENY) |

### Notification Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `notification.created` | notification-service | worker-service, webhook-service | Notification queued for delivery |
| `notification.delivered` | worker-service | analytics-service, webhook-service | Notification delivered to device |
| `notification.read` | notification-service | analytics-service, webhook-service | User read the notification |
| `notification.archived` | notification-service | analytics-service | User archived the notification |

### Callback Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `callback.requested` | communication-service | notification-service, webhook-service | Callback request created |
| `callback.approved` | communication-service | worker-service, webhook-service | User approved callback |
| `callback.rejected` | communication-service | webhook-service | User rejected callback |
| `callback.expired` | worker-service | webhook-service, analytics-service | Callback expired (48h) |

### Message Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `message.sent` | communication-service | webhook-service | Message sent in conversation |
| `message.read` | communication-service | analytics-service | Message marked as read |

### Document Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `document.shared` | communication-service | notification-service, webhook-service | Document shared with user |
| `document.opened` | document-service | analytics-service, webhook-service | User opened a shared document |

### Campaign Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `campaign.launched` | notification-service | worker-service | Campaign started, fan-out begins |
| `campaign.completed` | worker-service | analytics-service, webhook-service | All targets processed |

### Bot Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `bot.created` | bot-service | webhook-service | New bot configured |
| `bot.action.executed` | bot-service | analytics-service, webhook-service | Bot performed a tool action |
| `bot.escalated` | bot-service | communication-service, webhook-service | Bot escalated to human agent |

### Webhook Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `webhook.delivery.succeeded` | webhook-service | analytics-service | Webhook delivered successfully |
| `webhook.delivery.failed` | webhook-service | analytics-service | Webhook delivery permanently failed |

### Spam Events

| Event Type | Publisher | Consumers | Description |
|-----------|-----------|-----------|-------------|
| `spam.reported` | communication-service | ai-service, analytics-service | User reported spam |

## Event Flow Patterns

### Fire-and-Forget (Pub/Sub)
Used for real-time UI updates (presence, typing indicators). No persistence guarantee.

### Reliable Processing (Streams + Consumer Groups)
Used for all business events. Messages persist in the stream and are acknowledged after processing.

```
Producer → XADD stream → Consumer Group → XREADGROUP → Process → XACK
```

### Fan-Out (Streams → Multiple Consumer Groups)
A single event can be consumed by multiple services independently. Each service has its own consumer group on the stream.

```
notification.created → [worker-service group] → delivery
                     → [webhook-service group] → webhook dispatch
                     → [analytics-service group] → metrics update
```

## Observability

- All events carry a `TraceID` for end-to-end correlation
- Event publishing and consumption are instrumented with OpenTelemetry spans
- Prometheus counters track events published/consumed per type
- Failed event processing triggers retry with exponential backoff
