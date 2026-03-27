# Business Flow: Notification Delivery

## Overview
When an organization sends a notification to a user, it must pass through the policy engine before delivery.

## Actors
- **Organization**: Sends notifications to users
- **Policy Service**: Evaluates whether the notification is allowed
- **Notification Service**: Manages notification lifecycle
- **Worker Service**: Handles async delivery

## Flow Steps

1. **Organization submits notification** via GraphQL gateway
2. **Notification Service** receives the request and calls **Policy Service**
3. **Policy Service** runs the evaluation chain:
   - User exists?
   - Organization verified?
   - Organization blocked by user?
   - Category enabled by user?
   - DND active?
   - Callback approval required?
   - Ad cap exceeded?
   - Spam score below threshold?
4. If **ALLOW**: notification is persisted and queued for delivery
5. If **DENY**: decision is logged, organization receives denial reason
6. **Worker Service** picks up the delivery job and pushes to user device

## Business Rules
- Advertisements are opt-in; users must explicitly enable them
- Ad cap: max 3 per org per day
- DND windows support overnight spans (e.g., 22:00-07:00)
- Spam score threshold: 8.0 (org with score ≥ 8.0 is auto-blocked)
- All policy decisions are logged for audit

## Error Cases
- User not found → reject with `user_not_found`
- Org not verified → reject with `org_not_verified`
- User blocked org → reject with `org_blocked`
