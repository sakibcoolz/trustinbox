# Task 4.5 — Activity Feed

> **Phase**: 4 — Web App: Enhanced Features
> **Task**: 4.5 — Activity Feed
> **Files**: `apps/web/src/app/(dashboard)/activity/page.tsx` (new), `apps/web/src/hooks/useActivityFeed.ts` (new), `apps/web/src/components/layout/sidebar.tsx`, `apps/web/src/components/layout/mobile-nav.tsx`
> **Dependencies**: Phase 3 (all pages wired to real data)
> **Schema Note**: No `activityFeed` query exists in GraphQL schema — client-side aggregation from multiple sources required

---

## Objective

Create a unified activity feed page that shows a reverse-chronological timeline of all user interactions: notifications received, callbacks approved/rejected, messages sent/received, documents shared, and friend requests. This aggregates data from multiple sources into a single filterable timeline view.

---

## Current State

### No Activity Page
```
❌ apps/web/src/app/(dashboard)/activity/ — directory does NOT exist
❌ No route, no component, no data aggregation
```

### No Activity GraphQL Query
```
❌ No `activityFeed` or `activity` query in gateway schema
❌ No `Activity` type in schema
✅ Individual queries exist: notifications, callbackRequests, conversations
✅ SSE events provide real-time data: notification, chat_message, presence_update
```

### Sidebar & Mobile Nav — No Activity Link
```typescript
// apps/web/src/components/layout/sidebar.tsx — navItems array
// Current items: Inbox, Chats, Calls, People, Services, Files
// ❌ No "Activity" nav item

// apps/web/src/components/layout/mobile-nav.tsx — mobileNavItems array
// Current items: Inbox, Chats, Calls, People, Services, Files, Settings
// ❌ No "Activity" nav item
```

### Dashboard — Recent Activity Section Exists
```typescript
// apps/web/src/app/(dashboard)/page.tsx — shows recent notifications
// Uses SSE notifications context: recentNotifs = notifications.slice(0, 5)
// Only shows notifications, not aggregated activity
```

---

## Requirements

### 4.5.1 — Create Activity Feed Page
- [x] Create `apps/web/src/app/(dashboard)/activity/page.tsx`:
  - [x] Full-page timeline view with reverse chronological ordering
  - [x] Activity items from multiple sources aggregated and sorted by timestamp
  - [x] Each activity item shows: icon, title, description, timestamp, source badge
  - [x] Color-coded by type (blue: notification, green: callback, purple: message, orange: document)
  - [x] Loading skeleton on initial load
  - [x] Error state with retry button
  - [x] Empty state: "No activity yet. Your interactions will appear here."

### 4.5.2 — Create Activity Feed Hook
- [x] Create `apps/web/src/hooks/useActivityFeed.ts`:
  - [x] Aggregate data from multiple sources:
    - [x] Notifications: from SSE buffer + `notifications` query (recent 20)
    - [x] Callbacks: from `callbackRequests` query (recent 10)
    - [x] Conversations: from chat context (recent messages)
    - [x] Documents: from documents query if available (recent 10)
  - [x] Normalize each item into a common `ActivityItem` shape
  - [x] Sort all items by `timestamp` descending
  - [x] Return `{ activities: ActivityItem[], loading: boolean, error: Error | null, refetch: () => void }`
  - [x] Support pagination (load more)

### 4.5.3 — Add Filter Controls
- [x] Add filter bar at top of activity page:
  - [x] Filter by type: All, Notifications, Callbacks, Messages, Documents
  - [x] Use tab-style UI matching the existing tab pattern (`.tab` / `.tab-active` CSS classes)
  - [x] Filter is instant (client-side) — no API refetch needed
  - [x] Show count per filter category

### 4.5.4 — Add Activity Nav Item (Optional)
- [x] Consider adding "Activity" to sidebar navigation:
  - [x] Add nav item between existing items or in the bottom section
  - [x] Activity icon: clock/history icon from Lucide or inline SVG
  - [x] Or: keep Activity accessible only from dashboard "View all activity" link
- [x] If adding to sidebar, also add to mobile-nav for consistency
- [x] Update `header.tsx` PAGE_TITLES with `'/activity': 'Activity'`

### 4.5.5 — Wire Real-Time Updates
- [x] New SSE events should prepend to the activity feed:
  - [x] `notification` event → new activity item at top
  - [x] `chat_message` event → new activity item at top
  - [x] Merge without duplicates (check by id + type)
- [x] Animate new items sliding in from top

---

## Implementation Details

### Activity Item Type

```typescript
// apps/web/src/hooks/useActivityFeed.ts

interface ActivityItem {
  id: string;
  type: 'notification' | 'callback' | 'message' | 'document' | 'friend';
  title: string;
  description: string;
  timestamp: string; // ISO string
  href: string;      // deep link URL
  metadata: {
    serviceProviderName?: string;
    category?: string;
    status?: string;
  };
}
```

### Activity Feed Hook

