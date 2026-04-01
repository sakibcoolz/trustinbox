# Task 2.12 — Sidebar Role-Based Filtering

> **Section**: 2. Authentication & Authorization — RBAC  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/sidebar.tsx`

---

## Objective

Upgrade sidebar navigation to use the permission system for showing/hiding nav items based on the user's role.

---

## Current State

```typescript
const adminOnlyPaths = ['/webhooks', '/integrations'];
const isAdmin = user?.role === 'SP_ADMIN' || user?.role === 'PLATFORM_ADMIN';

function filterNav(items: typeof mainNav) {
  return items.filter((item) => {
    if (adminOnlyPaths.includes(item.href) && !isAdmin) return false;
    return true;
  });
}
```

**Issues**:
1. Hardcoded `adminOnlyPaths` — doesn't use permission system
2. Only filters by two paths — should filter all permission-gated routes
3. Sidebar fetches its own user data via `auth.me()` — should use AuthContext

---

## Requirements

### 1. Permission-Aware Nav Items
- [ ] Add `requiredPermission` to nav item definitions:

```typescript
interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  requiredPermission?: Permission;
  badge?: () => number | null; // dynamic badge count
}
```

### 2. Nav Item Permissions

| Nav Item | Required Permission |
|----------|-------------------|
| Dashboard | dashboard:view (always visible) |
| Customers | customers:view |
| Notifications | notifications:view |
| Conversations | conversations:view |
| Callbacks | callbacks:view |
| Documents | documents:view |
| Campaigns | campaigns:view |
| Bots | bots:view |
| Analytics | analytics:view |
| Webhooks | webhooks:view |
| Compliance | compliance:view |
| Integrations | integrations:view |
| Settings | settings:view |

### 3. Use AuthContext
- [ ] Replace `const me = await auth.me()` with `useAuth()` context
- [ ] Remove duplicate user state management
- [ ] Remove `useEffect` that calls `auth.me()`

### 4. Dynamic Badge Counts
- [ ] Notification bell count from GraphQL subscription (task 16.x)
- [ ] Callback badge showing pending count
- [ ] Prepare `badge` slot in nav item definition

---

## Implementation Plan

```tsx
const mainNav: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users, requiredPermission: 'customers:view' },
  { label: 'Notifications', href: '/notifications', icon: Bell, requiredPermission: 'notifications:view' },
  { label: 'Conversations', href: '/conversations', icon: MessageSquare, requiredPermission: 'conversations:view' },
  { label: 'Callbacks', href: '/callbacks', icon: PhoneCall, requiredPermission: 'callbacks:view' },
  { label: 'Documents', href: '/documents', icon: FileText, requiredPermission: 'documents:view' },
  { label: 'Campaigns', href: '/campaigns', icon: Megaphone, requiredPermission: 'campaigns:view' },
  { label: 'Bots', href: '/bots', icon: Bot, requiredPermission: 'bots:view' },
];

// In component:
const { user, role, activeServiceProvider } = useAuth();

function filterNav(items: NavItem[]) {
  return items.filter(item => {
    if (!item.requiredPermission) return true;
    return role ? hasPermission(role as Role, item.requiredPermission) : false;
  });
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/sidebar.tsx` | Modify — permission-based filtering, use AuthContext |

---

## Acceptance Criteria

- [ ] ANALYST sees: Dashboard, Customers, Notifications (view), Analytics, Compliance, Settings
- [ ] AGENT sees: Dashboard, Customers, Notifications, Conversations, Callbacks, Documents, Settings
- [ ] SP_ADMIN sees: all nav items
- [ ] Sidebar no longer makes its own `auth.me()` call
- [ ] Nav items define their required permission explicitly
- [ ] Badge slot ready for notification/callback counts

---

## Dependencies

- **Blocked by**: Task 2.4 (AuthContext), Task 2.8-2.9 (permissions)
- **Blocks**: None
- **Related**: Task 2.10 (usePermission), Task 1.3 (sidebar component)
