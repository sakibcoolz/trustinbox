# Task 9.19 — GraphQL previewCampaignPolicy Query

> **Section**: 9. Campaigns — Connected Backend  
> **Priority**: P0 — Policy compliance  
> **Estimated Scope**: Small  
> **Route**: N/A (shared GraphQL layer)  
> **File**: `apps/provider/src/lib/graphql/campaigns.ts`  
> **Status**: ✅ Complete

---

## Objective

Add the `PREVIEW_CAMPAIGN_POLICY` query to the campaigns GraphQL operations file. This query evaluates policy rules against the target audience before campaign launch, returning allowed/blocked counts and specific block reasons.

---

## Current State

No policy preview query exists. The wizard review step shows no policy information.

### GraphQL Schema

```graphql
input PreviewCampaignPolicyInput {
  serviceProviderId: ID!
  category: NotificationCategory!
  targetUserIds: [ID!]!
}

type CampaignPolicyPreview {
  totalTargets: Int!
  allowedCount: Int!
  blockedCount: Int!
  blockedReasons: [PolicyBlockReason!]!
}

type PolicyBlockReason {
  decisionCode: String!
  reason: String!
  count: Int!
}

type Query {
  previewCampaignPolicy(input: PreviewCampaignPolicyInput!): CampaignPolicyPreview!
}
```

---

## Requirements

### Query Definition

```graphql
query PreviewCampaignPolicy($input: PreviewCampaignPolicyInput!) {
  previewCampaignPolicy(input: $input) {
    totalTargets
    allowedCount
    blockedCount
    blockedReasons {
      decisionCode
      reason
      count
    }
  }
}
```

### Variables

| Variable | Type | Required | Notes |
|----------|------|----------|-------|
| `input.serviceProviderId` | `ID!` | Yes | From auth context |
| `input.category` | `NotificationCategory!` | Yes | PERSONAL / ORGANIZATIONAL / ADVERTISEMENT |
| `input.targetUserIds` | `[ID!]!` | Yes | List of target user IDs |

### Usage Pattern

- Use `useLazyQuery` since this should only fire when user reaches the Review step
- Or use `useQuery` with `skip: step !== 5`
- Results cached but invalidated if category or audience changes

### Response Handling

| Field | UI Usage |
|-------|----------|
| `totalTargets` | Displayed as "Total Targets" count |
| `allowedCount` | Green badge: "X will receive" |
| `blockedCount` | Red badge: "X blocked by policy" |
| `blockedReasons[].reason` | Listed as block reason descriptions |
| `blockedReasons[].count` | Count per reason |
| `blockedReasons[].decisionCode` | Internal code for debugging |

---

## Implementation Plan

```tsx
// Add to apps/provider/src/lib/graphql/campaigns.ts

export const PREVIEW_CAMPAIGN_POLICY = gql`
  query PreviewCampaignPolicy($input: PreviewCampaignPolicyInput!) {
    previewCampaignPolicy(input: $input) {
      totalTargets
      allowedCount
      blockedCount
      blockedReasons {
        decisionCode
        reason
        count
      }
    }
  }
`;
```

### Usage in wizard Review step

```tsx
import { useLazyQuery } from '@apollo/client';
import { PREVIEW_CAMPAIGN_POLICY } from '@/lib/graphql/campaigns';

const [fetchPreview, { data, loading, error }] = useLazyQuery(PREVIEW_CAMPAIGN_POLICY);

// Trigger when entering Review step:
useEffect(() => {
  if (step === 5 && form.targetUserIds.length > 0) {
    fetchPreview({
      variables: {
        input: {
          serviceProviderId,
          category: form.category,
          targetUserIds: form.targetUserIds,
        },
      },
    });
  }
}, [step]);
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add PREVIEW_CAMPAIGN_POLICY query |

---

## Acceptance Criteria

- [ ] `PREVIEW_CAMPAIGN_POLICY` query exported from `campaigns.ts`
- [ ] Accepts `PreviewCampaignPolicyInput` with serviceProviderId, category, targetUserIds
- [ ] Returns totalTargets, allowedCount, blockedCount, and blockedReasons array
- [ ] blockedReasons includes decisionCode, reason, and count fields
- [ ] Suitable for lazy loading (useLazyQuery) in wizard flow

---

## Dependencies

- **Blocked by**: Task 9.14 (campaigns.ts file)
- **Blocks**: Task 9.6 (policy preview UI in wizard)
- **Related**: Task 9.8 (launch confirmation — shows policy summary)
