# Task 9.15 — GraphQL createCampaign Mutation

> **Section**: 9. Campaigns — Connected Backend  
> **Priority**: P0 — Data layer  
> **Estimated Scope**: Small  
> **Route**: N/A (shared GraphQL layer)  
> **File**: `apps/provider/src/lib/graphql/campaigns.ts`  
> **Status**: ✅ Complete

---

## Objective

Add the `CREATE_CAMPAIGN` mutation to the campaigns GraphQL operations file. This mutation creates a new campaign in `DRAFT_CAMPAIGN` status.

---

## Current State

No mutation exists. The new campaign wizard uses a mocked `setTimeout`:

```tsx
async function handleSubmit() {
  await new Promise((r) => setTimeout(r, 500));
  window.location.href = '/campaigns';
}
```

### GraphQL Schema

```graphql
input CreateCampaignInput {
  serviceProviderId: ID!
  name: String!
  description: String
  category: NotificationCategory!
  scheduledAt: DateTime
}

type Mutation {
  createCampaign(input: CreateCampaignInput!): Campaign!
}
```

---

## Requirements

### Mutation Definition

```graphql
mutation CreateCampaign($input: CreateCampaignInput!) {
  createCampaign(input: $input) {
    ...CampaignFields
  }
}
```

### Variables

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `input.serviceProviderId` | `ID!` | Yes | From auth context |
| `input.name` | `String!` | Yes | Campaign name, ≥ 3 chars |
| `input.description` | `String` | No | Optional description |
| `input.category` | `NotificationCategory!` | Yes | PERSONAL / ORGANIZATIONAL / ADVERTISEMENT |
| `input.scheduledAt` | `DateTime` | No | Null for immediate, ISO datetime for scheduled |

### Cache Update

- On success: add new campaign to `campaigns` list cache
- `refetchQueries: ['GetCampaigns']` as simple approach
- Or use `cache.modify` to prepend to existing list

---

## Implementation Plan

```tsx
// Add to apps/provider/src/lib/graphql/campaigns.ts

export const CREATE_CAMPAIGN = gql`
  ${CAMPAIGN_FIELDS}
  mutation CreateCampaign($input: CreateCampaignInput!) {
    createCampaign(input: $input) {
      ...CampaignFields
    }
  }
`;
```

### Usage in wizard

```tsx
import { useMutation } from '@apollo/client';
import { CREATE_CAMPAIGN, GET_CAMPAIGNS } from '@/lib/graphql/campaigns';

const [createCampaign, { loading }] = useMutation(CREATE_CAMPAIGN, {
  refetchQueries: [{ query: GET_CAMPAIGNS, variables: { serviceProviderId } }],
});

async function handleSaveAsDraft() {
  const { data } = await createCampaign({
    variables: {
      input: {
        serviceProviderId,
        name: form.name,
        description: form.description || undefined,
        category: form.category,
        scheduledAt: form.scheduleType === 'scheduled' ? form.scheduledAt : null,
      },
    },
  });
  router.push('/campaigns');
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add CREATE_CAMPAIGN mutation |

---

## Acceptance Criteria

- [ ] `CREATE_CAMPAIGN` mutation exported from `campaigns.ts`
- [ ] Uses `CampaignFields` fragment for return type
- [ ] Accepts `CreateCampaignInput` as the single input variable
- [ ] Returns full Campaign object on success
- [ ] Cache strategy: refetchQueries or cache.modify to update list
- [ ] Consistent with other mutation naming in the codebase

---

## Dependencies

- **Blocked by**: Task 9.14 (campaigns.ts file + fragment)
- **Blocks**: Tasks 9.5, 9.7 (wizard save as draft), Task 9.12 (clone action)
- **Related**: Task 9.16 (updateCampaign — similar pattern)
