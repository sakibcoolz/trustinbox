# Task 6.16 — GraphQL messageReceived Subscription (Per-Conversation)

> **Section**: 6. Conversations — Connected Backend  
> **Priority**: P0  
> **Estimated Scope**: Medium  
> **Route**: `/conversations/[id]`  
> **File**: `apps/provider/src/lib/graphql/conversations.ts`
> **Status**: ✅ Complete

---

## Objective

Implement the `messageReceived` per-conversation subscription to power real-time message delivery in the active chat thread, appending new messages to the thread and triggering scroll/notification behavior.

---

## Current State

No subscription. Messages only appear via local state manipulation on send. No real-time incoming messages.

---

## Requirements

### 1. GraphQL Subscription (from schema)

```graphql
subscription MessageReceived($conversationId: ID!) {
  messageReceived(conversationId: $conversationId) {
    id
    senderType
    senderRefId
    messageType
    content
    metadata
    createdAt
  }
}
```

### 2. Scope
- Per-conversation: only receives messages for the currently viewed conversation
- Subscribed when conversation detail page mounts
- Unsubscribed when user navigates away

### 3. Cache Update on Event
When a new message arrives:
1. Append to `conversation.messages.nodes` in cache
2. Increment `messages.totalCount`
3. Update `conversation.updatedAt`
4. Auto-scroll to bottom (if user is at/near bottom)
5. Show "New message ↓" button if user has scrolled up

### 4. Deduplication
- Messages sent by this agent arrive via:
  1. Optimistic response (from `useSendMessage`)
  2. Subscription event
- Deduplicate based on `message.id` — if normalizing with `__typename + id`, Apollo cache handles this automatically
- Ensure no duplicate messages displayed

### 5. Typing Indicator Integration
- Subscription may also carry typing signals (or separate subscription)
- When customer message arrives, hide typing indicator

### 6. React Hook

```typescript
export function useMessageSubscription(conversationId: string) {
  return useSubscription(MESSAGE_RECEIVED_SUBSCRIPTION, {
    variables: { conversationId },
    skip: !conversationId,
    onData: ({ client, data: { data } }) => {
      const message = data?.messageReceived;
      if (!message) return;

      // Update conversation cache
      const convCacheId = client.cache.identify({
        __typename: 'Conversation',
        id: conversationId,
      });

      client.cache.modify({
        id: convCacheId,
        fields: {
          messages(existing) {
            // Check for duplicate (optimistic response)
            const exists = existing?.nodes?.some(
              (ref: any) => client.cache.identify(ref) === client.cache.identify(message)
            );
            if (exists) return existing;

            const newRef = client.cache.writeFragment({
              fragment: MESSAGE_FRAGMENT,
              data: message,
            });
            return {
              ...existing,
              nodes: [...(existing?.nodes ?? []), newRef],
              totalCount: (existing?.totalCount ?? 0) + 1,
            };
          },
          updatedAt: () => new Date().toISOString(),
        },
      });
    },
  });
}
```

### 7. Sound Notification (optional)
- Play subtle sound when customer message arrives (if user has enabled notification sounds in settings, task 16.5)
- No sound for own messages or bot messages

### 8. Polling Fallback
- If WebSocket unavailable: poll conversation messages every 10 seconds
- Compare message count to detect new messages
- Less ideal UX but functional

---

## Implementation Plan

```typescript
// apps/provider/src/lib/graphql/conversations.ts — add per-conversation subscription

const MESSAGE_FRAGMENT = gql`
  fragment MessageFields on Message {
    id senderType senderRefId messageType content metadata createdAt
  }
`;

export const MESSAGE_RECEIVED_SUBSCRIPTION = gql`
  subscription MessageReceived($conversationId: ID!) {
    messageReceived(conversationId: $conversationId) {
      ...MessageFields
    }
  }
  ${MESSAGE_FRAGMENT}
`;

export function useMessageSubscription(conversationId: string) {
  return useSubscription(MESSAGE_RECEIVED_SUBSCRIPTION, {
    variables: { conversationId },
    skip: !conversationId,
    onData: ({ client, data: { data } }) => {
      const message = data?.messageReceived;
      if (!message) return;

      const convCacheId = client.cache.identify({
        __typename: 'Conversation',
        id: conversationId,
      });

      if (convCacheId) {
        client.cache.modify({
          id: convCacheId,
          fields: {
            messages(existing = { nodes: [], totalCount: 0 }) {
              const newRef = client.cache.writeFragment({
                fragment: MESSAGE_FRAGMENT,
                data: message,
              });
              return {
                ...existing,
                nodes: [...existing.nodes, newRef],
                totalCount: existing.totalCount + 1,
              };
            },
            updatedAt: () => message.createdAt,
          },
        });
      }
    },
  });
}
```

```tsx
// In conversations/[id]/page.tsx
export default function ConversationDetailPage({ params }) {
  const { id } = use(params);
  const { data, loading } = useConversation(id);

  // Subscribe to live messages
  useMessageSubscription(id);

  // Auto-scroll on new messages
  const messages = data?.conversation.messages.nodes ?? [];
  // ...
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/conversations.ts` | Modify — add MESSAGE_RECEIVED_SUBSCRIPTION + useMessageSubscription hook |
| `apps/provider/src/app/conversations/[id]/page.tsx` | Modify — subscribe on mount |

---

## Acceptance Criteria

- [ ] `messageReceived(conversationId)` subscription defined
- [ ] New messages appear in real-time in chat thread
- [ ] Cache updated: message appended, totalCount incremented, updatedAt set
- [ ] Deduplication: no duplicates from optimistic + subscription
- [ ] Auto-scroll to bottom (if at bottom)
- [ ] "New message ↓" button if scrolled up
- [ ] Typing indicator hidden when message arrives
- [ ] Unsubscribes on unmount/navigation
- [ ] Polling fallback (10s) when WebSocket unavailable
- [ ] Optional sound notification for customer messages

---

## Dependencies

- **Blocked by**: Task 6.12 (conversations GraphQL file), Task 6.14 (sendMessage — for dedup with optimistic), Task 16.1 (Apollo WebSocket link) — soft dependency
- **Blocks**: None
- **Related**: Task 6.15 (provider-wide subscription — complementary), Task 6.8 (Typing indicator), Task 16.5 (Notification sounds)
