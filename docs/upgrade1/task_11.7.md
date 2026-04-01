# Task 11.7 — Daily Analytics Table

> **Section**: 11. Analytics  
> **Priority**: P1 — Detailed breakdown  
> **Estimated Scope**: Medium  
> **Route**: `/analytics`  
> **File**: `apps/provider/src/app/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a daily analytics table section to the analytics page that fetches `dailyAnalytics(spId, range)` and displays a tabular breakdown by date with all key metrics per row.

---

## Current State

No daily table exists on the analytics page.

### GraphQL Schema

```graphql
type DailyAnalyticsEntry {
  date: String!
  notificationsSent: Int!
  notificationsDelivered: Int!
  notificationsRead: Int!
  callbacksRequested: Int!
  callbacksApproved: Int!
  messagesSent: Int!
  documentsShared: Int!
  botActions: Int!
  spamReports: Int!
  policyDenials: Int!
}

query {
  dailyAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): [DailyAnalyticsEntry!]!
}
```

---

## Requirements

### 1. Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| **Date** | `entry.date` | Formatted (Mon, Mar 4) |
| **Notifications Sent** | `notificationsSent` | Number |
| **Delivered** | `notificationsDelivered` | Number |
| **Read** | `notificationsRead` | Number |
| **Callbacks** | `callbacksRequested` | Number |
| **Callbacks Approved** | `callbacksApproved` | Number |
| **Messages** | `messagesSent` | Number |
| **Bot Actions** | `botActions` | Number |
| **Policy Denials** | `policyDenials` | Number |
| **Spam Reports** | `spamReports` | Red if > 0 |

### 2. Features

- Sortable columns (click header to sort asc/desc)
- Default sort: date descending (newest first)
- Highlight rows with high spam reports or policy denials
- Totals row at bottom

### 3. Responsive

- Horizontal scroll for narrow screens
- Sticky first column (date)

---

## Implementation Plan

```tsx
function DailyAnalyticsTable({ dateVars }: { dateVars: AnalyticsDateVars }) {
  const { data, loading } = useQuery(GET_DAILY_ANALYTICS, {
    variables: dateVars,
  });
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (loading) return <TableSkeleton rows={7} cols={10} />;
  const entries = data?.dailyAnalytics ?? [];

  const sorted = [...entries].sort((a, b) => {
    const aVal = a[sortBy as keyof DailyAnalyticsEntry];
    const bVal = b[sortBy as keyof DailyAnalyticsEntry];
    const cmp = typeof aVal === 'number' ? aVal - (bVal as number) : String(aVal).localeCompare(String(bVal));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const totals = entries.reduce((acc, e) => ({
    notificationsSent: acc.notificationsSent + e.notificationsSent,
    notificationsDelivered: acc.notificationsDelivered + e.notificationsDelivered,
    notificationsRead: acc.notificationsRead + e.notificationsRead,
    callbacksRequested: acc.callbacksRequested + e.callbacksRequested,
    callbacksApproved: acc.callbacksApproved + e.callbacksApproved,
    messagesSent: acc.messagesSent + e.messagesSent,
    botActions: acc.botActions + e.botActions,
    policyDenials: acc.policyDenials + e.policyDenials,
    spamReports: acc.spamReports + e.spamReports,
  }), { notificationsSent: 0, notificationsDelivered: 0, notificationsRead: 0, callbacksRequested: 0, callbacksApproved: 0, messagesSent: 0, botActions: 0, policyDenials: 0, spamReports: 0 });

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <h3 className="text-sm font-semibold mb-4">Daily Breakdown</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-text-muted border-b border-border-primary">
              {columns.map((col) => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  className="text-left py-2 px-3 cursor-pointer hover:text-text-primary whitespace-nowrap">
                  {col.label} {sortBy === col.key && (sortDir === 'asc' ? '↑' : '↓')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry) => (
              <tr key={entry.date} className="border-b border-border-primary last:border-0 hover:bg-bg-hover/50">
                <td className="py-2 px-3 text-xs font-medium">{formatDate(entry.date)}</td>
                <td className="py-2 px-3 text-xs">{entry.notificationsSent.toLocaleString()}</td>
                {/* ... more cells */}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-primary font-medium">
              <td className="py-2 px-3 text-xs">Total</td>
              <td className="py-2 px-3 text-xs">{totals.notificationsSent.toLocaleString()}</td>
              {/* ... more total cells */}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/analytics/page.tsx` | **Modify** | Add daily analytics table section |
| `apps/provider/src/lib/graphql/analytics.ts` | **Modify** | Add GET_DAILY_ANALYTICS query + types |

---

## Acceptance Criteria

- [ ] Table fetches `dailyAnalytics(serviceProviderId, from, to)` query
- [ ] All 10+ columns displayed per row
- [ ] Sortable columns (click header)
- [ ] Default sort: date descending
- [ ] Totals row at bottom
- [ ] Spam reports highlighted in red when > 0
- [ ] Horizontal scroll on narrow screens
- [ ] Loading skeleton
- [ ] Empty state: "No data for selected range"

---

## Dependencies

- **Blocked by**: Task 11.1 (date range), Task 11.9 (GraphQL queries)
- **Blocks**: Task 11.8 (export — exports this data)
- **Related**: Tasks 11.2-11.5 (panels use the same date range)
