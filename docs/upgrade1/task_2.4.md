# Task 2.4 — useAuth Hook Upgrade

> **Section**: 2. Authentication & Authorization — Auth Flow  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/hooks/useAuth.ts`

---

## Objective

Upgrade the `useAuth` hook to provide full auth lifecycle: login, logout, token refresh, user context, and org context via React context and GraphQL.

---

## Current State

The `useAuth` hook **exists** with:
```typescript
export function useAuth() {
  const [state, setState] = useState<AuthState>({ user: null, loading: true, error: null });
  // Reads token from localStorage, calls auth.me() REST endpoint
  // On 401: clears tokens
}

export function useCMSPermissions() { /* reads user role, returns CMS permission set */ }
export function useRequireAuth(redirectTo = '/auth/login') { /* redirects if not authenticated */ }
```

### Issues
1. Calls REST `auth.me()` on every mount — no caching
2. No refresh token flow (just clears on 401)
3. No React context — every component using `useAuth()` makes its own API call
4. No logout function
5. No org context (active service provider)
6. `window.location.href` for redirect — should use Next.js router

---

## Requirements

### 1. AuthContext Provider
- [ ] Create `AuthProvider` context wrapping the entire app
- [ ] Single GraphQL `ME_QUERY` on mount — sets user + role
- [ ] Expose: `user`, `loading`, `error`, `isAuthenticated`, `role`, `activeServiceProvider`
- [ ] Expose: `login()`, `logout()`, `refreshSession()`, `switchServiceProvider()`

### 2. ME Query
```graphql
query Me {
  me {
    id
    email
    fullName
    username
    role
    serviceProviders {
      id
      name
      industry
      role
    }
    activeServiceProvider {
      id
      name
      industry
    }
  }
}
```

### 3. Token Refresh
- [ ] On 401 response, attempt `REFRESH_TOKEN_MUTATION` with refreshToken
- [ ] If refresh succeeds: update accessToken, retry original request
- [ ] If refresh fails: clear tokens, redirect to login
- [ ] Implement as Apollo Link (see task 2.6)

### 4. Logout
- [ ] Clear `accessToken`, `refreshToken`, `activeSpId`, `userSPs` from localStorage
- [ ] Call optional `LOGOUT_MUTATION` (server-side token invalidation)
- [ ] Reset Apollo cache
- [ ] Navigate to `/auth/login`

### 5. Service Provider Context
- [ ] `activeServiceProvider` from ME query or localStorage fallback
- [ ] `switchServiceProvider(spId)` — updates localStorage, refetches ME query
- [ ] Header auto-includes `X-Service-Provider-Id` (task 2.6)

---

## Implementation Plan

```tsx
// apps/provider/src/contexts/AuthContext.tsx
'use client';
import { createContext, useContext, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { ME_QUERY, LOGOUT_MUTATION, REFRESH_TOKEN_MUTATION } from '@/lib/graphql/auth';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  role: Role | null;
  activeServiceProvider: ServiceProvider | null;
  login: (accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  switchServiceProvider: (spId: string) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const client = useApolloClient();
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  
  const { data, loading, error, refetch } = useQuery(ME_QUERY, {
    skip: !token,
    fetchPolicy: 'cache-and-network',
  });

  const login = useCallback((accessToken: string, refreshToken: string) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    refetch();
  }, [refetch]);

  const logout = useCallback(async () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('activeSpId');
    localStorage.removeItem('userSPs');
    await client.clearStore();
    router.push('/auth/login');
  }, [client, router]);

  const switchServiceProvider = useCallback((spId: string) => {
    localStorage.setItem('activeSpId', spId);
    refetch();
  }, [refetch]);

  const value: AuthContextValue = {
    user: data?.me ?? null,
    loading: !token ? false : loading,
    error: error?.message ?? null,
    isAuthenticated: !!data?.me,
    role: data?.me?.role ?? null,
    activeServiceProvider: data?.me?.activeServiceProvider ?? null,
    login, logout, switchServiceProvider,
    refreshSession: refetch,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useRequireAuth(redirectTo = '/auth/login') {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!loading && !isAuthenticated) router.push(redirectTo);
  }, [loading, isAuthenticated, router, redirectTo]);
  return useAuth();
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/contexts/AuthContext.tsx` | Create — AuthProvider + useAuth |
| `apps/provider/src/hooks/useAuth.ts` | Modify — re-export from AuthContext for backward compat |
| `apps/provider/src/app/layout.tsx` | Modify — wrap with `<AuthProvider>` |
| `apps/provider/src/lib/graphql/auth.ts` | Modify — add ME_QUERY, LOGOUT_MUTATION |

---

## Acceptance Criteria

- [ ] Single `ME_QUERY` call on app mount (no duplicate per-component calls)
- [ ] `useAuth()` returns consistent user data across all components
- [ ] `logout()` clears all state, resets Apollo cache, navigates to login
- [ ] `switchServiceProvider()` updates context and refetches
- [ ] `useRequireAuth()` redirects unauthenticated users
- [ ] No flash of unauthenticated content (loading state handled)
- [ ] Backward-compatible: existing `useAuth()` imports still work

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo auth link), Task 2.14 (GraphQL mutations)
- **Blocks**: Task 2.10 (usePermission), Task 2.11 (ProtectedRoute), all feature pages
- **Related**: Task 2.5 (token management), Task 1.2 (LayoutShell)
