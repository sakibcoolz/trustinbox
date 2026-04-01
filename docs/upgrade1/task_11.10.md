# Task 11.10 — Analytics Queries Scoped by spId + Date Range

> **Section**: 11. Analytics — GraphQL Integration  
> **Priority**: P0 — Security & scoping  
> **Estimated Scope**: Small  
> **Route**: `/analytics`  
> **File**: `apps/provider/src/app/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Ensure all analytics queries on the `/analytics` page are correctly scoped by `serviceProviderId` from the auth context and date range from the date selector. Wire the full page together so every panel shares the same scoping variables and re-fetches cohesively when the date range changes.

---

## Current State

The analytics page is a static component with no queries at all. No `serviceProviderId` is used. No date range is passed to any query.

### Auth Context

```typescript
// From AuthContext
const { activeServiceProvider } = useAuth();
const serviceProviderId = activeServiceProvider?.id;
```

### Date Range Hook

```typescript
// From useDateRange
const { range } = useDateRange();
const from = range.from.toISOString();
const to = range.to.toISOString();
```

---

## Requirements

### 1. Shared Variables

All queries on the page share the same variables:

```typescript
const dateVars: AnalyticsDateVars = {
  serviceProviderId,
  from: range.from.toISOString(),
  to: range.to.toISOString(),
};
```

### 2. Query Calls

| Panel | Query | Variables |
|-------|-------|-----------|
| Summary cards | `GET_ANALYTICS_OVERVIEW` | `dateVars` |
| Notification panel | `GET_NOTIFICATION_ANALYTICS` | `dateVars` |
| Callback panel | `GET_CALLBACK_ANALYTICS` | `dateVars` |
| Campaign panel | Uses `GET_ANALYTICS_OVERVIEW` data | — |
| Bot panel | Uses `GET_ANALYTICS_OVERVIEW` data | — |
| Policy panel | Uses `GET_ANALYTICS_OVERVIEW` data | — |
| Daily table | `GET_DAILY_ANALYTICS` | `dateVars` |

### 3. Re-fetch on Range Change

- When date range changes, all queries re-fetch automatically (Apollo reactivity on variable change)
- No manual cache clearing needed
- Use `fetchPolicy: 'cache-and-network'` for fresh data

### 4. Guard

- If no `serviceProviderId`, show "Select a service provider" message
- If auth loading, show page skeleton

### 5. Page Layout Assembly

```
┌─────────────────────────────────────────────────────┐
│ Header: "Analytics" + DateRangeSelector + Export     │
├─────────────────────────────────────────────────────┤
│ Summary KPI Cards (6 cards from overview data)      │
├──────────────────────┬──────────────────────────────┤
│ Notification Panel   │ Callback Panel               │
├──────────────────────┼──────────────────────────────┤
│ Campaign Panel       │ Bot Panel                    │
├──────────────────────┴──────────────────────────────┤
│ Policy Panel (full width)                           │
├─────────────────────────────────────────────────────┤
│ Daily Analytics Table (full width)                  │
└─────────────────────────────────────────────────────┘
```

---

## Implementation Plan

```tsx
'use client';

import { useDateRange } from '@/hooks/useDateRange';
import { useAuth } from '@/contexts/AuthContext';
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector';
import {
  useAnalyticsOverview,
  useNotificationAnalytics,
  useCallbackAnalytics,
  useDailyAnalytics,
} from '@/lib/graphql/analytics';

export default function AnalyticsPage() {
  const { activeServiceProvider } = useAuth();
  const serviceProviderId = activeServiceProvider?.id ?? '';
  const { range, updateRange } = useDateRange();

  const dateVars = {
    serviceProviderId,
    from: range.from.toISOString(),
    to: range.to.toISOString(),
  };

  // All queries scoped by spId + date range
  const { data: overviewData, loading: overviewLoading } = useAnalyticsOverview(dateVars);
  const { data: notificationData, loading: notifLoading } = useNotificationAnalytics(dateVars);
  const { data: callbackData, loading: callbackLoading } = useCallbackAnalytics(dateVars);
  const { data: dailyData, loading: dailyLoading } = useDailyAnalytics(dateVars);

  if (!serviceProviderId) {
    return (
      <div className="p-8 text-center text-text-muted">
        Select a service provider to view analytics.
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Analytics</h1>
          <p className="text-text-secondary mt-1">Communication performance and trends</p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector range={range} onRangeChange={updateRange} />
          <ExportButton dateVars={dateVars} dailyData={dailyData?.dailyAnalytics} />
        </div>
      </div>

      {/* Summary KPI Cards */}
      <SummaryCards data={overviewData?.dashboardAnalytics} loading={overviewLoading} />

      {/* Panel Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <NotificationAnalyticsPanel data={notificationData?.notificationAnalytics} loading={notifLoading} />
        <CallbackAnalyticsPanel data={callbackData?.callbackAnalytics} loading={callbackLoading} />
        <CampaignAnalyticsPanel dashboardData={overviewData?.dashboardAnalytics} loading={overviewLoading} />
        <BotAnalyticsPanel dashboardData={overviewData?.dashboardAnalytics} dateVars={dateVars} loading={overviewLoading} />
      </div>

      {/* Policy Panel */}
      <PolicyAnalyticsPanel dashboardData={overviewData?.dashboardAnalytics} loading={overviewLoading} />

      {/* Daily Table */}
      <DailyAnalyticsTable data={dailyData?.dailyAnalytics} loading={dailyLoading} />
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/analytics/page.tsx` | **Modify** | Wire all queries with shared dateVars, assemble full layout |

---

## Acceptance Criteria

- [ ] All queries use the same `serviceProviderId` from auth context
- [ ] All queries use the same `from`/`to` from date range selector
- [ ] Changing date range re-fetches all panels automatically
- [ ] Guard: "Select a service provider" shown when no spId
- [ ] All 6 panels + daily table rendered in correct layout
- [ ] `fetchPolicy: 'cache-and-network'` for fresh data
- [ ] Hardcoded AnalyticsRow helper and mock data fully removed
- [ ] Page works end-to-end: date range → queries → panels

---

## Dependencies

- **Blocked by**: Tasks 11.1 (date range), 11.9 (GraphQL queries), 11.2-11.8 (panel components)
- **Blocks**: None
- **Related**: Dashboard page (similar pattern with dateVars scoping)
