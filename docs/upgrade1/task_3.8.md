# Task 3.8 — GraphQL Dashboard Analytics Query

> **Section**: 3. Dashboard — Connected Backend  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/graphql/dashboard.ts`

---

## Objective

Define the `dashboardAnalytics` GraphQL query that fetches all data needed by the dashboard: KPIs, delivery chart data, policy breakdown, and recent activity.

---

## Current State

No GraphQL query for dashboard data. Dashboard shows hardcoded static data.

---

## Requirements

### 1. Query Definition

```typescript
import { gql } from '@apollo/client';

export const DASHBOARD_ANALYTICS_QUERY = gql`
  query DashboardAnalytics($spId: ID!, $dateRange: DateRangeInput!) {
    dashboardAnalytics(spId: $spId, dateRange: $dateRange) {
      # KPI Summary
      notificationsSent
      previousNotificationsSent
      deliveryRate
      previousDeliveryRate
      activeCallbacks
      previousActiveCallbacks
      openConversations
      previousOpenConversations
      activeCampaigns
      previousActiveCampaigns
      botInteractions
      previousBotInteractions

      # Delivery Chart
      dailyDelivery {
        date
        sent
        delivered
        failed
      }

      # Policy Breakdown
      policyBreakdown {
        allowed
        blockedByDND
        blockedByPreference
        rateLimited
        total
      }

      # Recent Activity
      recentActivity {
        id
        type
        title
        description
        targetId
        targetType
        timestamp
      }
    }
  }
`;
```

### 2. Input Type

```typescript
export interface DateRangeInput {
  from: string; // ISO date
  to: string;   // ISO date
}
```

### 3. Response Types

```typescript
export interface DashboardAnalytics {
  notificationsSent: number;
  previousNotificationsSent: number;
  deliveryRate: number;
  previousDeliveryRate: number;
  activeCallbacks: number;
  previousActiveCallbacks: number;
  openConversations: number;
  previousOpenConversations: number;
  activeCampaigns: number;
  previousActiveCampaigns: number;
  botInteractions: number;
  previousBotInteractions: number;

  dailyDelivery: DailyDeliveryEntry[];
  policyBreakdown: PolicyBreakdown;
  recentActivity: ActivityEvent[];
}

export interface DailyDeliveryEntry {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
}

export interface PolicyBreakdown {
  allowed: number;
  blockedByDND: number;
  blockedByPreference: number;
  rateLimited: number;
  total: number;
}

export interface ActivityEvent {
  id: string;
  type: string;
  title: string;
  description?: string;
  targetId: string;
  targetType: string;
  timestamp: string;
}
```

### 4. Custom Hook

```typescript
export function useDashboardAnalytics(spId: string, dateRange: DateRange) {
  return useQuery(DASHBOARD_ANALYTICS_QUERY, {
    variables: {
      spId,
      dateRange: {
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
      },
    },
    skip: !spId,
    fetchPolicy: 'cache-and-network',
    pollInterval: 0, // controlled by auto-refresh
  });
}
```

### 5. Schema Alignment Check
- [ ] Verify `DashboardAnalytics` type exists in gateway schema
- [ ] Compare fields against `gateway/graphql-bff/graph/schema.graphqls`
- [ ] Document any discrepancies that need gateway implementation

---

## Implementation Plan

### Dashboard Page Integration

```tsx
// apps/provider/src/app/page.tsx
'use client';
import { useAuth } from '@/contexts/AuthContext';
import { useDashboardAnalytics } from '@/lib/graphql/dashboard';
import { useDateRange } from '@/hooks/useDateRange';
import { DashboardKPICards } from '@/components/dashboard/KPICards';
import { DeliveryChart } from '@/components/dashboard/DeliveryChart';
import { PolicyChart } from '@/components/dashboard/PolicyChart';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { DateRangeSelector } from '@/components/dashboard/DateRangeSelector';

export default function DashboardPage() {
  const { activeServiceProvider } = useAuth();
  const { range, updateRange } = useDateRange();
  const { data, loading } = useDashboardAnalytics(activeServiceProvider?.id ?? '', range);
  const analytics = data?.dashboardAnalytics;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-text-secondary mt-1">Overview of your communication metrics</p>
        </div>
        <DateRangeSelector value={range} onChange={updateRange} />
      </div>

      {/* Quick Actions */}
      <QuickActions />

      {/* KPIs */}
      <DashboardKPICards data={analytics} loading={loading} />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DeliveryChart data={analytics?.dailyDelivery ?? []} loading={loading} />
        <PolicyChart data={analytics?.policyBreakdown} loading={loading} />
      </div>

      {/* Activity */}
      <ActivityTimeline activities={analytics?.recentActivity ?? []} loading={loading} />
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/dashboard.ts` | Create — query, types, hook |
| `apps/provider/src/app/page.tsx` | Modify — integrate all dashboard components |

---

## Acceptance Criteria

- [ ] `DASHBOARD_ANALYTICS_QUERY` fetches all dashboard data in single request
- [ ] Types are comprehensive and match component props
- [ ] `useDashboardAnalytics` hook handles loading, error, skip states
- [ ] Date range changes trigger refetch
- [ ] Dashboard page integrates all components with real data
- [ ] Graceful handling if analytics data is null/empty
- [ ] Type exports usable by all dashboard components

---

## Dependencies

- **Blocked by**: Task 2.4 (AuthContext for spId), Task 2.6 (Apollo Client), Task 3.6 (date range)
- **Blocks**: Tasks 3.1, 3.2, 3.3, 3.4 (all need data)
- **Related**: Task 3.9 (subscription for live updates)
