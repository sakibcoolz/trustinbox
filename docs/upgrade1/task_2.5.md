# Task 2.5 — Token Management

> **Section**: 2. Authentication & Authorization — Auth Flow  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/token.ts`

---

## Objective

Implement robust token management: storage, retrieval, auto-refresh on 401, and silent refresh before expiry.

---

## Current State

Tokens are stored/retrieved directly via `localStorage.getItem('accessToken')` scattered across multiple files:
- `apps/provider/src/hooks/useAuth.ts`
- `apps/provider/src/lib/api.ts` (`getHeaders()`)
- `apps/provider/src/app/auth/login/page.tsx`
- `apps/provider/src/components/sidebar.tsx`

No centralized token management. No auto-refresh. No JWT decoding.

---

## Requirements

### 1. Token Storage Utility
- [ ] Centralized `tokenManager` with get/set/clear methods
- [ ] Store `accessToken`, `refreshToken`, `activeSpId`
- [ ] Never expose raw tokens outside the module

```typescript
export const tokenManager = {
  getAccessToken(): string | null,
  getRefreshToken(): string | null,
  setTokens(access: string, refresh: string): void,
  clearTokens(): void,
  getActiveSpId(): string | null,
  setActiveSpId(id: string): void,
};
```

### 2. JWT Decoding (client-side only)
- [ ] Decode JWT payload without verification (for expiry check)
- [ ] Extract `exp`, `sub`, `role` from token
- [ ] `isTokenExpired(token)` — returns boolean
- [ ] `getTokenExpiresIn(token)` — returns milliseconds until expiry

### 3. Silent Refresh
- [ ] Schedule refresh 60 seconds before token expiry
- [ ] Use `REFRESH_TOKEN_MUTATION`:
```graphql
mutation RefreshToken($refreshToken: String!) {
  refreshToken(refreshToken: $refreshToken) {
    accessToken
    refreshToken
  }
}
```
- [ ] On success: update stored tokens
- [ ] On failure: clear tokens, redirect to login
- [ ] Prevent concurrent refresh attempts (de-duplicate)

### 4. 401 Retry Flow (Apollo Link)
- [ ] On 401 from any GraphQL operation:
  1. Attempt refresh token
  2. If success: retry the failed operation with new token
  3. If failure: logout
- [ ] Queue pending operations during refresh to prevent multiple refresh calls

---

## Implementation Plan

```typescript
// apps/provider/src/lib/token.ts

function decodeJWT(token: string): { exp: number; sub: string; role?: string } | null {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export const tokenManager = {
  getAccessToken: () => typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null,
  getRefreshToken: () => typeof window !== 'undefined' ? localStorage.getItem('refreshToken') : null,
  
  setTokens(access: string, refresh: string) {
    localStorage.setItem('accessToken', access);
    localStorage.setItem('refreshToken', refresh);
    this.scheduleRefresh(access);
  },
  
  clearTokens() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('activeSpId');
    localStorage.removeItem('userSPs');
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
  },
  
  getActiveSpId: () => typeof window !== 'undefined' ? localStorage.getItem('activeSpId') : null,
  setActiveSpId: (id: string) => localStorage.setItem('activeSpId', id),
  
  isExpired(token: string): boolean {
    const decoded = decodeJWT(token);
    if (!decoded) return true;
    return Date.now() >= decoded.exp * 1000;
  },
  
  getExpiresIn(token: string): number {
    const decoded = decodeJWT(token);
    if (!decoded) return 0;
    return Math.max(0, decoded.exp * 1000 - Date.now());
  },
  
  _refreshTimer: null as ReturnType<typeof setTimeout> | null,
  _refreshPromise: null as Promise<boolean> | null,
  
  scheduleRefresh(token: string) {
    const expiresIn = this.getExpiresIn(token);
    const refreshIn = Math.max(0, expiresIn - 60_000); // 60s before expiry
    if (this._refreshTimer) clearTimeout(this._refreshTimer);
    this._refreshTimer = setTimeout(() => this.refresh(), refreshIn);
  },
  
  async refresh(): Promise<boolean> {
    // De-duplicate concurrent refreshes
    if (this._refreshPromise) return this._refreshPromise;
    this._refreshPromise = this._doRefresh();
    const result = await this._refreshPromise;
    this._refreshPromise = null;
    return result;
  },
  
  async _doRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;
    try {
      const res = await fetch('/api/graphql', { /* REFRESH_TOKEN_MUTATION */ });
      const { data } = await res.json();
      this.setTokens(data.refreshToken.accessToken, data.refreshToken.refreshToken);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  },
};
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/token.ts` | Create — centralized token manager |
| `apps/provider/src/lib/api.ts` | Modify — import from tokenManager instead of direct localStorage |
| `apps/provider/src/hooks/useAuth.ts` | Modify — import from tokenManager |

---

## Acceptance Criteria

- [ ] All token access goes through `tokenManager` (no direct localStorage calls elsewhere)
- [ ] JWT payload decoded for expiry checking
- [ ] Silent refresh triggers before token expires
- [ ] Concurrent refresh attempts are de-duplicated
- [ ] Failed refresh clears all tokens and redirects to login
- [ ] Works with SSR — guards against `window`/`localStorage` on server

---

## Dependencies

- **Blocked by**: Task 2.14 (REFRESH_TOKEN_MUTATION)
- **Blocks**: Task 2.4 (useAuth), Task 2.6 (Apollo auth link)
- **Related**: Task 2.1 (login stores tokens)
