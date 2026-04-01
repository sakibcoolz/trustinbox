# Task 9.16 — GraphQL updateCampaign Mutation

> **Section**: 9. Campaigns — Connected Backend  
> **Priority**: P1 — Data layer  
> **Estimated Scope**: Small  
> **Route**: N/A (shared GraphQL layer)  
> **File**: `apps/provider/src/lib/graphql/campaigns.ts`  
> **Status**: ✅ Complete

---

## Objective

Add the `UPDATE_CAMPAIGN` mutation to the campaigns GraphQL operations file. This mutation allows editing draft and scheduled campaigns (name, description, scheduledAt).

---

## Current State

No update mutation exists. Editing a campaign is not possible.

### GraphQL Schema

```graphql
input UpdateCampaignInput {
  campaignId: ID!
  serviceProviderId: ID!
  name: String
  description: String
  scheduledAt: DateTime
}

type Mutation {
  updateCampaign(input: UpdateCampaignInput!): Campaign!
}
```

**Note**: Only `name`, `description`, and `scheduledAt` are editable. `category` is not in the update input — it's set at creation and immutable.

---

## Requirements

### Mutation Definition

```graphql
mutation UpdateCampaign($input: UpdateCampaignInput!) {
  updateCampaign(input: $input) {
    ...CampaignFields
  }
}
```

### Variables

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `input.campaignId` | `ID!` | Yes | Campaign to update |
| `input.serviceProviderId` | `ID!` | Yes | From auth context |
| `input.name` | `String` | No | New name (if changing) |
| `input.description` | `String` | No | New description (if changing) |
| `input.scheduledAt` | `DateTime` | No | New schedule time (if changing) |

### Cache Update

- Apollo will auto-update the cached Campaign object by ID since the mutation returns the full `CampaignFields` fragment
- No manual cache manipulation needed

### Edit Constraints

- Only `DRAFT_CAMPAIGN` and `SCHEDULED` campaigns can be updated
- UI should prevent calling update on `RUNNING`/`COMPLETED`/`CANCELLED` campaigns
- Backend enforces this constraint; UI should gracefully handle the error

---

## Implementation Plan

```tsx
// Add to apps/provider/src/lib/graphql/campaigns.ts

export const UPDATE_CAMPAIGN = gql`
  ${CAMPAIGN_FIELDS}
  mutation UpdateCampaign($input: UpdateCampaignInput!) {
    updateCampaign(input: $input) {
      ...CampaignFields
    }
  }
`;
```

### Usage in edit page

```tsx
const [updateCampaign, { loading }] = useMutation(UPDATE_CAMPAIGN);

async function handleUpdate() {
  try {
    await updateCampaign({
      variables: {
        input: {
          campaignId: campaign.id,
          serviceProviderId,
          name: form.name,
          description: form.description,
          scheduledAt: form.scheduledAt || null,
        },
      },
    });
    router.push(`/campaigns/${campaign.id}`);
  } catch (err) {
    // Show error toast
  }
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add UPDATE_CAMPAIGN mutation |

---

## Acceptance Criteria

- [ ] `UPDATE_CAMPAIGN` mutation exported from `campaigns.ts`
- [ ] Uses `CampaignFields` fragment for return type
- [ ] Accepts `UpdateCampaignInput` with partial update fields
- [ ] Apollo auto-updates cached Campaign object on success
- [ ] Only called for DRAFT/SCHEDULED campaigns (UI constraint)

---

## Dependencies

- **Blocked by**: Task 9.14 (campaigns.ts file + fragment)
- **Blocks**: Task 9.12 (edit action on detail page)
- **Related**: Task 9.15 (createCampaign — similar pattern)
