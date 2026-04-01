# Task 3.6 — Date Range Selector

> **Section**: 3. Dashboard  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **Route**: `/` (Dashboard)  
> **File**: `apps/provider/src/components/dashboard/DateRangeSelector.tsx`
> **Status**: ✅ Complete

---

## Objective

Add a date range selector to the dashboard header that controls the time window for all KPIs and charts.

---

## Current State

No date range selector. Dashboard would show "last 30 days" by default with no way to change.

---

## Requirements

### 1. Preset Ranges

| Label | Value | Description |
|-------|-------|-------------|
| Today | `today` | Current day: midnight to now |
| Last 7 days | `7d` | Previous 7 days |
| Last 30 days | `30d` | Previous 30 days (default) |
| Last 90 days | `90d` | Previous 90 days |
| Custom | `custom` | Calendar date picker for start/end |

### 2. Appearance
- [x] Dropdown/segmented control in dashboard header (right-aligned)
- [x] Active preset highlighted with `accent-blue`
- [x] Custom range shows small calendar picker (inline or dropdown)
- [x] Display selected range as text: "Oct 1 – Oct 31, 2024"

### 3. State Management
- [x] Store selected range in URL query param: `?range=7d` or `?from=2024-10-01&to=2024-10-31`
- [x] Sync with URL on mount (restore from bookmark/refresh)
- [x] `onRangeChange(range)` callback triggers data refetch

### 4. Component API
```typescript
interface DateRange {
  preset: 'today' | '7d' | '30d' | '90d' | 'custom';
  from: Date;
  to: Date;
}

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}
```

---

## Implementation Plan

```tsx
const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: '90d', value: '90d' },
  { label: 'Custom', value: 'custom' },
];

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex items-center gap-1 bg-bg-hover rounded-lg p-0.5">
      {PRESETS.map(preset => (
        <button key={preset.value}
          onClick={() => onChange(computeDateRange(preset.value))}
          className={`px-3 py-1.5 text-xs rounded-md transition-colors ${
            value.preset === preset.value
              ? 'bg-accent-blue text-white'
              : 'text-text-secondary hover:text-text-primary'
          }`}>
          {preset.label}
        </button>
      ))}
    </div>
  );
}

function computeDateRange(preset: string): DateRange {
  const to = new Date();
  const from = new Date();
  switch (preset) {
    case 'today': from.setHours(0, 0, 0, 0); break;
    case '7d': from.setDate(from.getDate() - 7); break;
    case '30d': from.setDate(from.getDate() - 30); break;
    case '90d': from.setDate(from.getDate() - 90); break;
  }
  return { preset: preset as DateRange['preset'], from, to };
}
```

### useDateRange Hook
```typescript
export function useDateRange() {
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [range, setRange] = useState<DateRange>(() => {
    const preset = searchParams.get('range') || '30d';
    return computeDateRange(preset);
  });

  function updateRange(newRange: DateRange) {
    setRange(newRange);
    const params = new URLSearchParams(searchParams.toString());
    params.set('range', newRange.preset);
    router.replace(`?${params}`, { scroll: false });
  }

  return { range, updateRange };
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/dashboard/DateRangeSelector.tsx` | Create |
| `apps/provider/src/hooks/useDateRange.ts` | Create |
| `apps/provider/src/app/page.tsx` | Modify — add selector in header area, pass range to data query |

---

## Acceptance Criteria

- [x] 5 preset buttons render, default "30d" active
- [x] Clicking preset changes active state and updates URL
- [x] Range persists across page refresh (URL sync)
- [x] Custom shows date picker (basic implementation OK for v1)
- [x] `useDateRange` hook provides range to data-fetching logic
- [x] All dashboard components re-fetch when range changes

---

## Dependencies

- **Blocked by**: None
- **Blocks**: Task 3.8 (GraphQL query uses date range params)
- **Related**: Task 3.1, 3.2, 3.3 (all consume date range)
