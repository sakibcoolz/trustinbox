# Task 9.14 — GraphQL Campaigns Query

> **Section**: 9. Campaigns — Connected Backend  
> **Priority**: P0 — Data layer  
> **Estimated Scope**: Medium  
> **Route**: N/A (shared GraphQL layer)  
> **File**: `apps/provider/src/lib/graphql/campaigns.ts`  
> **Status**: ✅ Complete

---

## Objective

Create the `campaigns.ts` GraphQL operations file with the `GET_CAMPAIGNS` and `GET_CAMPAIGN` queries. These queries power the campaign list page and campaign detail page respectively.

---

## Current State

No `apps/provider/src/lib/graphql/campaigns.ts` file exists. Campaign pages use hardcoded mock data.

### GraphQL Schema

```graphql
type Query {
  campaign(id: ID!, serviceProviderId: ID!): Campaign!
  campaigns(
    serviceProviderId: ID!
    status: CampaignStatus
    limit: Int
    offset: Int
  ): CampaignConnection!
}

type Campaign {
  id: ID!
  serviceProviderId: ID!
  name: String!
  description: String
  category: NotificationCategory!
  status: CampaignStatus!
  targetCount: Int!
  sentCount: Int!
  deliveredCount: Int!
  readCount: Int!
  failedCount: Int!
  scheduledAt: DateTime
  startedAt: DateTime
  completedAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type CampaignConnection {
  nodes: [Campaign!]!
  totalCount: Int!
}

enum CampaignStatus {
  DRAFT_CAMPAIGN
  SCHEDULED
  RUNNING
  COMPLETED
  CANCELLED
}
```

### Apollo Cache Config (already set)

```ts
Campaign: { keyFields: ['id'] },
campaigns: { keyArgs: ['filter'], merge: false },
```

---

## Requirements

### 1. GET_CAMPAIGNS Query

```graphql
query GetCampaigns($serviceProviderId: ID!, $status: CampaignStatus, $limit: Int, $offset: Int) {
  campaigns(serviceProviderId: $serviceProviderId, status: $status, limit: $limit, offset: $offset) {
    nodes {
      id
      name
      description
      category
      status
      targetCount
      sentCount
      deliveredCount
      readCount
      failedCount
      scheduledAt
      startedAt
      completedAt
      createdAt
      updatedAt
    }
    totalCount
  }
}
```

### 2. GET_CAMPAIGN Query (single)

```graphql
query GetCampaign($id: ID!, $serviceProviderId: ID!) {
  campaign(id: $id, serviceProviderId: $serviceProviderId) {
    id
    serviceProviderId
    name
    description
    category
    status
    targetCount
    sentCount
    deliveredCount
    readCount
    failedCount
    scheduledAt
    startedAt
    completedAt
    createdAt
    updatedAt
  }
}
```

### 3. Campaign Fragment (optional optimization)

```graphql
fragment CampaignFields on Campaign {
  id
  serviceProviderId
  name
  description
  category
  status
  targetCount
  sentCount
  deliveredCount
  readCount
  failedCount
  scheduledAt
  startedAt
  completedAt
  createdAt
  updatedAt
}
```

---

## Implementation Plan

```tsx
// apps/provider/src/lib/graphql/campaigns.ts
import { gql } from '@apollo/client';

export const CAMPAIGN_FIELDS = gql`
  fragment CampaignFields on Campaign {
    id
    serviceProviderId
    name
    description
    category
    status
    targetCount
    sentCount
    deliveredCount
    readCount
    failedCount
    scheduledAt
    startedAt
    completedAt
    createdAt
    updatedAt
  }
`;

export const GET_CAMPAIGNS = gql`
  ${CAMPAIGN_FIELDS}
  query GetCampaigns($serviceProviderId: ID!, $status: CampaignStatus, $limit: Int, $offset: Int) {
    campaigns(serviceProviderId: $serviceProviderId, status: $status, limit: $limit, offset: $offset) {
      nodes {
        ...CampaignFields
      }
      totalCount
    }
  }
`;

export const GET_CAMPAIGN = gql`
  ${CAMPAIGN_FIELDS}
  query GetCampaign($id: ID!, $serviceProviderId: ID!) {
    campaign(id: $id, serviceProviderId: $serviceProviderId) {
      ...CampaignFields
    }
  }
`;
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/campaigns.ts` | **Create** | Campaign GraphQL queries and fragment |

---

## Acceptance Criteria

- [ ] `campaigns.ts` file created in `lib/graphql/`
- [ ] `CAMPAIGN_FIELDS` fragment covers all Campaign type fields
- [ ] `GET_CAMPAIGNS` query includes `serviceProviderId`, `status`, `limit`, `offset` variables
- [ ] `GET_CAMPAIGNS` returns `nodes` array + `totalCount`
- [ ] `GET_CAMPAIGN` query fetches single campaign by `id` + `serviceProviderId`
- [ ] Both queries use the shared fragment
- [ ] TypeScript: no type errors, query names match Apollo cache refetch expectations
- [ ] Consistent naming convention with other GraphQL files (e.g., `dashboard.ts`)

---

## Dependencies

- **Blocked by**: None (standalone file creation)
- **Blocks**: Tasks 9.1, 9.2, 9.3, 9.4, 9.9 (all UI components that need campaign data)
- **Related**: Tasks 9.15-9.21 (mutations and subscription added to same file)
