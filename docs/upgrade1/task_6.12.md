# Task 6.12 — GraphQL Conversation List Query

> **Section**: 6. Conversations — Connected Backend  
> **Priority**: P0 — Blocks all conversation UI  
> **Estimated Scope**: Large  
> **Route**: N/A (Data layer)  
> **File**: `apps/provider/src/lib/graphql/conversations.ts`
> **Status**: ✅ Complete

---

## Objective

Create the GraphQL query definitions, TypeScript types, and React hooks for fetching conversation lists with filters, search, sorting, and pagination.

---

## Current State

No `conversations.ts` exists in `apps/provider/src/lib/graphql/`. The `customers.ts` file has a raw reference to `conversations(...)` query but for customer list derivation. All conversation data is hardcoded mock data.

---

## Requirements

### 1. GraphQL Queries

**Conversation List**:
```graphql
query ConversationList(
  $status: ConversationStatus
  $search: String
  $orderBy: OrderByInput
  $limit: Int
  $offset: Int
) {
  conversations(
    limit: $limit
    offset: $offset
  ) {
    nodes {
      id
      status
      serviceProvider {
        id
        name
      }
      messages(limit: 1) {
        nodes {
          id
          senderType
          content
          createdAt
        }
        totalCount
      }
      createdAt
      updatedAt
    }
    totalCount
  }
}
```

**Single Conversation with Messages** (task 6.13):
```graphql
query ConversationDetail($id: ID!, $messageLimit: Int, $messageOffset: Int) {
  conversation(id: $id) {
    id
    status
    serviceProvider {
      id
      name
    }
    messages(limit: $messageLimit, offset: $messageOffset) {
      nodes {
        id
        senderType
        senderRefId
        messageType
        content
        metadata
        createdAt
      }
      totalCount
    }
    createdAt
    updatedAt
  }
}
```

### 2. TypeScript Types

```typescript
export interface ConversationNode {
  id: string;
  status: 'OPEN' | 'CLOSED' | 'ARCHIVED';
  serviceProvider: { id: string; name: string };
  messages: {
    nodes: MessageNode[];
    totalCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ConversationConnection {
  nodes: ConversationNode[];
  totalCount: number;
}

export interface MessageNode {
  id: string;
  senderType: 'CUSTOMER' | 'BOT' | 'AGENT' | 'SYSTEM';
  senderRefId?: string;
  messageType: 'TEXT' | 'FILE' | 'SYSTEM';
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface MessageConnection {
  nodes: MessageNode[];
  totalCount: number;
}

export interface ConversationListOptions {
  status?: string;
  search?: string;
  unreadOnly?: boolean;
  orderBy?: { field: string; direction: 'ASC' | 'DESC' };
  limit?: number;
  offset?: number;
}
```

### 3. React Hooks

```typescript
// Conversation list
export function useConversations(options: ConversationListOptions) {
  return useQuery<{ conversations: ConversationConnection }>(CONVERSATION_LIST_QUERY, {
    variables: buildListVariables(options),
    fetchPolicy: 'cache-and-network',
  });
}

// Single conversation with paginated messages
export function useConversation(id: string) {
  return useQuery<{ conversation: ConversationNode }>(CONVERSATION_DETAIL_QUERY, {
    variables: { id, messageLimit: 50, messageOffset: 0 },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });
}
```

### 4. Message Pagination Helper
- `fetchMoreMessages(conversationId, offset)` for loading older messages
- Merges into existing cache (prepend older messages)

### 5. Cache Configuration
- List: `cache-and-network` (frequently changing)
- Detail: `cache-and-network`
- Messages update via subscription (task 6.15, 6.16)
- Normalize by `__typename + id`

---

## Implementation Plan

```typescript
// apps/provider/src/lib/graphql/conversations.ts
import { gql, useQuery, useMutation, useSubscription } from '@apollo/client';

// ─── Queries ───
export const CONVERSATION_LIST_QUERY = gql`
  query ConversationList($limit: Int, $offset: Int) {
    conversations(limit: $limit, offset: $offset) {
      nodes {
        id
        status
        serviceProvider { id name }
        messages(limit: 1) {
          nodes { id senderType content createdAt }
          totalCount
        }
        createdAt
        updatedAt
      }
      totalCount
    }
  }
`;

export const CONVERSATION_DETAIL_QUERY = gql`
  query ConversationDetail($id: ID!, $messageLimit: Int, $messageOffset: Int) {
    conversation(id: $id) {
      id
      status
      serviceProvider { id name }
      messages(limit: $messageLimit, offset: $messageOffset) {
        nodes { id senderType senderRefId messageType content metadata createdAt }
        totalCount
      }
      createdAt
      updatedAt
    }
  }
`;

// ─── Types ───
export interface ConversationNode { ... }
export interface ConversationConnection { ... }
export interface MessageNode { ... }
export interface MessageConnection { ... }

// ─── Hooks ───
export function useConversations(options: ConversationListOptions) { ... }
export function useConversation(id: string) { ... }
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/conversations.ts` | Create — all conversation queries, types, and hooks |

---

## Acceptance Criteria

- [ ] `CONVERSATION_LIST_QUERY` with limit, offset (includes first message for preview)
- [ ] `CONVERSATION_DETAIL_QUERY` with paginated messages
- [ ] TypeScript interfaces for ConversationNode, MessageNode, MessageConnection
- [ ] `useConversations()` hook with filter/search/sort options
- [ ] `useConversation(id)` hook with message pagination
- [ ] `fetchMoreMessages` helper for loading older messages
- [ ] All queries aligned with schema types (ConversationStatus, Message, etc.)
- [ ] Cache normalization by `__typename + id`

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client setup)
- **Blocks**: Task 6.1 (List page), Task 6.5 (Chat thread), Task 6.13 (detail query used here), Task 6.14 (mutation), Task 6.15/6.16 (subscriptions)
- **Related**: Task 4.13 (Customer queries — same pattern), Task 5.12 (Notification queries)
