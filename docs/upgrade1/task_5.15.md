# Task 5.15 — GraphQL Notification Subscription (Live Status Updates)

> **Section**: 5. Notifications — Connected Backend  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: `/notifications`  
> **File**: `apps/provider/src/app/notifications/page.tsx`, `apps/provider/src/lib/graphql/notifications.ts`
> **Status**: ✅ Complete

---

## Objective

Implement the `providerNotificationDelivered` GraphQL subscription to provide real-time status updates in the notification history table, updating status badges as notifications are delivered, failed, or blocked.

---

## Current State

No subscription exists. Status updates require page refresh to see changes.

---

## Requirements

### 1. GraphQL Subscription (from schema)

```graphql
subscription ProviderNotificationDelivered($serviceProviderId: ID!) {
  providerNotificationDelivered(serviceProviderId: $serviceProviderId) {
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
```

### 2. Cache Update on Subscription Event
When a subscription event arrives:
1. Find the notification in Apollo cache by `id`
2. Update its `status` field
3. Update notification list stats (delivered count, failed count, etc.)
4. Show toast for important status changes (e.g., "Notification to VID-xxx delivered")

### 3. React Hook

```typescript
export function useNotificationLiveUpdates(spId: string, options?: {
  onDelivered?: (notification: NotificationNode) => void;
  onFailed?: (notification: NotificationNode) => void;
}) {
  const { data } = useSubscription(NOTIFICATION_DELIVERED_SUBSCRIPTION, {
    variables: { serviceProviderId: spId },
    skip: !spId,
    onData: ({ data: { data } }) => {
      const notification = data?.providerNotificationDelivered;
      if (!notification) return;

      if (notification.status === 'DELIVERED') {
        options?.onDelivered?.(notification);
      } else if (notification.status === 'FAILED') {
        options?.onFailed?.(notification);
      }
    },
  });

  return data?.providerNotificationDelivered ?? null;
}
```

### 4. Table Integration
- Subscribe when notification page is mounted
- Unsubscribe on unmount
- Status badge animates on change (brief highlight/pulse)
- Row that changed briefly highlighted with `bg-accent-blue/5` fade

### 5. Stats Update
- Update the stats cards (Total Sent, Delivery Rate, Failed, Policy Blocked)
- Increment/decrement counters based on new status
- Simple counter update without full refetch

### 6. Polling Fallback
- If WebSocket subscription not available (task 16.1 not yet complete):
  - Fall back to polling every 30 seconds
  - Use `pollInterval` option on `useNotifications` query
  - Show polling indicator in header

### 7. Toast Notifications
- Show a subtle toast for first delivery event after a send
- Don't toast for every delivery in a bulk send (batch: "X of Y delivered")
- Failed deliveries always show toast (attention-requiring)

---

## Implementation Plan

```typescript
// apps/provider/src/lib/graphql/notifications.ts — add subscription

export const NOTIFICATION_DELIVERED_SUBSCRIPTION = gql`
  subscription ProviderNotificationDelivered($serviceProviderId: ID!) {
    providerNotificationDelivered(serviceProviderId: $serviceProviderId) {
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

export function useNotificationLiveUpdates(spId: string) {
  const { toast } = useToast();

  return useSubscription(NOTIFICATION_DELIVERED_SUBSCRIPTION, {
    variables: { serviceProviderId: spId },
    skip: !spId,
    onData: ({ client, data: { data } }) => {
      const notification = data?.providerNotificationDelivered;
      if (!notification) return;

      // Update cache
      client.cache.modify({
        id: client.cache.identify({ __typename: 'Notification', id: notification.id }),
        fields: {
          status: () => notification.status,
        },
      });

      // Toast for failures
      if (notification.status === 'FAILED') {
        toast({ type: 'error', message: `Notification "${notification.title}" delivery failed` });
      }
    },
  });
}
```

```tsx
// In notifications/page.tsx
export default function NotificationsPage() {
  const { currentSp } = useAuth();

  // Live updates
  useNotificationLiveUpdates(currentSp?.id ?? '');

  // OR polling fallback:
  const { data } = useNotifications({
    ...filters,
    pollInterval: isSubscriptionAvailable ? 0 : 30000,
  });

  // ...
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/notifications.ts` | Modify — add subscription + useNotificationLiveUpdates hook |
| `apps/provider/src/app/notifications/page.tsx` | Modify — subscribe on mount for live status updates |

---

## Acceptance Criteria

- [ ] Subscription: `providerNotificationDelivered(serviceProviderId)` defined
- [ ] Status badges update in real-time when delivery events arrive
- [ ] Apollo cache updated optimistically (no full refetch)
- [ ] Toast shown for failed deliveries
- [ ] Brief row highlight animation on status change
- [ ] Stats cards update incrementally
- [ ] Unsubscribes on page unmount
- [ ] Polling fallback (30s) when WebSocket not available
- [ ] No flood of toasts for bulk sends

---

## Dependencies

- **Blocked by**: Task 5.1 (Notification table), Task 5.12 (Notification GraphQL queries), Task 16.1 (Apollo WebSocket link) — soft dependency, falls back to polling
- **Blocks**: None
- **Related**: Task 3.9 (Dashboard subscription — same pattern), Task 16.2 (all subscription connections), Task 16.4 (reconnection logic)
