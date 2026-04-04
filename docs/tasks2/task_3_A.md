# Task 3A — Inbox / Notifications (Tasks 3.1–3.4)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3A — Inbox / Notifications
> **Files**: `apps/web/src/app/(dashboard)/inbox/page.tsx`, `apps/web/src/lib/graphql/notifications.ts` (new), `apps/web/src/hooks/useNotificationsQuery.ts` (new)
> **GraphQL**: `notifications(category, status, limit, offset)`, `notification(id)`, `markNotificationAsRead(id)`, `archiveNotification(id)`

---

## Objective

Wire the inbox page from partial SSE-only data to a full GraphQL-backed experience with query history, pagination, mark-as-read/archive mutations, and a notification detail drawer — while preserving real-time SSE push for new incoming notifications.

---

## Current State

```typescript
// apps/web/src/app/(dashboard)/inbox/page.tsx — 289 lines
'use client';

import { useNotifications } from '@/lib/notification-context';
import { useState, useMemo } from 'react';

// Uses SSE context — notifications arrive via EventSource real-time push
// Tab filtering: All / Personal / Business / Advertisements
// handleSelect marks a single notification as read via context.markRead([id])
// No GraphQL query for historic notifications
// No pagination (shows all from SSE buffer)
// No search, no archive, no detail drawer
```

**Gaps**:
- Notifications come only from SSE push — no query for historical/persisted notifications
- No pagination — loads whatever SSE buffer holds (~50 recent)
- No search/filter beyond category tabs
- `markRead()` calls SSE context but not a GraphQL mutation (not persisted across sessions)
- No archive functionality
- No notification detail drawer (selecting just marks as read)
- No loading/error states

### Existing SSE Context

```typescript
// apps/web/src/lib/notification-context.tsx — useNotifications() hook provides:
// notifications: Notification[]     — SSE-buffered array
// unreadCount: number               — derived count
// markRead(ids: string[]): void     — local state mark
// markAllRead(): void               — local state mark all
// fetchNotifications(): void        — GET /api/notifications (REST)
```

### GraphQL Schema Available

```graphql
# Queries
notifications(category: NotificationCategory, status: String, limit: Int, offset: Int): NotificationConnection!
notification(id: ID!): Notification!

# Mutations
markNotificationAsRead(id: ID!): Boolean!
archiveNotification(id: ID!): Boolean!

# Types
type NotificationConnection { nodes: [Notification!]!; totalCount: Int! }
type Notification {
  id: ID!; category: NotificationCategory!; title: String!; body: String!
  priority: String!; status: String!; metadata: JSON
  serviceProvider: ServiceProvider; createdAt: DateTime!
}
enum NotificationCategory { PERSONAL, SERVICE_PROVIDER, ADVERTISEMENT }

# Subscription
notificationReceived: Notification!
```

---

## Task 3.1 — Wire Inbox to `notifications` Query

### Requirements

- [x] Create `apps/web/src/lib/graphql/notifications.ts` with GraphQL operations:
  - [x] `GET_NOTIFICATIONS` query — accepts `category`, `status`, `limit`, `offset`
  - [x] `GET_NOTIFICATION` query — accepts `id`
  - [x] `MARK_NOTIFICATION_READ` mutation — accepts `id`
  - [x] `ARCHIVE_NOTIFICATION` mutation — accepts `id`
- [x] Create `apps/web/src/hooks/useNotificationsQuery.ts` hook:
  - [x] Use `useQuery(GET_NOTIFICATIONS, { variables })` from Apollo Client
  - [x] Accept `category` and `page` parameters
  - [x] Return `{ notifications, totalCount, loading, error, refetch }`
  - [x] Page size: 20 items per page
- [x] Update `inbox/page.tsx`:
  - [x] Import and use `useNotificationsQuery()` for the list data
  - [x] Keep SSE `useNotifications()` for real-time incoming — merge new SSE items into query results
  - [x] Map category tabs to query variables: `null` (All), `PERSONAL`, `SERVICE_PROVIDER`, `ADVERTISEMENT`
  - [x] Add loading skeleton while query loads
  - [x] Add error state with retry button
  - [x] Add pagination controls (Previous / Next or infinite scroll)

