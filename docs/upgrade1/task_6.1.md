# Task 6.1 — Conversation List

> **Section**: 6. Conversations  
> **Priority**: P0 — Core feature page  
> **Estimated Scope**: Large  
> **Route**: `/conversations`  
> **File**: `apps/provider/src/app/conversations/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Upgrade the conversation list page from hardcoded mock data to a dynamic, GraphQL-powered left-panel list showing all active conversations with customer virtual ID, last message preview, unread badge, timestamp, and assignee.

---

## Current State

```tsx
// apps/provider/src/app/conversations/page.tsx — ~95 lines
const mockConversations = [
  { id: 'conv-1', customerVid: 'VID-8a3f2b', lastMessage: 'Thank you for the quick response!', lastAt: '2 min ago', unread: 0, assignee: 'Bot: Support Assistant', status: 'Active' },
  { id: 'conv-2', customerVid: 'VID-4c9e1d', lastMessage: 'I need help with my account settings', lastAt: '15 min ago', unread: 2, assignee: 'Agent: Sarah K.', status: 'Active' },
  // ... 3 more hardcoded rows
];
```

**Existing features**: Search input with `useState`, status filter chips (All/Active/Waiting/Escalated/Resolved), 4 hardcoded stats cards (Active: 12, Waiting: 5, Escalated: 3, Resolved Today: 28), conversation card list with icon, VID, status badge, last message, timestamp, assignee.

**Issues**:
- All 5 conversations hardcoded — no real data
- Stats cards hardcoded
- Client-side filtering only
- No pagination / infinite scroll
- No unread-first sorting option
- Status values (Active/Waiting/Resolved/Escalated) don't match schema enum (`OPEN`/`CLOSED`/`ARCHIVED`)
- No link between conversations and actual messages
- No real-time updates

---

## Requirements

### 1. Conversation Card Fields

| Field | Source | Notes |
|-------|--------|-------|
| **Avatar** | Customer virtual ID initials or icon | MessageSquare icon fallback |
| **Customer VID** | `conversation.participants[0].virtualPublicId` | Monospace `font-mono text-xs` |
| **Status** | `conversation.status` | Badge: OPEN (green), CLOSED (gray), ARCHIVED (muted) |
| **Last Message** | `conversation.messages.nodes[0].content` | Truncate at 60 chars, single line |
| **Timestamp** | `conversation.updatedAt` | Relative time (2m ago, 1h ago) |
| **Unread Count** | Count of unread messages | Blue badge with number |
| **Assignee** | Agent or bot name | Icon: Bot (purple) or User (blue) + name |

### 2. Data Integration
- Fetch from `conversations(limit, offset)` GraphQL query (task 6.12)
- Include first message for preview via nested `messages(limit: 1)` in query
- Replace `mockConversations` entirely

### 3. Stats Cards (dynamic)
- Fetch counts from `conversationStats` or derive from filtered data
- Cards: Open, Waiting/Pending, Escalated, Resolved Today
- Update in real-time via subscriptions

### 4. Layout
- On desktop: conversation list is the LEFT panel (takes ~350px)
- Clicking a conversation loads the chat thread in the RIGHT panel
- On mobile: full-width list, click navigates to `/conversations/[id]`
- Active conversation highlighted with `border-accent-blue` left border

### 5. Loading & Empty States
- Loading: 5 skeleton cards with shimmer
- Empty: "No conversations yet" with illustration
- Error: Error card with retry button

### 6. Infinite Scroll
- Load 20 conversations initially
- Load more on scroll to bottom
- Show loading spinner at bottom during fetch

---

## Implementation Plan

```tsx
'use client';

import { useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { MessageSquare, Search, Bot, User } from 'lucide-react';
import Link from 'next/link';
import { useConversations } from '@/lib/graphql/conversations';
import { Badge } from '@/components/ui/Badge';
import { formatRelativeTime } from '@/lib/utils/date';

const statusConfig: Record<string, { label: string; variant: string }> = {
  OPEN: { label: 'Open', variant: 'success' },
  CLOSED: { label: 'Closed', variant: 'neutral' },
  ARCHIVED: { label: 'Archived', variant: 'muted' },
};

export default function ConversationsPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') ?? 'All');
  const activeId = searchParams.get('active');

  const { data, loading, error, fetchMore } = useConversations({
    status: statusFilter !== 'All' ? statusFilter : undefined,
    search: search || undefined,
    limit: 20,
  });

  const conversations = data?.conversations.nodes ?? [];

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Left Panel — Conversation List */}
      <div className="w-[350px] border-r border-border-primary flex flex-col">
        <div className="p-4 space-y-3 border-b border-border-primary">
          <h1 className="text-lg font-semibold">Conversations</h1>
          {/* Search + Status Filters */}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && <ConversationListSkeleton />}
          {conversations.map((conv) => (
            <ConversationCard key={conv.id} conversation={conv} isActive={conv.id === activeId} />
          ))}
        </div>
      </div>

      {/* Right Panel — Chat (task 6.5) or Empty */}
      <div className="flex-1">
        {activeId ? <ConversationThread id={activeId} /> : <EmptyConversationPanel />}
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/conversations/page.tsx` | Modify — replace mock data with GraphQL, add split-panel layout |

---

## Acceptance Criteria

- [ ] Conversation list fetched from GraphQL (not hardcoded)
- [ ] Each card shows: VID, status badge, last message preview, timestamp, unread count, assignee
- [ ] Status badges match schema: OPEN (green), CLOSED (gray), ARCHIVED (muted)
- [ ] Split-panel layout: list (left 350px) + chat thread (right)
- [ ] Mobile: full-width list, navigate to `/conversations/[id]` on click
- [ ] Active conversation highlighted
- [ ] Loading skeleton (5 cards)
- [ ] Empty state when no conversations
- [ ] Infinite scroll loads 20 at a time
- [ ] Stats cards fetch live data

---

## Dependencies

- **Blocked by**: Task 1.8 (Skeleton), Task 1.9 (EmptyState), Task 1.18 (Badge), Task 6.12 (GraphQL conversations query)
- **Blocks**: Task 6.2 (search), Task 6.3 (filters), Task 6.4 (sort), Task 6.5 (ConversationPanel)
- **Related**: Task 16.2 (subscriptions update unread counts), Task 5.1 (notification table — similar pattern)
