# Task 3K — Dashboard (Tasks 3.40–3.43)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3K — Dashboard
> **Files**: `apps/web/src/app/(dashboard)/page.tsx`, `apps/web/src/features/dashboard/summary-cards.tsx`, `apps/web/src/features/dashboard/recent-notifications.tsx`, `apps/web/src/features/dashboard/pending-callbacks.tsx`, `apps/web/src/features/dashboard/ai-summary-widget.tsx`
> **GraphQL**: `dashboardSummary`, `notifications(limit)`, `callbackRequests(status: PENDING, limit)`

---

## Objective

Wire all dashboard widgets to real GraphQL data — replace hardcoded stats with `dashboardSummary` query, populate the recent notifications and pending callbacks stub widgets, and connect the AI summary widget from mock data to the `ai-service` backend.

---

## Current State

### Main Dashboard Page

```typescript
// apps/web/src/app/(dashboard)/page.tsx — 84 lines
'use client';

import { useAuth } from '@/lib/auth-context';
import { useNotifications } from '@/lib/notification-context';
import { useChat } from '@/lib/chat-context';
import { AISummaryWidget } from '@/features/dashboard/ai-summary-widget';

// Stats computed from SSE/XMPP contexts (partially real):
const stats = [
  { label: 'Unread', value: unreadCount, ... },        // REAL — from SSE context
  { label: 'Conversations', value: conversations.length, ... }, // REAL — from XMPP context
  { label: 'Unread Chats', value: chatUnread, ... },    // REAL — computed from context
  { label: 'Friends', value: 0, ... },                   // HARDCODED to 0
];

// Recent notifications: notifications.slice(0, 5) — from SSE context (real but limited)
// AISummaryWidget: imported, renders mock data
// Quick action links: Conversations, Check Inbox, Manage Settings (static)
```

### Widget Components

```typescript
// features/dashboard/summary-cards.tsx — 15 lines, HARDCODED STATIC
const summaryItems = [
  { label: 'Unread Notifications', value: '12', color: 'text-accent-blue' },
  { label: 'Pending Callbacks', value: '3', color: 'text-accent-orange' },
  { label: 'Active Conversations', value: '5', color: 'text-accent-green' },
  { label: 'Spam Blocked', value: '27', color: 'text-accent-red' },
];
// NOTE: This component is defined but NOT imported by the main page.
// The main page builds its own stats grid from contexts.
```

```typescript
// features/dashboard/recent-notifications.tsx — 9 lines, EMPTY STUB
export function RecentNotifications() {
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">Recent Notifications</h2>
      <p className="text-sm text-text-muted text-center py-4">No recent notifications</p>
    </div>
  );
}
// NOTE: NOT imported by the main page.
// The main page has its own inline recent notifications section from SSE context.
```

```typescript
// features/dashboard/pending-callbacks.tsx — 9 lines, EMPTY STUB
export function PendingCallbacks() {
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold text-text-primary">Callback Requests</h2>
      <p className="text-sm text-text-muted text-center py-4">No pending callbacks</p>
    </div>
  );
}
// NOTE: NOT imported by the main page.
```

```typescript
// features/dashboard/ai-summary-widget.tsx — 144 lines, 100% MOCK
// IS imported by the main page.
const mockSummaries: ConversationSummary[] = [
  { id: '1', provider: 'Acme Insurance', summary: 'Discussed auto policy renewal...', sentiment: 'positive', ... },
  { id: '2', provider: 'MedHealth Clinic', summary: 'Upcoming appointment confirmed...', sentiment: 'neutral', ... },
  { id: '3', provider: 'TechSupport Pro', summary: 'Support ticket #4521 resolved...', sentiment: 'positive', ... },
];
const mockDigest: NotificationDigest[] = [ ... ];
const mockCategories: SmartCategory[] = [ ... ];
// 3 tabs: Conversations (summaries) | Digest (notification breakdown) | Smart Tags (categories)
```

**Gaps**:
- Stats partially real (SSE counts) but miss `pendingCallbackRequests` and `spamBlocked`
- Friends count hardcoded to 0
- `DashboardSummaryCards` component exists but is unused (hardcoded values)
- `RecentNotifications` widget is an empty stub (not imported)
- `PendingCallbacks` widget is an empty stub (not imported)
- `AISummaryWidget` is 100% mock data — no backend AI call
- No auto-refresh for dashboard data
- No `dashboardSummary` GraphQL query integration

### GraphQL Schema Available

