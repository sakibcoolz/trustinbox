# Task 3.3 — Policy Decision Breakdown Chart

> **Section**: 3. Dashboard  
> **Priority**: P1 — Important  
> **Estimated Scope**: Medium  
> **Route**: `/` (Dashboard)  
> **File**: `apps/provider/src/components/dashboard/PolicyChart.tsx`

---

## Objective

Replace the callbacks chart placeholder with a donut/pie chart showing the policy engine's decision breakdown: allowed, blocked by DND, blocked by preference, and rate-limited.

---

## Current State

```html
<!-- Second chart placeholder -->
<div className="h-48 flex items-center justify-center text-text-muted text-sm">
  Chart placeholder — connect to analytics API
</div>
```

---

## Requirements

### 1. Chart Type
- [x] Donut chart (PieChart with inner radius) from Recharts
- [x] Center label: total count + "decisions"
- [x] 4 segments with colors:

| Segment | Color | Hex |
|---------|-------|-----|
| Allowed | Green | #22c55e |
| Blocked by DND | Orange | #f59e0b |
| Blocked by Preference | Red | #ef4444 |
| Rate Limited | Cyan | #06b6d4 |

### 2. Data Source
```graphql
fragment PolicyBreakdownData on DashboardAnalytics {
  policyBreakdown {
    allowed
    blockedByDND
    blockedByPreference
    rateLimited
    total
  }
}
```

### 3. Legend/Labels
- [x] Right-side legend with label, count, and percentage
- [x] Each legend item: colored dot + label + count (%) 
- [x] On mobile: legend below chart

### 4. Hover Interaction
- [x] Hover segment: enlarge slightly with active shape
- [x] Show tooltip with label and count

---

## Implementation Plan

```tsx
'use client';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';

interface PolicyBreakdown {
  allowed: number;
  blockedByDND: number;
  blockedByPreference: number;
  rateLimited: number;
  total: number;
}

const SEGMENTS = [
  { key: 'allowed', label: 'Allowed', color: '#22c55e' },
  { key: 'blockedByDND', label: 'Blocked by DND', color: '#f59e0b' },
  { key: 'blockedByPreference', label: 'Blocked by Preference', color: '#ef4444' },
  { key: 'rateLimited', label: 'Rate Limited', color: '#06b6d4' },
];

export function PolicyChart({ data, loading }: { data?: PolicyBreakdown; loading: boolean }) {
  if (loading) return <SkeletonChart />;
  if (!data) return null;
  
  const chartData = SEGMENTS.map(s => ({
    name: s.label,
    value: data[s.key as keyof PolicyBreakdown] as number,
    color: s.color,
  }));

  return (
    <Card>
      <CardHeader title="Policy Decisions" description="Communication approval breakdown" />
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="w-44 h-44 shrink-0 relative">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={chartData} cx="50%" cy="50%" innerRadius={48} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip content={<PolicyTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <p className="text-lg font-semibold text-text-primary">{data.total.toLocaleString()}</p>
                <p className="text-[10px] text-text-muted">decisions</p>
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex-1 space-y-3">
            {SEGMENTS.map(s => {
              const val = data[s.key as keyof PolicyBreakdown] as number;
              const pct = data.total > 0 ? ((val / data.total) * 100).toFixed(1) : '0';
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-xs text-text-secondary flex-1">{s.label}</span>
                  <span className="text-xs text-text-primary font-medium">{val.toLocaleString()}</span>
                  <span className="text-[10px] text-text-muted w-10 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/dashboard/PolicyChart.tsx` | Create |
| `apps/provider/src/app/page.tsx` | Modify — replace second placeholder |

---

## Acceptance Criteria

- [x] Donut chart with 4 segments renders with correct colors
- [x] Center shows total decision count
- [x] Legend on right shows label + count + percentage for each segment
- [x] Hover shows tooltip
- [x] Loading shows skeleton
- [x] Handles zero data gracefully
- [x] Responsive: legend moves below on small screens

---

## Dependencies

- **Blocked by**: Task 1.8 (skeleton), Task 1.12 (Card), Task 3.8 (GraphQL query)
- **Blocks**: None
- **Related**: Task 3.2 (delivery chart), Task 3.6 (date range)
