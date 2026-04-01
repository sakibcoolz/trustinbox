# Task 2.8 — Role Definitions

> **Section**: 2. Authentication & Authorization — RBAC  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/roles.ts`

---

## Objective

Expand the role definitions to include comprehensive permission mapping beyond CMS, covering all provider portal features.

---

## Current State

```typescript
export const ROLES = {
  PLATFORM_ADMIN: 'PLATFORM_ADMIN', SP_ADMIN: 'SP_ADMIN',
  CONTENT_MANAGER: 'CONTENT_MANAGER', AGENT: 'AGENT', ANALYST: 'ANALYST',
} as const;

const ROLE_HIERARCHY: Role[] = [PLATFORM_ADMIN, SP_ADMIN, CONTENT_MANAGER, AGENT, ANALYST];
export function hasRole(userRole: string, requiredRole: Role): boolean { /* ... */ }

// Only CMS permissions exist:
export const CMS_PERMISSIONS = { ... };
```

**Gaps**: No permission mapping for notifications, callbacks, campaigns, bots, webhooks, settings, analytics, documents, compliance, integrations.

---

## Requirements

### 1. Permission Enum
- [ ] Define all permissions as a string union type

```typescript
export type Permission =
  // Dashboard
  | 'dashboard:view'
  // Customers
  | 'customers:view' | 'customers:export'
  // Notifications
  | 'notifications:view' | 'notifications:send' | 'notifications:template:manage'
  // Conversations
  | 'conversations:view' | 'conversations:reply' | 'conversations:assign'
  // Callbacks
  | 'callbacks:view' | 'callbacks:manage' | 'callbacks:assign'
  // Documents
  | 'documents:view' | 'documents:upload' | 'documents:share' | 'documents:delete'
  // Campaigns
  | 'campaigns:view' | 'campaigns:create' | 'campaigns:launch' | 'campaigns:delete'
  // Bots
  | 'bots:view' | 'bots:create' | 'bots:deploy' | 'bots:delete'
  // Analytics
  | 'analytics:view' | 'analytics:export'
  // Webhooks
  | 'webhooks:view' | 'webhooks:manage'
  // Compliance
  | 'compliance:view' | 'compliance:manage'
  // Integrations
  | 'integrations:view' | 'integrations:manage'
  // Settings
  | 'settings:view' | 'settings:manage' | 'settings:team:manage' | 'settings:billing:manage'
  // API Keys
  | 'apikeys:view' | 'apikeys:manage';
```

### 2. Permission Matrix

| Permission | PLATFORM_ADMIN | SP_ADMIN | CONTENT_MANAGER | AGENT | ANALYST |
|-----------|:-:|:-:|:-:|:-:|:-:|
| dashboard:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| customers:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| customers:export | ✅ | ✅ | ❌ | ❌ | ✅ |
| notifications:send | ✅ | ✅ | ✅ | ✅ | ❌ |
| notifications:template:manage | ✅ | ✅ | ✅ | ❌ | ❌ |
| conversations:reply | ✅ | ✅ | ✅ | ✅ | ❌ |
| callbacks:manage | ✅ | ✅ | ❌ | ✅ | ❌ |
| campaigns:create | ✅ | ✅ | ✅ | ❌ | ❌ |
| campaigns:launch | ✅ | ✅ | ❌ | ❌ | ❌ |
| bots:create | ✅ | ✅ | ❌ | ❌ | ❌ |
| webhooks:manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| settings:team:manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| integrations:manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| compliance:manage | ✅ | ✅ | ❌ | ❌ | ❌ |
| compliance:view | ✅ | ✅ | ❌ | ❌ | ✅ |

### 3. ROLE_LABELS and ROLE_COLORS
- [ ] Display labels: `{ PLATFORM_ADMIN: 'Platform Admin', SP_ADMIN: 'Admin', ... }`
- [ ] Badge colors: `{ PLATFORM_ADMIN: 'purple', SP_ADMIN: 'info', AGENT: 'success', ANALYST: 'cyan', ... }`

---

## Implementation Plan

```typescript
export const PERMISSION_MATRIX: Record<Role, Set<Permission>> = {
  PLATFORM_ADMIN: new Set([/* all permissions */]),
  SP_ADMIN: new Set([/* all except platform-only */]),
  CONTENT_MANAGER: new Set(['dashboard:view', 'customers:view', 'notifications:view', 'notifications:send', ...]),
  AGENT: new Set(['dashboard:view', 'customers:view', 'notifications:view', 'notifications:send', 'conversations:view', 'conversations:reply', ...]),
  ANALYST: new Set(['dashboard:view', 'customers:view', 'customers:export', 'analytics:view', 'analytics:export', 'compliance:view']),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSION_MATRIX[role]?.has(permission) ?? false;
}

export const ROLE_LABELS: Record<Role, string> = {
  PLATFORM_ADMIN: 'Platform Admin', SP_ADMIN: 'Admin',
  CONTENT_MANAGER: 'Content Manager', AGENT: 'Agent', ANALYST: 'Analyst',
};

export const ROLE_COLORS: Record<Role, string> = {
  PLATFORM_ADMIN: 'purple', SP_ADMIN: 'info',
  CONTENT_MANAGER: 'warning', AGENT: 'success', ANALYST: 'cyan',
};
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/roles.ts` | Modify — add Permission type, PERMISSION_MATRIX, ROLE_LABELS, ROLE_COLORS |

---

## Acceptance Criteria

- [ ] All permissions defined as typed string union
- [ ] `hasPermission(role, permission)` returns correct boolean
- [ ] Every role has explicit permission set (no implicit grants)
- [ ] ROLE_LABELS provide display-friendly names
- [ ] ROLE_COLORS map to Badge variant names
- [ ] Backward compatible: existing `hasRole()`, `CMS_PERMISSIONS` still work

---

## Dependencies

- **Blocked by**: None
- **Blocks**: Task 2.9, 2.10, 2.11, 2.12, 2.13
- **Related**: Task 1.18 (Badge for role display)
