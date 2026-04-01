# Task 3.2 — Delivery Chart

> **Section**: 3. Dashboard  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium  
> **Route**: `/` (Dashboard)  
> **File**: `apps/provider/src/components/dashboard/DeliveryChart.tsx`

---

## Objective

Replace the chart placeholder with a Recharts area/line chart showing notifications sent vs delivered vs failed over the selected date range.

---

## Current State

```html
<div className="h-48 flex items-center justify-center text-text-muted text-sm">
  Chart placeholder — connect to analytics API
</div>
```

Recharts `^3.8.1` is already in `package.json`.

---

## Requirements

### 1. Chart Type
- [x] Area chart with gradient fill
- [x] Three series: **Sent** (blue), **Delivered** (green), **Failed** (red)
- [x] X-axis: dates (daily for 30d, hourly for today)
- [x] Y-axis: count with auto-scaling
- [x] Tooltip on hover: date + all series values
- [x] Legend at bottom: toggleable series

### 2. Data Source
```graphql
# Part of dashboardAnalytics query (task 3.8)
fragment DeliveryChartData on DashboardAnalytics {
  dailyDelivery {
    date
    sent
    delivered
    failed
  }
}
```

### 3. Chart Styling (VS Code dark theme)
- [x] Background: transparent (card provides bg)
- [x] Grid lines: `#1e2228` (border-primary)
- [x] Axis labels: `#8b929a` (text-secondary), 10px
- [x] Area fills: 20% opacity gradient
- [x] Line stroke: 2px
- [x] Tooltip: `bg-bg-elevated border-border-secondary` rounded, shadow

### 4. Responsive
- [x] Chart resizes with container (use `ResponsiveContainer`)
- [x] Height: 256px desktop, 200px mobile
- [x] Hide legend on mobile (show only in tooltip)

---

## Implementation Plan

```tsx
'use client';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

interface DailyDelivery {
  date: string;
  sent: number;
  delivered: number;
  failed: number;
}

export function DeliveryChart({ data, loading }: { data: DailyDelivery[]; loading: boolean }) {
  if (loading) return <SkeletonChart />;

  return (
    <Card>
      <CardHeader title="Notification Delivery" description="Sent vs Delivered vs Failed" />
      <CardContent className="pr-0">
        <ResponsiveContainer width="100%" height={256}>
          <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <defs>
              <linearGradient id="sentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="deliveredGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="failedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2228" vertical={false} />
            <XAxis dataKey="date" stroke="#8b929a" fontSize={10} tickFormatter={(d) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })} />
            <YAxis stroke="#8b929a" fontSize={10} tickFormatter={(v) => v.toLocaleString()} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px', color: '#8b929a' }} />
            <Area type="monotone" dataKey="sent" stroke="#3b82f6" fill="url(#sentGrad)" strokeWidth={2} name="Sent" />
            <Area type="monotone" dataKey="delivered" stroke="#22c55e" fill="url(#deliveredGrad)" strokeWidth={2} name="Delivered" />
            <Area type="monotone" dataKey="failed" stroke="#ef4444" fill="url(#failedGrad)" strokeWidth={2} name="Failed" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload) return null;
  return (
    <div className="bg-bg-elevated border border-border-secondary rounded-lg shadow-xl p-3">
      <p className="text-xs text-text-muted mb-2">{new Date(label).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="text-text-primary font-medium">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/dashboard/DeliveryChart.tsx` | Create |
| `apps/provider/src/app/page.tsx` | Modify — replace placeholder with DeliveryChart |

---

## Acceptance Criteria

- [x] Area chart renders with 3 series (sent, delivered, failed)
- [x] Gradient fills under each line with correct colors
- [x] Hover tooltip shows date + all values
- [x] X-axis shows date labels (MMM DD format)
- [x] Y-axis auto-scales with formatted numbers
- [x] Legend toggles series visibility
- [x] Responsive container fills card width
- [x] Loading state shows SkeletonChart
- [x] Dark theme colors match VS Code palette

---

## Dependencies

- **Blocked by**: Task 1.8 (SkeletonChart), Task 1.12 (Card), Task 3.8 (GraphQL query)
- **Blocks**: None
- **Related**: Task 3.6 (date range selector), Task 3.3 (policy chart)
