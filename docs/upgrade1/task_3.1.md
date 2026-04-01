# Task 3.1 — KPI Summary Cards (DashboardSummary Component)

> **Section**: 3. Dashboard  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium  
> **Route**: `/` (Dashboard)  
> **File**: `apps/provider/src/app/page.tsx`, `apps/provider/src/components/dashboard/KPICards.tsx`

---

## Objective

Replace the hardcoded KPI cards with a dynamic `DashboardSummary` component that fetches real analytics data from GraphQL and displays 6 KPI cards with trend indicators.

---

## Current State

```tsx
// Static, hardcoded data
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
  <KPICard label="Active Customers" value="2,347" change="+12%" positive />
  <KPICard label="Notifications Sent" value="18,542" change="+8%" positive />
  <KPICard label="Policy Denials" value="142" change="-3%" positive />
  <KPICard label="Callback Completion" value="89%" change="+2%" positive />
</div>

function KPICard({ label, value, change, positive }) {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-5">
      <p className="text-xs text-text-muted uppercase tracking-wider">{label}</p>
      <div className="flex items-end justify-between mt-2">
        <span className="text-2xl font-semibold">{value}</span>
        <span className={`text-xs font-medium ${positive ? 'text-status-success' : 'text-status-error'}`}>{change}</span>
      </div>
    </div>
  );
}
```

**Issues**: Static data, only 4 cards (plan calls for 6), no loading state, no sparkline/icon, no click-through.

---

## Requirements

### 1. KPI Cards (6 total)

| KPI | Icon | Value Source | Trend |
|-----|------|-------------|-------|
| **Notifications Sent** | `Bell` | `dashboardAnalytics.notificationsSent` | vs previous period % |
| **Delivery Rate** | `CheckCircle` | `dashboardAnalytics.deliveryRate` | % with trend arrow |
| **Active Callbacks** | `PhoneCall` | `dashboardAnalytics.activeCallbacks` | count change |
| **Open Conversations** | `MessageSquare` | `dashboardAnalytics.openConversations` | count change |
| **Active Campaigns** | `Megaphone` | `dashboardAnalytics.activeCampaigns` | count change |
| **Bot Interactions** | `Bot` | `dashboardAnalytics.botInteractions` | count change |

### 2. KPICard Component Upgrade
- [x] Add icon (Lucide icon, colored per type)
- [x] Add sparkline mini-chart (tiny area chart showing last 7 days, optional)
- [x] Trend arrow: `↑` green for positive, `↓` red for negative, `→` neutral
- [x] Click card to navigate to feature page (e.g., clicking "Active Callbacks" → `/callbacks`)
- [x] Loading state: use SkeletonKPI (task 1.8)
- [x] Use `<Card variant="interactive">` (task 1.12)
- [x] Format large numbers: `18,542` with comma separator
- [x] Format percentages: `89.2%`

### 3. Component API
```typescript
interface KPICardProps {
  label: string;
  value: number | string;
  previousValue?: number;
  format?: 'number' | 'percent' | 'currency';
  icon: React.ComponentType<{ size?: number }>;
  iconColor: string; // Tailwind text-color class
  href?: string;
  sparklineData?: number[];
  loading?: boolean;
}
```

### 4. Grid Layout
- [x] 6 cards: 3 columns on desktop (lg:grid-cols-3), 2 on tablet, 1 on mobile
- [x] Or: 6 cards in 2x3 grid (lg:grid-cols-3 gap-4)

---

## Implementation Plan