```graphql
# Dashboard query
dashboardSummary: DashboardSummary!

type DashboardSummary {
  unreadPersonal: Int!
  unreadServiceProvider: Int!
  unreadAdvertisements: Int!
  pendingCallbackRequests: Int!
  totalConversations: Int!
}

# Notifications (for recent widget)
notifications(category: NotificationCategory, status: String, limit: Int, offset: Int): NotificationConnection!

# Callbacks (for pending widget)
callbackRequests(status: CallbackRequestStatus, limit: Int, offset: Int): CallbackRequestConnection!
```

---

## Task 3.40 — Wire Dashboard Stats to `dashboardSummary` Query

### Requirements

- [ ] Create `apps/web/src/lib/graphql/dashboard.ts`:
  - [ ] `GET_DASHBOARD_SUMMARY` query — returns `DashboardSummary` fields
- [ ] Create `apps/web/src/hooks/useDashboard.ts` hook:
  - [ ] Use `useQuery(GET_DASHBOARD_SUMMARY)` with `pollInterval: 30000` (30s auto-refresh)
  - [ ] Return `{ summary, loading, error, refetch }`
- [ ] Update `page.tsx` stats grid:
  - [ ] Replace context-derived stats with `dashboardSummary` data
  - [ ] Stat cards:
    - [ ] "Unread Personal" → `unreadPersonal` (accent-blue)
    - [ ] "Unread SP" → `unreadServiceProvider` (accent-orange)
    - [ ] "Unread Ads" → `unreadAdvertisements` (accent-purple)
    - [ ] "Pending Callbacks" → `pendingCallbackRequests` (accent-green)
    - [ ] "Conversations" → `totalConversations` (accent-cyan)
  - [ ] Keep SSE `unreadCount` for real-time badge updates (merge with query data)
- [ ] Update or replace `DashboardSummaryCards` component:
  - [ ] Wire to query data instead of hardcoded values
  - [ ] Or remove if main page uses its own stats grid
- [ ] Add loading skeleton for stats grid (5 skeleton cards)
- [ ] Add 30-second auto-refresh via Apollo `pollInterval`

### Implementation Details

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

```typescript
// apps/web/src/hooks/useDashboard.ts
import { useQuery } from '@apollo/client';
import { GET_DASHBOARD_SUMMARY } from '@/lib/graphql/dashboard';

export function useDashboard() {
  const { data, loading, error, refetch } = useQuery(GET_DASHBOARD_SUMMARY, {
    pollInterval: 30000, // Auto-refresh every 30s
    fetchPolicy: 'cache-and-network',
  });

  return {
    summary: data?.dashboardSummary ?? null,
    loading,
    error,
    refetch,
  };
}
```

```typescript
// Stats grid update in page.tsx
const { summary, loading: summaryLoading } = useDashboard();

const stats = [
  { label: 'Unread Personal', value: summary?.unreadPersonal ?? 0, color: 'text-accent-blue', bg: 'bg-accent-blue/10', href: '/inbox?category=PERSONAL' },
  { label: 'Unread Business', value: summary?.unreadServiceProvider ?? 0, color: 'text-accent-orange', bg: 'bg-accent-orange/10', href: '/inbox?category=SERVICE_PROVIDER' },
  { label: 'Pending Callbacks', value: summary?.pendingCallbackRequests ?? 0, color: 'text-accent-green', bg: 'bg-accent-green/10', href: '/callbacks?status=PENDING' },
  { label: 'Conversations', value: summary?.totalConversations ?? 0, color: 'text-accent-purple', bg: 'bg-accent-purple/10', href: '/conversations' },
];
```

---

## Task 3.41 — Wire Recent Notifications Widget

### Requirements

- [ ] Update `features/dashboard/recent-notifications.tsx`:
  - [ ] Replace empty stub with real `notifications` query
  - [ ] Query: `GET_NOTIFICATIONS` with `{ limit: 5 }` (reuse from Task 3A)
  - [ ] Show last 5 notifications: icon, title, SP name, time ago
  - [ ] Click notification → navigate to `/inbox` (or open detail drawer)
  - [ ] "View All" link → `/inbox`
- [ ] **OR** update the inline notifications section in `page.tsx`:
  - [ ] Currently uses `notifications.slice(0, 5)` from SSE context
  - [ ] Enhance with GraphQL query for persistent history (SSE only has recent buffer)
  - [ ] Show category badge (Personal/SP/Ad) on each item
  - [ ] Show unread indicator dot
- [ ] Auto-refresh: piggyback on dashboard poll or separate 30s poll
- [ ] Loading skeleton: 5 notification row placeholders

### Implementation Details

