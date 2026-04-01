# Task 5.2 — Notification Status Badges

> **Section**: 5. Notifications  
> **Priority**: P0  
> **Estimated Scope**: Small  
> **Route**: `/notifications`  
> **File**: `apps/provider/src/app/notifications/page.tsx`

---

## Objective

Implement consistent, color-coded status badges for notification delivery states: Delivered (green), Pending (yellow), Failed (red), Blocked (gray), and Rate-limited (orange).

---

## Current State

```tsx
// apps/provider/src/app/notifications/page.tsx
const statusColors: Record<string, string> = {
  Delivered: 'bg-status-success/10 text-status-success',
  Failed: 'bg-status-error/10 text-status-error',
  Partial: 'bg-status-warning/10 text-status-warning',
  Pending: 'bg-accent-cyan/10 text-accent-cyan',
};
```

**Issues**: Missing "Blocked" and "Rate-limited" states, uses `Partial` which isn't in the plan, inconsistent with other badge usage (customer detail uses different `StatusBadge` component).

---

## Requirements

### 1. Status Definitions

| Status | Background | Text Color | Icon (optional) |
|--------|-----------|------------|-----------------|
| **Delivered** | `bg-status-success/10` | `text-status-success` | `CheckCircle` |
| **Pending** | `bg-status-warning/10` | `text-status-warning` | `Clock` |
| **Failed** | `bg-status-error/10` | `text-status-error` | `XCircle` |
| **Blocked** | `bg-bg-tertiary` | `text-text-muted` | `Shield` |
| **Rate-limited** | `bg-accent-orange/10` | `text-accent-orange` | `AlertTriangle` |
| **Partial** | `bg-accent-cyan/10` | `text-accent-cyan` | `AlertCircle` |

### 2. Use Shared Badge Component (task 1.18)

```tsx
<Badge variant={getNotificationStatusVariant(status)}>
  {status}
</Badge>
```

### 3. Badge Variants Mapping

```typescript
export function getNotificationStatusVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    DELIVERED: 'success',
    PENDING: 'warning',
    FAILED: 'error',
    BLOCKED: 'neutral',
    RATE_LIMITED: 'orange',
    PARTIAL: 'info',
  };
  return map[status.toUpperCase()] ?? 'neutral';
}
```

### 4. Status with Icon Variant
- For detail views, show icon + text
- For table rows, text-only badge (compact)
- Both use same color system

---

## Implementation Plan

```tsx
// apps/provider/src/lib/utils/notification-status.ts
import { CheckCircle, Clock, XCircle, Shield, AlertTriangle, AlertCircle } from 'lucide-react';

export const NOTIFICATION_STATUS_CONFIG: Record<string, {
  label: string;
  variant: string;
  icon: any;
  color: string;
}> = {
  DELIVERED: { label: 'Delivered', variant: 'success', icon: CheckCircle, color: 'text-status-success' },
  PENDING: { label: 'Pending', variant: 'warning', icon: Clock, color: 'text-status-warning' },
  FAILED: { label: 'Failed', variant: 'error', icon: XCircle, color: 'text-status-error' },
  BLOCKED: { label: 'Blocked', variant: 'neutral', icon: Shield, color: 'text-text-muted' },
  RATE_LIMITED: { label: 'Rate Limited', variant: 'orange', icon: AlertTriangle, color: 'text-accent-orange' },
  PARTIAL: { label: 'Partial', variant: 'info', icon: AlertCircle, color: 'text-accent-cyan' },
};

export function getNotificationStatusConfig(status: string) {
  return NOTIFICATION_STATUS_CONFIG[status.toUpperCase()] ?? NOTIFICATION_STATUS_CONFIG.PENDING;
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/utils/notification-status.ts` | Create — status config map |
| `apps/provider/src/app/notifications/page.tsx` | Modify — replace inline statusColors with shared utility |

---

## Acceptance Criteria

- [ ] 6 status types with distinct colors: Delivered, Pending, Failed, Blocked, Rate-limited, Partial
- [ ] Uses shared Badge component (task 1.18)
- [ ] Status config centralized in utility file (reusable)
- [ ] Consistent with customer detail StatusBadge
- [ ] Icon variant available for detail views
- [ ] Case-insensitive status matching

---

## Dependencies

- **Blocked by**: Task 1.18 (Badge/Status pill component)
- **Blocks**: None
- **Related**: Task 5.1 (notification table uses badges), Task 5.4 (expanded row shows detailed status), Task 7.2 (callback status badges — same pattern)
