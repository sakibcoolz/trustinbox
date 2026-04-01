# Task 11.9 — Analytics GraphQL Queries

> **Section**: 11. Analytics — GraphQL Integration  
> **Priority**: P0 — Foundation queries  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/graphql/analytics.ts`  
> **Status**: ✅ Complete

---

## Objective

Create the `apps/provider/src/lib/graphql/analytics.ts` file defining all analytics-specific GraphQL queries: `GET_DASHBOARD_ANALYTICS`, `GET_DAILY_ANALYTICS`, `GET_NOTIFICATION_ANALYTICS`, `GET_CALLBACK_ANALYTICS`, `GET_CAMPAIGN_ANALYTICS_OVERVIEW`, and `GET_BOT_PERFORMANCE_ANALYTICS`. Include TypeScript types and reusable hooks.

---

## Current State

- `apps/provider/src/lib/graphql/dashboard.ts` exists with `DASHBOARD_ANALYTICS_QUERY` (used by the dashboard page), `DashboardAnalytics` type, `PolicyBreakdown`, `DailyDeliveryEntry`, etc.
- `apps/provider/src/lib/graphql/campaigns.ts` has `GET_CAMPAIGN_ANALYTICS` (per-campaign)
- No dedicated analytics file exists for the `/analytics` page queries

### GraphQL Schema

```graphql
# Analytics queries
dashboardAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): DashboardAnalytics!
dailyAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): [DailyAnalyticsEntry!]!
notificationAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): NotificationAnalytics!
callbackAnalytics(serviceProviderId: ID!, from: DateTime!, to: DateTime!): CallbackAnalytics!
campaignAnalytics(serviceProviderId: ID!, campaignId: ID!, from: DateTime, to: DateTime): CampaignAnalytics!
botPerformanceAnalytics(serviceProviderId: ID!, botId: ID!, from: DateTime, to: DateTime): BotPerformanceAnalytics!

# Types
type DashboardAnalytics {
  notificationsSent: Int!
  notificationsDelivered: Int!
  notificationsRead: Int!
  notificationsRejected: Int!
  callbacksRequested: Int!
  callbacksApproved: Int!
  callbacksRejected: Int!
  messagesSent: Int!
  messagesReceived: Int!
  documentsShared: Int!
  campaignsLaunched: Int!
  botActions: Int!
  botEscalations: Int!
  spamReports: Int!
  policyDenials: Int!
  webhookDeliveries: Int!
  webhookFailures: Int!
  activeConversations: Int!
  deliveryRate: Float!
  readRate: Float!
}

type DailyAnalyticsEntry {
  date: String!
  notificationsSent: Int!
  notificationsDelivered: Int!
  notificationsRead: Int!
  callbacksRequested: Int!
  callbacksApproved: Int!
  messagesSent: Int!
  documentsShared: Int!
  botActions: Int!
  spamReports: Int!
  policyDenials: Int!
}

type NotificationAnalytics {
  totalSent: Int!
  totalDelivered: Int!
  totalRead: Int!
  totalRejected: Int!
  deliveryRate: Float!
  readRate: Float!
}

