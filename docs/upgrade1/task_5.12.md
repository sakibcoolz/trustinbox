# Task 5.12 — GraphQL Notification Queries

> **Section**: 5. Notifications — Connected Backend  
> **Priority**: P0 — Blocks all notification UI  
> **Estimated Scope**: Large  
> **Route**: N/A (Data layer)  
> **File**: `apps/provider/src/lib/graphql/notifications.ts`
> **Status**: ✅ Complete

---

## Objective

Create the GraphQL query definitions, TypeScript types, and React hooks for all notification-related data fetching: notification list with filters/pagination, notification detail, and notification analytics stats.

---

## Current State

No `notifications.ts` file exists in `apps/provider/src/lib/graphql/`. All notification data is hardcoded mock data on both the list page and compose page.

---

## Requirements

### 1. GraphQL Queries

**Notification List**:
```graphql
query NotificationList(
  $category: NotificationCategory
  $status: String
  $channel: String
  $search: String
  $from: DateTime
  $to: DateTime
  $limit: Int
  $offset: Int
) {
  notifications(
    category: $category
    status: $status
    limit: $limit
    offset: $offset
  ) {
    nodes {
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
    totalCount
  }
}
```

**Notification Detail** (for expanded row):
```graphql
query NotificationDetail($id: ID!) {
  notification(id: $id) {
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

**Notification Stats** (for page stats cards):
```graphql
query NotificationStats($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
  notificationAnalytics(serviceProviderId: $serviceProviderId, from: $from, to: $to) {
    totalSent
    totalDelivered
    totalRead
    totalRejected
    deliveryRate
    readRate
  }
}
```

### 2. TypeScript Types

```typescript
export interface NotificationNode {
  id: string;
  category: 'PERSONAL' | 'SERVICE_PROVIDER' | 'ADVERTISEMENT';
  title: string;
  body: string;
  priority: string;
  status: string;
  metadata?: Record<string, unknown>;
  serviceProvider: { id: string; name: string };
  createdAt: string;
}

export interface NotificationConnection {
  nodes: NotificationNode[];
  totalCount: number;
}

export interface NotificationAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalRejected: number;
  deliveryRate: number;
  readRate: number;
}

export interface NotificationListOptions {
  category?: string | string[];
  status?: string | string[];
  channel?: string | string[];
  search?: string;
  dateRange?: { from: string; to: string };
  limit?: number;
  offset?: number;
}
```

### 3. React Hooks

```typescript
// Notification list with filters
export function useNotifications(options: NotificationListOptions) {
  return useQuery<{ notifications: NotificationConnection }>(NOTIFICATION_LIST_QUERY, {
    variables: buildVariables(options),
    fetchPolicy: 'cache-and-network',
  });
}

// Single notification detail (lazy, for expanded rows)
export function useNotificationDetail(id: string | null) {
  return useQuery<{ notification: NotificationNode }>(NOTIFICATION_DETAIL_QUERY, {
    variables: { id },
    skip: !id,
  });
}

// Notification stats for page summary cards
export function useNotificationStats(spId: string, dateRange: { from: string; to: string }) {
  return useQuery<{ notificationAnalytics: NotificationAnalytics }>(NOTIFICATION_STATS_QUERY, {
    variables: { serviceProviderId: spId, ...dateRange },
    skip: !spId,
    fetchPolicy: 'cache-and-network',
  });
}
```

### 4. Variable Builder
- Map filter arrays to GraphQL variables
- Handle date range conversion
- Build sort/pagination variables

### 5. Cache Configuration
- List: `cache-and-network`
- Detail: `cache-first` (rarely changes after creation)
- Stats: `cache-and-network` with 30s poll interval when auto-refresh enabled

---

## Implementation Plan

```typescript
// apps/provider/src/lib/graphql/notifications.ts
import { gql, useQuery, useLazyQuery } from '@apollo/client';

// ─── Queries ───
export const NOTIFICATION_LIST_QUERY = gql`
  query NotificationList($category: NotificationCategory, $status: String, $limit: Int, $offset: Int) {
    notifications(category: $category, status: $status, limit: $limit, offset: $offset) {
      nodes {
        id
        category
        title
        body
        priority
        status
        metadata
        serviceProvider { id name }
        createdAt
      }
      totalCount
    }
  }
`;

export const NOTIFICATION_DETAIL_QUERY = gql`
  query NotificationDetail($id: ID!) {
    notification(id: $id) {
      id category title body priority status metadata
      serviceProvider { id name }
      createdAt
    }
  }
`;

export const NOTIFICATION_STATS_QUERY = gql`
  query NotificationStats($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
    notificationAnalytics(serviceProviderId: $serviceProviderId, from: $from, to: $to) {
      totalSent totalDelivered totalRead totalRejected deliveryRate readRate
    }
  }
`;

// ─── Types ───
export interface NotificationNode { ... }
export interface NotificationConnection { ... }
export interface NotificationAnalytics { ... }

// ─── Hooks ───
export function useNotifications(options: NotificationListOptions) { ... }
export function useNotificationDetail(id: string | null) { ... }
export function useNotificationStats(spId: string, dateRange: DateRange) { ... }
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/notifications.ts` | Create — all notification queries, types, and hooks |

---

## Acceptance Criteria

- [ ] `NOTIFICATION_LIST_QUERY` with category, status, limit, offset variables
- [ ] `NOTIFICATION_DETAIL_QUERY` for single notification by ID
- [ ] `NOTIFICATION_STATS_QUERY` for analytics summary cards
- [ ] TypeScript interfaces for all response types
- [ ] `useNotifications()` hook with cache-and-network
- [ ] `useNotificationDetail()` hook with skip on null ID
- [ ] `useNotificationStats()` hook with spId + dateRange
- [ ] Variable builder maps filter arrays to GraphQL vars
- [ ] All queries aligned with schema in `schema.graphqls`

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client setup)
- **Blocks**: Task 5.1 (Notification table), Task 5.3 (Filter bar — queries use filters), Task 5.4 (Detail expansion), Task 5.7 (Compose — uses stats)
- **Related**: Task 4.13 (Customer queries — same pattern), Task 3.8 (Dashboard queries)
