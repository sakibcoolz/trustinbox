# Task 5.13 — GraphQL sendNotification Mutation

> **Section**: 5. Notifications — Connected Backend  
> **Priority**: P0 — Core sending workflow  
> **Estimated Scope**: Medium  
> **Route**: N/A (Data layer)  
> **File**: `apps/provider/src/lib/graphql/notifications.ts`
> **Status**: ✅ Complete

---

## Objective

Implement the `sendNotification` GraphQL mutation for creating and enqueuing notifications through the policy engine, replacing the mock send behavior in the compose page.

---

## Current State

```tsx
// apps/provider/src/app/notifications/compose/page.tsx — Mock send
async function handleSend(e: React.FormEvent) {
  e.preventDefault();
  setSending(true);
  await new Promise((r) => setTimeout(r, 1000)); // Simulated delay
  setSending(false);
  window.location.href = '/notifications';
}
```

No GraphQL mutation exists. Send is faked with a `setTimeout`.

---

## Requirements

### 1. GraphQL Mutation (from schema)

```graphql
mutation SendNotification($input: SendNotificationInput!) {
  sendNotification(input: $input) {
    id
    category
    title
    body
    priority
    status
    createdAt
  }
}
```

### 2. Input Type

```typescript
// From schema - SendNotificationInput
export interface SendNotificationInput {
  recipientIds: string[];           // Virtual IDs
  category: NotificationCategory;   // PERSONAL | SERVICE_PROVIDER | ADVERTISEMENT
  title: string;                    // Subject line
  body: string;                     // Message body
  channel: string;                  // SMS | EMAIL | PUSH | IN_APP
  priority: string;                 // LOW | NORMAL | HIGH | URGENT
  metadata?: Record<string, unknown>;
  scheduledAt?: string;             // ISO datetime for scheduled delivery
}
```

### 3. React Hook

```typescript
export function useSendNotification() {
  const [send, { data, loading, error }] = useMutation<{
    sendNotification: NotificationNode;
  }>(SEND_NOTIFICATION_MUTATION, {
    // Update notification list cache on success
    update(cache, { data }) {
      if (!data?.sendNotification) return;
      cache.modify({
        fields: {
          notifications(existing) {
            // Prepend new notification to list
            return {
              ...existing,
              nodes: [data.sendNotification, ...(existing?.nodes ?? [])],
              totalCount: (existing?.totalCount ?? 0) + 1,
            };
          },
        },
      });
    },
  });

  return {
    sendNotification: (input: SendNotificationInput) =>
      send({ variables: { input } }),
    data: data?.sendNotification,
    loading,
    error,
  };
}
```

### 4. Error Handling
- **Validation errors**: Display field-level errors from GraphQL response
- **Policy blocked**: Show blocked reason (policy engine is mandatory gatekeeper)
- **Rate limited**: Show rate limit details + estimated retry time
- **Network error**: Retry with toast notification
- **Auth error**: Redirect to login

### 5. Optimistic Response (optional)
- Create optimistic Notification object with status `PENDING`
- Add to notification list cache immediately
- Replace with actual response when mutation completes

### 6. Post-Send Navigation
- Clear draft from localStorage (task 5.11)
- Navigate to `/notifications` page
- Show success toast with notification ID
- If scheduled: "Notification scheduled for [datetime]"
- If immediate: "Notification sent successfully"

---

## Implementation Plan

```typescript
// apps/provider/src/lib/graphql/notifications.ts — add mutation

export const SEND_NOTIFICATION_MUTATION = gql`
  mutation SendNotification($input: SendNotificationInput!) {
    sendNotification(input: $input) {
      id
      category
      title
      body
      priority
      status
      metadata
      serviceProvider {
        id
        name
      }
      createdAt
    }
  }
`;

export function useSendNotification() {
  const [sendMutation, result] = useMutation(SEND_NOTIFICATION_MUTATION);

  const sendNotification = async (input: SendNotificationInput) => {
    return sendMutation({
      variables: { input },
      optimisticResponse: {
        sendNotification: {
          __typename: 'Notification',
          id: `temp-${Date.now()}`,
          category: input.category,
          title: input.title,
          body: input.body,
          priority: input.priority,
          status: 'PENDING',
          metadata: input.metadata ?? null,
          serviceProvider: { __typename: 'ServiceProvider', id: '', name: '' },
          createdAt: new Date().toISOString(),
        },
      },
      update(cache, { data }) {
        if (!data?.sendNotification) return;
        cache.modify({
          fields: {
            notifications(existing = { nodes: [], totalCount: 0 }) {
              return {
                ...existing,
                nodes: [data.sendNotification, ...existing.nodes],
                totalCount: existing.totalCount + 1,
              };
            },
          },
        });
      },
    });
  };

  return { sendNotification, ...result };
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/notifications.ts` | Modify — add SEND_NOTIFICATION_MUTATION + useSendNotification hook |

---

## Acceptance Criteria

- [ ] `SEND_NOTIFICATION_MUTATION` matches GraphQL schema `sendNotification(input)`
- [ ] `SendNotificationInput` type includes all required fields
- [ ] `useSendNotification()` hook with mutation + cache update
- [ ] Optimistic response creates PENDING notification in cache
- [ ] Cache updated with new notification on success
- [ ] Error handling for validation, policy blocked, rate limited, auth errors
- [ ] Replaces `setTimeout` mock in compose page
- [ ] Returns notification ID for toast/navigation

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client), Task 5.12 (notifications GraphQL file)
- **Blocks**: Task 5.7 (NotificationComposer uses send mutation), Task 5.5 (retry uses similar mutation)
- **Related**: Task 17.3 (optimistic updates — uses same pattern)