type CallbackAnalytics {
  totalRequested: Int!
  totalApproved: Int!
  totalRejected: Int!
  totalExpired: Int!
  approvalRate: Float!
  avgResponseTimeHours: Float!
}

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
```

---

## Requirements

### 1. Queries

#### GET_ANALYTICS_OVERVIEW

Fetches `dashboardAnalytics` for the summary cards and policy breakdown on the analytics page:

```graphql
query GetAnalyticsOverview($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
  dashboardAnalytics(serviceProviderId: $serviceProviderId, from: $from, to: $to) {
    notificationsSent
    notificationsDelivered
    notificationsRead
    notificationsRejected
    callbacksRequested
    callbacksApproved
    callbacksRejected
    messagesSent
    messagesReceived
    documentsShared
    campaignsLaunched
    botActions
    botEscalations
    spamReports
    policyDenials
    webhookDeliveries
    webhookFailures
    activeConversations
    deliveryRate
    readRate
  }
}
```

#### GET_DAILY_ANALYTICS

```graphql
query GetDailyAnalytics($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
  dailyAnalytics(serviceProviderId: $serviceProviderId, from: $from, to: $to) {
    date
    notificationsSent
    notificationsDelivered
    notificationsRead
    callbacksRequested
    callbacksApproved
    messagesSent
    documentsShared
    botActions
    spamReports
    policyDenials
  }
}
```

#### GET_NOTIFICATION_ANALYTICS

```graphql
query GetNotificationAnalytics($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
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

#### GET_CALLBACK_ANALYTICS

```graphql
query GetCallbackAnalytics($serviceProviderId: ID!, $from: DateTime!, $to: DateTime!) {
  callbackAnalytics(serviceProviderId: $serviceProviderId, from: $from, to: $to) {
    totalRequested
    totalApproved
    totalRejected
    totalExpired
    approvalRate
    avgResponseTimeHours
  }
}
```

#### GET_BOT_PERFORMANCE_ANALYTICS

```graphql
query GetBotPerformanceAnalytics($serviceProviderId: ID!, $botId: ID!, $from: DateTime, $to: DateTime) {
  botPerformanceAnalytics(serviceProviderId: $serviceProviderId, botId: $botId, from: $from, to: $to) {
    totalConversations
    totalMessages
    totalActions
    totalEscalations
    escalationRate
    avgResponseTimeMs
    resolutionRate
    satisfactionScore
  }
}
```

### 2. TypeScript Types

```typescript
export interface AnalyticsDateVars {
  serviceProviderId: string;
  from: string;
  to: string;
}

export interface AnalyticsOverviewData {
  notificationsSent: number;
  notificationsDelivered: number;
  notificationsRead: number;
  notificationsRejected: number;
  callbacksRequested: number;
  callbacksApproved: number;
  callbacksRejected: number;
  messagesSent: number;
  messagesReceived: number;
  documentsShared: number;
  campaignsLaunched: number;
  botActions: number;
  botEscalations: number;
  spamReports: number;
  policyDenials: number;
  webhookDeliveries: number;
  webhookFailures: number;
  activeConversations: number;
  deliveryRate: number;
  readRate: number;
}

export interface DailyAnalyticsEntry {
  date: string;
  notificationsSent: number;
  notificationsDelivered: number;
  notificationsRead: number;
  callbacksRequested: number;
  callbacksApproved: number;
  messagesSent: number;
  documentsShared: number;
  botActions: number;
  spamReports: number;
  policyDenials: number;
}

export interface NotificationAnalyticsData {
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  totalRejected: number;
  deliveryRate: number;
  readRate: number;
}

export interface CallbackAnalyticsData {
  totalRequested: number;
  totalApproved: number;
  totalRejected: number;
  totalExpired: number;
  approvalRate: number;
  avgResponseTimeHours: number;
}

export interface BotPerformanceData {
  totalConversations: number;
  totalMessages: number;
  totalActions: number;
  totalEscalations: number;
  escalationRate: number;
  avgResponseTimeMs: number;
  resolutionRate: number;
  satisfactionScore: number;
}
```

### 3. Hooks

```typescript
export function useAnalyticsOverview(vars: AnalyticsDateVars) {
  return useQuery<{ dashboardAnalytics: AnalyticsOverviewData }>(GET_ANALYTICS_OVERVIEW, {
    variables: vars,
    skip: !vars.serviceProviderId,
    fetchPolicy: 'cache-and-network',
  });
}

export function useDailyAnalytics(vars: AnalyticsDateVars) { ... }
export function useNotificationAnalytics(vars: AnalyticsDateVars) { ... }
export function useCallbackAnalytics(vars: AnalyticsDateVars) { ... }
```

---

## Implementation Plan

```typescript
// apps/provider/src/lib/graphql/analytics.ts
import { gql, useQuery } from '@apollo/client';

// Types, queries, and hooks as specified above
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/analytics.ts` | **Create** | All analytics queries, types, and hooks |

---

## Acceptance Criteria

- [ ] `GET_ANALYTICS_OVERVIEW` query covers all DashboardAnalytics fields
- [ ] `GET_DAILY_ANALYTICS` query covers all DailyAnalyticsEntry fields
- [ ] `GET_NOTIFICATION_ANALYTICS` query covers all NotificationAnalytics fields
- [ ] `GET_CALLBACK_ANALYTICS` query covers all CallbackAnalytics fields
- [ ] `GET_BOT_PERFORMANCE_ANALYTICS` query covers all BotPerformanceAnalytics fields
- [ ] TypeScript types for all analytics data shapes
- [ ] Reusable hooks with skip/fetchPolicy
- [ ] `AnalyticsDateVars` shared type for all queries

---

## Dependencies

- **Blocked by**: None (schema defined)
- **Blocks**: Tasks 11.1-11.8 (all analytics panels depend on these queries)
- **Related**: `lib/graphql/dashboard.ts` (existing dashboard query — may share types)
