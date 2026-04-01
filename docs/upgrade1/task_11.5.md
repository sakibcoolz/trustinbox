# Task 11.5 — Bot Analytics Panel

> **Section**: 11. Analytics  
> **Priority**: P1 — Analytics panel  
> **Estimated Scope**: Medium  
> **Route**: `/analytics`  
> **File**: `apps/provider/src/app/analytics/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Replace the hardcoded Bot Analytics section with a panel powered by `DashboardAnalytics` aggregate fields and/or `botPerformanceAnalytics` query. Show total interactions, handoff rate, average response time, and top-performing bots ranking.

---

## Current State

```tsx
<div className="bg-bg-card border border-border-primary rounded-xl p-6">
  <h3 className="text-sm font-medium text-text-secondary mb-4">Bot Analytics</h3>
  <div className="space-y-3">
    <AnalyticsRow label="Conversations" value="801" />
    <AnalyticsRow label="Actions Executed" value="2,340" />
    <AnalyticsRow label="Escalations" value="42" />
    <AnalyticsRow label="Avg Response Time" value="0.8s" />
  </div>
</div>
```

**Issues**: All hardcoded. No real data.

### GraphQL Schema

From `DashboardAnalytics` (aggregate):
```graphql
botActions: Int!
botEscalations: Int!
```

Per-bot query:
```graphql
type BotPerformanceAnalytics {
  totalConversations: Int!
  totalMessages: Int!
  totalActions: Int!
  totalEscalations: Int!
  escalationRate: Float!
  avgResponseTimeMs: Float!
  resolutionRate: Float!
  satisfactionScore: Float!
}

query {
  botPerformanceAnalytics(serviceProviderId: ID!, botId: ID!, from: DateTime, to: DateTime): BotPerformanceAnalytics!
}
```

---

## Requirements

### 1. Aggregate KPIs (from DashboardAnalytics)

| Metric | Source | Format |
|--------|--------|--------|
| Bot Actions | `dashboardAnalytics.botActions` | Number |
| Bot Escalations | `dashboardAnalytics.botEscalations` | Number |
| Handoff Rate | `botEscalations / botActions * 100` | Percentage |

### 2. Per-Bot Performance (from bots list + botPerformanceAnalytics)

- Fetch active bots from `bots(serviceProviderId, status: ACTIVE)`
- For each active bot (top 5), show:
  - Bot name
  - Conversations count
  - Escalation rate
  - Satisfaction score
  - Mini bar showing relative performance

### 3. Top-Performing Bots Ranking

| Rank | Bot Name | Conversations | Escalation Rate | Satisfaction |
|------|----------|--------------|-----------------|--------------|
| 1 | Support Bot | 567 | 5.2% | 4.8/5 |
| 2 | Onboarding Bot | 234 | 8.1% | 4.5/5 |

---

## Implementation Plan

```tsx
function BotAnalyticsPanel({ dateVars, dashboardData }: {
  dateVars: AnalyticsDateVars;
  dashboardData?: DashboardAnalytics;
}) {
  const botActions = dashboardData?.botActions ?? 0;
  const botEscalations = dashboardData?.botEscalations ?? 0;
  const handoffRate = botActions > 0 ? ((botEscalations / botActions) * 100).toFixed(1) : '0';

  // Fetch active bots for ranking
  const { data: botsData } = useQuery(GET_BOTS, {
    variables: { serviceProviderId: dateVars.serviceProviderId, status: 'ACTIVE', limit: 5 },
  });

  const bots = botsData?.bots?.nodes ?? [];

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-semibold">Bot Analytics</h3>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center">
          <p className="text-xs text-text-muted">Actions</p>
          <p className="text-lg font-semibold mt-0.5 text-accent-teal">{botActions.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">Escalations</p>
          <p className="text-lg font-semibold mt-0.5 text-status-warning">{botEscalations.toLocaleString()}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-text-muted">Handoff Rate</p>
          <p className="text-lg font-semibold mt-0.5 text-accent-purple">{handoffRate}%</p>
        </div>
      </div>

      {/* Top bots ranking */}
      <div className="space-y-2">
        <p className="text-xs text-text-muted">Top Performing Bots</p>
        {bots.map((bot, i) => (
          <div key={bot.id} className="flex items-center gap-3 py-2">
            <span className="text-xs text-text-muted w-4">{i + 1}</span>
            <div className="w-7 h-7 rounded-full bg-accent-purple/20 flex items-center justify-center text-xs font-medium text-accent-purple">
              {bot.name[0]}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">{bot.name}</p>
              <p className="text-xs text-text-muted">
                {bot.analytics?.totalConversations ?? 0} conversations
              </p>
            </div>
            <span className="text-xs text-text-secondary">
              {bot.analytics?.satisfactionScore?.toFixed(1) ?? '—'}/5
            </span>
          </div>
        ))}
        {bots.length === 0 && (
          <p className="text-xs text-text-muted py-4 text-center">No active bots</p>
        )}
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/analytics/page.tsx` | **Modify** | Replace mock bot section with real data |

---

## Acceptance Criteria

- [ ] Bot aggregate metrics from dashboard analytics (actions, escalations)
- [ ] Handoff rate computed and displayed
- [ ] Top 5 active bots shown with name, conversations, satisfaction
- [ ] Loading state
- [ ] Empty state: "No active bots"
- [ ] Mock data removed

---

## Dependencies

- **Blocked by**: Task 11.1 (date range), Task 11.9 (GraphQL queries), Section 10 bot queries
- **Blocks**: None
- **Related**: Task 10.15 (per-bot analytics — detailed view)
