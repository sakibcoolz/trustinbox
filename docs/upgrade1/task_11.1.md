# Task 11.1 — Date Range Selector

> **Section**: 11. Analytics  
> **Priority**: P0 — Foundation component  
> **Estimated Scope**: Medium  
> **Route**: `/analytics`  
> **File**: `apps/provider/src/app/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Replace the hardcoded `['7d', '30d', '90d']` button group with a fully functional date range selector supporting today, 7d, 30d, 90d, and custom calendar picker. Wire it to the analytics GraphQL queries so changing the range re-fetches all panels.

---

## Current State

```tsx
// apps/provider/src/app/analytics/page.tsx
<div className="flex gap-2">
  {['7d', '30d', '90d'].map((range) => (
    <button key={range}
      className="px-3 py-1.5 text-xs rounded-lg border border-border-secondary text-text-secondary hover:text-text-primary hover:border-border-active transition-colors">
      {range}
    </button>
  ))}
</div>
```

**Issues**:
- Buttons are decorative — no state, no onClick
- Missing "today" and "custom" presets (plan requires all 5)
- No calendar picker for custom range
- No active state styling

### Existing Infrastructure

- `useDateRange` hook exists at `apps/provider/src/hooks/useDateRange.ts` — supports today/7d/30d/90d/custom presets, URL sync via search params
- `DateRangeSelector` component exists at `apps/provider/src/components/dashboard/DateRangeSelector.tsx` — already used on dashboard
- The analytics page does NOT use either of these

### GraphQL Schema

All analytics queries accept `from: DateTime!` and `to: DateTime!`:
```graphql
dashboardAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): DashboardAnalytics!
notificationAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): NotificationAnalytics!
callbackAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): CallbackAnalytics!
dailyAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): [DailyAnalyticsEntry!]!
```

---

## Requirements

### 1. Presets

| Preset | Label | Calculation |
|--------|-------|-------------|
| `today` | Today | Start of today → now |
| `7d` | 7 Days | 7 days ago → now |
| `30d` | 30 Days | 30 days ago → now |
| `90d` | 90 Days | 90 days ago → now |
| `custom` | Custom | Calendar picker |

### 2. Integration

- Use existing `useDateRange` hook for state + URL sync
- Use or extend existing `DateRangeSelector` component
- Pass `from`/`to` ISO strings to all analytics queries on the page
- Re-fetch all panels on range change

### 3. Active State

- Active preset: `bg-accent-blue text-white` or `border-accent-blue text-accent-blue`
- Inactive: current border styling

### 4. Custom Calendar

- Date picker for start/end dates
- Max range: 1 year
- End date cannot be before start date

---

## Implementation Plan

```tsx
'use client';

import { useDateRange } from '@/hooks/useDateRange';
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector';

export default function AnalyticsPage() {
  const { range, updateRange } = useDateRange();
  const { serviceProviderId } = useServiceProvider();

  const dateVars = {
    serviceProviderId,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  // Pass dateVars to all useQuery calls...

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-text-secondary mt-1">Communication performance and trends</p>
        </div>
        <DateRangeSelector range={range} onRangeChange={updateRange} />
      </div>
      {/* Panels use dateVars */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/analytics/page.tsx` | **Modify** | Replace hardcoded buttons with DateRangeSelector + useDateRange |

---

## Acceptance Criteria

- [ ] Date range selector shows 5 presets: Today, 7d, 30d, 90d, Custom
- [ ] Active preset visually distinct
- [ ] Custom opens calendar picker
- [ ] Range persisted in URL search params
- [ ] Changing range re-fetches all analytics queries
- [ ] Uses existing `useDateRange` hook and `DateRangeSelector` component
- [ ] Hardcoded button group removed

---

## Dependencies

- **Blocked by**: None (existing hooks/components available)
- **Blocks**: Tasks 11.2-11.8 (all panels depend on date range)
- **Related**: Dashboard page DateRangeSelector (same component)
