# Task 2.9 — Permission Matrix Implementation

> **Section**: 2. Authentication & Authorization — RBAC  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/roles.ts`

---

## Objective

Implement the full 25+ permission matrix mapping all roles to their allowed permissions, with utilities for checking and listing permissions.

---

## Current State

Task 2.8 defines the Permission type and PERMISSION_MATRIX structure. This task fills in the complete matrix and adds helper utilities.

---

## Requirements

### 1. Complete Permission Matrix

```typescript
const ALL_PERMISSIONS: Permission[] = [
  'dashboard:view',
  'customers:view', 'customers:export',
  'notifications:view', 'notifications:send', 'notifications:template:manage',
  'conversations:view', 'conversations:reply', 'conversations:assign',
  'callbacks:view', 'callbacks:manage', 'callbacks:assign',
  'documents:view', 'documents:upload', 'documents:share', 'documents:delete',
  'campaigns:view', 'campaigns:create', 'campaigns:launch', 'campaigns:delete',
  'bots:view', 'bots:create', 'bots:deploy', 'bots:delete',
  'analytics:view', 'analytics:export',
  'webhooks:view', 'webhooks:manage',
  'compliance:view', 'compliance:manage',
  'integrations:view', 'integrations:manage',
  'settings:view', 'settings:manage', 'settings:team:manage', 'settings:billing:manage',
  'apikeys:view', 'apikeys:manage',
];
```

### 2. Role → Permission Assignments

**PLATFORM_ADMIN**: All permissions  
**SP_ADMIN**: All permissions  
**CONTENT_MANAGER**: dashboard:view, customers:view, notifications:*, conversations:view/reply, callbacks:view, documents:view/upload/share, campaigns:view/create, bots:view, analytics:view, settings:view  
**AGENT**: dashboard:view, customers:view, notifications:view/send, conversations:view/reply/assign, callbacks:view/manage/assign, documents:view/upload/share, settings:view  
**ANALYST**: dashboard:view, customers:view/export, notifications:view, conversations:view, callbacks:view, documents:view, analytics:view/export, compliance:view, settings:view

### 3. Utility Functions
- [x] `getPermissions(role: Role): Permission[]` — returns array of permissions for a role
- [x] `hasAllPermissions(role: Role, permissions: Permission[]): boolean` — checks all true
- [x] `hasAnyPermission(role: Role, permissions: Permission[]): boolean` — checks any true
- [x] `getFeaturePermissions(feature: string): Permission[]` — returns all permissions for a feature prefix (e.g., "notifications" → notifications:view, notifications:send, notifications:template:manage)

---

## Implementation Plan

```typescript
export function getPermissions(role: Role): Permission[] {
  return Array.from(PERMISSION_MATRIX[role] ?? []);
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

export function getFeaturePermissions(feature: string): Permission[] {
  return ALL_PERMISSIONS.filter(p => p.startsWith(`${feature}:`));
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/roles.ts` | Modify — implement complete matrix + utilities |

---

## Acceptance Criteria

- [x] PLATFORM_ADMIN has all permissions
- [x] SP_ADMIN has all permissions
- [x] CONTENT_MANAGER can create campaigns but not launch them
- [x] AGENT can manage callbacks but not campaigns
- [x] ANALYST can only view + export analytics, view compliance
- [x] `hasPermission('AGENT', 'campaigns:create')` returns false
- [x] `hasAnyPermission('AGENT', ['callbacks:manage', 'campaigns:create'])` returns true
- [x] Type-safe: invalid permission strings cause compile errors

---

## Dependencies

- **Blocked by**: Task 2.8 (role definitions)
- **Blocks**: Task 2.10, 2.11, 2.12, 2.13
- **Related**: CMS_PERMISSIONS (keep backward compat)
