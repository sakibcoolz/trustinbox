# Task 9.10 — Campaign Delivery Progress Bar

> **Section**: 9. Campaigns  
> **Priority**: P1 — Detail page enhancement  
> **Estimated Scope**: Medium  
> **Route**: `/campaigns/[id]`  
> **File**: `apps/provider/src/app/campaigns/[id]/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Replace the hardcoded delivery funnel on the campaign detail page with a dynamic, real-time progress bar showing sent, delivered, failed, and blocked counts with percentage breakdowns. The bar should auto-update via the `providerCampaignProgressUpdated` subscription for running campaigns.

---

## Current State

```tsx
// apps/provider/src/app/campaigns/[id]/page.tsx
<div className="bg-bg-card border border-border-primary rounded-xl p-6">
  <h3 className="text-sm font-semibold mb-4">Delivery Funnel</h3>
  <div className="space-y-3">
    {[
      { label: 'Targeted', value: c.targets, pct: 100 },
      { label: 'Delivered', value: c.delivered, pct: parseFloat(deliveryRate) },
      { label: 'Opened', value: c.opened, pct: parseFloat(openRate) },
      { label: 'Clicked', value: c.clicked, pct: parseFloat(clickRate) },
    ].map((step) => (
      // ... horizontal bars with hardcoded values
    ))}
  </div>
</div>
```

**Issues**:
- Uses `targets`, `delivered`, `opened`, `clicked` from mock data
- `opened`/`clicked` not in Campaign type — in CampaignAnalytics
- No real-time update capability
- Static percentages

---

## Requirements

### 1. Progress Bar Segments

Based on `Campaign` type fields:

| Segment | Field | Color | Priority |
|---------|-------|-------|----------|
| Delivered | `deliveredCount` | `bg-status-success` | Foreground |
| Sent (in-transit) | `sentCount - deliveredCount` | `bg-accent-blue` | Mid |
| Failed | `failedCount` | `bg-status-error` | Mid |
| Read | `readCount` | `bg-accent-purple` | Overlay indicator |
| Remaining | `targetCount - sentCount - failedCount` | `bg-bg-tertiary` | Background |

### 2. Visual Design

```
Delivery Progress (78.4%)
┌────────────────────────────────────────────┐
│████████████████████████████░░░░░▓▓▓░░░░░░░░│
│ Delivered (4,080)  In Transit  Failed  Rem │
└────────────────────────────────────────────┘

  ● Delivered  4,080  (78.4%)
  ● In Transit   520  (10.0%)
  ● Failed       150  ( 2.9%)
  ● Remaining    450  ( 8.7%)
  ────────────────────────────
  Total Targets  5,200
```

### 3. Real-Time Updates

- For `RUNNING` campaigns: subscribe to `providerCampaignProgressUpdated`
- Merge subscription data into cached campaign object
- Progress bar animates on count changes (CSS transitions)
- Show "Live" indicator badge next to title when subscribed

### 4. Status-Dependent Display

| Status | Progress Bar | Live Badge |
|--------|-------------|------------|
| `DRAFT_CAMPAIGN` | Hidden | No |
| `SCHEDULED` | Hidden (show scheduled time instead) | No |
| `RUNNING` | Visible + animated | Yes |
| `COMPLETED` | Visible (final state) | No |
| `CANCELLED` | Visible (final state) with cancelled banner | No |

---

## Implementation Plan

```tsx
interface DeliveryProgressProps {
  campaign: Campaign;
  isLive?: boolean;
}

function DeliveryProgressBar({ campaign, isLive }: DeliveryProgressProps) {
  const { targetCount, sentCount, deliveredCount, failedCount, readCount } = campaign;

  if (targetCount === 0) return null;

  const deliveredPct = (deliveredCount / targetCount) * 100;
  const inTransitPct = (Math.max(0, sentCount - deliveredCount) / targetCount) * 100;
  const failedPct = (failedCount / targetCount) * 100;

  const segments = [
    { label: 'Delivered', count: deliveredCount, pct: deliveredPct, color: 'bg-status-success', dot: 'bg-status-success' },
    { label: 'In Transit', count: Math.max(0, sentCount - deliveredCount), pct: inTransitPct, color: 'bg-accent-blue', dot: 'bg-accent-blue' },
    { label: 'Failed', count: failedCount, pct: failedPct, color: 'bg-status-error', dot: 'bg-status-error' },
    { label: 'Remaining', count: targetCount - sentCount - failedCount, pct: 100 - deliveredPct - inTransitPct - failedPct, color: 'bg-bg-tertiary', dot: 'bg-border-secondary' },
  ];

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Delivery Progress</h3>
        {isLive && (
          <span className="flex items-center gap-1.5 text-xs text-status-success">
            <span className="w-2 h-2 rounded-full bg-status-success animate-pulse" />
            Live
          </span>
        )}
      </div>

      {/* Stacked bar */}
      <div className="w-full h-3 bg-bg-tertiary rounded-full overflow-hidden flex mb-4">
        {segments.filter(s => s.pct > 0).map((s) => (
          <div key={s.label} className={`h-full ${s.color} transition-all duration-500`}
            style={{ width: `${s.pct}%` }} />
        ))}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {segments.map((s) => (
          <div key={s.label} className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${s.dot}`} />
            <div>
              <p className="text-xs text-text-muted">{s.label}</p>
              <p className="text-sm font-medium">{s.count.toLocaleString()} <span className="text-text-muted text-xs">({s.pct.toFixed(1)}%)</span></p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/[id]/page.tsx` | **Modify** | Replace hardcoded funnel with dynamic progress bar |
| `apps/provider/src/components/DeliveryProgressBar.tsx` | **Create** (optional) | Extract as reusable component |

---

## Acceptance Criteria

- [ ] Stacked progress bar shows delivered, in-transit, failed, remaining segments
- [ ] Percentages computed from Campaign type fields
- [ ] Legend below bar shows count + percentage for each segment
- [ ] "Live" badge shown for RUNNING campaigns with active subscription
- [ ] Bar segments animate smoothly on data updates (CSS transitions)
- [ ] Hidden for DRAFT/SCHEDULED campaigns
- [ ] Shows final state for COMPLETED/CANCELLED campaigns
- [ ] Handles edge cases: 0 targets, all delivered, all failed

---

## Dependencies

- **Blocked by**: Task 9.9 (campaign detail with real data)
- **Blocks**: None
- **Related**: Task 9.4 (mini-chart in list — similar logic), Task 9.21 (subscription for live updates)
