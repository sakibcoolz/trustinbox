# Task 6.14 — GraphQL sendMessage Mutation

> **Section**: 6. Conversations — Connected Backend  
> **Priority**: P0 — Core chat functionality  
> **Estimated Scope**: Medium  
> **Route**: N/A (Data layer)  
> **File**: `apps/provider/src/lib/graphql/conversations.ts`
> **Status**: ✅ Complete

---

## Objective

Implement the `sendMessage` GraphQL mutation with optimistic updates, cache management, and error handling to power real-time message sending in conversations.

---

## Current State

```tsx
// apps/provider/src/app/conversations/[id]/page.tsx — client-side only
function handleSend(e: React.FormEvent) {
  e.preventDefault();
  if (!message.trim()) return;
  setMessages((prev) => [...prev, {
    id: String(prev.length + 1), sender: 'agent', text: message,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }]);
  setMessage('');
}
```

No GraphQL mutation. Messages only added to local state.

---

## Requirements

### 1. GraphQL Mutation (from schema)

```graphql
mutation SendMessage($input: SendMessageInput!) {
  sendMessage(input: $input) {
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

### 2. Input Type

```typescript
export interface SendMessageInput {
  conversationId: string;
  content: string;
  messageType?: string; // 'TEXT' | 'FILE' — defaults to 'TEXT'
}
```

### 3. React Hook

```typescript
export function useSendMessage() {
  const [sendMutation, result] = useMutation(SEND_MESSAGE_MUTATION);

  const sendMessage = async (input: SendMessageInput) => {
    return sendMutation({
      variables: { input },
      optimisticResponse: {
        sendMessage: {
          __typename: 'Message',
          id: `temp-${Date.now()}`,
          senderType: 'AGENT',
          senderRefId: null,
          messageType: input.messageType ?? 'TEXT',
          content: input.content,
          metadata: null,
          createdAt: new Date().toISOString(),
        },
      },
      update(cache, { data }) {
        if (!data?.sendMessage) return;
        const convCacheId = cache.identify({
          __typename: 'Conversation',
          id: input.conversationId,
        });
        if (!convCacheId) return;

        // Append message to conversation's messages
        cache.modify({
          id: convCacheId,
          fields: {
            messages(existing) {
              const newMessageRef = cache.writeFragment({
                fragment: gql`fragment NewMessage on Message { id senderType senderRefId messageType content metadata createdAt }`,
                data: data.sendMessage,
              });
              return {
                ...existing,
                nodes: [...(existing?.nodes ?? []), newMessageRef],
                totalCount: (existing?.totalCount ?? 0) + 1,
              };
            },
            updatedAt: () => new Date().toISOString(),
          },
        });

        // Update conversation list (last message preview)
        cache.modify({
          fields: {
            conversations(existing) {
              // Touch to trigger re-render of list
              return { ...existing };
            },
          },
        });
      },
    });
  };

  return { sendMessage, ...result };
}
```

### 4. Error Handling
- **Policy blocked**: "Message blocked by communication policy" — show reason
- **Conversation closed**: "Cannot send messages to a closed conversation"
- **Rate limited**: "Too many messages, please wait"
- **Network error**: Retry with toast, keep optimistic message with "Failed to send" indicator

### 5. Failed Message Handling
- If mutation fails, mark optimistic message as "failed" (red indicator)
- Show retry button on failed message bubble
- "Retry" re-sends the same message

### 6. File Message
When sending with file attachment (task 6.7):
```typescript
sendMessage({
  conversationId: id,
  content: 'Shared a document',
  messageType: 'FILE',
  // File URL in metadata after upload
});
```

---

## Implementation Plan

```typescript
// apps/provider/src/lib/graphql/conversations.ts — add mutation

export const SEND_MESSAGE_MUTATION = gql`
  mutation SendMessage($input: SendMessageInput!) {
    sendMessage(input: $input) {
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

export function useSendMessage() {
  const [sendMutation, result] = useMutation(SEND_MESSAGE_MUTATION);

  const sendMessage = async (input: SendMessageInput) => {
    return sendMutation({
      variables: { input },
      optimisticResponse: { /* ... */ },
      update(cache, { data }) { /* ... */ },
    });
  };

  return { sendMessage, loading: result.loading, error: result.error };
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/conversations.ts` | Modify — add SEND_MESSAGE_MUTATION + useSendMessage hook |

---

## Acceptance Criteria

- [ ] `SEND_MESSAGE_MUTATION` matches schema `sendMessage(input: SendMessageInput!)`
- [ ] `useSendMessage()` hook with optimistic response
- [ ] Optimistic message appears immediately in thread (senderType: AGENT)
- [ ] Cache updated: message appended to conversation messages
- [ ] Conversation list updated (last message preview)
- [ ] Error handling: policy blocked, conversation closed, rate limited
- [ ] Failed message indicator with retry button
- [ ] Replaces `setMessages` local state manipulation
- [ ] Supports TEXT and FILE message types

---

## Dependencies

- **Blocked by**: Task 6.12 (conversations GraphQL file), Task 2.6 (Apollo Client)
- **Blocks**: Task 6.5 (Chat thread — uses send), Task 6.6 (MessageComposer — calls send)
- **Related**: Task 17.3 (Optimistic updates pattern), Task 6.7 (File attachment — uses FILE type)
