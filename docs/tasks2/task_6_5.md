# Task 6.5 — Campaign E2E

> **Phase**: 6 — Cross-App End-to-End Flows
> **Goal**: Verify the complete campaign lifecycle: Provider creates campaign → Configures audience and content → Launches → Worker fans out to individual targets → Each customer receives notification → Policy denials tracked → Campaign analytics aggregate correctly.
> **Type**: Integration test scenario validating the campaign fan-out and per-target delivery pipeline.

---

## Objective

Verify that a campaign created in the Provider Portal fans out to individual targeted customers, each undergoing independent policy evaluation, with delivery tracking per target, real-time progress updates, and correct analytics aggregation.

---

## Architecture Flow

```
Provider Portal (/campaigns/new)
  └─ 5-step wizard: Basics → Audience → Content → Schedule → Review
  └─ POST /api/campaigns (create)
  └─ POST /api/campaigns/{id}/launch (launch)
       └─ Gateway → gRPC → notification-service (:50055)
            ├─ campaignRepo.Create() → PostgreSQL
            └─ publisher.Publish(CampaignLaunched) → Redis Streams
                 └─ worker-service (:50058) CampaignSendProcessor
                      ├─ Fan-out: for each target user:
                      │    ├─ policy-service.EvaluateCommunication()
                      │    │    ├─ ALLOW → create notification → queue delivery
                      │    │    └─ DENY → log rejection with reason
                      │    └─ Update campaign target status
                      └─ Publish campaign_progress events

Provider Portal (/campaigns/{id})
  └─ useCampaignProgressUpdated(id) — SSE real-time progress
       ├─ X of Y targets sent
       ├─ X delivered, X failed, X rejected
       └─ Campaign analytics cards update

Web App (/inbox)
  └─ Each target customer receives individual notification
       └─ Same flow as Task 6.1 (Notification Delivery E2E)
```

---

## Current State

### Provider Portal — New Campaign (`apps/provider/src/app/campaigns/new/page.tsx`, ~300+ lines)

- **Status**: FULLY IMPLEMENTED with 5-step wizard
- Steps: Basics → Audience → Content → Schedule → Review
- Wizard form:
  - **Basics**: name, description
  - **Audience**: targetType (all/segment/manual), segmentId or userIds
  - **Content**: category, subject, body
  - **Schedule**: scheduleType (now/scheduled), scheduledAt
  - **Review**: policy preview with `usePreviewCampaignPolicy()` — shows ALLOW/DENY per sample user
- Launch: `useCreateCampaign()` → POST `/api/campaigns`, then redirect to detail

### Provider Portal — Campaign Detail (`apps/provider/src/app/campaigns/[id]/page.tsx`, ~313 lines)

- CampaignProgressBar, 6 analytics cards, Overview/Recipients tabs
- LaunchConfirmationModal, cancel/clone/edit actions
- Real-time: `useCampaignProgressUpdated(id)` — SSE subscription
- Paginated recipients table with status filter

### Provider Portal — Mutations (`apps/provider/src/lib/mutations/campaigns.ts`, ~25 lines)

```tsx
useCreateCampaign(input)   → POST /api/campaigns
useUpdateCampaign(id)      → PUT /api/campaigns/{id}
useLaunchCampaign(id)      → POST /api/campaigns/{id}/launch
useCancelCampaign(id)      → POST /api/campaigns/{id}/cancel
```

### Worker Service — Campaign Processing (`services/worker-service/internal/worker/`)

- `dispatcher.go` + `processor.go`
- Consumes `campaign.launched` event from Redis Streams
- Fans out: iterates target users → calls `notification-service.CreateNotification()` per user
- Each target gets independent policy evaluation
- Publishes `campaign_progress` events for real-time tracking

### Web App — Inbox

- Customer receives campaign notifications as regular notifications
- Same delivery path as Task 6.1 — appears in inbox with correct category and SP name
- No special "campaign" UI — notifications are individual from customer perspective

---

## Requirements

### Sub-task 6.5.1 — Provider Portal: Create Campaign

- [x] Open Provider Portal → navigate to `/campaigns/new`
- [x] **Step 1 — Basics**:
  - Enter name: "Q1 Feature Announcement"
  - Enter description: "Inform customers about new account features"
  - Click Next
- [x] **Step 2 — Audience**:
  - Select target type: `manual`
  - Add 3+ customer virtual IDs as targets
  - Verify search/autocomplete works for finding customers
  - Click Next
- [x] **Step 3 — Content**:
  - Select category: `ORGANIZATIONAL` (to maximize policy ALLOW rate)
  - Enter subject: "New Features Now Available!"
  - Enter body: "We're excited to announce new account features..."
  - Click Next
- [x] **Step 4 — Schedule**:
  - Select: "Send Now"
  - Click Next
- [x] **Step 5 — Review**:
  - Verify summary shows all configuration
  - Verify `usePreviewCampaignPolicy()` shows policy preview per sample target:
    - Green checkmarks for targets that pass policy
    - Red X marks for targets that would be denied (with reason)
  - Click "Launch Campaign"

