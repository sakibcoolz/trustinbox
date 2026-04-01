# Task 18.3 — Utility Tests

> **Section**: 18. Testing & QA  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Status**: ✅ Complete

---

## Objective

Write unit tests for all utility/library functions.

## Deliverables

- `src/__tests__/unit/roles.test.ts` — 24 tests
  - hasRole, hasPermission, hasAllPermissions, hasAnyPermission
  - getPermissions, getFeaturePermissions, getCMSPermissions
  - ROLE_LABELS, ROLE_COLORS completeness
- `src/__tests__/unit/format.test.ts` — 12 tests
  - formatNumber, formatPercent, formatCompactNumber, formatRelativeTime
- `src/__tests__/unit/utils.test.ts` — 5 tests (cn class joining)
- `src/__tests__/unit/csv-export.test.ts` — 13 tests
  - sanitizeCsvField (CSV injection prevention), buildCsvString, downloadCsv
- `src/__tests__/unit/token.test.ts` — 8 tests
  - tokenManager: setTokens, clearTokens, isAuthenticated, getTokenPayload