### Implementation Details

```typescript
// apps/web/src/lib/graphql/notifications.ts
import { gql } from '@apollo/client';

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($category: NotificationCategory, $status: String, $limit: Int, $offset: Int) {
    notifications(category: $category, status: $status, limit: $limit, offset: $offset) {
      nodes {
        id
        category
        title
        body
        priority
        status
        metadata
        serviceProvider { id name industry verificationStatus }
        createdAt
      }
      totalCount
    }
  }
`;

export const GET_NOTIFICATION = gql`
  query GetNotification($id: ID!) {
    notification(id: $id) {
      id category title body priority status metadata
      serviceProvider { id name industry verificationStatus description website }
      createdAt
    }
  }
`;

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: ID!) {
    markNotificationAsRead(id: $id)
  }
`;

export const ARCHIVE_NOTIFICATION = gql`
  mutation ArchiveNotification($id: ID!) {
    archiveNotification(id: $id)
  }
`;
```

```typescript
// apps/web/src/hooks/useNotificationsQuery.ts
import { useQuery } from '@apollo/client';
import { GET_NOTIFICATIONS } from '@/lib/graphql/notifications';
import { NotificationCategory } from '@/lib/types';

const PAGE_SIZE = 20;

export function useNotificationsQuery(category: NotificationCategory | null, page: number) {
  const { data, loading, error, refetch } = useQuery(GET_NOTIFICATIONS, {
    variables: {
      category: category ?? undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    },
    fetchPolicy: 'cache-and-network',
  });

  return {
    notifications: data?.notifications?.nodes ?? [],
    totalCount: data?.notifications?.totalCount ?? 0,
    totalPages: Math.ceil((data?.notifications?.totalCount ?? 0) / PAGE_SIZE),
    loading,
    error,
    refetch,
  };
}
```

### SSE + GraphQL Merge Strategy

```
1. On mount: useNotificationsQuery fetches paginated history from GraphQL
2. SSE pushes new notifications via useNotifications() context
3. New SSE notifications prepend to the query list (dedup by ID)
4. markRead/markAllRead → call GraphQL mutation + update SSE context
5. refetch on tab change or page change
```

---

## Task 3.2 — Add Mark-as-Read Mutation

### Requirements

- [x] Create `useMarkNotificationRead()` hook or inline `useMutation`:
  - [x] Call `MARK_NOTIFICATION_READ` mutation on notification select
  - [x] Optimistic update: set `status: 'READ'` in Apollo cache immediately
  - [x] Also call SSE context `markRead([id])` to sync sidebar badge
  - [x] Handle error: revert optimistic update, show toast
- [x] Wire to existing `handleSelect` in inbox page:
  - [x] Replace local-only `markRead` with GraphQL mutation + context sync
- [x] Add "Mark All Read" button:
  - [x] Loop through unread notifications and call mutation for each (or batch if available)
  - [x] Update SSE context `markAllRead()` for immediate UI feedback
- [x] Update sidebar unread badge to reflect mutation success

### Implementation Details

```typescript
// In inbox/page.tsx — handleSelect replacement
const [markRead] = useMutation(MARK_NOTIFICATION_READ);
const { markRead: sseMarkRead } = useNotifications();

const handleSelect = async (id: string) => {
  setSelectedId(id);
  // Optimistic: update local + SSE
  sseMarkRead([id]);
  try {
    await markRead({
      variables: { id },
      optimisticResponse: { markNotificationAsRead: true },
      update(cache) {
        cache.modify({
          id: cache.identify({ __typename: 'Notification', id }),
          fields: { status: () => 'READ' },
        });
      },
    });
  } catch {
    // Revert handled by Apollo optimistic response rollback
  }
};
```

---

## Task 3.3 — Add Notification Actions (Archive, Mute Sender)

### Requirements

- [x] Add archive action to each notification item:
  - [x] Swipe-to-archive on mobile or archive icon button
  - [x] Call `ARCHIVE_NOTIFICATION` mutation
  - [x] Optimistic removal from list (filter out by ID)
  - [x] Show undo toast with 5-second timer to revert
