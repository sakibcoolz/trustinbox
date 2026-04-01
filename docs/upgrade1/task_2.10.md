# Task 2.10 — usePermission Hook

> **Section**: 2. Authentication & Authorization — RBAC  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/hooks/usePermission.ts`

---

## Objective

Create a `usePermission` hook that checks if the current user has a specific permission, enabling conditional UI rendering based on RBAC.

---

## Current State

No permission hook exists. Components would need to manually check `user.role` against the permission matrix.

---

## Requirements

### 1. usePermission Hook
```typescript
function usePermission(permission: Permission): boolean;
```
- [ ] Returns `true` if the current user's role has the specified permission
- [ ] Returns `false` if user is not authenticated or lacks permission
- [ ] Reads from `useAuth()` context (task 2.4)

### 2. usePermissions Hook (multiple checks)
```typescript
function usePermissions(permissions: Permission[]): Record<Permission, boolean>;
```
- [ ] Returns an object mapping each permission to its boolean result
- [ ] Useful for pages with multiple permission-gated UI elements

### 3. useFeatureAccess Hook
```typescript
function useFeatureAccess(feature: string): { canView: boolean; canCreate: boolean; canManage: boolean; canDelete: boolean };
```
- [ ] Convenience hook for common feature access patterns
- [ ] Maps to `feature:view`, `feature:create`, `feature:manage`, `feature:delete`

### 4. PermissionGate Component
```tsx
interface PermissionGateProps {
  permission: Permission | Permission[];
  mode?: 'all' | 'any'; // default 'all'
  fallback?: React.ReactNode;
  children: React.ReactNode;
}
```
- [ ] Renders children only if permission check passes
- [ ] Optional fallback content for unauthorized view
- [ ] Mode: 'all' requires all permissions, 'any' requires at least one

---

## Implementation Plan

```typescript
// apps/provider/src/hooks/usePermission.ts
import { useAuth } from '@/contexts/AuthContext';
import { hasPermission, hasAllPermissions, hasAnyPermission, type Permission, type Role } from '@/lib/roles';

export function usePermission(permission: Permission): boolean {
  const { role } = useAuth();
  if (!role) return false;
  return hasPermission(role as Role, permission);
}

export function usePermissions(permissions: Permission[]): Record<string, boolean> {
  const { role } = useAuth();
  if (!role) return Object.fromEntries(permissions.map(p => [p, false]));
  return Object.fromEntries(permissions.map(p => [p, hasPermission(role as Role, p)]));
}

export function useFeatureAccess(feature: string) {
  const { role } = useAuth();
  const r = role as Role;
  return {
    canView: hasPermission(r, `${feature}:view` as Permission),
    canCreate: hasPermission(r, `${feature}:create` as Permission),
    canManage: hasPermission(r, `${feature}:manage` as Permission),
    canDelete: hasPermission(r, `${feature}:delete` as Permission),
  };
}
```

```tsx
// apps/provider/src/components/PermissionGate.tsx
export function PermissionGate({ permission, mode = 'all', fallback = null, children }: PermissionGateProps) {
  const { role } = useAuth();
  if (!role) return <>{fallback}</>;
  
  const perms = Array.isArray(permission) ? permission : [permission];
  const allowed = mode === 'all' 
    ? hasAllPermissions(role as Role, perms) 
    : hasAnyPermission(role as Role, perms);
  
  return allowed ? <>{children}</> : <>{fallback}</>;
}
```

### Usage Examples
```tsx
// Conditional button
<PermissionGate permission="notifications:send">
  <button>Send Notification</button>
</PermissionGate>

// In a page
const canLaunch = usePermission('campaigns:launch');
<button disabled={!canLaunch}>Launch Campaign</button>

// Feature access
const { canView, canCreate, canDelete } = useFeatureAccess('campaigns');
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/hooks/usePermission.ts` | Create |
| `apps/provider/src/components/PermissionGate.tsx` | Create |

---

## Acceptance Criteria

- [ ] `usePermission('notifications:send')` returns true for AGENT
- [ ] `usePermission('campaigns:create')` returns false for AGENT
- [ ] `PermissionGate` hides children when unauthorized
- [ ] `PermissionGate` shows fallback when unauthorized
- [ ] `useFeatureAccess` returns correct view/create/manage/delete booleans
- [ ] Handles unauthenticated state gracefully (all false)

---

## Dependencies

- **Blocked by**: Task 2.4 (AuthContext), Task 2.9 (permission matrix)
- **Blocks**: Tasks 2.12, 2.13, all feature pages
- **Related**: Task 2.11 (ProtectedRoute)