```typescript
// features/dashboard/recent-notifications.tsx — full replacement
'use client';

import { useQuery } from '@apollo/client';
import { GET_NOTIFICATIONS } from '@/lib/graphql/notifications';
import Link from 'next/link';

export function RecentNotifications() {
  const { data, loading } = useQuery(GET_NOTIFICATIONS, {
    variables: { limit: 5, offset: 0 },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,
  });

  const notifications = data?.notifications?.nodes ?? [];

  if (loading && notifications.length === 0) return <NotificationsSkeleton />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text-primary">Recent Notifications</h2>
        <Link href="/inbox" className="text-2xs text-accent-blue hover:underline">View all</Link>
      </div>
      <div className="space-y-1">
        {notifications.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No recent notifications</p>
        ) : (
          notifications.map((n) => (
            <Link key={n.id} href="/inbox" className="flex items-center gap-3 py-2.5 px-2 rounded-lg hover:bg-bg-hover transition-colors">
              <CategoryIcon category={n.category} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-secondary truncate">{n.title}</p>
                <p className="text-2xs text-text-muted">{n.serviceProvider?.name}</p>
              </div>
              <span className="text-2xs text-text-muted shrink-0">{timeAgo(n.createdAt)}</span>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## Task 3.42 — Wire Pending Callbacks Widget

### Requirements

- [ ] Update `features/dashboard/pending-callbacks.tsx`:
  - [ ] Replace empty stub with real `callbackRequests` query
  - [ ] Query: `GET_CALLBACK_REQUESTS` with `{ status: 'PENDING', limit: 5 }` (reuse from Task 3B)
  - [ ] Show pending callbacks: SP name, reason, time requested
  - [ ] Inline quick actions: "Approve" / "Reject" buttons
  - [ ] Pending count badge in header
  - [ ] "View All" link → `/callbacks`
- [ ] Approve inline:
  - [ ] Click approve → show minimal slot picker (or use next available slot)
  - [ ] Call `approveCallbackRequest` mutation
  - [ ] Optimistic removal from widget
- [ ] Reject inline:
  - [ ] Click reject → call `rejectCallbackRequest` mutation with no reason
  - [ ] Optimistic removal from widget
- [ ] Show next upcoming approved callback:
  - [ ] Find nearest `APPROVED` callback in the future
  - [ ] Show countdown: "Next callback with {SP} in {time}"
- [ ] Auto-refresh: pollInterval 30s or refetch on SSE callback event

### Implementation Details

```typescript
// features/dashboard/pending-callbacks.tsx — full replacement
'use client';

import { useQuery, useMutation } from '@apollo/client';
import { GET_CALLBACK_REQUESTS, APPROVE_CALLBACK, REJECT_CALLBACK } from '@/lib/graphql/callbacks';
import Link from 'next/link';

