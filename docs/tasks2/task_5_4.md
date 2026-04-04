# Task 5.4 — Analytics Trend Charts

> **Phase**: 5 — Provider Portal: Completion
> **Task**: 5.4 — Replace "Coming Soon" Chart Placeholders with Real Charts
> **Files**: `apps/provider/src/app/analytics/page.tsx` (656 lines), `apps/provider/src/components/dashboard/DeliveryChart.tsx` (80 lines), new chart components
> **Dependencies**: `analytics-service` daily breakdown data (fully implemented)
> **Data Sources**: `@/lib/graphql/analytics` (`useDailyAnalytics`, `useNotificationAnalytics`, `useCallbackAnalytics`)
> **Chart Library**: `recharts` (already installed — used by `DeliveryChart.tsx`)

---

## Objective

Replace the two "coming soon" chart placeholders in the analytics page with real trend charts: a delivery rate trend line chart for notification analytics and an approval rate trend line chart for callback analytics. Optionally add a notification volume bar chart and improve the existing dashboard `DeliveryChart` component to be reusable.

---

## Current State

### Analytics Page — Two "Coming Soon" Placeholders (656 lines)
```typescript
// apps/provider/src/app/analytics/page.tsx

// Notification Analytics Panel (line 126):
<div className="h-40 border border-border-secondary rounded-lg flex items-center justify-center text-xs text-text-muted">
  Delivery rate trend chart — coming soon
</div>

// Callback Analytics Panel (line 169):
<div className="h-40 border border-border-secondary rounded-lg flex items-center justify-center text-xs text-text-muted">
  Approval rate trend chart — coming soon
</div>
```

### DeliveryChart — Already Uses Recharts (80 lines)
```typescript
// apps/provider/src/components/dashboard/DeliveryChart.tsx
// ✅ Uses recharts: AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
// ✅ Custom tooltip with dark theme styling
// ✅ Gradient fills for Sent/Delivered/Failed lines
// ✅ Skeleton loading state
// ✅ Used on dashboard page — NOT on analytics page
```

### Daily Analytics Data — Already Available
```typescript
// apps/provider/src/lib/graphql/analytics.ts
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

export function useDailyAnalytics(vars: AnalyticsDateVars) {
  return useData<DailyAnalyticsEntry[]>(analyticsUrl('daily', vars));
}
```

### Recharts — Already Installed
```json
// apps/provider/package.json (already has):
// "recharts": "^2.x" — used by DeliveryChart.tsx
```

### Panels Currently Render KPIs + Placeholder
```typescript
// NotificationAnalyticsPanel: 6 KPIs (Sent, Delivered, Read, Rejected, Delivery Rate, Read Rate) + placeholder
// CallbackAnalyticsPanel: 6 KPIs (Requested, Approved, Rejected, Expired, Approval Rate, Avg Response) + placeholder
// CampaignAnalyticsPanel: 4 KPIs + best performing campaign (no chart needed)
// BotAnalyticsPanel: 4 KPIs + top bots ranking (no chart needed)
// PolicyAnalyticsPanel: ✅ Already has SVG donut chart (working)
```

---

## Requirements

