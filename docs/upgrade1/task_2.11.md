# Task 2.11 — ProtectedRoute Wrapper

> **Section**: 2. Authentication & Authorization — RBAC  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ProtectedRoute.tsx`

---

## Objective

Create a `ProtectedRoute` wrapper component that checks for minimum role level and redirects users with insufficient permissions.

---

## Current State

`useRequireAuth()` checks for authentication only (logged in vs not). No role-based route protection exists. An ANALYST could navigate to `/webhooks` even though it's hidden from sidebar.

---

## Requirements

### 1. Role-Based Route Guard
```typescript
interface ProtectedRouteProps {
  requiredRole?: Role;
  requiredPermission?: Permission | Permission[];
  permissionMode?: 'all' | 'any';
  children: React.ReactNode;
  fallback?: 'redirect' | 'forbidden'; // redirect to /, or show 403 page
}
```

### 2. Behavior
- [ ] If `requiredRole` provided: check `hasRole(userRole, requiredRole)`
- [ ] If `requiredPermission` provided: check permission matrix
- [ ] On failure with `fallback='redirect'`: navigate to `/` with toast "Access denied"
- [ ] On failure with `fallback='forbidden'`: render 403 page
- [ ] During loading: show loading skeleton

### 3. Per-Route Configuration
```tsx
// apps/provider/src/app/webhooks/layout.tsx
export default function WebhooksLayout({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute requiredRole="SP_ADMIN" fallback="forbidden">
      {children}
    </ProtectedRoute>
  );
}
```

### 4. Route-Permission Map
| Route | Required Role | Required Permission |
|-------|---------------|-------------------|
| `/webhooks` | SP_ADMIN | webhooks:view |
| `/integrations` | SP_ADMIN | integrations:view |
| `/settings/team` | SP_ADMIN | settings:team:manage |
| `/settings/billing` | SP_ADMIN | settings:billing:manage |
| `/compliance` | — | compliance:view |
| `/campaigns/new` | — | campaigns:create |
| `/bots/new` | — | bots:create |

---

## Implementation Plan

```tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { hasRole, hasPermission, hasAllPermissions, hasAnyPermission } from '@/lib/roles';
import type { Role, Permission } from '@/lib/roles';

export function ProtectedRoute({ requiredRole, requiredPermission, permissionMode = 'all', children, fallback = 'redirect' }: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();
  const router = useRouter();

  const isAuthorized = (() => {
    if (!user || !role) return false;
    if (requiredRole && !hasRole(role, requiredRole)) return false;
    if (requiredPermission) {
      const perms = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
      return permissionMode === 'all' 
        ? hasAllPermissions(role as Role, perms) 
        : hasAnyPermission(role as Role, perms);
    }
    return true;
  })();

  useEffect(() => {
    if (!loading && !isAuthorized && fallback === 'redirect') {
      router.push('/');
    }
  }, [loading, isAuthorized, fallback, router]);

  if (loading) return <div className="flex-1 flex items-center justify-center"><LoadingSpinner /></div>;
  if (!isAuthorized && fallback === 'forbidden') return <ForbiddenPage />;
  if (!isAuthorized) return null;
  return <>{children}</>;
}

function ForbiddenPage() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <Shield size={48} className="mx-auto text-status-error mb-4" />
        <h2 className="text-lg font-semibold text-text-primary mb-2">Access Denied</h2>
        <p className="text-sm text-text-secondary mb-4">You don't have permission to access this page.</p>
        <a href="/" className="text-sm text-accent-blue hover:underline">Return to Dashboard</a>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/ProtectedRoute.tsx` | Create |
| `apps/provider/src/app/webhooks/layout.tsx` | Modify — wrap with ProtectedRoute |
| `apps/provider/src/app/integrations/layout.tsx` | Modify — wrap with ProtectedRoute |

---

## Acceptance Criteria

- [ ] ANALYST user navigating to `/webhooks` sees 403 page
- [ ] AGENT navigating to `/campaigns/new` sees 403 or redirect
- [ ] SP_ADMIN can access all routes
- [ ] Loading state shown while auth resolves
- [ ] 403 page has clear message and link back to dashboard
- [ ] `fallback="redirect"` navigates to `/` silently

---

## Dependencies

- **Blocked by**: Task 2.4 (AuthContext), Task 2.8-2.9 (role definitions)
- **Blocks**: None (applied to route layouts)
- **Related**: Task 2.7 (middleware), Task 2.12 (sidebar filtering)
