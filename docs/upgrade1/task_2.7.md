# Task 2.7 — Auth Middleware

> **Section**: 2. Authentication & Authorization — Auth Flow  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/middleware.ts`

---

## Objective

Upgrade the Next.js middleware to validate authentication state server-side and redirect unauthenticated users before page rendering.

---

## Current State

```typescript
const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/invite'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/favicon')) return NextResponse.next();
  // Client-side auth check via useRequireAuth handles the redirect for SPA
  return NextResponse.next();
}
```

**Issue**: Middleware does NOT check for authentication — it relies entirely on client-side `useRequireAuth()`. This causes a flash of loading content on every protected page.

---

## Requirements

### 1. Cookie-Based Token Check
- [x] Set `accessToken` as an HTTP-only cookie on login (in addition to localStorage)
- [x] Or: Set a non-HTTP-only `auth-status` cookie (value: `"1"`) as a lightweight flag
- [x] Middleware checks for the cookie — if absent, redirect to `/auth/login`

> **Note**: We can't read localStorage in middleware (runs on Edge Runtime). The simplest approach is a lightweight `auth-status` cookie set by the client after login.

### 2. Redirect Logic
- [x] Unauthenticated → redirect to `/auth/login?redirect={pathname}`
- [x] Authenticated on `/auth/login` → redirect to `/`
- [x] Preserve query params in redirect

### 3. Public Paths
- [x] `/auth/login`
- [x] `/auth/register`
- [x] `/auth/invite/[token]`
- [x] `/auth/forgot-password`
- [x] `/auth/reset-password`
- [x] `/_next/*`, `/api/*`, `/favicon.ico`

---

## Implementation Plan

```typescript
// apps/provider/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/auth/login', '/auth/register', '/auth/invite', '/auth/forgot-password', '/auth/reset-password'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static/api assets
  if (pathname.startsWith('/_next') || pathname.startsWith('/api') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
  const hasAuth = request.cookies.get('auth-status')?.value === '1';

  // Redirect authenticated users away from auth pages
  if (isPublicPath && hasAuth) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // Redirect unauthenticated users to login
  if (!isPublicPath && !hasAuth) {
    const loginUrl = new URL('/auth/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

### Cookie Management (client-side)
```typescript
// In tokenManager.setTokens():
document.cookie = 'auth-status=1; path=/; max-age=604800; SameSite=Lax';

// In tokenManager.clearTokens():
document.cookie = 'auth-status=; path=/; max-age=0';
```

### Login Page — Handle Redirect
```tsx
// After successful login:
const searchParams = new URLSearchParams(window.location.search);
const redirect = searchParams.get('redirect') || '/';
router.push(redirect);
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/middleware.ts` | Modify — add auth cookie check |
| `apps/provider/src/lib/token.ts` | Modify — set/clear `auth-status` cookie |
| `apps/provider/src/app/auth/login/page.tsx` | Modify — read `redirect` query param |

---

## Acceptance Criteria

- [x] Unauthenticated users are redirected to `/auth/login` from any protected route
- [x] Redirect URL preserved in `?redirect=` param
- [x] After login, user returns to the originally requested page
- [x] Authenticated users visiting `/auth/login` are redirected to `/`
- [x] No flash of unauthenticated content on protected pages
- [x] Public pages (login, register, invite) accessible without auth

---

## Dependencies

- **Blocked by**: Task 2.5 (tokenManager — cookie management)
- **Blocks**: None (enhancement over existing client-side redirect)
- **Related**: Task 2.4 (useRequireAuth still acts as fallback)
