# Task 10.1 — Bot List Cards

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P0 — Core feature page  
> **Estimated Scope**: Large  
> **Route**: `/bots`  
> **File**: `apps/provider/src/app/bots/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the bots list page from hardcoded mock cards to a dynamic, GraphQL-powered grid showing all bots with name, avatar, status (Active/Inactive/Draft/Paused/Archived), model, last active date, and total interactions.

---

## Current State

```tsx
// apps/provider/src/app/bots/page.tsx — 63 lines
export default function BotsPage() {
  // ...
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {[
      { name: 'Loan Inquiry Bot', purpose: 'Handle loan pre-qualification inquiries', status: 'Active', conversations: 234, escalations: 12 },
      { name: 'Account Support Bot', purpose: 'Assist with account balance and transaction queries', status: 'Active', conversations: 567, escalations: 23 },
      { name: 'Onboarding Bot', purpose: 'Guide new customers through KYC process', status: 'Draft', conversations: 0, escalations: 0 },
    ].map((bot, i) => (
      <div key={i} className="bg-bg-card ...">
        // ... card layout
      </div>
    ))}
  </div>
}
```

**Existing features**: Header with "AI Bots" title, status filter chips (All/Active/Draft/Paused/Archived), 3 hardcoded bot cards with avatar initial, name, purpose, status badge, conversations count, escalations count. "+ Create Bot" button.

**Issues**:
- Only 3 bots, all hardcoded — no real data
- Status values ("Active"/"Draft") partially align with `BotStatus` enum (`ACTIVE`/`DRAFT`/`PAUSED`/`ARCHIVED`)
- No model info shown (plan requires model display)
- No "last active" timestamp
- No link to bot detail page (`/bots/[id]`)
- No pagination
- No loading/error/empty states
- Filter chips non-functional
- No total interactions metric (plan: "total interactions")

### GraphQL Schema

```graphql
enum BotStatus { DRAFT, ACTIVE, PAUSED, ARCHIVED }

type Bot {
  id: ID!
  serviceProviderId: ID!
  name: String!
  avatarUrl: String
  purpose: String!
  department: String
  status: BotStatus!
  configuration: BotConfiguration
  analytics: BotAnalytics
  createdAt: DateTime!
  updatedAt: DateTime!
}

type BotConnection { nodes: [Bot!]!, totalCount: Int! }

type BotAnalytics {
  botId: ID!
  totalConversations: Int!
  totalMessagesSent: Int!
  totalMessagesReceived: Int!
  totalActionsExecuted: Int!
  totalEscalations: Int!
  avgResponseTimeMs: Int!
  escalationRate: Float!
  resolutionRate: Float!
  satisfactionScore: Float!
  lastActiveAt: DateTime
}

query {
  bots(serviceProviderId: ID!, status: BotStatus, limit: Int, offset: Int): BotConnection!
}
```

---

## Requirements

### 1. Bot Card Fields

| Field | Source | Notes |
|-------|--------|-------|
| **Avatar** | `bot.avatarUrl` or first-letter fallback | Purple background circle |
| **Name** | `bot.name` | Link to `/bots/${bot.id}`, semibold |
| **Purpose** | `bot.purpose` | Truncated text-xs |
| **Status** | `bot.status` | Badge, see colors below |
| **Model** | `bot.configuration?.customSystemPrompt` short identifier or department | Secondary text |
| **Last Active** | `bot.analytics?.lastActiveAt` | Relative time or "Never" |
| **Conversations** | `bot.analytics?.totalConversations` | Formatted number |
| **Escalations** | `bot.analytics?.totalEscalations` | Formatted number |
| **Escalation Rate** | `bot.analytics?.escalationRate` | Percentage badge |

### 2. Status Badge Colors

| Schema | UI Label | Color |
|--------|----------|-------|
| `ACTIVE` | Active | `bg-status-success/20 text-status-success` |
| `DRAFT` | Draft | `bg-text-muted/20 text-text-muted` |
| `PAUSED` | Paused | `bg-status-warning/20 text-status-warning` |
| `ARCHIVED` | Archived | `bg-border-secondary text-text-muted` |

### 3. Data Integration

- Fetch from `bots(serviceProviderId, status, limit, offset)` query (task 10.22)
- Include `analytics` nested field in query for conversation/escalation counts
- Replace hardcoded array entirely
- Pagination: offset-based or load-more

### 4. States

- **Loading**: Skeleton card grid (6 cards)
- **Error**: Error card with retry button
- **Empty**: Illustration + "No bots created yet" + CTA to create first bot
- **Empty filtered**: "No bots match your filter" + clear filters

---

## Implementation Plan

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import { Bot } from 'lucide-react';
import { GET_BOTS } from '@/lib/graphql/bots';
import { useServiceProvider } from '@/hooks/useServiceProvider';

const STATUS_MAP = {
  ACTIVE: { label: 'Active', className: 'bg-status-success/20 text-status-success' },
  DRAFT: { label: 'Draft', className: 'bg-text-muted/20 text-text-muted' },
  PAUSED: { label: 'Paused', className: 'bg-status-warning/20 text-status-warning' },
  ARCHIVED: { label: 'Archived', className: 'bg-border-secondary text-text-muted' },
};

export default function BotsPage() {
  const { serviceProviderId } = useServiceProvider();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data, loading, error } = useQuery(GET_BOTS, {
    variables: { serviceProviderId, status: statusFilter, limit: 50, offset: 0 },
  });

  const bots = data?.bots?.nodes ?? [];

  return (
    <div className="p-8">
      {/* Header + filter chips + bot card grid */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/page.tsx` | **Modify** | Replace mock data with GraphQL query, add all fields |
| `apps/provider/src/types/bots.ts` | **Create** | BotStatus, Bot, BotAnalytics types |
| `apps/provider/src/lib/graphql/bots.ts` | **Create** (partial) | GET_BOTS query (expanded in task 10.22) |

---

## Acceptance Criteria

- [ ] Bots fetch from `bots()` GraphQL query on mount
- [ ] Card displays avatar, name (linked), purpose, status badge, conversations, escalations, last active
- [ ] Status badges use correct colors per `BotStatus` enum
- [ ] Bot name links to `/bots/[id]`
- [ ] Loading state shows skeleton cards
- [ ] Error state shows error card with retry
- [ ] Empty state shows CTA to create first bot
- [ ] "+ Create Bot" button navigates to `/bots/new`
- [ ] Mock data array fully removed

---

## Dependencies

- **Blocked by**: Task 10.22 (GraphQL bots query)
- **Blocks**: Tasks 10.2, 10.3, 10.4 (create button, toggle, search/filter)
- **Related**: Task 10.7 (bot detail — link target)
