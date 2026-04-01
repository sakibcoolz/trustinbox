# Task 9.18 — GraphQL cancelCampaign Mutation

> **Section**: 9. Campaigns — Connected Backend  
> **Priority**: P1 — Data layer  
> **Estimated Scope**: Small  
> **Route**: N/A (shared GraphQL layer)  
> **File**: `apps/provider/src/lib/graphql/campaigns.ts`  
> **Status**: ✅ Complete

---

## Objective

Add the `CANCEL_CAMPAIGN` mutation to the campaigns GraphQL operations file. This mutation cancels an active or scheduled campaign, stopping all pending deliveries.

---

## Current State

No cancel mutation exists. The "Pause" button on the detail page is non-functional and doesn't match the schema (no pause operation exists).

### GraphQL Schema

```graphql
type Mutation {
  cancelCampaign(campaignId: ID!, serviceProviderId: ID!): Boolean!
}
```

**Note**: Returns `Boolean!` (not `Campaign!`), so the cache won't auto-update. Need manual cache update or refetch.

---

## Requirements

### Mutation Definition

```graphql
mutation CancelCampaign($campaignId: ID!, $serviceProviderId: ID!) {
  cancelCampaign(campaignId: $campaignId, serviceProviderId: $serviceProviderId)
}
```

### Variables

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `campaignId` | `ID!` | Yes | Campaign to cancel |
| `serviceProviderId` | `ID!` | Yes | From auth context |

### Return Value

Returns `Boolean` (true on success). Since no `Campaign` object is returned, the client must:
1. Refetch `GetCampaign` query to get updated status
2. Or manually update cache: set `status: CANCELLED`

### Cache Strategy

```tsx
// Option A: Refetch
refetchQueries: ['GetCampaign', 'GetCampaigns']

// Option B: Cache modify
update(cache) {
  cache.modify({
    id: cache.identify({ __typename: 'Campaign', id: campaignId }),
    fields: {
      status() { return 'CANCELLED'; },
    },
  });
}
```

### Cancellation Rules

| Current Status | Can Cancel? | Notes |
|---------------|-------------|-------|
| `DRAFT_CAMPAIGN` | No | Just delete or leave as draft |
| `SCHEDULED` | Yes | Cancel before execution starts |
| `RUNNING` | Yes | In-progress deliveries may still complete |
| `COMPLETED` | No | Already finished |
| `CANCELLED` | No | Already cancelled |

---

## Implementation Plan

```tsx
// Add to apps/provider/src/lib/graphql/campaigns.ts

export const CANCEL_CAMPAIGN = gql`
  mutation CancelCampaign($campaignId: ID!, $serviceProviderId: ID!) {
    cancelCampaign(campaignId: $campaignId, serviceProviderId: $serviceProviderId)
  }
`;
```

### Usage in cancel confirmation modal

```tsx
const [cancelCampaign, { loading }] = useMutation(CANCEL_CAMPAIGN, {
  refetchQueries: ['GetCampaign', 'GetCampaigns'],
});

async function handleCancel() {
  try {
    await cancelCampaign({
      variables: { campaignId: campaign.id, serviceProviderId },
    });
    setShowConfirm(false);
    // toast: "Campaign cancelled"
  } catch (err) {
    // toast error
  }
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add CANCEL_CAMPAIGN mutation |

---

## Acceptance Criteria

- [ ] `CANCEL_CAMPAIGN` mutation exported from `campaigns.ts`
- [ ] Accepts `campaignId` and `serviceProviderId` as variables
- [ ] Returns `Boolean` success indicator
- [ ] Cache update strategy: refetchQueries for GetCampaign + GetCampaigns
- [ ] Only callable for SCHEDULED and RUNNING campaigns (UI constraint)

---

## Dependencies

- **Blocked by**: Task 9.14 (campaigns.ts file)
- **Blocks**: Task 9.12 (cancel action on detail page)
- **Related**: Task 9.17 (launchCampaign — reverse operation)