```tsx
// apps/provider/src/components/dashboard/KPICards.tsx
import { Bell, CheckCircle, PhoneCall, MessageSquare, Megaphone, Bot, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';

function formatNumber(n: number): string {
  return n.toLocaleString();
}

function formatPercent(n: number): string {
  return `${n.toFixed(1)}%`;
}

function getTrend(current: number, previous: number): { label: string; positive: boolean; icon: any } {
  if (previous === 0) return { label: '–', positive: true, icon: Minus };
  const pct = ((current - previous) / previous * 100).toFixed(1);
  const positive = current >= previous;
  return { label: `${positive ? '+' : ''}${pct}%`, positive, icon: positive ? TrendingUp : TrendingDown };
}

const KPI_CONFIG = [
  { key: 'notificationsSent', label: 'Notifications Sent', icon: Bell, iconColor: 'text-accent-blue', href: '/notifications', format: 'number' as const },
  { key: 'deliveryRate', label: 'Delivery Rate', icon: CheckCircle, iconColor: 'text-status-success', href: '/analytics', format: 'percent' as const },
  { key: 'activeCallbacks', label: 'Active Callbacks', icon: PhoneCall, iconColor: 'text-accent-orange', href: '/callbacks', format: 'number' as const },
  { key: 'openConversations', label: 'Open Conversations', icon: MessageSquare, iconColor: 'text-accent-cyan', href: '/conversations', format: 'number' as const },
  { key: 'activeCampaigns', label: 'Active Campaigns', icon: Megaphone, iconColor: 'text-accent-purple', href: '/campaigns', format: 'number' as const },
  { key: 'botInteractions', label: 'Bot Interactions', icon: Bot, iconColor: 'text-accent-teal', href: '/bots', format: 'number' as const },
];

interface DashboardKPIs {
  notificationsSent: number;
  deliveryRate: number;
  activeCallbacks: number;
  openConversations: number;
  activeCampaigns: number;
  botInteractions: number;
  previousNotificationsSent: number;
  previousDeliveryRate: number;
  previousActiveCallbacks: number;
  previousOpenConversations: number;
  previousActiveCampaigns: number;
  previousBotInteractions: number;
}

export function DashboardKPICards({ data, loading }: { data?: DashboardKPIs; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonKPI key={i} />)}
      </div>
    );
  }
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {KPI_CONFIG.map(kpi => {
        const value = data?.[kpi.key as keyof DashboardKPIs] ?? 0;
        const prevValue = data?.[`previous${kpi.key.charAt(0).toUpperCase() + kpi.key.slice(1)}` as keyof DashboardKPIs] ?? 0;
        const formatted = kpi.format === 'percent' ? formatPercent(value as number) : formatNumber(value as number);
        const trend = getTrend(value as number, prevValue as number);
        const Icon = kpi.icon;

        return (
          <Link key={kpi.key} href={kpi.href}>
            <Card variant="interactive" padding="lg">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-text-muted uppercase tracking-wider">{kpi.label}</p>
                  <p className="text-2xl font-semibold mt-2">{formatted}</p>
                </div>
                <div className={`p-2 rounded-lg bg-bg-hover ${kpi.iconColor}`}>
                  <Icon size={18} />
                </div>
              </div>
              <div className="flex items-center gap-1 mt-3">
                <trend.icon size={12} className={trend.positive ? 'text-status-success' : 'text-status-error'} />
                <span className={`text-xs font-medium ${trend.positive ? 'text-status-success' : 'text-status-error'}`}>{trend.label}</span>
                <span className="text-xs text-text-muted ml-1">vs previous period</span>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/dashboard/KPICards.tsx` | Create |
| `apps/provider/src/app/page.tsx` | Modify — replace static KPICard with DashboardKPICards |

---

## Acceptance Criteria

- [x] 6 KPI cards render in 3-column grid
- [x] Each card shows: icon, label, formatted value, trend arrow + percentage
- [x] Clicking a card navigates to the appropriate feature page
- [x] Loading state shows 6 skeleton cards
- [x] Numbers formatted with comma separator
- [x] Percentages formatted to 1 decimal place
- [x] Positive trends show green, negative show red
- [x] Responsive: 3 cols desktop, 2 tablet, 1 mobile

---

## Dependencies

- **Blocked by**: Task 1.8 (SkeletonKPI), Task 1.12 (Card), Task 3.8 (GraphQL query)
- **Blocks**: None
- **Related**: Task 3.6 (date range affects KPI data), Task 3.7 (auto-refresh)
