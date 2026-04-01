# Task 6.15 — GraphQL providerMessageReceived Subscription

> **Section**: 6. Conversations — Connected Backend  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: `/conversations`  
> **File**: `apps/provider/src/lib/graphql/conversations.ts`

---

## Objective

Implement the `providerMessageReceived` subscription to provide real-time updates across all conversations: update the conversation list with new message previews, unread badges, and trigger toast notifications for new messages.

---

## Current State

No subscriptions exist. Message updates require page refresh.

---

## Requirements

### 1. GraphQL Subscription (from schema)

```graphql
subscription ProviderMessageReceived($serviceProviderId: ID!) {
  providerMessageReceived(serviceProviderId: $serviceProviderId) {
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
- Provider-wide: listens for ALL new messages across all conversations for this SP
- Used on the conversation list page to update previews and badges
- Active for the duration the provider is on any conversation-related page

### 3. Cache Updates on Event
When a new message arrives:
1. Find the conversation in cache (by conversation ID from message metadata or context)
2. Update `messages(limit: 1)` preview in conversation list
3. Increment unread count (if conversation is not currently viewed)
4. Move conversation to top of list (most recently active)
5. Update stats cards (if visible)

### 4. Toast Notifications
- Show toast for new customer messages (not bot/agent messages)
- Toast content: "New message from VID-xxxx: [preview]"
- Click toast → navigate to conversation
- Don't toast for the conversation currently being viewed
- Rate limit: max 1 toast per 5 seconds (batch if multiple arrive)

### 5. Unread Badge Updates
- Update conversation card's unread count
- Update sidebar "Conversations" navigation badge
- Update header notification bell (if shared across features)

### 6. React Hook

```typescript
export function useProviderMessageSubscription(spId: string) {
  return useSubscription(PROVIDER_MESSAGE_RECEIVED_SUBSCRIPTION, {
    variables: { serviceProviderId: spId },
    skip: !spId,
    onData: ({ client, data: { data } }) => {
      const message = data?.providerMessageReceived;
      if (!message) return;

      // Update conversation list cache
      // Show toast for customer messages
      // Update unread counts
    },
  });
}
```

### 7. Polling Fallback
- If WebSocket not available (task 16.1 not complete):
  - Poll conversation list every 15 seconds
  - Compare with previous data to detect new messages
  - Show "Real-time updates unavailable" indicator

---

## Implementation Plan

```typescript
// apps/provider/src/lib/graphql/conversations.ts — add subscription

export const PROVIDER_MESSAGE_RECEIVED_SUBSCRIPTION = gql`
  subscription ProviderMessageReceived($serviceProviderId: ID!) {
    providerMessageReceived(serviceProviderId: $serviceProviderId) {
      id
      senderType
      senderRefId
      messageType
      content
      metadata
      createdAt
    }
  }
`;

export function useProviderMessageSubscription(spId: string, options?: {
  activeConversationId?: string;
  onNewMessage?: (message: MessageNode) => void;
}) {
  const { toast } = useToast();

  return useSubscription(PROVIDER_MESSAGE_RECEIVED_SUBSCRIPTION, {
    variables: { serviceProviderId: spId },
    skip: !spId,
    onData: ({ client, data: { data } }) => {
      const message = data?.providerMessageReceived;
      if (!message) return;

      options?.onNewMessage?.(message);

      // Toast for customer messages (not the active conversation)
      if (message.senderType === 'CUSTOMER' && message.conversationId !== options?.activeConversationId) {
        toast({
          type: 'info',
          message: `New message: ${message.content.substring(0, 60)}...`,
          action: { label: 'View', href: `/conversations/${message.conversationId}` },
        });
      }
    },
  });
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/conversations.ts` | Modify — add subscription + useProviderMessageSubscription hook |
| `apps/provider/src/app/conversations/page.tsx` | Modify — subscribe on mount |

---

## Acceptance Criteria

- [ ] `providerMessageReceived(serviceProviderId)` subscription defined
- [ ] Conversation list updates with new message preview on event
- [ ] Unread count incremented for unviewed conversations
- [ ] Most recently active conversation moves to top of list
- [ ] Toast for customer messages (not own messages)
- [ ] No toast for currently viewed conversation
- [ ] Rate-limited toasts (max 1 per 5s)
- [ ] Unsubscribes on page unmount
- [ ] Polling fallback (15s) when WebSocket unavailable

---

## Dependencies

- **Blocked by**: Task 6.12 (conversations GraphQL file), Task 16.1 (Apollo WebSocket link) — soft dependency
- **Blocks**: None
- **Related**: Task 6.16 (per-conversation subscription), Task 16.2 (all subscription connections), Task 5.15 (notification subscription — same pattern)
