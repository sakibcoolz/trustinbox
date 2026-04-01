# Task 9.2 — Campaign Status Filter Chips

> **Section**: 9. Campaigns  
> **Priority**: P1 — List filtering  
> **Estimated Scope**: Small  
> **Route**: `/campaigns`  
> **File**: `apps/provider/src/app/campaigns/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the static filter chips from hardcoded text buttons to functional status filters that re-query the campaigns list. Map chip labels to the `CampaignStatus` GraphQL enum and highlight the active filter.

---

## Current State

```tsx
// apps/provider/src/app/campaigns/page.tsx
<div className="flex gap-2 mb-6">
  {['All', 'Draft', 'Scheduled', 'In Progress', 'Completed'].map((filter) => (
    <button
      key={filter}
      className="px-3 py-1.5 text-xs rounded-full border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors"
    >
      {filter}
    </button>
  ))}
</div>
```

**Issues**:
- Clicking chips does nothing — no `onClick` handler
- No active state styling
- Missing "Cancelled" filter chip
- "In Progress" should map to `RUNNING`
- "Draft" should map to `DRAFT_CAMPAIGN`
- No count badges on chips

---

## Requirements

### 1. Filter Chip Configuration

| Chip Label | Schema Value | Color When Active |
|------------|-------------|-------------------|
| All | `null` (no filter) | `bg-accent-blue text-white` |
| Draft | `DRAFT_CAMPAIGN` | `bg-border-secondary text-text-primary` |
| Scheduled | `SCHEDULED` | `bg-accent-blue/10 text-accent-blue border-accent-blue` |
| Active | `RUNNING` | `bg-status-success/10 text-status-success border-status-success` |
| Completed | `COMPLETED` | `bg-accent-purple/10 text-accent-purple border-accent-purple` |
| Cancelled | `CANCELLED` | `bg-status-error/10 text-status-error border-status-error` |

### 2. Behavior

- Click a chip → set `statusFilter` state → queries re-fetch with `status` variable
- Active chip gets filled background + ring/border
- Inactive chips keep outline style
- "All" chip resets filter to `null`
- Optionally show count per status (derived from a summary query or cached data)

### 3. Interaction with Pagination

- Changing filter resets pagination offset to 0
- URL searchParams sync: `?status=RUNNING` for deep-linking (optional)

---

## Implementation Plan

```tsx
const FILTER_CHIPS = [
  { label: 'All', value: null },
  { label: 'Draft', value: 'DRAFT_CAMPAIGN' as CampaignStatus },
  { label: 'Scheduled', value: 'SCHEDULED' as CampaignStatus },
  { label: 'Active', value: 'RUNNING' as CampaignStatus },
  { label: 'Completed', value: 'COMPLETED' as CampaignStatus },
  { label: 'Cancelled', value: 'CANCELLED' as CampaignStatus },
];

function StatusFilterChips({
  activeFilter,
  onChange,
}: {
  activeFilter: CampaignStatus | null;
  onChange: (status: CampaignStatus | null) => void;
}) {
  return (
    <div className="flex gap-2 mb-6">
      {FILTER_CHIPS.map((chip) => {
        const isActive = activeFilter === chip.value;
        return (
          <button
            key={chip.label}
            onClick={() => onChange(chip.value)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              isActive
                ? 'bg-accent-blue/10 text-accent-blue border-accent-blue'
                : 'border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active'
            }`}
          >
            {chip.label}
          </button>
        );
      })}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/page.tsx` | **Modify** | Add functional filter chips with status mapping |

---

## Acceptance Criteria

- [ ] Six filter chips rendered: All, Draft, Scheduled, Active, Completed, Cancelled
- [ ] Clicking a chip sets `statusFilter` and triggers GraphQL re-fetch
- [ ] Active chip has distinct background/border styling
- [ ] "All" chip resets the filter to show all statuses
- [ ] Changing filter resets pagination to first page
- [ ] Labels map correctly to `CampaignStatus` enum values

---

## Dependencies

- **Blocked by**: Task 9.1 (campaign list table with statusFilter state)
- **Blocks**: None
- **Related**: Task 9.14 (GraphQL query accepts `status` filter variable)
