# Task 10.20 — addKnowledgeSource / removeKnowledgeSource Mutations

> **Section**: 10. Bots (AI Studio) — GraphQL Integration  
> **Priority**: P1 — Knowledge management  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/bots.ts`  
> **Status**: ✅ Complete

---

## Objective

Define the `ADD_KNOWLEDGE_SOURCE` and `REMOVE_KNOWLEDGE_SOURCE` mutations with the `KNOWLEDGE_SOURCE_FIELDS` fragment. Used by the knowledge base editor (10.12) and remove action (10.14).

---

## Current State

No knowledge source GraphQL operations exist. The knowledge page has a mock "Add Source" form and non-functional "Remove" buttons.

### GraphQL Schema

```graphql
enum KnowledgeSourceType { DOCUMENT, URL, TEXT, FAQ, API }
enum KnowledgeSourceStatus { PENDING, PROCESSING, ACTIVE_SOURCE, FAILED }

input AddKnowledgeSourceInput {
  botId: ID!
  serviceProviderId: ID!
  sourceType: KnowledgeSourceType!
  name: String!
  description: String
  content: String
  s3Key: String
  fileType: String
  fileSize: Int
}

type KnowledgeSource {
  id: ID!
  botId: ID!
  sourceType: KnowledgeSourceType!
  name: String!
  description: String
  content: String
  s3Key: String
  fileType: String
  fileSize: Int
  chunkCount: Int
  status: KnowledgeSourceStatus!
  createdAt: DateTime!
}

mutation {
  addKnowledgeSource(input: AddKnowledgeSourceInput!): KnowledgeSource!
  removeKnowledgeSource(knowledgeSourceId: ID!, botId: ID!, serviceProviderId: ID!): Boolean!
}
```

---

## Requirements

### 1. Fragment

```graphql
fragment KnowledgeSourceFields on KnowledgeSource {
  id
  botId
  sourceType
  name
  description
  content
  s3Key
  fileType
  fileSize
  chunkCount
  status
  createdAt
}
```

### 2. Mutations

#### ADD_KNOWLEDGE_SOURCE

```graphql
mutation AddKnowledgeSource($input: AddKnowledgeSourceInput!) {
  addKnowledgeSource(input: $input) {
    ...KnowledgeSourceFields
  }
}
```

#### REMOVE_KNOWLEDGE_SOURCE

```graphql
mutation RemoveKnowledgeSource($knowledgeSourceId: ID!, $botId: ID!, $serviceProviderId: ID!) {
  removeKnowledgeSource(
    knowledgeSourceId: $knowledgeSourceId
    botId: $botId
    serviceProviderId: $serviceProviderId
  )
}
```

### 3. TypeScript Types

```typescript
export type KnowledgeSourceType = 'DOCUMENT' | 'URL' | 'TEXT' | 'FAQ' | 'API';
export type KnowledgeSourceStatus = 'PENDING' | 'PROCESSING' | 'ACTIVE_SOURCE' | 'FAILED';

export interface KnowledgeSourceData {
  id: string;
  botId: string;
  sourceType: KnowledgeSourceType;
  name: string;
  description: string | null;
  content: string | null;
  s3Key: string | null;
  fileType: string | null;
  fileSize: number | null;
  chunkCount: number | null;
  status: KnowledgeSourceStatus;
  createdAt: string;
}

export interface AddKnowledgeSourceInput {
  botId: string;
  serviceProviderId: string;
  sourceType: KnowledgeSourceType;
  name: string;
  description?: string;
  content?: string;
  s3Key?: string;
  fileType?: string;
  fileSize?: number;
}
```

---

## Implementation Plan

```typescript
// Add to apps/provider/src/lib/graphql/bots.ts

export const KNOWLEDGE_SOURCE_FIELDS = gql`
  fragment KnowledgeSourceFields on KnowledgeSource {
    id
    botId
    sourceType
    name
    description
    content
    s3Key
    fileType
    fileSize
    chunkCount
    status
    createdAt
  }
`;

export const ADD_KNOWLEDGE_SOURCE = gql`
  mutation AddKnowledgeSource($input: AddKnowledgeSourceInput!) {
    addKnowledgeSource(input: $input) {
      ...KnowledgeSourceFields
    }
  }
  ${KNOWLEDGE_SOURCE_FIELDS}
`;

export const REMOVE_KNOWLEDGE_SOURCE = gql`
  mutation RemoveKnowledgeSource($knowledgeSourceId: ID!, $botId: ID!, $serviceProviderId: ID!) {
    removeKnowledgeSource(
      knowledgeSourceId: $knowledgeSourceId
      botId: $botId
      serviceProviderId: $serviceProviderId
    )
  }
`;
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add knowledge source fragment + mutations |
| `apps/provider/src/types/bots.ts` | **Modify** | Add knowledge source types |

---

## Acceptance Criteria

- [ ] `KNOWLEDGE_SOURCE_FIELDS` fragment covers all KnowledgeSource fields
- [ ] `ADD_KNOWLEDGE_SOURCE` mutation defined with `AddKnowledgeSourceInput`
- [ ] `REMOVE_KNOWLEDGE_SOURCE` mutation with three ID params
- [ ] TypeScript types for `KnowledgeSourceData`, enums, and input
- [ ] Source type and status enums as union types

---

## Dependencies

- **Blocked by**: Task 10.17 (bots.ts file creation)
- **Blocks**: Tasks 10.12 (add source), 10.14 (remove source)
- **Related**: Task 10.22 (botKnowledgeSources query), Task 10.11 (knowledge page)
