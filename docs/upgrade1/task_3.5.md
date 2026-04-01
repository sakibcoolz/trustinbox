# Task 3.5 — Quick Actions Panel

> **Section**: 3. Dashboard  
> **Priority**: P2 — Nice to Have  
> **Estimated Scope**: Small  
> **Route**: `/` (Dashboard)  
> **File**: `apps/provider/src/components/dashboard/QuickActions.tsx`
> **Status**: ✅ Complete

---

## Objective

Add a quick actions panel with shortcut buttons for common provider tasks: compose notification, create campaign, create bot.

---

## Current State

No quick actions panel exists on the dashboard.

---

## Requirements

### 1. Quick Action Buttons

| Action | Icon | Permission | Navigates To |
|--------|------|-----------|-------------|
| Send Notification | `Bell` | notifications:send | `/notifications/compose` |
| Create Campaign | `Megaphone` | campaigns:create | `/campaigns/new` |
| Create Bot | `Bot` | bots:create | `/bots/new` |
| Request Callback | `PhoneCall` | callbacks:manage | `/callbacks/new` |
| Upload Document | `FileText` | documents:upload | `/documents/upload` |
| View Reports | `BarChart3` | analytics:view | `/analytics` |

### 2. Permission-Gated
- [x] Only show actions the user has permission for
- [x] Use `PermissionGate` or `usePermission` to filter

### 3. Appearance
- [x] Row of pill-shaped buttons with icon + label
- [x] Primary blue border/accent for primary action (Send Notification)
- [x] Subtle hover effect
- [x] Responsive: horizontal scroll on mobile

### 4. Component API
```typescript
interface QuickAction {
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  href: string;
  permission: Permission;
  primary?: boolean;
}
```

---

## Implementation Plan

```tsx
import Link from 'next/link';
import { Bell, Megaphone, Bot, PhoneCall, FileText, BarChart3 } from 'lucide-react';
import { usePermission } from '@/hooks/usePermission';
import type { Permission } from '@/lib/roles';

const ACTIONS: QuickAction[] = [
  { label: 'Send Notification', icon: Bell, href: '/notifications/compose', permission: 'notifications:send', primary: true },
  { label: 'Create Campaign', icon: Megaphone, href: '/campaigns/new', permission: 'campaigns:create' },
  { label: 'Create Bot', icon: Bot, href: '/bots/new', permission: 'bots:create' },
  { label: 'Request Callback', icon: PhoneCall, href: '/callbacks/new', permission: 'callbacks:manage' },
  { label: 'Upload Document', icon: FileText, href: '/documents/upload', permission: 'documents:upload' },
  { label: 'View Reports', icon: BarChart3, href: '/analytics', permission: 'analytics:view' },
];

export function QuickActions() {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
      {ACTIONS.map(action => (
        <QuickActionButton key={action.href} {...action} />
      ))}
    </div>
  );
}

function QuickActionButton({ label, icon: Icon, href, permission, primary }: QuickAction) {
  const allowed = usePermission(permission);
  if (!allowed) return null;

  return (
    <Link href={href}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-colors border ${
        primary
          ? 'border-accent-blue text-accent-blue hover:bg-accent-blue/10'
          : 'border-border-primary text-text-secondary hover:text-text-primary hover:border-border-secondary hover:bg-bg-hover'
      }`}>
      <Icon size={14} />
      {label}
    </Link>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/dashboard/QuickActions.tsx` | Create |
| `apps/provider/src/app/page.tsx` | Modify — add QuickActions between KPIs and charts |

---

## Acceptance Criteria

- [x] Quick action buttons render for permitted actions only
- [x] ANALYST sees only "View Reports"
- [x] SP_ADMIN sees all 6 actions
- [x] Clicking navigates to correct page
- [x] Primary action (Send Notification) has blue accent styling
- [x] Horizontal scroll on mobile
- [x] If no actions are permitted, section is hidden entirely

---

## Dependencies

- **Blocked by**: Task 2.10 (usePermission)
- **Blocks**: None
- **Related**: Task 2.13 (field-level auth)