### Sub-task 6.5.2 — Backend: Campaign Creation & Launch

- [x] Verify campaign persisted in PostgreSQL:
  ```sql
  SELECT id, name, status, target_count, schedule_type, launched_at
  FROM campaigns
  WHERE name = 'Q1 Feature Announcement'
  ORDER BY created_at DESC LIMIT 1;
  ```
  - Status: `LAUNCHED` (after launch step)
  - Target count: matches selected recipients
- [x] Verify campaign targets persisted:
  ```sql
  SELECT campaign_id, user_id, status
  FROM campaign_targets
  WHERE campaign_id = '<campaign-id>';
  ```
  - Each target: status `PENDING`
- [x] Verify `campaign.launched` event published to Redis Streams
- [x] Check Jaeger trace: `notification-service / CreateCampaign` + `LaunchCampaign` spans

### Sub-task 6.5.3 — Worker: Fan-Out Processing

- [x] Verify worker-service picks up campaign launch event
- [x] Verify per-target processing:
  - For each target user:
    1. Calls `notification-service.CreateNotification()` with campaign metadata
    2. Policy evaluation runs independently per user
    3. ALLOW → notification created with `campaign_id` in metadata
    4. DENY → target status updated to `REJECTED` with reason
- [x] Verify progress events published for real-time tracking:
  - Event: `campaign_progress`
  - Payload: `{ campaign_id, sent, delivered, failed, rejected, total }`
- [x] Check worker logs:
  ```
  "processing campaign target" notification_id=... user_id=... campaign_id=...
  ```
- [x] Verify all targets processed (no targets stuck in PENDING)

### Sub-task 6.5.4 — Provider Portal: Real-Time Progress

- [x] Navigate to `/campaigns/<campaign-id>`
- [x] Verify real-time progress via `useCampaignProgressUpdated(id)`:
  - CampaignProgressBar updates: "X of Y targets processed"
  - Progress percentage fills
- [x] Verify 6 analytics cards update:
  - Total Targets
  - Sent count
  - Delivered count
  - Failed count
  - Rejected (policy denied) count
  - Delivery rate percentage
- [x] Verify Recipients tab:
  - Table shows each target with individual status
  - Filter: All / Sent / Delivered / Failed / Rejected
  - Each row: customer VID, status badge, delivery timestamp

### Sub-task 6.5.5 — Web App: Customers Receive Notifications

- [x] Log in as each target customer on the Web App
- [x] Navigate to `/inbox`
- [x] Verify notification received:
  - Title: "New Features Now Available!"
  - Body: correct content from campaign
  - Category: ORGANIZATIONAL
  - SP name: the sending organization
  - Unread indicator
- [x] Verify each customer receives their own individual notification (not a "campaign" object)
- [x] Mark as read → verify status updates per Task 6.1 flow

### Sub-task 6.5.6 — Policy Denials in Campaign

- [x] Set up at least one target customer to trigger policy denial:
  - **Option A**: Customer has blocked the SP
  - **Option B**: Customer has ORGANIZATIONAL category disabled
  - **Option C**: Customer is in DND window
- [x] Launch campaign including this customer
- [x] Verify per-target policy evaluation:
  - Denied target: status `REJECTED` with reason in campaign_targets table
  - Other targets: proceed normally
- [x] Verify Provider Portal campaign detail:
  - Rejected count increments
  - Recipients tab: denied customer shows `REJECTED` badge with reason tooltip
  - Campaign analytics card: rejection reason breakdown
- [x] Verify denied customer does NOT receive notification in Web App

### Sub-task 6.5.7 — Campaign Analytics Aggregation

- [x] After campaign completes (all targets processed):
  - Verify final campaign status: `COMPLETED` (or `SENT`)
  - Verify aggregate counts:
    ```sql
    SELECT status, COUNT(*) FROM campaign_targets
    WHERE campaign_id = '<campaign-id>'
    GROUP BY status;
    ```
    - DELIVERED + REJECTED + FAILED = total targets
  - Verify analytics-service receives campaign events:
    - Daily campaign counts updated
    - Per-SP campaign metrics updated
- [x] Navigate to Provider Portal `/analytics`
  - Verify campaign metrics reflected in analytics dashboard
  - Campaign panel: recent campaigns with delivery rates

---

## Verification Checklist

- [x] Provider: 5-step wizard → create campaign → launch → persisted with LAUNCHED status
- [x] Worker: picks up campaign → fans out to all targets → per-user policy evaluation
- [x] Allowed targets: notification created → delivered → visible in customer inbox
- [x] Denied targets: marked REJECTED with reason → not delivered to customer
- [x] Provider detail: real-time progress bar updates via SSE
- [x] Provider detail: analytics cards show correct sent/delivered/failed/rejected counts
- [x] Provider detail: recipients table shows per-target status with filters
- [x] Web App: each allowed target customer sees individual notification in inbox
- [x] Campaign analytics: aggregate counts match individual target statuses
- [x] Policy preview (step 5): accurately predicts which targets will pass/fail
- [x] Jaeger: traces for campaign launch → worker fan-out → per-target notification creation
