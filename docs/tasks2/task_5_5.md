# Task 5.5 — Campaign Detail Page Polish

> **Phase**: 5 — Provider Portal: Completion
> **Task**: 5.5 — Enhance Campaign Detail with Real-Time Progress & Actions
> **File**: `apps/provider/src/app/campaigns/[id]/page.tsx` (313 lines — exists, substantial)
> **Components**: `CampaignProgressBar.tsx` (98 lines), `LaunchConfirmationModal.tsx` (133 lines)
> **Dependencies**: `notification-service` (campaign RPCs), `worker-service` (CampaignSendProcessor)
> **Data Sources**: `@/lib/graphql/campaigns` (hooks for campaign, analytics, targets, cancel, launch, progress subscription)

---

## Objective

Enhance the existing campaign detail page with delivery breakdown by channel, real-time SSE progress updates during active campaigns, Pause/Resume actions for running campaigns, and polish the recipients table with user-friendly identifiers and export capability.

---

## Current State

### Campaign Detail — Already Feature-Rich (313 lines)
```typescript
// apps/provider/src/app/campaigns/[id]/page.tsx
// ✅ Header: campaign name, status badge, category badge, action buttons
// ✅ CampaignProgressBar: stacked delivery progress bar
// ✅ Analytics Cards: 6 metrics (targets, sent, delivered, read, failed, skipped)
// ✅ Tabs: Overview (details + delivery rate progress bars) / Recipients (filtered paginated table)
// ✅ LaunchConfirmationModal: policy preview with launch action
// ✅ Cancel action: for RUNNING/SCHEDULED campaigns
// ✅ Clone action: always available
// ✅ Edit action: for DRAFT campaigns
// ✅ Real-time: useCampaignProgressUpdated(id) subscription
// ✅ Recipients table: userId, status badge, sent/delivered timestamps, failure reason
// ✅ Pagination: 10 items/page with prev/next
```

### What's Missing
```
❌ No delivery breakdown by channel (push, email, SMS, in-app)
❌ No Pause/Resume actions for running campaigns
❌ Recipients show raw userId (not user-friendly identifier)
❌ No export capability for recipients list
❌ No delivery timeline chart showing send rate over time
❌ useCampaignProgressUpdated — need to verify SSE actually updates UI
```

### Campaign Hooks — Already Comprehensive
```typescript
// apps/provider/src/lib/graphql/campaigns.ts
useCampaign(id, spId)              // GET campaign detail
useCampaignAnalytics({...})        // GET campaign analytics
useCampaignTargets({...})          // GET paginated targets
useCancelCampaign()                // POST cancel
useCampaignProgressUpdated(id)     // SSE subscription for progress
// Helper functions: getStatusConfig(), getCategoryConfig(), getTargetStatusConfig()
```

---

## Requirements

### 5.5.1 — Add Delivery Breakdown by Channel
- [x] Add a new section in the Overview tab: "Delivery by Channel"
  - [x] Horizontal bar chart or stacked bars showing:
    - Push: count + percentage
    - Email: count + percentage
    - SMS: count + percentage
    - In-App: count + percentage
  - [x] Data source: from campaign analytics or target breakdown
  - [x] If channel breakdown not available in analytics API: add to `CampaignAnalytics` type or compute from target data
- [x] Visual: colored bars (Push: blue, Email: green, SMS: orange, In-App: purple)
- [x] Show total per channel with rate

### 5.5.2 — Add Pause/Resume Campaign Actions
- [x] Add "Pause" button for RUNNING campaigns:
  - [x] Confirmation dialog: "Pausing will stop sending to remaining targets. You can resume later."
  - [x] Wire to `pauseCampaign` mutation (if gateway supports it)
  - [x] Status changes to PAUSED
- [x] Add "Resume" button for PAUSED campaigns:
  - [x] Wire to `resumeCampaign` mutation
  - [x] Status changes back to RUNNING
  - [x] Continue from where it left off (not restart)
- [x] Check if backend supports Pause/Resume:
  - [x] If not: add TODO comment, keep buttons disabled with "Coming soon" tooltip
  - [x] Gateway endpoint needed: `POST /api/campaigns/:id/pause`, `POST /api/campaigns/:id/resume`

### 5.5.3 — Improve Recipients Table
- [x] Replace raw `userId` with more useful identifier:
  - [x] If user has VID (virtual ID): show VID (masked)
  - [x] If customer name available: show name + VID
  - [x] Fallback: truncated UUID with copy-on-click
- [x] Add "Read At" column (if target has read timestamp)
- [x] Add status-specific row styling:
  - [x] Failed: subtle red background
  - [x] Skipped: subtle orange background
