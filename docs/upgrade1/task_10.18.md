# Task 10.18 — updateBotConfiguration Mutation

> **Section**: 10. Bots (AI Studio) — GraphQL Integration  
> **Priority**: P0 — Configuration management  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/bots.ts`  
> **Status**: ✅ Complete

---

## Objective

Define the `UPDATE_BOT_CONFIGURATION` mutation and `BOT_CONFIGURATION_FIELDS` fragment for updating bot configuration settings. Used by the wizard (Step 2-3), the detail page config tab, and the BotConfigEditor component.

---

## Current State

No configuration mutation exists. `BotConfigEditor.tsx` has a mock `onSave` callback and the detail page uses uncontrolled `defaultValue` inputs.

### GraphQL Schema

```graphql
input UpdateBotConfigurationInput {
  botId: ID!
  serviceProviderId: ID!
  tone: String
  writingStyle: String
  supportedLanguages: [String!]
  workingHoursStart: String
  workingHoursEnd: String
  workingDays: [Int!]
  maxTurnsBeforeEscalation: Int
  escalationRulesJson: String
  humanHandoffPolicyJson: String
  approvalPolicyJson: String
  fallbackActionsJson: String
  complianceRestrictionsJson: String
  customSystemPrompt: String
  temperature: Float
}

type BotConfiguration {
  botId: ID!
  tone: String
  writingStyle: String
  supportedLanguages: [String!]!
  workingHoursStart: String
  workingHoursEnd: String
  workingDays: [Int!]!
  maxTurnsBeforeEscalation: Int
  escalationRulesJson: String
  humanHandoffPolicyJson: String
  approvalPolicyJson: String
  fallbackActionsJson: String
  complianceRestrictionsJson: String
  customSystemPrompt: String
  temperature: Float
}

mutation { updateBotConfiguration(input: UpdateBotConfigurationInput!): BotConfiguration! }
```

---

## Requirements

### 1. Fragment

```graphql
fragment BotConfigurationFields on BotConfiguration {
  botId
  tone
  writingStyle
  supportedLanguages
  workingHoursStart
  workingHoursEnd
  workingDays
  maxTurnsBeforeEscalation
  escalationRulesJson
  humanHandoffPolicyJson
  approvalPolicyJson
  fallbackActionsJson
  complianceRestrictionsJson
  customSystemPrompt
  temperature
}
```

### 2. Mutation

```graphql
mutation UpdateBotConfiguration($input: UpdateBotConfigurationInput!) {
  updateBotConfiguration(input: $input) {
    ...BotConfigurationFields
  }
}
```

### 3. TypeScript Types

```typescript
export interface BotConfigurationData {
  botId: string;
  tone: string | null;
  writingStyle: string | null;
  supportedLanguages: string[];
  workingHoursStart: string | null;
  workingHoursEnd: string | null;
  workingDays: number[];
  maxTurnsBeforeEscalation: number | null;
  escalationRulesJson: string | null;
  humanHandoffPolicyJson: string | null;
  approvalPolicyJson: string | null;
  fallbackActionsJson: string | null;
  complianceRestrictionsJson: string | null;
  customSystemPrompt: string | null;
  temperature: number | null;
}

export interface UpdateBotConfigurationInput {
  botId: string;
  serviceProviderId: string;
  tone?: string;
  writingStyle?: string;
  supportedLanguages?: string[];
  workingHoursStart?: string;
  workingHoursEnd?: string;
  workingDays?: number[];
  maxTurnsBeforeEscalation?: number;
  escalationRulesJson?: string;
  humanHandoffPolicyJson?: string;
  approvalPolicyJson?: string;
  fallbackActionsJson?: string;
  complianceRestrictionsJson?: string;
  customSystemPrompt?: string;
  temperature?: number;
}
```

---

## Implementation Plan

```typescript
// Add to apps/provider/src/lib/graphql/bots.ts

export const BOT_CONFIGURATION_FIELDS = gql`
  fragment BotConfigurationFields on BotConfiguration {
    botId
    tone
    writingStyle
    supportedLanguages
    workingHoursStart
    workingHoursEnd
    workingDays
    maxTurnsBeforeEscalation
    escalationRulesJson
    humanHandoffPolicyJson
    approvalPolicyJson
    fallbackActionsJson
    complianceRestrictionsJson
    customSystemPrompt
    temperature
  }
`;

export const UPDATE_BOT_CONFIGURATION = gql`
  mutation UpdateBotConfiguration($input: UpdateBotConfigurationInput!) {
    updateBotConfiguration(input: $input) {
      ...BotConfigurationFields
    }
  }
  ${BOT_CONFIGURATION_FIELDS}
`;
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add config fragment + mutation |
| `apps/provider/src/types/bots.ts` | **Modify** | Add configuration types |

---

## Acceptance Criteria

- [ ] `BOT_CONFIGURATION_FIELDS` fragment covers all BotConfiguration fields
- [ ] `UPDATE_BOT_CONFIGURATION` mutation defined with `UpdateBotConfigurationInput`
- [ ] TypeScript types for `BotConfigurationData` and `UpdateBotConfigurationInput`
- [ ] JSON fields typed as `string | null`

---

## Dependencies

- **Blocked by**: Task 10.17 (bots.ts file creation)
- **Blocks**: Tasks 10.5 (wizard Steps 2-3), 10.7 (detail config tab)
- **Related**: Task 10.22 (botConfiguration query)
