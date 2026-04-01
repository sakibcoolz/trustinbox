# Task 11.2 — Notification Analytics Panel

> **Section**: 11. Analytics  
> **Priority**: P0 — Core panel  
> **Estimated Scope**: Large  
> **Route**: `/analytics`  
> **File**: `apps/provider/src/app/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Replace the hardcoded Notification Analytics section with a GraphQL-powered panel showing total sent, delivered, failed, blocked KPI cards, delivery rate over time (line chart placeholder), breakdown by category (bar chart placeholder), and breakdown by channel (donut chart placeholder).

---

## Current State

```tsx
<div className="bg-bg-card border border-border-primary rounded-xl p-6">
  <h3 className="text-sm font-medium text-text-secondary mb-4">Notification Analytics</h3>
  <div className="space-y-3">
    <AnalyticsRow label="Sent" value="18,542" />
    <AnalyticsRow label="Delivered" value="18,022" />
    <AnalyticsRow label="Failed" value="520" />
    <AnalyticsRow label="Avg Delivery Time" value="1.2s" />
  </div>
</div>
```

**Issues**: All values hardcoded. No GraphQL query. No charts. Missing "blocked" count and "read" count.

### GraphQL Schema

```graphql
type NotificationAnalytics {
  totalSent: Int!
  totalDelivered: Int!
  totalRead: Int!
  totalRejected: Int!
  deliveryRate: Float!
  readRate: Float!
}

query {
  notificationAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): NotificationAnalytics!
}
```

Also from `DashboardAnalytics`:
```graphql
notificationsSent: Int!
notificationsDelivered: Int!
notificationsRead: Int!
notificationsRejected: Int!
deliveryRate: Float!
readRate: Float!
```

---

## Requirements

### 1. KPI Cards

| Metric | Source | Format | Color |
|--------|--------|--------|-------|
| Total Sent | `totalSent` | Number | `text-accent-blue` |
| Delivered | `totalDelivered` | Number | `text-status-success` |
| Read | `totalRead` | Number | `text-accent-purple` |
| Rejected/Blocked | `totalRejected` | Number | `text-status-error` |
| Delivery Rate | `deliveryRate` | Percentage | `text-status-success` |
| Read Rate | `readRate` | Percentage | `text-accent-blue` |

### 2. Delivery Rate Over Time (Placeholder)

- Line chart showing daily delivery rate from `dailyAnalytics` entries
- X-axis: date, Y-axis: percentage
- Data source: `dailyAnalytics[].notificationsDelivered / notificationsSent`
- Chart component placeholder (can use a simple bar/progress approach until a charting library is added)

### 3. Breakdown by Category (Future)

- Bar chart: Personal vs Organizational vs Advertisement
- Schema doesn't provide category breakdown yet — show placeholder

### 4. Breakdown by Channel (Future)

- Donut chart: In-App, SMS, Email, WhatsApp
- Schema doesn't provide channel breakdown yet — show placeholder

---

## Implementation Plan

```tsx
function NotificationAnalyticsPanel({ dateVars }: { dateVars: AnalyticsDateVars }) {
  const { data, loading } = useQuery(GET_NOTIFICATION_ANALYTICS, {
    variables: dateVars,
  });

  if (loading) return <PanelSkeleton />;
  const stats = data?.notificationAnalytics;

  const kpis = [
    { label: 'Total Sent', value: stats?.totalSent?.toLocaleString() ?? '0', color: 'text-accent-blue' },
    { label: 'Delivered', value: stats?.totalDelivered?.toLocaleString() ?? '0', color: 'text-status-success' },
    { label: 'Read', value: stats?.totalRead?.toLocaleString() ?? '0', color: 'text-accent-purple' },
    { label: 'Rejected', value: stats?.totalRejected?.toLocaleString() ?? '0', color: 'text-status-error' },
    { label: 'Delivery Rate', value: stats?.deliveryRate ? `${stats.deliveryRate.toFixed(1)}%` : '—', color: 'text-status-success' },
    { label: 'Read Rate', value: stats?.readRate ? `${stats.readRate.toFixed(1)}%` : '—', color: 'text-accent-blue' },
  ];

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Notification Analytics</h3>
      <div className="grid grid-cols-3 gap-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="text-center">
            <p className="text-xs text-text-muted">{kpi.label}</p>
            <p className={`text-lg font-semibold mt-0.5 ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>
      {/* Delivery rate chart placeholder */}
      <div className="h-40 border border-border-secondary rounded-lg flex items-center justify-center text-xs text-text-muted">
        Delivery rate trend chart — coming soon
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/analytics/page.tsx` | **Modify** | Replace mock notification section with real data |
| `apps/provider/src/lib/graphql/analytics.ts` | **Create** | GET_NOTIFICATION_ANALYTICS query + types |

---

## Acceptance Criteria

- [ ] Notification analytics fetched from `notificationAnalytics` query
- [ ] 6 KPI values displayed with correct formatting
- [ ] Delivery rate and read rate shown as percentages
- [ ] Loading skeleton while fetching
- [ ] Error state with retry
- [ ] Chart placeholder for delivery rate over time
- [ ] Mock hardcoded values fully removed

---

## Dependencies

- **Blocked by**: Task 11.1 (date range selector), Task 11.9 (GraphQL query)
- **Blocks**: None
- **Related**: Task 11.7 (daily table — uses same date range)
