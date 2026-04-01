# Task 9.4 — Campaign Performance Mini-Chart

> **Section**: 9. Campaigns  
> **Priority**: P2 — Enhancement  
> **Estimated Scope**: Medium  
> **Route**: `/campaigns`  
> **File**: `apps/provider/src/app/campaigns/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a sparkline mini-chart to each active/running campaign row in the list table showing real-time delivery progress. The chart visualizes the ratio of sent, delivered, failed, and remaining targets as a compact horizontal progress bar or micro-bar chart.

---

## Current State

Campaign cards show raw numeric values for Targets, Delivered, and Opt-Outs with no visual progress indicator. No charts or progress visualization exist.

```tsx
<div className="text-right">
  <p className="text-xs text-text-muted">Targets</p>
  <p className="text-sm font-medium">{campaign.targets.toLocaleString()}</p>
</div>
<div className="text-right">
  <p className="text-xs text-text-muted">Delivered</p>
  <p className="text-sm font-medium">{campaign.delivered.toLocaleString()}</p>
</div>
```

---

## Requirements

### 1. Mini Progress Bar

For each campaign row, display a compact stacked horizontal bar showing:

| Segment | Color | Source |
|---------|-------|--------|
| Delivered | `bg-status-success` | `campaign.deliveredCount` |
| Sent (in-transit) | `bg-accent-blue` | `campaign.sentCount - campaign.deliveredCount` |
| Failed | `bg-status-error` | `campaign.failedCount` |
| Remaining | `bg-bg-tertiary` | `campaign.targetCount - campaign.sentCount - campaign.failedCount` |

### 2. Display Rules

- Only show for campaigns with `status === RUNNING` or `status === COMPLETED`
- For `DRAFT_CAMPAIGN` / `SCHEDULED`: show "—" or empty
- Width: ~120px inline in the table row
- Height: 6px with rounded corners
- Hover tooltip: "Delivered: X | Sent: Y | Failed: Z | Remaining: W"

### 3. Delivery Rate Label

- Show `deliveryRate` as percentage text next to the bar
- Formula: `(deliveredCount / targetCount * 100).toFixed(1)%`
- Color: green if > 90%, orange if 50-90%, red if < 50%

---

## Implementation Plan

```tsx
interface CampaignProgressProps {
  campaign: Campaign;
}

function CampaignProgressBar({ campaign }: CampaignProgressProps) {
  const { targetCount, sentCount, deliveredCount, failedCount, status } = campaign;

  if (status === 'DRAFT_CAMPAIGN' || status === 'SCHEDULED') {
    return <span className="text-xs text-text-muted">—</span>;
  }

  if (targetCount === 0) return <span className="text-xs text-text-muted">No targets</span>;

  const deliveredPct = (deliveredCount / targetCount) * 100;
  const inTransitPct = (Math.max(0, sentCount - deliveredCount) / targetCount) * 100;
  const failedPct = (failedCount / targetCount) * 100;

  const rateColor =
    deliveredPct > 90 ? 'text-status-success' :
    deliveredPct > 50 ? 'text-accent-orange' :
    'text-status-error';

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 bg-bg-tertiary rounded-full overflow-hidden flex">
        <div className="h-full bg-status-success" style={{ width: `${deliveredPct}%` }} />
        <div className="h-full bg-accent-blue" style={{ width: `${inTransitPct}%` }} />
        <div className="h-full bg-status-error" style={{ width: `${failedPct}%` }} />
      </div>
      <span className={`text-xs font-medium ${rateColor}`}>
        {deliveredPct.toFixed(1)}%
      </span>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/page.tsx` | **Modify** | Add CampaignProgressBar to table rows |
| `apps/provider/src/components/CampaignProgressBar.tsx` | **Create** (optional) | Extract as reusable component |

---

## Acceptance Criteria

- [ ] Each campaign row shows a stacked progress bar for RUNNING/COMPLETED campaigns
- [ ] Bar segments: delivered (green), in-transit (blue), failed (red), remaining (gray)
- [ ] Delivery rate percentage shown next to bar with conditional coloring
- [ ] DRAFT/SCHEDULED campaigns show "—" instead of bar
- [ ] Hover tooltip displays exact counts
- [ ] Bar renders correctly at 0%, partial, and 100% fill

---

## Dependencies

- **Blocked by**: Task 9.1 (campaign list table with real data)
- **Blocks**: None
- **Related**: Task 9.10 (full delivery progress bar on detail page), Task 9.13 (campaign analytics)
