# Task 3.9 — GraphQL Dashboard Subscription

> **Section**: 3. Dashboard — Connected Backend  
> **Priority**: P2 — Nice to Have  
> **Estimated Scope**: Small  
> **Route**: `/` (Dashboard)  
> **File**: `apps/provider/src/lib/graphql/dashboard.ts`
> **Status**: ✅ Complete

---

## Objective

Define a GraphQL subscription for real-time dashboard counter updates when notifications are delivered or callbacks change.

---

## Current State

No subscriptions. Dashboard data is fetched once (or polled via task 3.7).

---

## Requirements

### 1. Subscription Definition

```typescript
export const DASHBOARD_LIVE_UPDATES_SUBSCRIPTION = gql`
  subscription DashboardLiveUpdates($spId: ID!) {
    providerNotificationDelivered(spId: $spId) {
      type  # NOTIFICATION_DELIVERED, NOTIFICATION_FAILED, CALLBACK_CREATED, CALLBACK_COMPLETED, etc.
      notificationId
      status
      timestamp
      delta {
        notificationsSent
        deliveryRate
        activeCallbacks
        openConversations
      }
    }
  }
`;
```

### 2. Types

```typescript
export interface DashboardLiveUpdate {
  type: string;
  notificationId?: string;
  status?: string;
  timestamp: string;
  delta?: {
    notificationsSent?: number;
    deliveryRate?: number;
    activeCallbacks?: number;
    openConversations?: number;
  };
}
```

### 3. Subscription Hook

```typescript
export function useDashboardLiveUpdates(spId: string, onUpdate: (event: DashboardLiveUpdate) => void) {
  const { data } = useSubscription(DASHBOARD_LIVE_UPDATES_SUBSCRIPTION, {
    variables: { spId },
    skip: !spId,
    onData: ({ data: subData }) => {
      if (subData?.data?.providerNotificationDelivered) {
        onUpdate(subData.data.providerNotificationDelivered);
      }
    },
  });
  return data;
}
```

### 4. Integration Strategy
- [x] On subscription event:
  1. Update KPI counters optimistically (add delta to cached values)
  2. Prepend to recent activity list
  3. Debounce full refetch every 60 seconds to reconcile
- [x] Use Apollo cache update for optimistic changes:
```typescript
cache.modify({
  fields: {
    dashboardAnalytics(existing) {
      return {
        ...existing,
        notificationsSent: existing.notificationsSent + (delta.notificationsSent ?? 0),
      };
    },
  },
});
```

### 5. Fallback
- [x] If WebSocket connection fails, fall back to polling (task 3.7)
- [x] Show "Reconnecting..." status in auto-refresh indicator

---

## Implementation Plan

### Dashboard Page Integration

```tsx
// In page.tsx
const { activeServiceProvider } = useAuth();
const { data, loading, refetch } = useDashboardAnalytics(spId, range);

useDashboardLiveUpdates(spId, (event) => {
  // Add to activity timeline
  setLiveActivities(prev => [mapEventToActivity(event), ...prev].slice(0, 10));
  
  // Optimistic KPI update via Apollo cache
  if (event.delta) {
    client.cache.modify({ ... });
  }
  
  // Schedule debounced full refetch
  debouncedRefetch();
});
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/dashboard.ts` | Modify — add subscription + hook |
| `apps/provider/src/app/page.tsx` | Modify — integrate subscription |

---

## Acceptance Criteria

- [x] Subscription connects via WebSocket when dashboard mounts
- [x] KPI counters update in real-time on new events
- [x] New activity appears at top of timeline without full page refresh
- [x] Falls back to polling if WebSocket unavailable
- [x] Clean disconnection on unmount
- [x] No duplicate events in activity list

---

## Dependencies

- **Blocked by**: Task 2.6 (WebSocket link), Task 3.8 (base query), Task 3.7 (auto-refresh fallback)
- **Blocks**: None (enhancement)
- **Related**: Task 16.1 (real-time infrastructure)

---

## Gateway Schema Note

Verify the subscription exists in the gateway schema:
```graphql
type Subscription {
  providerNotificationDelivered(spId: ID!): NotificationDeliveryEvent!
}
```

If not present, this subscription needs to be added to `gateway/graphql-bff/graph/schema.graphqls` and implemented in the resolver.
