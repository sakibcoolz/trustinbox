# Task 7.6 — 48-Hour Expiry Indicator

> **Section**: 7. Callback Requests  
> **Priority**: P1 — UX enhancement  
> **Estimated Scope**: Small  
> **Route**: `/callbacks`  
> **Component**: ExpiryIndicator in table rows
> **Status**: ✅ Complete

---

## Objective

Add a countdown/progress bar showing time remaining for pending callback requests, which expire after 48 hours per business rules.

---

## Current State

No expiry indicator exists. Pending callbacks show no visual indication of urgency or time remaining.

---

## Requirements

### Expiry Display

| Time Remaining | Indicator | Color |
|----------------|-----------|-------|
| > 24 hours | Progress bar (green) + "Xh remaining" | `bg-status-success` |
| 12–24 hours | Progress bar (yellow) + "Xh remaining" | `bg-status-warning` |
| < 12 hours | Progress bar (red) + "Xh remaining" | `bg-status-error` |
| < 1 hour | Pulsing red + "Expiring soon!" | `bg-status-error animate-pulse` |
| Expired | "Expired" badge | `bg-border-secondary text-text-muted` |

### Calculation
- `expiresAt` = `requestedAt` + 48 hours
- `remaining` = `expiresAt` - `now`
- Progress = `remaining / 48h * 100%`
- Auto-update every minute for active countdowns

### Placement
- Show below the "Requested At" column or as a separate column
- Only visible for PENDING status callbacks
- Tooltip shows exact expiry datetime

---

## Implementation Plan

```tsx
import { useEffect, useState } from 'react';

function ExpiryIndicator({ requestedAt }: { requestedAt: string }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(interval);
  }, []);

  const expiresAt = new Date(requestedAt).getTime() + 48 * 60 * 60 * 1000;
  const remaining = expiresAt - now;
  const progress = Math.max(0, Math.min(100, (remaining / (48 * 60 * 60 * 1000)) * 100));

  if (remaining <= 0) return <span className="text-xs text-text-muted">Expired</span>;

  const hours = Math.floor(remaining / (60 * 60 * 1000));
  const color = hours > 24 ? 'bg-status-success' : hours > 12 ? 'bg-status-warning' : 'bg-status-error';
  const pulse = hours < 1 ? 'animate-pulse' : '';

  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-border-secondary rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} ${pulse}`} style={{ width: `${progress}%` }} />
      </div>
      <span className="text-xs text-text-muted">{hours}h left</span>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/callbacks/ExpiryIndicator.tsx` | Create — countdown progress component |
| `apps/provider/src/app/callbacks/page.tsx` | Modify — add ExpiryIndicator to PENDING rows |

---

## Acceptance Criteria

- [ ] Progress bar shows percentage of 48h remaining
- [ ] Color transitions: green → yellow → red
- [ ] Pulsing animation when < 1 hour
- [ ] Updates every minute
- [ ] Tooltip shows exact expiry time
- [ ] Only visible for PENDING callbacks
- [ ] Shows "Expired" when time runs out

---

## Dependencies

- **Blocked by**: Task 7.1 (CallbackRequestTable)
- **Blocks**: None
- **Related**: Task 7.2 (status badges — EXPIRED status shown when timer hits 0)