export function PendingCallbacks() {
  const { data, loading } = useQuery(GET_CALLBACK_REQUESTS, {
    variables: { status: 'PENDING', limit: 5, offset: 0 },
    fetchPolicy: 'cache-and-network',
    pollInterval: 30000,
  });

  const [approveCallback] = useMutation(APPROVE_CALLBACK);
  const [rejectCallback] = useMutation(REJECT_CALLBACK);

  const callbacks = data?.callbackRequests?.nodes ?? [];
  const total = data?.callbackRequests?.totalCount ?? 0;

  if (loading && callbacks.length === 0) return <CallbacksSkeleton />;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-text-primary">Pending Callbacks</h2>
        <div className="flex items-center gap-2">
          {total > 0 && <span className="badge-count">{total}</span>}
          <Link href="/callbacks" className="text-2xs text-accent-blue hover:underline">View all</Link>
        </div>
      </div>
      <div className="space-y-2">
        {callbacks.length === 0 ? (
          <p className="text-sm text-text-muted py-4 text-center">No pending callbacks</p>
        ) : (
          callbacks.map((cb) => (
            <div key={cb.id} className="flex items-center gap-3 py-2 px-2 rounded-lg bg-bg-tertiary">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary">{cb.serviceProvider.name}</p>
                <p className="text-2xs text-text-muted truncate">{cb.reason}</p>
              </div>
              <div className="flex gap-1.5 shrink-0">
                <button className="px-2.5 py-1 text-2xs font-medium rounded-md bg-status-success/10 text-status-success hover:bg-status-success/20">
                  Approve
                </button>
                <button className="px-2.5 py-1 text-2xs font-medium rounded-md bg-accent-red/10 text-accent-red hover:bg-accent-red/20">
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

---

## Task 3.43 — Wire AI Summary Widget

### Requirements

- [ ] Replace mock data in `AISummaryWidget` with real backend calls:
  - [ ] **Conversation Summaries tab**: call `ai-service` for conversation summarization
    - [ ] Endpoint: `GET /api/ai/summaries?type=conversations` (or GraphQL if available)
    - [ ] Returns: SP name, summary text, sentiment, last activity time
    - [ ] Fallback: if AI service unavailable, show "AI summaries unavailable" with retry
  - [ ] **Notification Digest tab**: compute from real notification data
    - [ ] Group `notifications(limit: 50)` by category → count + highlight
    - [ ] "Daily" / "Weekly" period filter
    - [ ] Highlight: pick most notable notification per category
  - [ ] **Smart Tags tab**: AI-driven categorization
    - [ ] Endpoint: `GET /api/ai/categorize?type=notifications` (or compute client-side)
    - [ ] Tags: Action Required, Informational, Promotions, Completed
    - [ ] Count per tag + click to filter inbox
- [ ] Remove all mock data arrays:
  - [ ] Remove `mockSummaries`, `mockDigest`, `mockCategories`
  - [ ] Replace with query/fetch results
- [ ] Loading states per tab:
  - [ ] Each tab loads independently
  - [ ] Show skeleton specific to tab content
- [ ] Error handling:
  - [ ] AI service errors: show fallback ("AI insights temporarily unavailable")
  - [ ] Don't break the dashboard if AI service is down
  - [ ] Retry button per tab

### Implementation Details

```typescript
// Digest tab — compute from real notifications
const { data: notifData } = useQuery(GET_NOTIFICATIONS, {
  variables: { limit: 50, offset: 0 },
});

const digest = useMemo(() => {
  const nodes = notifData?.notifications?.nodes ?? [];
  const personal = nodes.filter(n => n.category === 'PERSONAL');
  const sp = nodes.filter(n => n.category === 'SERVICE_PROVIDER');
  const ads = nodes.filter(n => n.category === 'ADVERTISEMENT');

  return [
    { category: 'Personal', count: personal.length, highlight: `${personal.length} messages` },
    { category: 'Service Provider', count: sp.length, highlight: summarizeSP(sp) },
    { category: 'Advertisement', count: ads.length, highlight: `${ads.length} promotions` },
  ];
}, [notifData]);
```

```typescript
// AI summaries — REST call to ai-service (via gateway)
const fetchSummaries = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_BASE}/api/ai/conversation-summaries`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('AI service unavailable');
  return res.json();
};
```

---

## Verification Checklist

- [ ] Dashboard stats grid shows real data from `dashboardSummary` query
- [ ] Stats auto-refresh every 30 seconds
- [ ] Stats loading skeleton shows during initial query
- [ ] Recent notifications widget shows last 5 real notifications
- [ ] Notification items show category icon, title, SP name, time ago
- [ ] Click notification navigates to inbox
- [ ] Pending callbacks widget shows real pending callbacks
- [ ] Inline approve/reject buttons work on callback widget
- [ ] Pending count badge shows in callbacks widget header
- [ ] AI summary widget — Conversations tab shows real summaries (or graceful fallback)
- [ ] AI summary widget — Digest tab computes from real notification data
- [ ] AI summary widget — Smart Tags tab shows categorization (or placeholder)
- [ ] All mock data removed (`mockSummaries`, `mockDigest`, `mockCategories`)
- [ ] Dashboard doesn't break if AI service is unavailable
- [ ] Mobile responsive layout

---

## Dependencies

**Depends on**:
- Task 2.1 — Apollo Client configured
- Task 2.2 — ApolloProvider
- Task 3A — Notifications GraphQL operations (reuse `GET_NOTIFICATIONS`)
- Task 3B — Callbacks GraphQL operations (reuse `GET_CALLBACK_REQUESTS`, mutations)
- `ai-service` for conversation summaries (Optional — widget degrades gracefully)

**Blocks**:
- None — dashboard is the final integration point

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/page.tsx` | Dashboard page (84 lines, partial real) |
| `apps/web/src/features/dashboard/summary-cards.tsx` | Summary cards (15 lines, hardcoded, unused) |
| `apps/web/src/features/dashboard/recent-notifications.tsx` | Recent notifs (9 lines, empty stub) |
| `apps/web/src/features/dashboard/pending-callbacks.tsx` | Pending callbacks (9 lines, empty stub) |
| `apps/web/src/features/dashboard/ai-summary-widget.tsx` | AI widget (144 lines, 100% mock) |
| `apps/web/src/lib/graphql/dashboard.ts` | **New** — Dashboard GraphQL query |
| `apps/web/src/hooks/useDashboard.ts` | **New** — Dashboard hook |
| `apps/web/src/lib/graphql/notifications.ts` | Reuse from Task 3A |
| `apps/web/src/lib/graphql/callbacks.ts` | Reuse from Task 3B |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema — `DashboardSummary` type |
