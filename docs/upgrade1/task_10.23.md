# Task 10.23 — providerBotActionExecuted Subscription

> **Section**: 10. Bots (AI Studio) — GraphQL Integration  
> **Priority**: P2 — Real-time updates  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/bots.ts`  
> **Status**: ✅ Complete

---

## Objective

Define the `PROVIDER_BOT_ACTION_EXECUTED` subscription for real-time bot action feeds. When a bot executes an action, the provider sees it live in the activity log (10.8) and audit log (10.16) without manual refresh.

---

## Current State

No subscriptions exist for bot actions. Activity logs require manual page refresh.

### GraphQL Schema

```graphql
subscription {
  providerBotActionExecuted(serviceProviderId: ID!): BotActionLog!
}

type BotActionLog {
  id: ID!
  botId: ID!
  conversationId: ID
  userId: ID
  actionType: String!
  toolUsed: String
  inputSummary: String
  outputSummary: String
  policyDecision: String
  durationMs: Int
  success: Boolean!
  errorMessage: String
  createdAt: DateTime!
}
```

---

## Requirements

### 1. Subscription Definition

```graphql
subscription ProviderBotActionExecuted($serviceProviderId: ID!) {
  providerBotActionExecuted(serviceProviderId: $serviceProviderId) {
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
}
```

### 2. Client-side Integration

```typescript
// Hook usage in activity log component
const { data: newAction } = useSubscription(PROVIDER_BOT_ACTION_EXECUTED, {
  variables: { serviceProviderId },
});

useEffect(() => {
  if (newAction?.providerBotActionExecuted) {
    // Prepend to action logs list
    // Or update Apollo cache
  }
}, [newAction]);
```

### 3. Cache Update on New Action

When a new action is received:
1. Prepend to `botActionLogs` cache for the relevant bot
2. Show a brief toast or pulse animation on the new entry
3. Optionally update `BotAnalytics` counters (or refetch analytics)

### 4. WebSocket Setup

- Requires WebSocket connection to gateway
- Apollo `split` link for HTTP queries + WS subscriptions
- Should already be configured in Apollo provider setup

---

## Implementation Plan

```typescript
// Add to apps/provider/src/lib/graphql/bots.ts

export const PROVIDER_BOT_ACTION_EXECUTED = gql`
  subscription ProviderBotActionExecuted($serviceProviderId: ID!) {
    providerBotActionExecuted(serviceProviderId: $serviceProviderId) {
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
  }
`;
```

### Usage Hook

```typescript
// apps/provider/src/hooks/useBotActionSubscription.ts
import { useSubscription } from '@apollo/client';
import { PROVIDER_BOT_ACTION_EXECUTED } from '@/lib/graphql/bots';
import { useServiceProvider } from '@/hooks/useServiceProvider';

export function useBotActionSubscription(botId?: string) {
  const { serviceProviderId } = useServiceProvider();

  const { data, error } = useSubscription(PROVIDER_BOT_ACTION_EXECUTED, {
    variables: { serviceProviderId },
    skip: !serviceProviderId,
  });

  const action = data?.providerBotActionExecuted;

  // Filter by botId if provided (subscription is org-wide)
  if (botId && action?.botId !== botId) return { action: null, error };

  return { action, error };
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add subscription definition |
| `apps/provider/src/hooks/useBotActionSubscription.ts` | **Create** | Reusable subscription hook |

---

## Acceptance Criteria

- [ ] `PROVIDER_BOT_ACTION_EXECUTED` subscription defined with all BotActionLog fields
- [ ] `useBotActionSubscription` hook wraps the subscription with serviceProviderId
- [ ] Hook supports optional botId filtering
- [ ] New actions prepend to activity/audit logs in real-time
- [ ] WebSocket transport assumptions documented
- [ ] Graceful handling if WebSocket isn't available (degrades to polling)

---

## Dependencies

- **Blocked by**: Task 10.17 (bots.ts file creation), WebSocket Apollo link setup
- **Blocks**: None (enhancement layer)
- **Related**: Task 10.8 (activity log — consumer), Task 10.16 (audit log — consumer)
