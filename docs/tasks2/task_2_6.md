# Task 2.6 — Harden Auth Hook

> **Phase**: 2 — Web App: Foundation & Data Layer
> **File**: `apps/web/src/lib/auth-context.tsx`

---

## Objective

Add token expiry utility functions and an `isAuthenticated` computed value to the existing auth context. The auth context already has proactive refresh scheduling, so this task focuses on **exposing utilities** and **tightening the public API**.

---

## Current State

The auth context (`apps/web/src/lib/auth-context.tsx`, ~280 lines) **already has**:

- **Proactive refresh scheduling**: `scheduleRefresh()` sets a timer to refresh 2 minutes before expiry
- **Immediate refresh on mount**: If token is expired or within 2 minutes, refreshes immediately
- **Logout on refresh failure**: Clears localStorage and redirects to `/auth/login`
- **`msUntilExpiry()` helper**: Internal function that decodes JWT and returns ms until expiry
- **`refreshAccessToken()` method**: Exposed on context, calls `POST /api/auth/refresh`
- **XMPP JWT validation**: `isValidJwt()` internal function

**What's missing per task2.md**:
- `isTokenExpired()` — standalone utility function
- `isTokenExpiringSoon()` — standalone utility function with configurable buffer
- `isAuthenticated` — computed boolean on context (not just checking `token !== null`)
- These utilities are needed by Apollo Client error link (Task 2.1) and protected route guards

---

## Requirements

### Utility Functions (exported from module)
- [x] Create `isTokenExpired(token: string): boolean` — returns true if JWT `exp` is in the past
- [x] Create `isTokenExpiringSoon(token: string, bufferMs?: number): boolean` — default buffer 120000ms (2 min)
- [x] Export both functions so other modules can use them (e.g., Apollo error link, route guards)
- [x] Handle malformed / non-JWT tokens gracefully (return `true` to force refresh)

### Context Additions
- [x] Add `isAuthenticated: boolean` to `AuthContextType` interface
- [x] Compute `isAuthenticated` as: `token !== null && !isTokenExpired(token)`
- [x] Expose `isAuthenticated` on the context value

### Refactor Internal Helpers
- [x] Replace the internal `msUntilExpiry()` to use the new `isTokenExpiringSoon()` where appropriate
- [x] Keep `msUntilExpiry()` for the timer calculation (it returns ms, which the scheduler needs)
- [x] Replace the internal `isValidJwt()` to reuse `isTokenExpired()` for the expiry check

---

## Implementation Details

### Utility Functions
```typescript
// ─── Token Utilities ────────────────────────────────────

/** Decode a JWT payload without verification. Returns null on malformed tokens. */
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!base64) return null;
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

/** Returns true if the token is expired or malformed. */
export function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 < Date.now();
}

/** Returns true if the token will expire within `bufferMs` milliseconds (default: 2 min). */
export function isTokenExpiringSoon(token: string, bufferMs = 120_000): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 - Date.now() < bufferMs;
}
```

### Context Type Update
```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  xmppToken: string | null;
  xmppJid: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;  // NEW
  login: (email: string, password: string) => Promise<void>;
  register: (input: { ... }) => Promise<void>;
  logout: () => void;
  updateAvatar: (url: string | null) => void;
  refreshAccessToken: () => Promise<boolean>;
}
```

### Context Value Update
```typescript
const isAuthenticated = token !== null && !isTokenExpired(token);

return (
  <AuthContext.Provider value={{
    user, token, xmppToken, xmppJid, isLoading,
    isAuthenticated,  // NEW
    login, register, logout, updateAvatar, refreshAccessToken,
  }}>
    {children}
  </AuthContext.Provider>
);
```

### Refactored Internal Helpers
```typescript
// Replace the inline isValidJwt with:
const isValidJwt = (t: string | null): boolean => {
  if (!t || t.split('.').length !== 3) return false;
  return !isTokenExpired(t);
};

// msUntilExpiry stays as-is (returns number for timer scheduling)
const msUntilExpiry = (t: string | null): number => {
  if (!t) return 0;
  const payload = decodeJwtPayload(t);
  if (!payload?.exp) return 0;
  return Math.max(0, payload.exp * 1000 - Date.now());
};
```

---

## What's Already Done (DO NOT duplicate)

The following features from task2.md are **already implemented**:
- Auto-refresh when token within 2 minutes of expiry (`scheduleRefresh()`)
- Redirect to `/auth/login` on refresh failure (`logout()` called)
- Clear localStorage on failure (`logout()` removes all keys)
- Proactive scheduling on mount (the `useEffect` with `msUntilExpiry`)

**Do NOT**:
- Re-implement proactive refresh — it exists
- Add another effect for token monitoring — the existing schedule covers it
- Change the refresh endpoint or localStorage keys

---

## Verification Checklist

- [x] `isTokenExpired()` exported and works with valid JWT → returns `false` for non-expired
- [x] `isTokenExpired()` returns `true` for expired token
- [x] `isTokenExpired()` returns `true` for malformed/non-JWT string
- [x] `isTokenExpiringSoon()` returns `true` when token expires in < 2 minutes
- [x] `isTokenExpiringSoon(token, 0)` returns `false` for a non-expired token
- [x] `isAuthenticated` is `true` when logged in with valid token
- [x] `isAuthenticated` is `false` when no token or token expired
- [x] `isAuthenticated` updates reactively when token refreshes
- [x] Existing login/register/logout flow unchanged
- [x] Existing proactive refresh scheduling unchanged
- [x] No TypeScript compilation errors

---

## Dependencies

- **Depends on**: Nothing (can be done independently)
- **Used by**: Task 2.1 (Apollo error link may use `isTokenExpired` for pre-check), protected route guards

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/lib/auth-context.tsx` | **Target file** — extend |
| `apps/web/src/lib/apollo-client.ts` | Consumer — error link may import `isTokenExpired` |
| `apps/web/src/app/(protected)/layout.tsx` | Consumer — route guard may use `isAuthenticated` |
