# Task 10.19 — setBotPermission Mutation

> **Section**: 10. Bots (AI Studio) — GraphQL Integration  
> **Priority**: P1 — Permission management  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/bots.ts`  
> **Status**: ✅ Complete

---

## Objective

Define the `SET_BOT_PERMISSION` mutation and `BOT_PERMISSION_FIELDS` fragment for granting or revoking bot tool permissions. Used by the wizard Step 4 (Permissions) and the bot detail page Permissions tab.

---

## Current State

No permission-related GraphQL operations exist. The wizard has no permissions step and the detail page doesn't show tool permissions.

### GraphQL Schema

```graphql
input SetBotPermissionInput {
  botId: ID!
  serviceProviderId: ID!
  toolName: String!
  isAllowed: Boolean!
  constraintsJson: String
}

type BotPermission {
  id: ID!
  botId: ID!
  toolName: String!
  isAllowed: Boolean!
  constraintsJson: String
}

mutation { setBotPermission(input: SetBotPermissionInput!): BotPermission! }
```

### Allowed Bot Tools

```
get_customer_profile, search_knowledge_base, evaluate_policy,
send_notification, schedule_callback, share_document,
create_ticket, update_ticket, escalate_to_human, check_account_status
```

---

## Requirements

### 1. Fragment

```graphql
fragment BotPermissionFields on BotPermission {
  id
  botId
  toolName
  isAllowed
  constraintsJson
}
```

### 2. Mutation

```graphql
mutation SetBotPermission($input: SetBotPermissionInput!) {
  setBotPermission(input: $input) {
    ...BotPermissionFields
  }
}
```

### 3. TypeScript Types

```typescript
export interface BotPermissionData {
  id: string;
  botId: string;
  toolName: string;
  isAllowed: boolean;
  constraintsJson: string | null;
}

export interface SetBotPermissionInput {
  botId: string;
  serviceProviderId: string;
  toolName: string;
  isAllowed: boolean;
  constraintsJson?: string;
}

export const ALLOWED_BOT_TOOLS = [
  { name: 'get_customer_profile', label: 'View Customer Profile', description: 'Access customer data and history' },
  { name: 'search_knowledge_base', label: 'Search Knowledge Base', description: 'Query indexed documents and FAQs' },
  { name: 'evaluate_policy', label: 'Evaluate Policy', description: 'Check communication policies before actions' },
  { name: 'send_notification', label: 'Send Notification', description: 'Send notifications to users' },
  { name: 'schedule_callback', label: 'Schedule Callback', description: 'Create callback appointment requests' },
  { name: 'share_document', label: 'Share Document', description: 'Share documents with conversation participants' },
  { name: 'create_ticket', label: 'Create Ticket', description: 'Create new support tickets' },
  { name: 'update_ticket', label: 'Update Ticket', description: 'Update existing ticket status and details' },
  { name: 'escalate_to_human', label: 'Escalate to Human', description: 'Hand conversation off to a human agent' },
  { name: 'check_account_status', label: 'Check Account Status', description: 'View account balance and status' },
] as const;
```

---

## Implementation Plan

```typescript
// Add to apps/provider/src/lib/graphql/bots.ts

export const BOT_PERMISSION_FIELDS = gql`
  fragment BotPermissionFields on BotPermission {
    id
    botId
    toolName
    isAllowed
    constraintsJson
  }
`;

export const SET_BOT_PERMISSION = gql`
  mutation SetBotPermission($input: SetBotPermissionInput!) {
    setBotPermission(input: $input) {
      ...BotPermissionFields
    }
  }
  ${BOT_PERMISSION_FIELDS}
`;
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add permission fragment + mutation |
| `apps/provider/src/types/bots.ts` | **Modify** | Add permission types + tool constants |

---

## Acceptance Criteria

- [ ] `BOT_PERMISSION_FIELDS` fragment covers all BotPermission fields
- [ ] `SET_BOT_PERMISSION` mutation defined with `SetBotPermissionInput`
- [ ] TypeScript types for `BotPermissionData` and `SetBotPermissionInput`
- [ ] `ALLOWED_BOT_TOOLS` constant with all 10 tools
- [ ] Each tool has name, label, and description

---

## Dependencies

- **Blocked by**: Task 10.17 (bots.ts file creation)
- **Blocks**: Task 10.5 (wizard Step 4), Task 10.7 (detail permissions tab)
- **Related**: Task 10.22 (botPermissions query)
