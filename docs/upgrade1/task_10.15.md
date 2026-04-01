# Task 10.15 — Bot Analytics Dashboard

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P1 — Analytics  
> **Estimated Scope**: Large  
> **Route**: `/bots/[id]/analytics`  
> **File**: `apps/provider/src/app/bots/[id]/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the bot analytics page from 100% hardcoded metrics to GraphQL-powered real data. Fetch from `botAnalytics` query and display KPI cards, daily trends, top topics, and escalation reasons with real numbers.

---

## Current State

```tsx
// apps/provider/src/app/bots/[id]/analytics/page.tsx — 157 lines
const metrics = {
  totalConversations: 1240, avgSessionDuration: '4.2 min', avgRating: 4.6,
  escalationRate: 8.2, resolutionRate: 91.8, avgResponseTime: '1.2s', messagesPerSession: 6.4,
};

const dailyStats = [
  { date: 'Mon', conversations: 180, escalations: 12, satisfaction: 4.5 },
  // ... 7 days hardcoded
];

const topTopics = [
  { topic: 'Account Balance', count: 340, percentage: 27 },
  // ... 6 topics hardcoded
];

const escalationReasons = [
  { reason: 'Complex billing dispute', count: 23, percentage: 28 },
  // ... 5 reasons hardcoded
];
```

**Issues**:
- All metrics, daily stats, topics, and escalation reasons are hardcoded
- No GraphQL query
- No date range selector
- `dailyStats` not in current schema — may need a separate analytics endpoint
- No loading/error states

### GraphQL Schema

```graphql
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

type BotPerformanceAnalytics {
  totalConversations: Int!
  totalMessages: Int!
  totalActions: Int!
  totalEscalations: Int!
  escalationRate: Float!
  avgResponseTimeMs: Int!
  resolutionRate: Float!
  satisfactionScore: Float!
}

query {
  botAnalytics(botId: ID!, serviceProviderId: ID!): BotAnalytics!
}
```

---

## Requirements

### 1. KPI Cards (from BotAnalytics)

| Metric | Source | Format |
|--------|--------|--------|
| Total Conversations | `analytics.totalConversations` | Number |
| Messages Sent | `analytics.totalMessagesSent` | Number |
| Messages Received | `analytics.totalMessagesReceived` | Number |
| Avg Response Time | `analytics.avgResponseTimeMs` | "X.Xs" |
| Escalation Rate | `analytics.escalationRate` | "X.X%" |
| Resolution Rate | `analytics.resolutionRate` | "X.X%" |
| Satisfaction Score | `analytics.satisfactionScore` | "X.X / 5.0" |
| Total Actions | `analytics.totalActionsExecuted` | Number |
| Total Escalations | `analytics.totalEscalations` | Number |

### 2. KPI Card Component

```
┌──────────────────────┐
│ 📊 Total Convos      │
│ 1,240                │
│ ↑ 12.5% vs last week │
└──────────────────────┘
```

### 3. Daily Trends (future)

- Placeholder section for daily stats chart
- Note: Schema doesn't include daily breakdown yet
- Show "Coming soon" or compute from action logs if possible

### 4. Top Topics & Escalation Reasons (future)

- These require aggregation of `BotActionLog` data
- For now, keep placeholders or derive from action logs query
- Note in implementation that these will be enhanced when analytics API is extended

---

## Implementation Plan

```tsx
'use client';

import { use } from 'react';
import { useQuery } from '@apollo/client';
import { GET_BOT_ANALYTICS } from '@/lib/graphql/bots';

export default function BotAnalyticsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { serviceProviderId } = useServiceProvider();

  const { data, loading } = useQuery(GET_BOT_ANALYTICS, {
    variables: { botId: id, serviceProviderId },
  });

  if (loading) return <AnalyticsSkeleton />;
  const analytics = data?.botAnalytics;

  const kpis = [
    { label: 'Total Conversations', value: analytics?.totalConversations?.toLocaleString() ?? '0' },
    { label: 'Avg Response Time', value: analytics?.avgResponseTimeMs ? `${(analytics.avgResponseTimeMs / 1000).toFixed(1)}s` : '—' },
    { label: 'Escalation Rate', value: analytics?.escalationRate ? `${analytics.escalationRate.toFixed(1)}%` : '—' },
    { label: 'Resolution Rate', value: analytics?.resolutionRate ? `${analytics.resolutionRate.toFixed(1)}%` : '—' },
    { label: 'Satisfaction', value: analytics?.satisfactionScore ? `${analytics.satisfactionScore.toFixed(1)} / 5.0` : '—' },
    { label: 'Total Actions', value: analytics?.totalActionsExecuted?.toLocaleString() ?? '0' },
  ];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Bot Analytics</h1>
        <Link href={`/bots/${id}`} className="text-sm text-accent-blue hover:underline">Back to Bot</Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Placeholder for daily trends and topic breakdowns */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/[id]/analytics/page.tsx` | **Modify** | Replace all mock data with GraphQL query |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add GET_BOT_ANALYTICS query (task 10.22) |

---

## Acceptance Criteria

- [ ] Analytics fetched from `botAnalytics(botId, serviceProviderId)` query
- [ ] KPI cards show real data with proper formatting
- [ ] Avg response time converted from ms to seconds display
- [ ] Escalation and resolution rates shown as percentages
- [ ] Satisfaction score shown as X.X / 5.0
- [ ] Loading state shows skeleton cards
- [ ] Error state with retry
- [ ] Back link to bot detail page
- [ ] Mock data fully removed

---

## Dependencies

- **Blocked by**: Task 10.22 (botAnalytics query)
- **Blocks**: Task 10.16 (action audit log on analytics page)
- **Related**: Task 10.7 (bot detail page — links here)