- [x] Add "Mute Sender" action:
  - [x] Shows in notification item overflow menu (three-dot menu)
  - [x] Calls `blockServiceProvider(serviceProviderId)` mutation
  - [x] Shows confirmation dialog before blocking
  - [x] Removes all notifications from that SP from view
- [x] Add "Report Spam" action:
  - [x] Shows in notification item overflow menu
  - [x] Calls `reportSpam` mutation with `notificationId` and `serviceProviderId`
  - [x] Prompts for reason selection

### Implementation Details

```typescript
// Archive with optimistic removal
const [archiveNotification] = useMutation(ARCHIVE_NOTIFICATION);

const handleArchive = async (id: string) => {
  await archiveNotification({
    variables: { id },
    optimisticResponse: { archiveNotification: true },
    update(cache) {
      cache.modify({
        fields: {
          notifications(existing, { readField }) {
            return {
              ...existing,
              nodes: existing.nodes.filter(
                (ref: any) => readField('id', ref) !== id
              ),
              totalCount: existing.totalCount - 1,
            };
          },
        },
      });
    },
  });
};
```

---

## Task 3.4 — Add Notification Detail Drawer

### Requirements

- [x] Create slide-over drawer component for notification detail:
  - [x] Full notification body (rendered as text, not truncated)
  - [x] Sender info: SP name, industry, verification badge
  - [x] Category badge (Personal / Service Provider / Advertisement)
  - [x] Priority badge (Low / Normal / High / Urgent)
  - [x] Timestamp with relative time
  - [x] Metadata display (if present in JSON)
- [x] Action buttons in drawer:
  - [x] "Archive" — calls archive mutation
  - [x] "Block Sender" — opens confirmation, calls `blockServiceProvider`
  - [x] "Report Spam" — opens report dialog
- [x] Wire to notification select:
  - [x] Desktop: side panel (right third of screen)
  - [x] Mobile: full-screen slide-up drawer
- [x] Fetch full notification detail:
  - [x] Use `GET_NOTIFICATION` query with `id` for complete data
  - [x] Show loading skeleton while fetching

### Implementation Details

```typescript
// NotificationDetailDrawer component structure
interface NotificationDetailDrawerProps {
  notificationId: string | null;
  onClose: () => void;
}

// Uses useQuery(GET_NOTIFICATION, { variables: { id }, skip: !id })
// Renders: sender card → body → metadata → actions
// Verification badge: ✓ Verified | ⚠ Pending | ✗ Unverified
// Priority colors: LOW → text-text-muted, NORMAL → text-accent-blue,
//                  HIGH → text-accent-orange, URGENT → text-accent-red
```

---

## Verification Checklist

- [x] Inbox loads notifications from GraphQL query (not just SSE)
- [x] Category tab switching triggers re-query with correct `category` variable
- [x] Pagination works — Previous/Next buttons or infinite scroll
- [x] New SSE notifications appear at top without full re-fetch
- [x] Clicking a notification marks it as read (persisted via mutation)
- [x] Sidebar unread badge decrements after mark-read
- [x] Archive removes notification from list with undo toast
- [x] Detail drawer opens with full notification info
- [x] Detail drawer shows SP verification badge
- [x] Block sender from drawer works (with confirmation)
- [x] Loading skeleton shows during initial query
- [x] Error state shows with retry button
- [x] Mobile responsive — drawer becomes full-screen

---

## Dependencies

**Depends on**:
- Task 2.1 — Apollo Client configured with auth headers and error link
- Task 2.2 — ApolloProvider wrapping the app
- Task 2.4 — GraphQL type generation (if using codegen)

**Blocks**:
- Task 3K.41 — Dashboard recent notifications widget (shares query/hook)

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/inbox/page.tsx` | Main inbox page (289 lines, partial SSE) |
| `apps/web/src/lib/notification-context.tsx` | SSE notification context (keep for real-time) |
| `apps/web/src/lib/graphql/notifications.ts` | **New** — GraphQL operations |
| `apps/web/src/hooks/useNotificationsQuery.ts` | **New** — Apollo query hook |
| `apps/web/src/lib/types.ts` | Shared types (`NotificationCategory`, etc.) |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema reference |
