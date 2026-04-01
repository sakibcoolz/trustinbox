# Task 18.1 — Hook Tests

> **Section**: 18. Testing & QA  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Status**: ✅ Complete

---

## Objective

Write unit tests for `useAuth`, `usePermission`, `useFeatureAccess`, and `useCMSPermissions` hooks using Vitest + Testing Library.

## Deliverables

- `src/__tests__/hooks/usePermission.test.tsx` — 11 tests
  - `usePermission`: role-based permission checks (5 tests)
  - `usePermissions`: permission map for role (2 tests)
  - `useFeatureAccess`: canView/canCreate/canManage/canDelete (3 tests)
- `src/__tests__/hooks/useAuth.test.tsx` — 4 tests
  - `useCMSPermissions`: full access for SP_ADMIN, limited for ANALYST, defaults, loading

## Test Stack

- Vitest with globals
- @testing-library/react (renderHook)
- vi.mock for AuthContext
