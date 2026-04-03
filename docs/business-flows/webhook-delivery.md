# Business Flow: Webhook Delivery

## Overview

Service providers can subscribe to platform events and receive real-time HTTP callbacks (webhooks) at their own endpoints. Every webhook delivery is signed with HMAC-SHA256 for authenticity, and failed deliveries are retried with exponential backoff.

## Actors

- **Service Provider (SP_ADMIN)**: Creates webhook subscriptions
- **Webhook Service**: Manages subscriptions, matches events, and delivers payloads
- **Worker Service**: Handles delivery retries
- **Any Platform Service**: Publishes events that trigger webhooks

## Flow Steps

### Phase 1: Subscription Setup

1. SP Admin navigates to **Integrations → Webhooks** in the provider portal
2. Creates a new webhook subscription:
   - **URL**: The HTTPS endpoint to receive webhooks
   - **Events**: Select specific event types to subscribe to (multi-select)
   - **Secret**: Auto-generated HMAC signing secret (displayed once, then hashed)
   - **Description**: Human-readable label
3. System validates the URL (must be HTTPS in production)
4. System generates a signing secret and stores its hash
5. Subscription created with `ACTIVE` status

### Phase 2: Test Delivery

6. SP clicks **Send Test Event** button
7. System sends a `webhook.test` event to the configured URL
8. SP verifies receipt and signature on their end
9. Test delivery result shown in the UI (success/failure with response code)

### Phase 3: Event Matching

10. A platform event occurs (e.g., `notification.delivered`, `callback.approved`)
11. Event is published to Redis Streams
12. Webhook service consumer picks up the event
13. Matches event type against all active subscriptions for the SP
14. For each matching subscription → creates a `webhook_delivery` record

### Phase 4: Payload Delivery

15. For each delivery:
    a. Construct JSON payload:
       ```json
       {
         "id": "delivery-uuid",
         "event": "notification.delivered",
         "timestamp": "2025-01-15T10:30:00Z",
         "data": { ... event-specific payload ... }
       }
       ```
    b. Compute HMAC-SHA256 signature:
       ```
       X-TrustInbox-Signature: sha256=<hex(HMAC-SHA256(secret, raw_body))>
       X-TrustInbox-Timestamp: <unix_timestamp>
       ```
    c. Send HTTP POST to subscription URL with:
       - `Content-Type: application/json`
       - `X-TrustInbox-Signature` header
       - `X-TrustInbox-Timestamp` header
       - `X-TrustInbox-Delivery-ID` header
16. Record response status code and latency

### Phase 5: Retry Logic

17. If delivery fails (non-2xx response or timeout):
    - Mark delivery as `FAILED`
    - Schedule retry with exponential backoff:
      - Attempt 1: immediate
      - Attempt 2: 1 minute
      - Attempt 3: 5 minutes
      - Attempt 4: 30 minutes
      - Attempt 5: 2 hours
      - Attempt 6: 12 hours (final)
    - Max 6 attempts total
18. If all retries exhausted:
    - Mark delivery as `PERMANENTLY_FAILED`
    - Publish `webhook.delivery.failed` event
    - Optionally disable subscription after N consecutive failures

### Phase 6: Delivery History

19. SP views delivery history in **Integrations → Webhooks → [Subscription] → Deliveries**
20. Each delivery shows:
    - Event type
    - Timestamp
    - Response code
    - Attempt count
    - Status (delivered / failed / retrying)
    - Request/response body (for debugging)

## Subscription Statuses

| Status | Description |
|--------|-------------|
| `ACTIVE` | Receiving events |
| `PAUSED` | Temporarily disabled by SP |
| `DISABLED` | Auto-disabled after too many consecutive failures |
| `DELETED` | Permanently removed |

## Delivery Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Queued for delivery |
| `DELIVERED` | Successfully delivered (2xx response) |
| `FAILED` | Delivery attempt failed, retries remaining |
| `RETRYING` | Scheduled for retry |
| `PERMANENTLY_FAILED` | All retry attempts exhausted |

## Subscribable Event Types

| Category | Events |
|----------|--------|
| Notification | `notification.created`, `notification.delivered`, `notification.read`, `notification.failed` |
| Callback | `callback.requested`, `callback.approved`, `callback.rejected`, `callback.completed`, `callback.expired` |
| Campaign | `campaign.launched`, `campaign.completed`, `campaign.paused` |
| Message | `message.sent`, `message.received`, `message.read` |
| Document | `document.uploaded`, `document.shared`, `document.downloaded` |
| Bot | `bot.action.executed`, `bot.escalated` |
| Customer | `customer.relationship.created`, `customer.blocked`, `customer.unblocked` |
| Consent | `consent.granted`, `consent.revoked` |

## Business Rules

- **HTTPS only**: Webhook URLs must use HTTPS in production environments
- **Signing is mandatory**: Every delivery includes an HMAC-SHA256 signature
- **Timestamp validation**: Receivers should reject deliveries older than 5 minutes (replay protection)
- **Idempotency**: Delivery IDs are unique — receivers should deduplicate
- **Timeout**: 30-second timeout per delivery attempt
- **Auto-disable**: Subscription auto-disabled after 100 consecutive failures
- **SP-scoped**: A subscription only receives events related to its own service provider
- **Rate limiting**: Max 1000 deliveries per minute per subscription

## Signature Verification (Receiver Side)

```
1. Extract X-TrustInbox-Signature header
2. Extract X-TrustInbox-Timestamp header
3. Verify timestamp is within 5 minutes of current time
4. Compute: expected = hex(HMAC-SHA256(secret, timestamp + "." + raw_body))
5. Compare expected with signature (constant-time comparison)
6. If match → process payload
7. If mismatch → reject with 401
```

## Error Cases

- Invalid URL → reject subscription creation
- Network timeout → retry with backoff
- 4xx response → retry (may be transient)
- 5xx response → retry with backoff
- SSL certificate error → mark as failed, notify SP
- Subscription deleted mid-delivery → discard pending deliveries

## Events Published

| Event | Trigger |
|-------|---------|
| `webhook.delivery.completed` | Successful delivery |
| `webhook.delivery.failed` | All retries exhausted |
| `webhook.subscription.disabled` | Auto-disabled after failures |
