# Task 9.20 — GraphQL campaignAnalytics Query

> **Section**: 9. Campaigns — Connected Backend  
> **Priority**: P1 — Data layer  
> **Estimated Scope**: Small  
> **Route**: N/A (shared GraphQL layer)  
> **File**: `apps/provider/src/lib/graphql/campaigns.ts`  
> **Status**: ✅ Complete

---

## Objective

Add the `GET_CAMPAIGN_ANALYTICS` query to the campaigns GraphQL operations file. This query fetches performance metrics for a specific campaign over a given date range.

---

## Current State

No analytics query exists. The detail page computes metrics from mock data:

```tsx
const deliveryRate = ((c.delivered / c.targets) * 100).toFixed(1);
const openRate = ((c.opened / c.delivered) * 100).toFixed(1);
const clickRate = ((c.clicked / c.delivered) * 100).toFixed(1);
```

### GraphQL Schema

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

type Query {
  campaignAnalytics(
    serviceProviderId: ID!
    campaignId: ID!
    from: DateTime!
    to: DateTime!
  ): CampaignAnalytics!
}
```

### Backend

- `analytics-service` has `GetCampaignAnalytics` gRPC endpoint
- Consumes `campaign.launched` and `campaign.completed` events
- Aggregates from campaign_targets table

---

## Requirements

### Query Definition

```graphql
query GetCampaignAnalytics($serviceProviderId: ID!, $campaignId: ID!, $from: DateTime!, $to: DateTime!) {
  campaignAnalytics(serviceProviderId: $serviceProviderId, campaignId: $campaignId, from: $from, to: $to) {
    totalTargets
    totalSent
    totalDelivered
    totalRead
    totalFailed
    totalSkipped
    deliveryRate
    readRate
  }
}
```

### Variables

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `serviceProviderId` | `ID!` | Yes | From auth context |
| `campaignId` | `ID!` | Yes | Target campaign |
| `from` | `DateTime!` | Yes | Start of date range (campaign.startedAt) |
| `to` | `DateTime!` | Yes | End of date range (now or campaign.completedAt) |

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `totalTargets` | `Int!` | Total audience size |
| `totalSent` | `Int!` | Notifications sent |
| `totalDelivered` | `Int!` | Successfully delivered |
| `totalRead` | `Int!` | Opened/read by recipients |
| `totalFailed` | `Int!` | Failed deliveries |
| `totalSkipped` | `Int!` | Skipped by policy |
| `deliveryRate` | `Float!` | Delivered / Targets × 100 |
| `readRate` | `Float!` | Read / Delivered × 100 |

### Polling for Live Data

For RUNNING campaigns, poll every 30 seconds:
```tsx
const { data } = useQuery(GET_CAMPAIGN_ANALYTICS, {
  variables: { ... },
  pollInterval: campaign.status === 'RUNNING' ? 30000 : 0,
});
```

---

## Implementation Plan

```tsx
// Add to apps/provider/src/lib/graphql/campaigns.ts

export const GET_CAMPAIGN_ANALYTICS = gql`
  query GetCampaignAnalytics($serviceProviderId: ID!, $campaignId: ID!, $from: DateTime!, $to: DateTime!) {
    campaignAnalytics(serviceProviderId: $serviceProviderId, campaignId: $campaignId, from: $from, to: $to) {
      totalTargets
      totalSent
      totalDelivered
      totalRead
      totalFailed
      totalSkipped
      deliveryRate
      readRate
    }
  }
`;
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add GET_CAMPAIGN_ANALYTICS query |

---

## Acceptance Criteria

- [ ] `GET_CAMPAIGN_ANALYTICS` query exported from `campaigns.ts`
- [ ] Accepts serviceProviderId, campaignId, from, to as variables
- [ ] Returns all CampaignAnalytics fields: totalTargets/Sent/Delivered/Read/Failed/Skipped + rates
- [ ] Supports pollInterval for RUNNING campaigns
- [ ] Consistent naming with other GET_ queries

---

## Dependencies

- **Blocked by**: Task 9.14 (campaigns.ts file)
- **Blocks**: Task 9.13 (campaign analytics UI section)
- **Related**: Task 9.10 (progress bar uses Campaign type fields, not analytics query)
