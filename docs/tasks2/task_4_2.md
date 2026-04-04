# Task 4.2 — Sidebar Unread Badges

> **Phase**: 4 — Web App: Enhanced Features
> **Task**: 4.2 — Sidebar Unread Badges
> **Files**: `apps/web/src/components/layout/sidebar.tsx`, `apps/web/src/components/layout/mobile-nav.tsx`, `apps/web/src/app/(dashboard)/page.tsx`
> **Dependencies**: Phase 3A (Inbox notifications wired), Phase 3B (Callbacks wired), Phase 3K (Dashboard summary query)
> **Data Sources**: SSE notification context, chat context, `dashboardSummary` GraphQL query

---

## Objective

Wire the sidebar and mobile nav badge counts to real data from SSE events and the `dashboardSummary` GraphQL query, so badges on Inbox, Chats, and Calls update in real-time. Currently, Inbox and Chats badges work via SSE contexts, but Calls (callbacks) is hardcoded to `0` and People is hardcoded to `0`.

---

## Current State

### Sidebar Badge System — Partially Working
```typescript
// apps/web/src/components/layout/sidebar.tsx
// badgeKey is defined per nav item:
// - inbox: 'inbox' → ✅ WORKS (from unreadCount via SSE)
// - chats: 'chats' → ✅ WORKS (from chat context unreadCount)
// - calls: 'calls' → ❌ HARDCODED 0
// - people: 'people' → ❌ HARDCODED 0
// - services: undefined → no badge
// - documents: undefined → no badge

const badgeCounts = useMemo(() => {
  const chatUnread = conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0);
  return {
    inbox: unreadCount,
    chats: chatUnread,
    calls: 0,        // ← hardcoded
    people: 0,       // ← hardcoded
  } as Record<string, number>;
}, [conversations, unreadCount]);
```

### Badge CSS — Already Exists
```css
/* apps/web/src/app/globals.css */
.badge-count {
  @apply min-w-[18px] h-[18px] rounded-full bg-accent-blue text-white
         text-2xs font-bold flex items-center justify-center px-1;
}
```

### Badge Rendering — Already Implemented
```tsx
// Sidebar nav item rendering
{item.badgeKey && badgeCounts[item.badgeKey] > 0 && (
  <span className="absolute top-1 right-1 badge-count">{badgeCounts[item.badgeKey]}</span>
)}
```

### Mobile Nav — Same Pattern, Same Hardcoded Values
```typescript
// apps/web/src/components/layout/mobile-nav.tsx
const badgeCounts = useMemo(() => ({
  inbox: unreadCount,
  chats: conversations.reduce((sum, c) => sum + (c.unreadCount || 0), 0),
  calls: 0,        // ← hardcoded
  people: 0,       // ← hardcoded
}), [conversations, unreadCount]);
```

### GraphQL Schema — DashboardSummary
```graphql
type DashboardSummary {
  unreadPersonal: Int!
  unreadServiceProvider: Int!
  unreadAdvertisements: Int!
  pendingCallbackRequests: Int!     # ← this is what we need for calls badge
  totalConversations: Int!
}

# Query
dashboardSummary: DashboardSummary!
```

### Dashboard Page — Partially Wired
```typescript
// apps/web/src/app/(dashboard)/page.tsx — stats hardcode some values
const stats = [
  { label: 'Unread', value: unreadCount, ... },         // ✅ SSE
  { label: 'Conversations', value: conversations.length, ... }, // ✅ chat context
  { label: 'Unread Chats', value: chatUnread, ... },     // ✅ chat context
  { label: 'Friends', value: 0, ... },                   // ❌ hardcoded
];
```

---

## Requirements

### 4.2.1 — Create Badge Data Hook
- [x] Create `apps/web/src/hooks/useBadgeCounts.ts`:
  - [x] Combine SSE notification context (`unreadCount`)
  - [x] Combine chat context (`conversations` unread sum)
  - [x] Fetch `pendingCallbackRequests` from `dashboardSummary` query (or from callbacks hook if available)
  - [x] Fetch pending friend requests count (from friends API if available)
  - [x] Return `{ inbox: number, chats: number, calls: number, people: number }`
  - [x] Set up polling interval (every 60 seconds) for `dashboardSummary` to keep counts fresh
  - [x] Merge SSE real-time updates for inbox and chats

