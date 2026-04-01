# Task 11.6 — Policy Analytics Panel

> **Section**: 11. Analytics  
> **Priority**: P1 — Analytics panel  
> **Estimated Scope**: Medium  
> **Route**: `/analytics`  
> **File**: `apps/provider/src/app/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a new Policy Analytics panel to the analytics page showing allowed vs blocked ratio, block reasons breakdown (DND, preference, rate-limit, suspended), and recommendations for which categories have the highest block rates.

---

## Current State

No policy analytics panel exists on the analytics page. The page only has 4 panels (Notification, Callback, Campaign, Bot) with hardcoded data.

### GraphQL Schema

From `DashboardAnalytics`:
```graphql
policyDenials: Int!
spamReports: Int!
```

The gateway also has a `PolicyBlockReason` type:
```graphql
type PolicyBlockReason {
  decisionCode: String!
  reason: String!
  count: Int!
}
```

The dashboard already integrates a `PolicyBreakdown` via the dashboard query:
```graphql
policyBreakdown {
  allowed: Int!
  blockedByDND: Int!
  blockedByPreference: Int!
  rateLimited: Int!
  total: Int!
}
```

### Existing Code

`apps/provider/src/components/dashboard/PolicyChart.tsx` exists — renders a policy breakdown visualization on the dashboard. This component can be reused or adapted.

`apps/provider/src/lib/graphql/dashboard.ts` already defines `PolicyBreakdown` type.

---

## Requirements

### 1. Allowed vs Blocked Ratio

- Pie/donut chart (or visual progress ring)
- Allowed: green segment
- Blocked: red segment
- Center: total count or blocked percentage

### 2. Block Reasons Breakdown

| Reason | Source | Color |
|--------|--------|-------|
| DND Active | `policyBreakdown.blockedByDND` | `text-status-error` |
| User Preference | `policyBreakdown.blockedByPreference` | `text-status-warning` |
| Rate Limited | `policyBreakdown.rateLimited` | `text-accent-orange` |
| Spam Reports | `dashboardAnalytics.spamReports` | `text-status-error` |

Each with count and percentage bar.

### 3. Recommendations Section

- Analyze block breakdown to surface actionable insights:
  - If DND blocks > 20%: "Consider adjusting sending windows to avoid DND hours"
  - If preference blocks > 15%: "Review category targeting — users are opting out"
  - If rate limiting > 10%: "Reduce notification frequency for high-volume categories"
- Simple rule-based recommendations (not AI-generated)

### 4. Data Source

- Use `DashboardAnalytics.policyBreakdown` from the existing dashboard query (task 11.9)
- Supplement with `policyDenials` and `spamReports` counts

---

## Implementation Plan

```tsx
function PolicyAnalyticsPanel({ dashboardData }: { dashboardData?: DashboardAnalytics }) {
  const pb = dashboardData?.policyBreakdown;
  if (!pb) return <PanelSkeleton />;

  const allowed = pb.allowed;
  const blocked = pb.total - pb.allowed;
  const blockedPct = pb.total > 0 ? ((blocked / pb.total) * 100).toFixed(1) : '0';

  const reasons = [
    { label: 'DND Active', value: pb.blockedByDND, color: 'bg-status-error', textColor: 'text-status-error' },
    { label: 'User Preference', value: pb.blockedByPreference, color: 'bg-status-warning', textColor: 'text-status-warning' },
    { label: 'Rate Limited', value: pb.rateLimited, color: 'bg-accent-orange', textColor: 'text-accent-orange' },
  ];

  const recommendations = buildRecommendations(pb);

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Policy Analytics</h3>

      {/* Allowed vs Blocked */}
      <div className="flex items-center gap-6">
        <div className="relative w-24 h-24">
          {/* SVG donut ring */}
          <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
            <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" className="stroke-status-success/20" />
            <circle cx="18" cy="18" r="14" fill="none" strokeWidth="4" className="stroke-status-error"
              strokeDasharray={`${Number(blockedPct) * 0.88} 88`} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold">{blockedPct}%</span>
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-success" />
            <span className="text-xs text-text-muted">Allowed: {allowed.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-status-error" />
            <span className="text-xs text-text-muted">Blocked: {blocked.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Reasons breakdown */}
      <div className="space-y-2">
        <p className="text-xs text-text-muted">Block Reasons</p>
        {reasons.map((r) => {
          const pct = blocked > 0 ? ((r.value / blocked) * 100).toFixed(0) : '0';
          return (
            <div key={r.label} className="flex items-center gap-3">
              <span className="text-xs text-text-secondary w-28">{r.label}</span>
              <div className="flex-1 h-2 bg-border-secondary rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${r.color}`} style={{ width: `${pct}%` }} />
              </div>
              <span className={`text-xs font-medium ${r.textColor}`}>{r.value}</span>
            </div>
          );
        })}
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-border-primary">
          <p className="text-xs text-text-muted">Recommendations</p>
          {recommendations.map((rec, i) => (
            <p key={i} className="text-xs text-accent-blue">💡 {rec}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function buildRecommendations(pb: PolicyBreakdown): string[] {
  const recs: string[] = [];
  const blocked = pb.total - pb.allowed;
  if (blocked === 0) return recs;

  if ((pb.blockedByDND / blocked) > 0.2) {
    recs.push('Adjust sending windows to avoid Do Not Disturb hours');
  }
  if ((pb.blockedByPreference / blocked) > 0.15) {
    recs.push('Review category targeting — users are opting out of these types');
  }
  if ((pb.rateLimited / blocked) > 0.1) {
    recs.push('Reduce notification frequency for high-volume categories');
  }
  return recs;
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/analytics/page.tsx` | **Modify** | Add policy analytics panel |

---

## Acceptance Criteria

- [ ] Policy panel shows allowed vs blocked ratio with donut visualization
- [ ] Block reasons breakdown with percentage bars (DND, preference, rate-limited)
- [ ] Counts and percentages displayed for each reason
- [ ] Rule-based recommendations shown when thresholds exceeded
- [ ] Data from `dashboardAnalytics.policyBreakdown`
- [ ] Loading state
- [ ] New panel added to the analytics grid

---

## Dependencies

- **Blocked by**: Task 11.1 (date range), Task 11.9 (GraphQL queries — dashboard analytics)
- **Blocks**: None
- **Related**: Dashboard PolicyChart component (similar visualization)
