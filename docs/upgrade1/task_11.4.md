# Task 11.4 — Campaign Analytics Panel

> **Section**: 11. Analytics  
> **Priority**: P1 — Analytics panel  
> **Estimated Scope**: Medium  
> **Route**: `/analytics`  
> **File**: `apps/provider/src/app/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Replace the hardcoded Campaign Analytics section with a GraphQL-powered panel showing active campaigns count, total recipients reached, delivery success rate, and a best-performing campaign highlight card.

---

## Current State

```tsx
<div className="bg-bg-card border border-border-primary rounded-xl p-6">
  <h3 className="text-sm font-medium text-text-secondary mb-4">Campaign Analytics</h3>
  <div className="space-y-3">
    <AnalyticsRow label="Total Campaigns" value="24" />
    <AnalyticsRow label="Targeted Users" value="8,542" />
    <AnalyticsRow label="Delivered" value="8,301" />
    <AnalyticsRow label="Opt-Outs" value="154" />
  </div>
</div>
```

**Issues**: All hardcoded. Missing delivery rate, read rate, failed count, skipped count. No "best performing" highlight. The `CampaignAnalytics` query is per-campaign (requires `campaignId`), so the overview page needs aggregate data from `DashboardAnalytics` or a separate approach.

### GraphQL Schema

The per-campaign query (not usable for overview without a campaignId):
```graphql
type CampaignAnalytics {
  totalTargets: Int!
  totalSent: Int!
  totalDelivered: Int!
  totalRead: Int!
  totalFailed: Int!
  totalSkipped: Int!
  deliveryRate: Float!
  readRate: Float!
}

query {
  campaignAnalytics(serviceProviderId: ID!, campaignId: ID!, from: DateTime, to: DateTime): CampaignAnalytics!
}
```

From `DashboardAnalytics` (aggregate):
```graphql
campaignsLaunched: Int!
```

---

## Requirements

### 1. Data Strategy

Since `campaignAnalytics` requires a campaignId, the overview panel uses:
- `DashboardAnalytics.campaignsLaunched` for total campaigns count
- Fetch list of campaigns via `campaigns(serviceProviderId)` and aggregate client-side, OR
- Use `dashboardAnalytics` aggregate fields + the campaign list for "best performing"

### 2. KPI Cards

| Metric | Source | Format |
|--------|--------|--------|
| Campaigns Launched | `dashboardAnalytics.campaignsLaunched` | Number |
| Total Recipients | Sum from campaign list or separate field | Number |
| Total Delivered | Sum from campaign list | Number |
| Delivery Rate | Computed | Percentage |

### 3. Best Performing Campaign Card

- Show the campaign with highest delivery rate
- Display: name, status badge, delivery rate, total targets
- Link to campaign detail page

### 4. Campaign Delivery Breakdown

- Optional progress bar or mini chart: Sent / Delivered / Failed / Skipped

---

## Implementation Plan

```tsx
function CampaignAnalyticsPanel({ dateVars, dashboardData }: {
  dateVars: AnalyticsDateVars;
  dashboardData?: DashboardAnalytics;
}) {
  // Use dashboard aggregate data for overview
  const campaignsLaunched = dashboardData?.campaignsLaunched ?? 0;

  // Optionally fetch campaigns list for best-performing
  const { data: campaignList } = useQuery(GET_CAMPAIGNS, {
    variables: { serviceProviderId: dateVars.serviceProviderId, limit: 10 },
  });

  const campaigns = campaignList?.campaigns?.nodes ?? [];

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Campaign Analytics</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-center">
          <p className="text-xs text-text-muted">Campaigns Launched</p>
          <p className="text-lg font-semibold mt-0.5 text-status-warning">{campaignsLaunched}</p>
        </div>
        {/* More KPIs */}
      </div>
      {/* Best performing campaign highlight */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/analytics/page.tsx` | **Modify** | Replace mock campaign section with real data |
| `apps/provider/src/lib/graphql/analytics.ts` | **Modify** | Ensure dashboard analytics includes campaign fields |

---

## Acceptance Criteria

- [ ] Campaign metrics fetched from dashboard analytics aggregate
- [ ] Show campaigns launched count
- [ ] Best performing campaign card with name, delivery rate, link
- [ ] Delivery breakdown displayed
- [ ] Loading skeleton
- [ ] Mock data removed

---

## Dependencies

- **Blocked by**: Task 11.1 (date range), Task 11.9 (GraphQL queries)
- **Blocks**: None
- **Related**: Task 11.2 (notification panel — sibling), Section 9 campaign detail analytics
