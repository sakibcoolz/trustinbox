# Task 10.21 — executeBotAction Mutation (Policy-Gated)

> **Section**: 10. Bots (AI Studio) — GraphQL Integration  
> **Priority**: P1 — Bot execution  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/bots.ts`  
> **Status**: ✅ Complete

---

## Objective

Define the `EXECUTE_BOT_ACTION` mutation that executes a bot action through the policy engine. This is the primary mutation for the test panel (10.6) and any interactive bot execution flows. All actions are policy-gated — the backend checks the bot's permissions via the PolicyChecker before executing.

---

## Current State

No execution mutation exists. The test panel and bot interaction flows are not implemented.

### GraphQL Schema

```graphql
input ExecuteBotActionInput {
  botId: ID!
  serviceProviderId: ID!
  conversationId: ID!
  userId: ID!
  actionType: String!
  toolName: String
  inputJson: String
}

type ExecuteBotActionResult {
  success: Boolean!
  outputJson: String
  policyDecision: String
  policyReason: String
  escalated: Boolean!
}

mutation { executeBotAction(input: ExecuteBotActionInput!): ExecuteBotActionResult! }
```

### Backend Policy Flow

The `bot-service` use case calls `PolicyChecker.CheckBotAction()` before execution:
- If policy **ALLOWED**: execute the action, log result
- If policy **DENIED**: return denied result with reason, log denial
- All actions logged to `bot_action_logs` table

---

## Requirements

### 1. Mutation

```graphql
mutation ExecuteBotAction($input: ExecuteBotActionInput!) {
  executeBotAction(input: $input) {
    success
    outputJson
    policyDecision
    policyReason
    escalated
  }
}
```

### 2. TypeScript Types

```typescript
export interface ExecuteBotActionInput {
  botId: string;
  serviceProviderId: string;
  conversationId: string;
  userId: string;
  actionType: string;
  toolName?: string;
  inputJson?: string;
}

export interface ExecuteBotActionResult {
  success: boolean;
  outputJson: string | null;
  policyDecision: string | null;
  policyReason: string | null;
  escalated: boolean;
}
```

### 3. Policy Decision Handling

UI should handle both outcomes:

| policyDecision | UI Action |
|----------------|-----------|
| `"ALLOWED"` | Show result from `outputJson` |
| `"DENIED"` | Show denial badge + `policyReason` |
| `null` | Show generic result |

### 4. Escalation Handling

When `escalated: true`:
- Show escalation notice in test panel
- "This action was escalated to a human agent"
- Purple/accent badge

---

## Implementation Plan

```typescript
// Add to apps/provider/src/lib/graphql/bots.ts

export const EXECUTE_BOT_ACTION = gql`
  mutation ExecuteBotAction($input: ExecuteBotActionInput!) {
    executeBotAction(input: $input) {
      success
      outputJson
      policyDecision
      policyReason
      escalated
    }
  }
`;
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add executeBotAction mutation |
| `apps/provider/src/types/bots.ts` | **Modify** | Add execution types |

---

## Acceptance Criteria

- [ ] `EXECUTE_BOT_ACTION` mutation defined with `ExecuteBotActionInput`
- [ ] Returns all `ExecuteBotActionResult` fields
- [ ] TypeScript types for input and result
- [ ] Policy decision handling documented (ALLOWED/DENIED)
- [ ] Escalation flag documented

---

## Dependencies

- **Blocked by**: Task 10.17 (bots.ts file creation)
- **Blocks**: Task 10.6 (test panel execution)
- **Related**: Task 10.23 (subscription for action execution events)