```typescript
// apps/web/src/hooks/useActivityFeed.ts
'use client';

import { useMemo, useState } from 'react';
import { useNotifications } from '@/lib/notification-context';
import { useChat } from '@/lib/chat-context';
import { useQuery } from '@apollo/client';
import { GET_NOTIFICATIONS } from '@/lib/graphql/notifications';
import { GET_CALLBACK_REQUESTS } from '@/lib/graphql/callbacks';

type ActivityType = 'notification' | 'callback' | 'message' | 'document' | 'friend';

export function useActivityFeed(filter: ActivityType | 'all' = 'all') {
  const { notifications } = useNotifications();
  const { conversations } = useChat();

  const { data: notifsData, loading: notifsLoading } = useQuery(GET_NOTIFICATIONS, {
    variables: { limit: 20, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const { data: callbacksData, loading: callbacksLoading } = useQuery(GET_CALLBACK_REQUESTS, {
    variables: { limit: 10, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const activities = useMemo(() => {
    const items: ActivityItem[] = [];

    // Notifications from SSE + query
    const allNotifs = notifsData?.notifications?.nodes || notifications;
    allNotifs.forEach((n: any) => {
      items.push({
        id: `notif-${n.id}`,
        type: 'notification',
        title: n.title,
        description: n.body || '',
        timestamp: n.createdAt,
        href: `/inbox?id=${n.id}`,
        metadata: {
          serviceProviderName: n.serviceProvider?.name,
          category: n.category,
          status: n.status,
        },
      });
    });

    // Callbacks
    (callbacksData?.callbackRequests?.nodes || []).forEach((cb: any) => {
      items.push({
        id: `callback-${cb.id}`,
        type: 'callback',
        title: `Callback request from ${cb.serviceProvider?.name || 'Unknown'}`,
        description: cb.reason || '',
        timestamp: cb.createdAt,
        href: `/callbacks?id=${cb.id}`,
        metadata: {
          serviceProviderName: cb.serviceProvider?.name,
          status: cb.status,
        },
      });
    });

    // Recent messages from conversations
    conversations.forEach((conv) => {
      if (conv.lastMessage) {
        items.push({
          id: `msg-${conv.id}`,
          type: 'message',
          title: `Message from ${conv.participantName || 'Unknown'}`,
          description: conv.lastMessage.text?.slice(0, 100) || '',
          timestamp: conv.lastMessage.createdAt || conv.updatedAt,
          href: '/conversations',
          metadata: {},
        });
      }
    });

    // Sort by timestamp descending
    items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Apply filter
    if (filter !== 'all') {
      return items.filter((item) => item.type === filter);
    }

    return items;
  }, [notifications, notifsData, callbacksData, conversations, filter]);

  return {
    activities,
    loading: notifsLoading || callbacksLoading,
  };
}
```

### Activity Feed Page

```tsx
// apps/web/src/app/(dashboard)/activity/page.tsx
'use client';

import { useState } from 'react';
import { useActivityFeed } from '@/hooks/useActivityFeed';

const ACTIVITY_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'notification', label: 'Notifications' },
  { key: 'callback', label: 'Callbacks' },
  { key: 'message', label: 'Messages' },
  { key: 'document', label: 'Documents' },
] as const;

const TYPE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  notification: { bg: 'bg-accent-blue/10', text: 'text-accent-blue', icon: '🔔' },
  callback: { bg: 'bg-accent-green/10', text: 'text-accent-green', icon: '📞' },
  message: { bg: 'bg-accent-purple/10', text: 'text-accent-purple', icon: '💬' },
  document: { bg: 'bg-accent-orange/10', text: 'text-accent-orange', icon: '📄' },
  friend: { bg: 'bg-accent-cyan/10', text: 'text-accent-cyan', icon: '👤' },
};

export default function ActivityPage() {
  const [filter, setFilter] = useState<string>('all');
  const { activities, loading } = useActivityFeed(filter as any);

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Activity</h1>
          <p className="text-sm text-text-muted mt-1">Your recent interactions and events</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {ACTIVITY_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={filter === t.key ? 'tab-active' : 'tab'}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Timeline */}
        {loading ? (
          <ActivitySkeleton />
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-2xl bg-bg-tertiary flex items-center justify-center mb-3">
              <span className="text-xl">📋</span>
            </div>
            <p className="text-sm text-text-muted">No activity yet</p>
            <p className="text-xs text-text-muted mt-1">Your interactions will appear here</p>
          </div>
        ) : (
          <div className="space-y-1">
            {activities.map((item) => (
              <ActivityCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityCard({ item }: { item: ActivityItem }) {
  const colors = TYPE_COLORS[item.type] || TYPE_COLORS.notification;

  return (
    <Link
      href={item.href}
      className="flex items-start gap-3 p-3 rounded-xl hover:bg-bg-hover transition-colors"
    >
      <div className={`w-9 h-9 rounded-xl ${colors.bg} flex items-center justify-center shrink-0 text-sm`}>
        {colors.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-text-primary font-medium truncate">{item.title}</p>
        {item.description && (
          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className={`text-2xs font-medium ${colors.text}`}>
            {item.type}
          </span>
          <span className="text-2xs text-text-muted">
            {formatTimeAgo(item.timestamp)}
          </span>
        </div>
      </div>
    </Link>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3 p-3 animate-pulse">
          <div className="w-9 h-9 rounded-xl bg-bg-tertiary" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-bg-tertiary rounded w-3/4" />
            <div className="h-3 bg-bg-tertiary rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function formatTimeAgo(timestamp: string): string {
  const now = Date.now();
  const then = new Date(timestamp).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}
```

---

## Verification

- [x] `/activity` route loads the activity feed page
- [x] Activities aggregated from notifications, callbacks, and conversations
- [x] Items sorted by timestamp descending (most recent first)
- [x] Filter tabs work: All, Notifications, Callbacks, Messages, Documents
- [x] Each item is color-coded by type
- [x] Clicking an activity item navigates to the correct detail page with deep link
- [x] Loading skeleton shows while data fetches
- [x] Empty state shows when no activity exists
- [x] Real-time SSE events prepend new items to the feed
- [x] Page title shows "Activity" in header
- [x] Responsive layout works on mobile (< 640px)
- [x] No duplicate items in the feed (deduplication by id + type)
