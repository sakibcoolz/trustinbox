# Task 6.13 — GraphQL Conversation Detail + Messages Query

> **Section**: 6. Conversations — Connected Backend  
> **Priority**: P0  
> **Estimated Scope**: Medium  
> **Route**: N/A (Data layer)  
> **File**: `apps/provider/src/lib/graphql/conversations.ts`

---

## Objective

Define the conversation detail query with cursor-based message pagination (latest messages first), supporting infinite scroll for loading older messages, and include related metadata for the info sidebar.

---

## Current State

Defined in task 6.12 as `CONVERSATION_DETAIL_QUERY`. This task focuses on the message pagination mechanics and cache management for the chat thread.

---

## Requirements

### 1. Message Pagination
- Initial load: last 50 messages (most recent first)
- Scroll to top: load 50 more older messages
- Cursor-based: use `offset` (or `cursor` if schema supports it)
- Messages ordered by `createdAt DESC` from server, reversed for display

### 2. fetchMore Integration

```typescript
export function useConversation(id: string) {
  const result = useQuery(CONVERSATION_DETAIL_QUERY, {
    variables: { id, messageLimit: 50, messageOffset: 0 },
    skip: !id,
    fetchPolicy: 'cache-and-network',
  });

  const fetchMoreMessages = () => {
    const currentCount = result.data?.conversation.messages.nodes.length ?? 0;
    return result.fetchMore({
      variables: { messageOffset: currentCount },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          conversation: {
            ...prev.conversation,
            messages: {
              ...prev.conversation.messages,
              nodes: [
                ...prev.conversation.messages.nodes,
                ...fetchMoreResult.conversation.messages.nodes,
              ],
            },
          },
        };
      },
    });
  };

  const hasMore = (result.data?.conversation.messages.nodes.length ?? 0) <
    (result.data?.conversation.messages.totalCount ?? 0);

  return { ...result, fetchMoreMessages, hasMore };
}
```

### 3. New Message Cache Update
When a new message arrives (via subscription task 6.16):
- Append to the end of `messages.nodes` array
- Increment `totalCount`
- Update conversation's `updatedAt`
- Update conversation list's last message preview

### 4. Extended Fields for Info Sidebar
If the schema supports it (or via separate query):
```graphql
conversation(id: $id) {
  # ... existing fields
  # Extended for sidebar (task 6.11):
  # participantVirtualId
  # sharedDocuments { id name sharedAt }
  # relatedCallbacks { id status requestedAt }
}
```

> **Note**: If these fields don't exist in schema, the sidebar will use separate queries or derive from existing data.
> **Status**: ✅ Complete

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/conversations.ts` | Modify — add fetchMoreMessages helper, cache update logic |

---

## Acceptance Criteria

- [ ] Initial load: last 50 messages
- [ ] `fetchMoreMessages()` loads 50 more older messages
- [ ] `hasMore` flag based on nodes.length vs totalCount
- [ ] Cache updated correctly on fetchMore (append older messages)
- [ ] New message subscription appends to cache correctly
- [ ] Messages displayed in chronological order (oldest to newest)

---

## Dependencies

- **Blocked by**: Task 6.12 (Base queries and types)
- **Blocks**: Task 6.5 (Chat thread — infinite scroll)
- **Related**: Task 6.16 (`messageReceived` subscription — updates cache)
