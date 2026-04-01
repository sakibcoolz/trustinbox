# Task 10.17 — createBot / updateBot / deleteBot Mutations

> **Section**: 10. Bots (AI Studio) — GraphQL Integration  
> **Priority**: P0 — Foundation mutations  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/graphql/bots.ts`  
> **Status**: ✅ Complete

---

## Objective

Define the `CREATE_BOT`, `UPDATE_BOT`, and `DELETE_BOT` GraphQL mutations with full input types and return fragments. These are the core bot CRUD operations used by the wizard (10.5), detail page (10.7/10.9), and list page (10.3).

---

## Current State

No `apps/provider/src/lib/graphql/bots.ts` file exists. All bot pages use hardcoded mock data.

### GraphQL Schema

```graphql
input CreateBotInput {
  serviceProviderId: ID!
  name: String!
  purpose: String!
  department: String
  industryProfileId: ID
  avatarUrl: String
}

input UpdateBotInput {
  botId: ID!
  serviceProviderId: ID!
  name: String
  purpose: String
  department: String
  avatarUrl: String
  status: BotStatus
}

mutation {
  createBot(input: CreateBotInput!): Bot!
  updateBot(input: UpdateBotInput!): Bot!
  deleteBot(botId: ID!, serviceProviderId: ID!): Boolean!
}
```

---

## Requirements

### 1. Bot Fragment

Define a reusable fragment for consistent Bot fields across queries and mutations:

```graphql
fragment BotFields on Bot {
  id
  serviceProviderId
  name
  avatarUrl
  purpose
  department
  industryProfileId
  status
  createdAt
  updatedAt
}
```

### 2. Bot With Analytics Fragment

Extended fragment including analytics for list and detail pages:

```graphql
fragment BotWithAnalytics on Bot {
  ...BotFields
  analytics {
    botId
    totalConversations
    totalMessagesSent
    totalMessagesReceived
    totalActionsExecuted
    totalEscalations
    avgResponseTimeMs
    escalationRate
    resolutionRate
    satisfactionScore
    lastActiveAt
  }
}
```

### 3. Mutations

#### CREATE_BOT

```graphql
mutation CreateBot($input: CreateBotInput!) {
  createBot(input: $input) {
    ...BotWithAnalytics
  }
}
```

**Used by**: Task 10.5 (wizard Step 1)

#### UPDATE_BOT

```graphql
mutation UpdateBot($input: UpdateBotInput!) {
  updateBot(input: $input) {
    ...BotFields
  }
}
```

**Used by**: Task 10.3 (quick toggle), 10.5 (wizard Step 5 deploy), 10.9 (status toggle)

#### DELETE_BOT

```graphql
mutation DeleteBot($botId: ID!, $serviceProviderId: ID!) {
  deleteBot(botId: $botId, serviceProviderId: $serviceProviderId)
}
```

**Used by**: Task 10.10 (delete bot)

### 4. TypeScript Types

```typescript
export interface BotFields {
  id: string;
  serviceProviderId: string;
  name: string;
  avatarUrl: string | null;
  purpose: string;
  department: string | null;
  industryProfileId: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
}

export interface BotAnalyticsData {
  botId: string;
  totalConversations: number;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalActionsExecuted: number;
  totalEscalations: number;
  avgResponseTimeMs: number;
  escalationRate: number;
  resolutionRate: number;
  satisfactionScore: number;
  lastActiveAt: string | null;
}

export interface CreateBotInput {
  serviceProviderId: string;
  name: string;
  purpose: string;
  department?: string;
  industryProfileId?: string;
  avatarUrl?: string;
}

export interface UpdateBotInput {
  botId: string;
  serviceProviderId: string;
  name?: string;
  purpose?: string;
  department?: string;
  avatarUrl?: string;
  status?: 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
}
```

---

## Implementation Plan

```typescript
// apps/provider/src/lib/graphql/bots.ts
import { gql } from '@apollo/client';

export const BOT_FIELDS = gql`
  fragment BotFields on Bot {
    id
    serviceProviderId
    name
    avatarUrl
    purpose
    department
    industryProfileId
    status
    createdAt
    updatedAt
  }
`;

export const BOT_WITH_ANALYTICS = gql`
  fragment BotWithAnalytics on Bot {
    ...BotFields
    analytics {
      botId
      totalConversations
      totalMessagesSent
      totalMessagesReceived
      totalActionsExecuted
      totalEscalations
      avgResponseTimeMs
      escalationRate
      resolutionRate
      satisfactionScore
      lastActiveAt
    }
  }
  ${BOT_FIELDS}
`;

export const CREATE_BOT = gql`
  mutation CreateBot($input: CreateBotInput!) {
    createBot(input: $input) {
      ...BotWithAnalytics
    }
  }
  ${BOT_WITH_ANALYTICS}
`;

export const UPDATE_BOT = gql`
  mutation UpdateBot($input: UpdateBotInput!) {
    updateBot(input: $input) {
      ...BotFields
    }
  }
  ${BOT_FIELDS}
`;

export const DELETE_BOT = gql`
  mutation DeleteBot($botId: ID!, $serviceProviderId: ID!) {
    deleteBot(botId: $botId, serviceProviderId: $serviceProviderId)
  }
`;
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/bots.ts` | **Create** | Bot fragments + CRUD mutations |
| `apps/provider/src/types/bots.ts` | **Create** | TypeScript types for bot data |

---

## Acceptance Criteria

- [ ] `BOT_FIELDS` fragment includes all core Bot fields
- [ ] `BOT_WITH_ANALYTICS` fragment extends with analytics
- [ ] `CREATE_BOT` mutation defined with `CreateBotInput`
- [ ] `UPDATE_BOT` mutation defined with `UpdateBotInput`
- [ ] `DELETE_BOT` mutation defined with botId + serviceProviderId
- [ ] TypeScript interfaces for all input types
- [ ] Fragments are reused consistently

---

## Dependencies

- **Blocked by**: None (schema already defined)
- **Blocks**: Tasks 10.1-10.5, 10.7, 10.9, 10.10 (all bot CRUD operations)
- **Related**: Tasks 10.18-10.23 (config, permission, knowledge, action mutations and queries)
