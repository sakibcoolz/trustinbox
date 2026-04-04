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
- [ ] Add a new section in the Overview tab: "Delivery by Channel"
  - [ ] Horizontal bar chart or stacked bars showing:
    - Push: count + percentage
    - Email: count + percentage
    - SMS: count + percentage
    - In-App: count + percentage
  - [ ] Data source: from campaign analytics or target breakdown
  - [ ] If channel breakdown not available in analytics API: add to `CampaignAnalytics` type or compute from target data
- [ ] Visual: colored bars (Push: blue, Email: green, SMS: orange, In-App: purple)
- [ ] Show total per channel with rate

### 5.5.2 — Add Pause/Resume Campaign Actions
- [ ] Add "Pause" button for RUNNING campaigns:
  - [ ] Confirmation dialog: "Pausing will stop sending to remaining targets. You can resume later."
  - [ ] Wire to `pauseCampaign` mutation (if gateway supports it)
  - [ ] Status changes to PAUSED
- [ ] Add "Resume" button for PAUSED campaigns:
  - [ ] Wire to `resumeCampaign` mutation
  - [ ] Status changes back to RUNNING
  - [ ] Continue from where it left off (not restart)
- [ ] Check if backend supports Pause/Resume:
  - [ ] If not: add TODO comment, keep buttons disabled with "Coming soon" tooltip
  - [ ] Gateway endpoint needed: `POST /api/campaigns/:id/pause`, `POST /api/campaigns/:id/resume`

### 5.5.3 — Improve Recipients Table
- [ ] Replace raw `userId` with more useful identifier:
  - [ ] If user has VID (virtual ID): show VID (masked)
  - [ ] If customer name available: show name + VID
  - [ ] Fallback: truncated UUID with copy-on-click
- [ ] Add "Read At" column (if target has read timestamp)
- [ ] Add status-specific row styling:
  - [ ] Failed: subtle red background
  - [ ] Skipped: subtle orange background
- [ ] Add bulk selection:
  - [ ] Checkbox column
  - [ ] "Export Selected" or "Retry Failed" action (if backend supports)

### 5.5.4 — Add Recipients Export
- [ ] Add "Export CSV" button above recipients table:
  - [ ] Export all recipients (not just current page)
  - [ ] Columns: User ID, Status, Sent At, Delivered At, Read At, Failure Reason
  - [ ] File name: `campaign-<name>-recipients-<date>.csv`
  - [ ] Reuse existing CSV export utilities from `@/lib/utils/csv-export`
- [ ] Add "Export Analytics" for campaign-level metrics

### 5.5.5 — Verify Real-Time Progress Updates
- [ ] Test `useCampaignProgressUpdated(id)` during an active campaign:
  - [ ] Verify progress bar updates as targets are processed
  - [ ] Verify analytics cards update (sent/delivered/failed counts)
  - [ ] Verify recipients table shows new statuses
- [ ] If SSE not working:
  - [ ] Add manual refresh button with auto-refresh toggle (every 5s during RUNNING status)
  - [ ] Wire to `useLiveNotifications()` SSE stream for campaign delivery events
- [ ] Add visual indicator when receiving real-time updates:
  - [ ] Subtle pulse on progress bar during active campaigns
  - [ ] "Live" badge next to campaign status when RUNNING

### 5.5.6 — Add Delivery Timeline Chart
- [ ] Add a mini chart in Overview tab showing send rate over time:
  - [ ] X-axis: time (minutes since launch)
  - [ ] Y-axis: cumulative count
  - [ ] Lines: Sent (cumulative), Delivered (cumulative)
  - [ ] Use `recharts` LineChart (already available)
  - [ ] Data source: derive from target timestamps or campaign progress events
  - [ ] Only show for RUNNING or COMPLETED campaigns (not DRAFT)

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

- [ ] Channel breakdown shows delivery counts per channel (push/email/SMS/in-app)
- [ ] Channel bars are proportional and show percentage
- [ ] Pause button appears for RUNNING campaigns (or disabled with "coming soon")
- [ ] Resume button appears for PAUSED campaigns (or disabled with "coming soon")
- [ ] Cancel action works with confirmation
- [ ] Recipients: user IDs are more readable (truncated UUID or VID)
- [ ] Recipients: "Read At" column displays when available
- [ ] Recipients: failed rows have subtle red styling
- [ ] Recipients CSV export: downloads file with all recipients
- [ ] Real-time: progress bar updates during active campaign
- [ ] Real-time: "Live" badge shows for RUNNING campaigns
- [ ] Delivery timeline chart shows cumulative send/deliver rates
- [ ] Analytics cards: all 6 metrics display with correct values
- [ ] Pagination: works correctly with status filtering
- [ ] Mobile: page layout stacks vertically on small screens
