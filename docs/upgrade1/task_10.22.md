# Task 10.22 — Bot Queries (All)

> **Section**: 10. Bots (AI Studio) — GraphQL Integration  
> **Priority**: P0 — Foundation queries  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/graphql/bots.ts`  
> **Status**: ✅ Complete

---

## Objective

Define all bot-related GraphQL queries: `GET_BOTS`, `GET_BOT`, `GET_BOT_CONFIGURATION`, `GET_BOT_PERMISSIONS`, `GET_BOT_KNOWLEDGE_SOURCES`, `GET_BOT_ACTION_LOGS`, and `GET_BOT_ANALYTICS`. These are the read operations consumed by all bot pages.

---

## Current State

No queries exist. All bot pages use hardcoded mock data.

### GraphQL Schema

```graphql
query {
  bot(id: ID!, serviceProviderId: ID!): Bot!
  bots(serviceProviderId: ID!, status: BotStatus, limit: Int, offset: Int): BotConnection!
  botConfiguration(botId: ID!, serviceProviderId: ID!): BotConfiguration!
  botPermissions(botId: ID!, serviceProviderId: ID!): [BotPermission!]!
  botKnowledgeSources(botId: ID!, serviceProviderId: ID!): [KnowledgeSource!]!
  botActionLogs(botId: ID!, serviceProviderId: ID!, conversationId: ID, limit: Int, offset: Int): BotActionLogConnection!
  botAnalytics(botId: ID!, serviceProviderId: ID!): BotAnalytics!
}
```

---

## Requirements

### 1. GET_BOTS (list page)

```graphql
query GetBots($serviceProviderId: ID!, $status: BotStatus, $limit: Int, $offset: Int) {
  bots(serviceProviderId: $serviceProviderId, status: $status, limit: $limit, offset: $offset) {
    nodes {
      ...BotWithAnalytics
    }
    totalCount
  }
}
```

**Used by**: Task 10.1 (bot list page)

### 2. GET_BOT (detail page)

```graphql
query GetBot($id: ID!, $serviceProviderId: ID!) {
  bot(id: $id, serviceProviderId: $serviceProviderId) {
    ...BotWithAnalytics
    configuration {
      ...BotConfigurationFields
    }
    permissions {
      ...BotPermissionFields
    }
    knowledgeSources {
      ...KnowledgeSourceFields
    }
  }
}
```

**Used by**: Task 10.7 (bot detail page) — fetches everything in one query

### 3. GET_BOT_CONFIGURATION

```graphql
query GetBotConfiguration($botId: ID!, $serviceProviderId: ID!) {
  botConfiguration(botId: $botId, serviceProviderId: $serviceProviderId) {
    ...BotConfigurationFields
  }
}
```

**Used by**: Task 10.7 (config tab — if separate fetch preferred)

### 4. GET_BOT_PERMISSIONS

```graphql
query GetBotPermissions($botId: ID!, $serviceProviderId: ID!) {
  botPermissions(botId: $botId, serviceProviderId: $serviceProviderId) {
    ...BotPermissionFields
  }
}
```

**Used by**: Task 10.7 (permissions tab)

### 5. GET_BOT_KNOWLEDGE_SOURCES

```graphql
query GetBotKnowledgeSources($botId: ID!, $serviceProviderId: ID!) {
  botKnowledgeSources(botId: $botId, serviceProviderId: $serviceProviderId) {
    ...KnowledgeSourceFields
  }
}
```

**Used by**: Task 10.11 (knowledge page)

### 6. GET_BOT_ACTION_LOGS

```graphql
query GetBotActionLogs($botId: ID!, $serviceProviderId: ID!, $conversationId: ID, $limit: Int, $offset: Int) {
  botActionLogs(botId: $botId, serviceProviderId: $serviceProviderId, conversationId: $conversationId, limit: $limit, offset: $offset) {
    nodes {
      id
      botId
      conversationId
      userId
      actionType
      toolUsed
      inputSummary
      outputSummary
      policyDecision
      durationMs
      success
      errorMessage
      createdAt
    }
    totalCount
  }
}
```

**Used by**: Tasks 10.8 (activity log), 10.16 (audit log)

### 7. GET_BOT_ANALYTICS

```graphql
query GetBotAnalytics($botId: ID!, $serviceProviderId: ID!) {
  botAnalytics(botId: $botId, serviceProviderId: $serviceProviderId) {
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

**Used by**: Task 10.15 (analytics page)

---

## Implementation Plan

```typescript
// Add to apps/provider/src/lib/graphql/bots.ts

export const GET_BOTS = gql`
  query GetBots($serviceProviderId: ID!, $status: BotStatus, $limit: Int, $offset: Int) {
    bots(serviceProviderId: $serviceProviderId, status: $status, limit: $limit, offset: $offset) {
      nodes {
        ...BotWithAnalytics
      }
      totalCount
    }
  }
  ${BOT_WITH_ANALYTICS}
`;

export const GET_BOT = gql`
  query GetBot($id: ID!, $serviceProviderId: ID!) {
    bot(id: $id, serviceProviderId: $serviceProviderId) {
      ...BotWithAnalytics
      configuration {
        ...BotConfigurationFields
      }
      permissions {
        ...BotPermissionFields
      }
      knowledgeSources {
        ...KnowledgeSourceFields
      }
    }
  }
  ${BOT_WITH_ANALYTICS}
  ${BOT_CONFIGURATION_FIELDS}
  ${BOT_PERMISSION_FIELDS}
  ${KNOWLEDGE_SOURCE_FIELDS}
`;

export const GET_BOT_CONFIGURATION = gql`
  query GetBotConfiguration($botId: ID!, $serviceProviderId: ID!) {
    botConfiguration(botId: $botId, serviceProviderId: $serviceProviderId) {
      ...BotConfigurationFields
    }
  }
  ${BOT_CONFIGURATION_FIELDS}
`;

export const GET_BOT_PERMISSIONS = gql`
  query GetBotPermissions($botId: ID!, $serviceProviderId: ID!) {
    botPermissions(botId: $botId, serviceProviderId: $serviceProviderId) {
      ...BotPermissionFields
    }
  }
  ${BOT_PERMISSION_FIELDS}
`;

export const GET_BOT_KNOWLEDGE_SOURCES = gql`
  query GetBotKnowledgeSources($botId: ID!, $serviceProviderId: ID!) {
    botKnowledgeSources(botId: $botId, serviceProviderId: $serviceProviderId) {
      ...KnowledgeSourceFields
    }
  }
  ${KNOWLEDGE_SOURCE_FIELDS}
`;

export const GET_BOT_ACTION_LOGS = gql`
  query GetBotActionLogs($botId: ID!, $serviceProviderId: ID!, $conversationId: ID, $limit: Int, $offset: Int) {
    botActionLogs(botId: $botId, serviceProviderId: $serviceProviderId, conversationId: $conversationId, limit: $limit, offset: $offset) {
      nodes {
        id
        botId
        conversationId
        userId
        actionType
        toolUsed
        inputSummary
        outputSummary
        policyDecision
        durationMs
        success
        errorMessage
        createdAt
      }
      totalCount
    }
  }
`;

export const GET_BOT_ANALYTICS = gql`
  query GetBotAnalytics($botId: ID!, $serviceProviderId: ID!) {
    botAnalytics(botId: $botId, serviceProviderId: $serviceProviderId) {
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
`;
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add all 7 bot queries |

---

## Acceptance Criteria

- [ ] `GET_BOTS` query with status filter, pagination, returns BotConnection
- [ ] `GET_BOT` query fetches single bot with config, permissions, knowledge sources
- [ ] `GET_BOT_CONFIGURATION` standalone config query
- [ ] `GET_BOT_PERMISSIONS` standalone permissions query
- [ ] `GET_BOT_KNOWLEDGE_SOURCES` standalone knowledge sources query
- [ ] `GET_BOT_ACTION_LOGS` with pagination and conversationId filter
- [ ] `GET_BOT_ANALYTICS` with all analytics fields
- [ ] All queries reuse appropriate fragments
- [ ] Query names match convention (GetBots, GetBot, etc.)

---

## Dependencies

- **Blocked by**: Tasks 10.17-10.20 (fragments defined in those tasks)
- **Blocks**: Tasks 10.1, 10.4, 10.7, 10.8, 10.11, 10.15, 10.16 (all data-fetching pages)
- **Related**: All Section 10 UI tasks
