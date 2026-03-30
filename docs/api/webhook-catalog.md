# Webhook Event Catalog

This document describes all webhook events available to service providers and the delivery mechanism.

## Overview

Service providers can subscribe to webhook events to receive real-time HTTP callbacks when actions occur in TrustInbox. Webhooks are managed via the webhook-service (port 50060) and the provider portal.

## Subscription Management

### Creating a Subscription

```
POST /api/webhooks/subscriptions
Authorization: Bearer <token> | X-API-Key: <key>

{
  "callback_url": "https://example.com/webhooks/trustinbox",
  "event_types": ["notification.delivered", "callback.approved"],
  "secret": "whsec_your_signing_secret",
  "description": "Production webhook endpoint"
}
```

### Subscription Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `callback_url` | string | Yes | HTTPS endpoint to receive events |
| `event_types` | string[] | Yes | Events to subscribe to (use `*` for all) |
| `secret` | string | Yes | HMAC-SHA256 signing secret |
| `description` | string | No | Human-readable label |

## Delivery Format

All webhook deliveries use the following format:

```http
POST /your/webhook/endpoint HTTP/1.1
Content-Type: application/json
X-Webhook-ID: <delivery_uuid>
X-Webhook-Signature: t=1700000000,v1=5257a869e7ecebeda32affa62cd...
X-Webhook-Event: notification.delivered
```

### Payload Structure

```json
{
  "id": "evt_01HZ...",
  "event_type": "notification.delivered",
  "timestamp": "2025-01-15T10:30:00Z",
  "subscription_id": "sub_01HZ...",
  "data": {
    // Event-specific payload
  }
}
```

## Signature Verification

All deliveries are signed using HMAC-SHA256. To verify:

1. Extract `t` (timestamp) and `v1` (signature) from `X-Webhook-Signature`
2. Construct the signed content: `{timestamp}.{raw_body}`
3. Compute `HMAC-SHA256(secret, signed_content)`
4. Compare the hex digest with `v1` using constant-time comparison
5. Check that `t` is within acceptable tolerance (recommended: 5 minutes)

**Example (Go):**
```go
import "github.com/trustinbox/packages/cornerstone/webhook"

valid := webhook.VerifySignature(body, signatureHeader, secret, 5*time.Minute)
```

## Available Events

### Notification Events

#### `notification.created`
Fired when a notification is queued for delivery after passing policy evaluation.

```json
{
  "notification_id": "uuid",
  "user_id": "uuid",
  "category": "ORGANIZATIONAL",
  "title": "Payment reminder",
  "status": "pending"
}
```

#### `notification.delivered`
Fired when a notification is successfully delivered to the user's device.

```json
{
  "notification_id": "uuid",
  "user_id": "uuid",
  "delivered_at": "2025-01-15T10:30:00Z",
  "channel": "push"
}
```

#### `notification.read`
Fired when a user opens/reads a notification.

```json
{
  "notification_id": "uuid",
  "user_id": "uuid",
  "read_at": "2025-01-15T11:00:00Z"
}
```

### Callback Events

#### `callback.requested`
Fired when a callback request is created and pending user approval.

```json
{
  "callback_id": "uuid",
  "user_id": "uuid",
  "reason": "Loan follow-up",
  "status": "pending",
  "expires_at": "2025-01-17T10:30:00Z"
}
```

#### `callback.approved`
Fired when a user approves a callback request.

```json
{
  "callback_id": "uuid",
  "user_id": "uuid",
  "approved_at": "2025-01-15T12:00:00Z",
  "scheduled_time": "2025-01-16T14:00:00Z"
}
```

#### `callback.rejected`
Fired when a user rejects a callback request.

```json
{
  "callback_id": "uuid",
  "user_id": "uuid",
  "rejected_at": "2025-01-15T12:00:00Z",
  "reason": "Not interested"
}
```

#### `callback.expired`
Fired when a pending callback expires after 48 hours.

```json
{
  "callback_id": "uuid",
  "user_id": "uuid",
  "expired_at": "2025-01-17T10:30:00Z"
}
```

### Message Events

#### `message.sent`
Fired when a message is sent in a conversation (by any participant).

```json
{
  "message_id": "uuid",
  "conversation_id": "uuid",
  "sender_type": "customer|agent|bot",
  "sent_at": "2025-01-15T10:30:00Z"
}
```

### Document Events

#### `document.shared`
Fired when a document is shared with a customer.

```json
{
  "document_id": "uuid",
  "user_id": "uuid",
  "shared_by": "uuid",
  "conversation_id": "uuid",
  "filename": "loan_agreement.pdf",
  "expires_at": "2025-01-22T10:30:00Z"
}
```

#### `document.opened`
Fired when a customer opens a shared document.

```json
{
  "document_id": "uuid",
  "user_id": "uuid",
  "opened_at": "2025-01-15T14:00:00Z"
}
```

### Campaign Events

#### `campaign.completed`
Fired when all targets in a campaign have been processed.

```json
{
  "campaign_id": "uuid",
  "total_targets": 5000,
  "delivered_count": 4200,
  "denied_count": 800,
  "completed_at": "2025-01-15T11:30:00Z"
}
```

### Policy Events

#### `policy.evaluated`
Fired for every policy evaluation (useful for compliance monitoring).

```json
{
  "evaluation_id": "uuid",
  "user_id": "uuid",
  "decision": "ALLOW|DENY",
  "reason": "category_disabled",
  "communication_type": "notification|callback|message",
  "category": "ADVERTISEMENT"
}
```

### Bot Events

#### `bot.action.executed`
Fired when a bot executes a tool action.

```json
{
  "bot_id": "uuid",
  "conversation_id": "uuid",
  "action_type": "book_appointment",
  "status": "success|failed|policy_denied",
  "executed_at": "2025-01-15T10:30:00Z"
}
```

#### `bot.escalated`
Fired when a bot escalates a conversation to a human agent.

```json
{
  "bot_id": "uuid",
  "conversation_id": "uuid",
  "reason": "user_requested|confidence_low|permission_denied",
  "escalated_at": "2025-01-15T10:30:00Z"
}
```

### Service Provider Events

#### `service_provider.verified`
Fired when the platform verifies a service provider.

```json
{
  "sp_id": "uuid",
  "verified_at": "2025-01-15T10:30:00Z"
}
```

#### `service_provider.suspended`
Fired when the platform suspends a service provider.

```json
{
  "sp_id": "uuid",
  "reason": "policy_violation",
  "suspended_at": "2025-01-15T10:30:00Z"
}
```

### Spam Events

#### `spam.reported`
Fired when a customer reports a message as spam.

```json
{
  "report_id": "uuid",
  "message_id": "uuid",
  "user_id": "uuid",
  "reason": "Unsolicited advertisement",
  "current_spam_score": 5.2
}
```

## Retry Policy

| Attempt | Delay | Cumulative |
|---------|-------|-----------|
| 1 | Immediate | 0 |
| 2 | 1 minute | 1 min |
| 3 | 5 minutes | 6 min |
| 4 | 30 minutes | 36 min |
| 5 | 2 hours | ~2.5 hours |

After 5 failed attempts, the delivery is marked as `permanently_failed`.

After 10 consecutive failures across any deliveries, the subscription is automatically disabled. Re-enable via the provider portal or API.

## Response Requirements

- Return HTTP `2xx` within 30 seconds to acknowledge receipt
- Non-2xx responses or timeouts trigger retries
- The response body is logged but not processed

## Rate Limits

- Maximum 100 active subscriptions per tenant
- Maximum 10,000 deliveries per hour per tenant
- Burst limit: 100 deliveries per second per endpoint
