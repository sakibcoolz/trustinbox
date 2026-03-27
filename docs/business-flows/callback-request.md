# Business Flow: Callback Request

## Overview
Organizations can request to call users. Users must approve or reject callback requests before the call happens.

## Actors
- **Organization**: Requests callbacks
- **User**: Approves or rejects callbacks
- **Communication Service**: Manages callback lifecycle
- **Policy Service**: Validates request is allowed

## Flow Steps

### Request Phase
1. Organization submits callback request with reason and preferred time
2. Communication Service checks policy
3. If allowed, callback request is created with `pending` status
4. User receives notification about the pending request

### Approval Phase
5. User reviews the request in their dashboard
6. User approves or rejects the request
7. Organization is notified of the decision

### Execution Phase (if approved)
8. Worker service monitors scheduled callbacks
9. At scheduled time, callback is triggered
10. Callback marked as `completed`

### Expiry
- Pending callbacks expire after 48 hours (configurable)
- Expired callbacks are marked as `expired` by cleanup worker

## Business Rules
- Calls **always** require approval unless user has explicit policy allowing auto-approve
- Organization must be verified
- User must not have blocked the organization
- DND rules are respected for the scheduled time
- User sees org name, reason, and requested time slot
