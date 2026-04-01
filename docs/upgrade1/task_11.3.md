# Task 11.3 — Callback Analytics Panel

> **Section**: 11. Analytics  
> **Priority**: P0 — Core panel  
> **Estimated Scope**: Medium  
> **Route**: `/analytics`  
> **File**: `apps/provider/src/app/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Replace the hardcoded Callback Analytics section with a GraphQL-powered panel showing total requests, approved, rejected, expired, completed, average response time, and completion rate trend.

---

## Current State

```tsx
<div className="bg-bg-card border border-border-primary rounded-xl p-6">
  <h3 className="text-sm font-medium text-text-secondary mb-4">Callback Analytics</h3>
  <div className="space-y-3">
    <AnalyticsRow label="Requested" value="3,201" />
    <AnalyticsRow label="Approved" value="2,705" />
    <AnalyticsRow label="Completed" value="2,470" />
    <AnalyticsRow label="Denied" value="496" />
  </div>
</div>
```

**Issues**: All hardcoded. Missing "Expired" count, "Approval Rate", "Avg Response Time".

### GraphQL Schema

```graphql
type CallbackAnalytics {
  totalRequested: Int!
  totalApproved: Int!
  totalRejected: Int!
  totalExpired: Int!
  approvalRate: Float!
  avgResponseTimeHours: Float!
}

query {
  callbackAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): CallbackAnalytics!
}
```

---

## Requirements

### 1. KPI Cards

| Metric | Source | Format | Color |
|--------|--------|--------|-------|
| Total Requested | `totalRequested` | Number | `text-accent-blue` |
| Approved | `totalApproved` | Number | `text-status-success` |
| Rejected | `totalRejected` | Number | `text-status-error` |
| Expired | `totalExpired` | Number | `text-status-warning` |
| Approval Rate | `approvalRate` | Percentage | `text-status-success` |
| Avg Response Time | `avgResponseTimeHours` | "X.Xh" | `text-accent-purple` |

### 2. Completion Rate Trend (Placeholder)

- Line chart over time from `dailyAnalytics[].callbacksApproved / callbacksRequested`
- Placeholder until charting library added

---

## Implementation Plan

```tsx
function CallbackAnalyticsPanel({ dateVars }: { dateVars: AnalyticsDateVars }) {
  const { data, loading } = useQuery(GET_CALLBACK_ANALYTICS, {
    variables: dateVars,
  });

  if (loading) return <PanelSkeleton />;
  const stats = data?.callbackAnalytics;

  const kpis = [
    { label: 'Total Requested', value: stats?.totalRequested?.toLocaleString() ?? '0', color: 'text-accent-blue' },
    { label: 'Approved', value: stats?.totalApproved?.toLocaleString() ?? '0', color: 'text-status-success' },
    { label: 'Rejected', value: stats?.totalRejected?.toLocaleString() ?? '0', color: 'text-status-error' },
    { label: 'Expired', value: stats?.totalExpired?.toLocaleString() ?? '0', color: 'text-status-warning' },
    { label: 'Approval Rate', value: stats?.approvalRate ? `${stats.approvalRate.toFixed(1)}%` : '—', color: 'text-status-success' },
    { label: 'Avg Response', value: stats?.avgResponseTimeHours ? `${stats.avgResponseTimeHours.toFixed(1)}h` : '—', color: 'text-accent-purple' },
  ];

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Callback Analytics</h3>
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="text-center">
            <p className="text-xs text-text-muted">{kpi.label}</p>
            <p className={`text-lg font-semibold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="h-40 border border-border-secondary rounded-lg flex items-center justify-center text-xs text-text-muted">
        Approval rate trend chart — coming soon
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/analytics/page.tsx` | **Modify** | Replace mock callback section with real data |
| `apps/provider/src/lib/graphql/analytics.ts` | **Modify** | Add GET_CALLBACK_ANALYTICS query + types |

---

## Acceptance Criteria

- [ ] Callback analytics fetched from `callbackAnalytics` query
- [ ] 6 KPI values: requested, approved, rejected, expired, approval rate, avg response time
- [ ] Avg response time formatted as "X.Xh"
- [ ] Loading skeleton while fetching
- [ ] Chart placeholder for completion rate trend
- [ ] Mock hardcoded values removed

---

## Dependencies

- **Blocked by**: Task 11.1 (date range), Task 11.9 (GraphQL query)
- **Blocks**: None
- **Related**: Task 11.2 (notification panel — sibling panel)
