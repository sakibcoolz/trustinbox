# Task 3.7 — Auto-Refresh Toggle

> **Section**: 3. Dashboard  
> **Priority**: P2 — Nice to Have  
> **Estimated Scope**: Small  
> **Route**: `/` (Dashboard)  
> **File**: `apps/provider/src/components/dashboard/AutoRefresh.tsx`

---

## Objective

Add an auto-refresh toggle that polls dashboard data every 30 seconds, or uses GraphQL subscriptions for real-time counter updates.

---

## Current State

No auto-refresh. Dashboard data is fetched once and becomes stale.

---

## Requirements

### 1. Polling Mode (Default)
- [x] Toggle switch: "Live" on/off
- [x] When ON: re-trigger `dashboardAnalytics` query every 30 seconds
- [x] Visual indicator: pulsing green dot when active
- [x] Last updated timestamp: "Updated 15s ago"

### 2. Subscription Mode (Advanced)
- [x] When WebSocket available (task 2.6), use subscription instead of polling
- [x] `providerNotificationDelivered(spId)` subscription (task 3.9)
- [x] On event: increment KPI counters optimistically, refetch analytics every 60s

### 3. Component API
```typescript
interface AutoRefreshProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  lastUpdated: Date | null;
  interval?: number; // ms, default 30000
}
```

### 4. Appearance
- [x] Small toggle in dashboard header, next to date range selector
- [x] Green pulsing dot + "Live" text when active
- [x] Gray dot + "Paused" when inactive
- [x] "Updated Xs ago" timestamp below

---

## Implementation Plan

```tsx
export function AutoRefresh({ enabled, onToggle, lastUpdated }: AutoRefreshProps) {
  return (
    <div className="flex items-center gap-2">
      <button onClick={() => onToggle(!enabled)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-bg-hover hover:bg-bg-active transition-colors">
        <span className={`w-2 h-2 rounded-full ${enabled ? 'bg-status-success animate-pulse' : 'bg-text-muted'}`} />
        <span className={enabled ? 'text-status-success' : 'text-text-muted'}>{enabled ? 'Live' : 'Paused'}</span>
      </button>
      {lastUpdated && (
        <span className="text-[10px] text-text-muted">{formatRelativeTime(lastUpdated.toISOString())}</span>
      )}
    </div>
  );
}
```

### useAutoRefresh Hook
```typescript
export function useAutoRefresh(refetch: () => void, interval = 30000) {
  const [enabled, setEnabled] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      refetch();
      setLastUpdated(new Date());
    }, interval);
    return () => clearInterval(timer);
  }, [enabled, refetch, interval]);

  return { enabled, setEnabled, lastUpdated };
}
```

### Integration in Dashboard
```tsx
// In page.tsx
const { data, loading, refetch } = useQuery(DASHBOARD_ANALYTICS_QUERY, { ... });
const { enabled, setEnabled, lastUpdated } = useAutoRefresh(refetch);

// In header
<div className="flex items-center gap-4">
  <DateRangeSelector value={range} onChange={updateRange} />
  <AutoRefresh enabled={enabled} onToggle={setEnabled} lastUpdated={lastUpdated} />
</div>
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/dashboard/AutoRefresh.tsx` | Create |
| `apps/provider/src/hooks/useAutoRefresh.ts` | Create |
| `apps/provider/src/app/page.tsx` | Modify — add auto-refresh in header |

---

## Acceptance Criteria

- [x] Toggle switch enables/disables auto-refresh
- [x] When enabled, data refreshes every 30 seconds
- [x] Green pulsing dot visible when live
- [x] "Updated Xs ago" timestamp shows
- [x] No polling when tab is hidden (optimization)
- [x] Clean interval on unmount

---

## Dependencies

- **Blocked by**: Task 3.8 (GraphQL query to refetch)
- **Blocks**: None
- **Related**: Task 3.9 (subscription as alternative to polling)