- [x] Add bulk selection:
  - [x] Checkbox column
  - [x] "Export Selected" or "Retry Failed" action (if backend supports)

### 5.5.4 — Add Recipients Export
- [x] Add "Export CSV" button above recipients table:
  - [x] Export all recipients (not just current page)
  - [x] Columns: User ID, Status, Sent At, Delivered At, Read At, Failure Reason
  - [x] File name: `campaign-<name>-recipients-<date>.csv`
  - [x] Reuse existing CSV export utilities from `@/lib/utils/csv-export`
- [x] Add "Export Analytics" for campaign-level metrics

### 5.5.5 — Verify Real-Time Progress Updates
- [x] Test `useCampaignProgressUpdated(id)` during an active campaign:
  - [x] Verify progress bar updates as targets are processed
  - [x] Verify analytics cards update (sent/delivered/failed counts)
  - [x] Verify recipients table shows new statuses
- [x] If SSE not working:
  - [x] Add manual refresh button with auto-refresh toggle (every 5s during RUNNING status)
  - [x] Wire to `useLiveNotifications()` SSE stream for campaign delivery events
- [x] Add visual indicator when receiving real-time updates:
  - [x] Subtle pulse on progress bar during active campaigns
  - [x] "Live" badge next to campaign status when RUNNING

### 5.5.6 — Add Delivery Timeline Chart
- [x] Add a mini chart in Overview tab showing send rate over time:
  - [x] X-axis: time (minutes since launch)
  - [x] Y-axis: cumulative count
  - [x] Lines: Sent (cumulative), Delivered (cumulative)
  - [x] Use `recharts` LineChart (already available)
  - [x] Data source: derive from target timestamps or campaign progress events
  - [x] Only show for RUNNING or COMPLETED campaigns (not DRAFT)

---

## Implementation Details

### Channel Breakdown Component

```tsx
function ChannelBreakdown({ analytics }: { analytics: CampaignAnalytics }) {
  // If analytics has channel data:
  const channels = [
    { name: 'Push', count: analytics.pushDelivered ?? 0, color: 'bg-accent-blue' },
    { name: 'Email', count: analytics.emailDelivered ?? 0, color: 'bg-status-success' },
    { name: 'SMS', count: analytics.smsDelivered ?? 0, color: 'bg-accent-orange' },
    { name: 'In-App', count: analytics.inAppDelivered ?? 0, color: 'bg-accent-purple' },
  ];

  const total = channels.reduce((sum, ch) => sum + ch.count, 0) || 1;

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Delivery by Channel</h3>
      <div className="space-y-3">
        {channels.map((ch) => (
          <div key={ch.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-text-secondary">{ch.name}</span>
              <span className="text-text-primary">{ch.count.toLocaleString()} ({((ch.count / total) * 100).toFixed(1)}%)</span>
            </div>
            <div className="w-full h-2 bg-bg-tertiary rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${ch.color}`} style={{ width: `${(ch.count / total) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Recipients CSV Export

```tsx
function handleExportRecipients() {
  // Fetch all targets (no pagination limit - or large limit)
  const headers = ['User ID', 'Status', 'Sent At', 'Delivered At', 'Failure Reason'];
  const rows = allTargets.map(t => [
    t.userId,
    t.status,
    t.sentAt ? new Date(t.sentAt).toISOString() : '',
    t.deliveredAt ? new Date(t.deliveredAt).toISOString() : '',
    t.failedReason || '',
  ]);
  const csv = buildCsvString(headers, rows);
  downloadCsv(csv, `campaign-${campaign.name}-recipients-${new Date().toISOString().split('T')[0]}.csv`);
}
```

### Live Badge for Running Campaigns

```tsx
{campaign.status === 'RUNNING' && (
  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-status-success/10 text-status-success">
    <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse" />
    Live
  </span>
)}
```

---

## Verification

- [x] Channel breakdown shows delivery counts per channel (push/email/SMS/in-app)
- [x] Channel bars are proportional and show percentage
- [x] Pause button appears for RUNNING campaigns (or disabled with "coming soon")
- [x] Resume button appears for PAUSED campaigns (or disabled with "coming soon")
- [x] Cancel action works with confirmation
- [x] Recipients: user IDs are more readable (truncated UUID or VID)
- [x] Recipients: "Read At" column displays when available
- [x] Recipients: failed rows have subtle red styling
- [x] Recipients CSV export: downloads file with all recipients
- [x] Real-time: progress bar updates during active campaign
- [x] Real-time: "Live" badge shows for RUNNING campaigns
- [x] Delivery timeline chart shows cumulative send/deliver rates
- [x] Analytics cards: all 6 metrics display with correct values
- [x] Pagination: works correctly with status filtering
- [x] Mobile: page layout stacks vertically on small screens
