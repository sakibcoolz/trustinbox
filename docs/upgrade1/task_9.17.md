# Task 9.17 — GraphQL launchCampaign Mutation

> **Section**: 9. Campaigns — Connected Backend  
> **Priority**: P0 — Data layer  
> **Estimated Scope**: Small  
> **Route**: N/A (shared GraphQL layer)  
> **File**: `apps/provider/src/lib/graphql/campaigns.ts`  
> **Status**: ✅ Complete

---

## Objective

Add the `LAUNCH_CAMPAIGN` mutation to the campaigns GraphQL operations file. This mutation transitions a draft campaign to `RUNNING` status and triggers the worker-service fan-out process that sends notifications to each target user.

---

## Current State

No launch mutation exists. Campaign launch is mocked.

### GraphQL Schema

```graphql
type Mutation {
  launchCampaign(campaignId: ID!, serviceProviderId: ID!): Campaign!
}
```

### Backend Flow

When `launchCampaign` is called:
1. Gateway sets campaign status to `RUNNING`
2. Emits `campaign.launched` event
3. Worker-service `CampaignSendProcessor` picks up the event
4. Queries `campaign_targets` for PENDING users
5. For each target: creates notification via `notification-service` with policy check
6. Updates each target's status (SENT/DELIVERED/FAILED/SKIPPED)
7. On completion: emits `campaign.completed` event

---

## Requirements

### Mutation Definition

```graphql
mutation LaunchCampaign($campaignId: ID!, $serviceProviderId: ID!) {
  launchCampaign(campaignId: $campaignId, serviceProviderId: $serviceProviderId) {
    ...CampaignFields
  }
}
```

### Variables

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `campaignId` | `ID!` | Yes | Campaign to launch |
| `serviceProviderId` | `ID!` | Yes | From auth context |

### Return Value

Returns the updated `Campaign` with `status: RUNNING` and `startedAt` timestamp.

### Cache Update

- Apollo auto-updates cached campaign by ID
- May also need to refetch campaigns list to update status badge in list view

### Error Cases

| Error | UI Handling |
|-------|-------------|
| Campaign not in DRAFT status | Show error toast: "Only draft campaigns can be launched" |
| No targets added | Show error toast: "Campaign has no target audience" |
| Authorization failure | Show error toast: "You don't have permission to launch campaigns" |

---

## Implementation Plan

```tsx
// Add to apps/provider/src/lib/graphql/campaigns.ts

export const LAUNCH_CAMPAIGN = gql`
  ${CAMPAIGN_FIELDS}
  mutation LaunchCampaign($campaignId: ID!, $serviceProviderId: ID!) {
    launchCampaign(campaignId: $campaignId, serviceProviderId: $serviceProviderId) {
      ...CampaignFields
    }
  }
`;
```

### Usage in launch confirmation modal

```tsx
const [launchCampaign, { loading }] = useMutation(LAUNCH_CAMPAIGN, {
  refetchQueries: ['GetCampaigns'],
});

async function handleLaunch() {
  try {
    const { data } = await launchCampaign({
      variables: { campaignId: campaign.id, serviceProviderId },
    });
    onClose();
    router.push(`/campaigns/${data.launchCampaign.id}`);
    // toast: "Campaign launched successfully"
  } catch (err) {
    // Show error in modal
  }
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add LAUNCH_CAMPAIGN mutation |

---

## Acceptance Criteria

- [ ] `LAUNCH_CAMPAIGN` mutation exported from `campaigns.ts`
- [ ] Uses `CampaignFields` fragment for return type
- [ ] Accepts `campaignId` and `serviceProviderId` as variables
- [ ] Returns Campaign with updated status (`RUNNING`) and `startedAt`
- [ ] Campaign list cache refreshed after launch
- [ ] Error cases handled with descriptive error messages

---

## Dependencies

- **Blocked by**: Task 9.14 (campaigns.ts file + fragment)
- **Blocks**: Task 9.8 (launch confirmation modal)
- **Related**: Task 9.18 (cancelCampaign — reverse operation), Task 9.21 (subscription — starts after launch)
