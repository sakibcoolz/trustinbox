# Task 1.18 — Badge / Status Pill Component

> **Section**: 1. Foundation & Shell — Design System  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ui/Badge.tsx`
> **Status**: ✅ Complete

---

## Objective

Create color-coded badge and status pill components for showing entity statuses across tables, cards, and detail views.

---

## Current State

Status indicators are implemented inline with ad-hoc Tailwind classes. No shared badge component.

---

## Requirements

### 1. Status Badge Variants

| Status | Colors | Example Entities |
|--------|--------|-----------------|
| `success` | `bg-status-success/10 text-status-success` | Delivered, Active, Verified, Completed |
| `warning` | `bg-status-warning/10 text-status-warning` | Pending, Scheduled, Reconnecting |
| `error` | `bg-status-error/10 text-status-error` | Failed, Rejected, Expired, Disconnected |
| `info` | `bg-status-info/10 text-status-info` | In Progress, Processing, Open |
| `neutral` | `bg-bg-hover text-text-secondary` | Draft, Archived, Paused, Blocked |
| `purple` | `bg-accent-purple/10 text-accent-purple` | Role badges (SP_ADMIN, AGENT, etc.) |
| `cyan` | `bg-accent-cyan/10 text-accent-cyan` | Rate-limited, Queued |

### 2. Component API
```typescript
interface BadgeProps {
  variant: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'purple' | 'cyan';
  children: React.ReactNode;
  dot?: boolean;      // show colored dot before text
  size?: 'sm' | 'md'; // sm = text-[10px], md = text-xs
  className?: string;
}
```

### 3. Status Mapper Utility
```typescript
// Maps domain statuses to badge variants
const STATUS_MAP: Record<string, BadgeProps['variant']> = {
  DELIVERED: 'success', ACTIVE: 'success', VERIFIED: 'success', COMPLETED: 'success',
  PENDING: 'warning', SCHEDULED: 'warning', PROCESSING: 'warning',
  FAILED: 'error', REJECTED: 'error', EXPIRED: 'error', CANCELLED: 'error',
  OPEN: 'info', RUNNING: 'info', IN_PROGRESS: 'info',
  DRAFT: 'neutral', ARCHIVED: 'neutral', PAUSED: 'neutral', BLOCKED: 'neutral',
};

export function getStatusVariant(status: string): BadgeProps['variant'] {
  return STATUS_MAP[status] || 'neutral';
}
```

---

## Implementation Plan

```tsx
const VARIANTS = {
  success: 'bg-status-success/10 text-status-success',
  warning: 'bg-status-warning/10 text-status-warning',
  error:   'bg-status-error/10 text-status-error',
  info:    'bg-status-info/10 text-status-info',
  neutral: 'bg-bg-hover text-text-secondary',
  purple:  'bg-accent-purple/10 text-accent-purple',
  cyan:    'bg-accent-cyan/10 text-accent-cyan',
};

const DOT_COLORS = {
  success: 'bg-status-success', warning: 'bg-status-warning', error: 'bg-status-error',
  info: 'bg-status-info', neutral: 'bg-text-muted', purple: 'bg-accent-purple', cyan: 'bg-accent-cyan',
};

const SIZES = { sm: 'text-[10px] px-1.5 py-0.5', md: 'text-xs px-2 py-0.5' };

export function Badge({ variant, children, dot, size = 'sm', className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-medium', VARIANTS[variant], SIZES[size], className)}>
      {dot && <span className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[variant])} />}
      {children}
    </span>
  );
}

// Convenience for domain statuses
export function StatusBadge({ status }: { status: string }) {
  const variant = getStatusVariant(status);
  const label = status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return <Badge variant={variant} dot>{label}</Badge>;
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/ui/Badge.tsx` | Create |

---

## Acceptance Criteria

- [x] `<Badge variant="success">Delivered</Badge>` renders green pill
- [x] `<StatusBadge status="PENDING" />` auto-maps to yellow warning badge
- [x] Dot indicator shows colored circle before text when enabled
- [x] All 7 variants render with correct color combinations
- [x] Size variants (sm/md) affect font size and padding
- [x] Used consistently across all tables and detail views

---

## Dependencies

- **Blocked by**: Task 1.11 (color tokens)
- **Blocks**: Tasks 5.2, 7.2, 9.1 (all table status columns)
- **Related**: Task 1.13 (table column rendering)