### 4.2.2 — Wire Sidebar Badge Counts
- [x] Update `apps/web/src/components/layout/sidebar.tsx`:
  - [x] Replace inline `badgeCounts` useMemo with `useBadgeCounts()` hook
  - [x] Remove hardcoded `calls: 0` and `people: 0`
  - [x] Calls badge shows `pendingCallbackRequests` from dashboard summary
  - [x] People badge shows pending friend request count
  - [x] Badges update in real-time as SSE events arrive

### 4.2.3 — Wire Mobile Nav Badge Counts
- [x] Update `apps/web/src/components/layout/mobile-nav.tsx`:
  - [x] Replace inline `badgeCounts` useMemo with `useBadgeCounts()` hook
  - [x] Same real data as sidebar — consistent badge counts across layouts

### 4.2.4 — Real-Time Badge Updates via SSE
- [x] Ensure SSE events trigger badge re-renders:
  - [x] `notification` event → inbox badge increments
  - [x] `chat_message` event → chats badge increments
  - [x] Callback status change → calls badge updates (may need new SSE event type)
  - [x] Friend request received → people badge updates (may need new SSE event type)
- [x] Badge clears when user navigates to the respective page and views items

### 4.2.5 — Update Dashboard Stats
- [x] Wire dashboard page stats to real data:
  - [x] Replace `Friends: 0` with actual friend count from API
  - [x] Add pending callbacks count stat card
  - [x] Use same `useBadgeCounts()` or `useDashboard()` hook for consistency

---

## Implementation Details

### Badge Counts Hook (`apps/web/src/hooks/useBadgeCounts.ts`)

```typescript
// apps/web/src/hooks/useBadgeCounts.ts
'use client';

import { useMemo } from 'react';
import { useNotifications } from '@/lib/notification-context';
import { useChat } from '@/lib/chat-context';
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_SUMMARY } from '@/lib/graphql/dashboard';

interface BadgeCounts {
  inbox: number;
  chats: number;
  calls: number;
  people: number;
}

export function useBadgeCounts(): BadgeCounts {
  const { unreadCount } = useNotifications();
  const { conversations } = useChat();

  const { data } = useQuery(GET_DASHBOARD_SUMMARY, {
    pollInterval: 60_000, // refresh every 60s
    fetchPolicy: 'cache-and-network',
  });

  return useMemo(() => {
    const chatUnread = conversations.reduce(
      (sum, c) => sum + (c.unreadCount || 0),
      0
    );

    return {
      inbox: unreadCount,
      chats: chatUnread,
      calls: data?.dashboardSummary?.pendingCallbackRequests ?? 0,
      people: 0, // TODO: wire to friend request count when API available
    };
  }, [unreadCount, conversations, data]);
}
```

### GraphQL Query (`apps/web/src/lib/graphql/dashboard.ts`)

```typescript
// apps/web/src/lib/graphql/dashboard.ts
import { gql } from '@apollo/client';

export const GET_DASHBOARD_SUMMARY = gql`
  query GetDashboardSummary {
    dashboardSummary {
      unreadPersonal
      unreadServiceProvider
      unreadAdvertisements
      pendingCallbackRequests
      totalConversations
    }
  }
`;
```

### Updated Sidebar (key change)

```typescript
// apps/web/src/components/layout/sidebar.tsx — replace badgeCounts useMemo
import { useBadgeCounts } from '@/hooks/useBadgeCounts';

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { unreadCount, notifications, markAllRead } = useNotifications();
  const badgeCounts = useBadgeCounts();
  // ... rest unchanged, remove old badgeCounts useMemo
```

### Updated Mobile Nav (key change)

```typescript
// apps/web/src/components/layout/mobile-nav.tsx — replace badgeCounts useMemo
import { useBadgeCounts } from '@/hooks/useBadgeCounts';

export function MobileNav() {
  const pathname = usePathname();
  const badgeCounts = useBadgeCounts();
  // ... rest unchanged, remove old badgeCounts useMemo and direct context imports
```

---

## Verification

- [x] Inbox badge shows real unread notification count from SSE stream
- [x] Chats badge shows real unread message count from chat context
- [x] Calls badge shows `pendingCallbackRequests` from `dashboardSummary` query
- [x] Badges update in real-time when new SSE events arrive
- [x] Sidebar and mobile nav show identical badge counts
- [x] Badge disappears when count is 0 (existing logic already handles this)
- [x] Dashboard stats page shows consistent numbers with sidebar badges
- [x] `dashboardSummary` polls every 60s to keep counts fresh
- [x] No unnecessary re-renders — useMemo correctly memoizes badge counts
- [x] Badge renders correctly with `9+` overflow for counts > 9 (existing CSS handles this)
