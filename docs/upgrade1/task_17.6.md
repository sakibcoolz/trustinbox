# Task 17.6 — React Context Auth State

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P0 — Auth  
> **Estimated Scope**: Small (already exists — audit)  
> **File**: `apps/provider/src/contexts/AuthContext.tsx`  
> **Status**: ✅ Complete

---

## Objective

Audit the existing Auth context to ensure it provides all required auth state for the upgraded features: user info, active service provider ID, roles/permissions, and token management.

---

## Requirements

### Auth Context Shape

```typescript
interface AuthContextType {
  user: {
    id: string;
    email: string;
    fullName: string;
    username: string;
  } | null;
  serviceProvider: {
    id: string;
    companyName: string;
    role: TeamRole; // SP_ADMIN | AGENT | ANALYST
  } | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<string>;
  switchServiceProvider: (spId: string) => void;
}
```

### Must Provide

- `serviceProvider.role` for RBAC checks (used by `usePermission` hook)
- `serviceProvider.id` for all GraphQL queries requiring `spId`
- Token refresh logic for Apollo errorLink integration
- Persistent auth state (survive page refresh)

### Integration Points

- Apollo `authLink` reads token + spId from this context
- `ProtectedRoute` reads `isAuthenticated` + `role`
- `usePermission` reads `role` from this context

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/contexts/AuthContext.tsx` | **Modify** | Ensure role + spId exposed |

---

## Acceptance Criteria

- [ ] User info, role, and spId available in context
- [ ] Token refresh function accessible
- [ ] Auth state persists across page refresh
- [ ] Context provides loading state
- [ ] Integrates with Apollo authLink

---

## Dependencies

- **Blocked by**: None
- **Blocks**: Tasks using RBAC (12.3, 13.2, 14.2, 15.8)