### 5.4.1 — Create Notification Delivery Trend Chart
- [ ] Replace "Delivery rate trend chart — coming soon" in `NotificationAnalyticsPanel`:
  - [ ] Add `useDailyAnalytics(dateVars)` call to the panel
  - [ ] Render an `AreaChart` (recharts) showing daily Sent vs Delivered vs Failed
  - [ ] X-axis: dates (formatted as "Mon", "Tue" or "Jan 15")
  - [ ] Y-axis: notification counts
  - [ ] Three area series with gradient fills:
    - Sent: blue (#3b82f6)
    - Delivered: green (#22c55e)
    - Failed: red (#ef4444)
  - [ ] Custom tooltip matching DeliveryChart's dark-theme style
  - [ ] Responsive container: 100% width, 200px height
  - [ ] Skeleton/loading state while data loads
  - [ ] Empty state: "No data for selected date range" if no entries

### 5.4.2 — Create Callback Approval Trend Chart
- [ ] Replace "Approval rate trend chart — coming soon" in `CallbackAnalyticsPanel`:
  - [ ] Use same `useDailyAnalytics(dateVars)` data (already fetched or shared)
  - [ ] Render an `AreaChart` showing daily Requested vs Approved
  - [ ] Two area series with gradient fills:
    - Requested: blue (#3b82f6)
    - Approved: green (#22c55e)
  - [ ] Same tooltip, axis, and styling as notification chart
  - [ ] Responsive container: 100% width, 200px height

### 5.4.3 — Extract Reusable TrendChart Component
- [ ] Create `apps/provider/src/components/analytics/TrendChart.tsx`:
  - [ ] Props: `data`, `series` (array of `{ dataKey, name, color }`), `height`, `loading`
  - [ ] Reusable across notification, callback, and future charts
  - [ ] Applies consistent styling (dark theme, grid, tooltips, gradients)
  - [ ] Handles empty data gracefully
- [ ] Refactor notification and callback charts to use `TrendChart`

### 5.4.4 — Add Notification Volume Bar Chart (Optional)
- [ ] Add a bar chart below or beside the area chart in notification panel:
  - [ ] Grouped bars: volume by category per day (if data available)
  - [ ] Or simple bar chart: daily notification count
  - [ ] Use `BarChart` from recharts with same styling conventions
  - [ ] Only add if daily analytics data supports category breakdown

### 5.4.5 — Improve Date Range Integration
- [ ] Ensure charts respond to `DateRangeSelector` changes:
  - [ ] 7-day range: daily granularity
  - [ ] 30-day range: daily granularity
  - [ ] 90-day range: consider weekly aggregation for readability
- [ ] Add chart loading state during date range transitions
- [ ] Verify `useDailyAnalytics` correctly re-fetches when dates change

### 5.4.6 — Polish Chart Interactions
- [ ] Hover tooltip: show date + all values on hover
- [ ] Legend: clickable to toggle series visibility
- [ ] Chart animation: smooth transition on data change
- [ ] Mobile responsive: charts scale down without breaking
- [ ] Print/export: charts should render in CSV export data (already has ExportButton)

---

## Implementation Details

### Reusable TrendChart Component

```tsx
// apps/provider/src/components/analytics/TrendChart.tsx
'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TrendSeries {
  dataKey: string;
  name: string;
  color: string;
}

interface TrendChartProps {
  data: Array<Record<string, unknown>>;
  series: TrendSeries[];
  height?: number;
  loading?: boolean;
  emptyMessage?: string;
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="bg-bg-elevated border border-border-secondary rounded-lg shadow-xl p-3">
      <p className="text-xs text-text-muted mb-2">
        {new Date(label ?? '').toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
      </p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-xs">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: entry.color }} />
          <span className="text-text-secondary">{entry.name}:</span>
          <span className="text-text-primary font-medium">{entry.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export function TrendChart({ data, series, height = 200, loading, emptyMessage = 'No data for selected range' }: TrendChartProps) {
  if (loading) {
    return <div className={`h-[${height}px] bg-border-primary/30 rounded animate-pulse`} />;
  }

  if (!data.length) {
    return (
      <div className={`h-[${height}px] border border-border-secondary rounded-lg flex items-center justify-center text-xs text-text-muted`}>
        {emptyMessage}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
        <defs>
          {series.map((s) => (
            <linearGradient key={s.dataKey} id={`grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={s.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={s.color} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2228" vertical={false} />
        <XAxis
          dataKey="date"
          stroke="#8b929a"
          fontSize={10}
          tickFormatter={(d: string) => new Date(d).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
        />
        <YAxis stroke="#8b929a" fontSize={10} tickFormatter={(v: number) => v.toLocaleString()} />
        <Tooltip content={<ChartTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px', color: '#8b929a' }} />
        {series.map((s) => (
          <Area
            key={s.dataKey}
            type="monotone"
            dataKey={s.dataKey}
            stroke={s.color}
            fill={`url(#grad-${s.dataKey})`}
            strokeWidth={2}
            name={s.name}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  );
}
```

### Usage in NotificationAnalyticsPanel

```tsx
// Replace the "coming soon" div in NotificationAnalyticsPanel:
const { data: dailyData, loading: dailyLoading } = useDailyAnalytics(dateVars);
const dailyEntries = dailyData?.dailyAnalytics ?? [];

// In render:
<TrendChart
  data={dailyEntries}
  series={[
    { dataKey: 'notificationsSent', name: 'Sent', color: '#3b82f6' },
    { dataKey: 'notificationsDelivered', name: 'Delivered', color: '#22c55e' },
    { dataKey: 'notificationsRead', name: 'Read', color: '#a855f7' },
  ]}
  loading={dailyLoading}
/>
```

### Usage in CallbackAnalyticsPanel

```tsx
// Replace the "coming soon" div in CallbackAnalyticsPanel:
<TrendChart
  data={dailyEntries}
  series={[
    { dataKey: 'callbacksRequested', name: 'Requested', color: '#3b82f6' },
    { dataKey: 'callbacksApproved', name: 'Approved', color: '#22c55e' },
  ]}
  loading={dailyLoading}
/>
```

---

## Verification

- [ ] Notification panel: "coming soon" placeholder replaced with area chart
- [ ] Notification chart: shows Sent/Delivered/Read lines with correct colors
- [ ] Callback panel: "coming soon" placeholder replaced with area chart
- [ ] Callback chart: shows Requested/Approved lines with correct colors
- [ ] Hover tooltip: shows date + values in dark-themed popup
- [ ] Legend: displays series names with color dots
- [ ] Date range selector: changing range updates chart data
- [ ] 7-day view: shows daily data points
- [ ] 30-day view: shows daily data points
- [ ] Empty state: "No data for selected range" when no analytics entries
- [ ] Loading state: skeleton pulse while data fetches
- [ ] Mobile: charts scale down to full width on smaller screens
- [ ] `TrendChart` component is reusable (used by at least 2 panels)
- [ ] No new dependencies added (`recharts` already installed)
- [ ] Existing policy SVG donut chart still works
- [ ] CSV export still works with chart data
