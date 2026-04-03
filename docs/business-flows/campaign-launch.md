# Business Flow: Campaign Launch & Delivery

## Overview

Campaigns allow service providers to send bulk notifications to a targeted list of customers. Each campaign goes through policy preview, approval, fan-out, and delivery tracking phases. The policy engine evaluates every individual target before delivery.

## Actors

- **Service Provider (SP_ADMIN / AGENT)**: Creates and launches campaigns
- **Policy Service**: Evaluates each target individually
- **Notification Service**: Manages campaign lifecycle
- **Worker Service**: Handles fan-out and delivery
- **Analytics Service**: Tracks campaign metrics

## Flow Steps

### Phase 1: Campaign Creation

1. SP user navigates to **Campaigns → New Campaign** in the provider portal
2. SP user configures campaign:
   - **Name**: Human-readable campaign identifier
   - **Category**: Personal / Service Provider / Advertisement
   - **Channel**: In-app, SMS, email, push (multi-select)
   - **Template**: Select from industry-specific templates or create custom
   - **Schedule**: Immediate or scheduled (date/time picker)
   - **Target segment**: Upload CSV, select from customer list, or use filters (tags, last active, consent status)
3. System validates inputs and creates campaign with `DRAFT` status

### Phase 2: Policy Preview

4. SP user clicks **Preview Policy Impact**
5. System runs a dry-run policy evaluation against each target:
   - Checks user consent, DND, blocked status, ad caps, spam scores
6. Returns preview summary:
   - Total targets: N
   - Eligible: M
   - Blocked by policy: K (with breakdown by denial reason)
7. SP reviews and adjusts targeting or scheduling

### Phase 3: Launch

8. SP user clicks **Launch Campaign**
9. System transitions campaign to `SCHEDULED` or `SENDING` status
10. Campaign event published: `campaign.launched`
11. Worker service picks up the campaign job

### Phase 4: Fan-Out & Delivery

12. Worker service iterates through campaign targets
13. For each target:
    - Creates individual notification
    - Calls policy service for real-time evaluation
    - If ALLOWED → queues for delivery
    - If DENIED → marks target as `skipped` with reason
14. Delivery processor pushes notifications via configured channels
15. Events published: `notification.created`, `notification.delivered`, `notification.failed`

### Phase 5: Tracking & Analytics

16. Campaign status transitions: `SENDING` → `COMPLETED` / `PARTIALLY_COMPLETED`
17. Analytics service aggregates metrics:
    - Sent count, delivered count, read count, failed count
    - Delivery rate, open rate, click-through rate
    - Policy denial breakdown
18. SP views campaign performance in **Campaigns → [Campaign ID]** dashboard

## Campaign Statuses

| Status | Description |
|--------|-------------|
| `DRAFT` | Created but not launched |
| `SCHEDULED` | Approved and waiting for scheduled time |
| `SENDING` | Active fan-out in progress |
| `PAUSED` | Manually paused by SP |
| `COMPLETED` | All targets processed |
| `PARTIALLY_COMPLETED` | Completed with some failures |
| `CANCELLED` | Cancelled before completion |

## Business Rules

- **Category restrictions**: Advertisement campaigns require opt-in from every target
- **Ad cap enforcement**: Max 3 ads per org per user per day — campaign fan-out respects this
- **DND compliance**: Scheduled campaigns respect each target's DND windows
- **Rate limiting**: Campaign fan-out is throttled to prevent system overload (configurable batch size)
- **Spam score check**: Campaigns from high-spam-score SPs (≥ 8.0) are auto-blocked
- **SP verification**: Only verified service providers can launch campaigns
- **Scheduling**: Scheduled campaigns can be cancelled before their send time
- **Pause/resume**: Active campaigns can be paused and resumed

## Error Cases

- SP not verified → reject with `sp_not_verified`
- No eligible targets after policy preview → warn but allow launch
- Worker failure during fan-out → retry individual targets, mark campaign as `partially_completed`
- Rate limit exceeded → throttle and continue

## Data Model

```
campaigns
├── id (UUID)
├── service_provider_id (FK)
├── name (VARCHAR)
├── category (VARCHAR)
├── channels (TEXT[])
├── template_id (UUID, nullable)
├── custom_body (TEXT)
├── schedule_at (TIMESTAMPTZ, nullable)
├── status (VARCHAR)
├── total_targets (INT)
├── sent_count (INT)
├── delivered_count (INT)
├── failed_count (INT)
├── created_by (UUID)
├── created_at (TIMESTAMPTZ)
└── updated_at (TIMESTAMPTZ)

campaign_targets
├── id (UUID)
├── campaign_id (FK)
├── user_id (FK)
├── status (VARCHAR: pending/sent/delivered/skipped/failed)
├── denial_reason (VARCHAR, nullable)
├── delivered_at (TIMESTAMPTZ, nullable)
└── created_at (TIMESTAMPTZ)
```

## Events Published

| Event | Trigger |
|-------|---------|
| `campaign.launched` | Campaign starts sending |
| `campaign.completed` | All targets processed |
| `campaign.paused` | SP pauses campaign |
| `campaign.cancelled` | SP cancels campaign |
| `notification.created` | Individual target notification created |
| `notification.delivered` | Target notification delivered |
