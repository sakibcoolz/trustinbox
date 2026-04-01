# Task 1.2 — LayoutShell Component

> **Section**: 1. Foundation & Shell  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/components/LayoutShell.tsx`

---

## Objective

Provide the top-level authenticated layout wrapper that conditionally renders the sidebar + header chrome for authenticated users, or passes through raw children for auth pages (login/register/invite).

---

## Current State

```typescript
// apps/provider/src/components/LayoutShell.tsx
'use client';

import { usePathname } from 'next/navigation';
import SidebarWrapper from '@/components/sidebar';
import Header from '@/components/Header';
import { useRequireAuth } from '@/hooks/useAuth';

const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/invite'];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = AUTH_ROUTES.some((r) => pathname.startsWith(r));

  if (isAuthPage) {
    return <>{children}</>;
  }
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-text-muted">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen">
      <SidebarWrapper />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
```

---

## Requirements

### 1. Auth Route Detection
- [x] Detect auth pages by pathname prefix matching (already done)
- [ ] Add `/auth/forgot-password` and `/auth/reset-password` to `AUTH_ROUTES` for future support
- [ ] Handle edge case: trailing slashes (`/auth/login/` should match)

### 2. Loading State
- [x] Full-screen centered spinner while auth state resolves (already done)
- [ ] Add TrustInbox logo above spinner for brand recognition during load
- [ ] Minimum 200ms display to prevent flash-of-loading for fast connections
- [ ] Use skeleton shimmer (task 1.8) for authenticated layout instead of plain spinner

### 3. Auth Guard
- [x] Redirect to `/auth/login` if no user after loading (handled by `useRequireAuth`) (already done)
- [ ] Preserve attempted URL in query param `?redirect=/attempted-path` for post-login redirect
- [ ] Handle token expiry mid-session — show toast + redirect instead of blank page

### 4. Layout Structure
- [x] Flex row: Sidebar (fixed 256px) + main content column (already done)
- [x] Main column: Header (h-14 fixed) + scrollable `<main>` (already done)
- [ ] Add keyboard shortcut overlay (Cmd+K for search) at this level
- [ ] Support sidebar collapse state (via localStorage persisted preference)

### 5. Error Handling
- [ ] Wrap `<main>` content in a React Error Boundary (task 1.10)
- [ ] Catch render errors and show in-place error card without breaking sidebar/header

---

## Implementation Plan

```typescript
'use client';

import { usePathname } from 'next/navigation';
import SidebarWrapper from '@/components/sidebar';
import Header from '@/components/Header';
import { useRequireAuth } from '@/hooks/useAuth';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const AUTH_ROUTES = ['/auth/login', '/auth/register', '/auth/invite', '/auth/forgot-password', '/auth/reset-password'];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const normalizedPath = pathname.replace(/\/+$/, '');
  const isAuthPage = AUTH_ROUTES.some((r) => normalizedPath.startsWith(r));

  if (isAuthPage) {
    return <>{children}</>;
  }
  return <AuthenticatedShell>{children}</AuthenticatedShell>;
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-primary">
        <div className="text-center">
          <p className="text-lg font-semibold text-accent-blue mb-4">TrustInbox</p>
          <div className="w-8 h-8 border-2 border-accent-blue border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-text-muted">Loading provider portal…</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-screen bg-bg-primary">
      <SidebarWrapper />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/LayoutShell.tsx` | Modify — add error boundary, redirect preserve, logo |
| `apps/provider/src/components/ErrorBoundary.tsx` | Create (see task 1.10) |

---

## Acceptance Criteria

- [ ] Auth pages render without sidebar/header
- [ ] Authenticated pages render with sidebar + header + scrollable main
- [ ] Loading spinner shows with brand logo during auth resolution
- [ ] Redirect to login preserves original URL as `?redirect=` param
- [ ] Render errors in page content caught by error boundary, don't break shell
- [ ] No flash of unauthenticated content before redirect
- [ ] Height is exactly viewport — no overflow on body, scrolling only in `<main>`

---

## Dependencies

- **Blocked by**: Task 1.1 (root layout)
- **Blocks**: All feature pages (they render inside this shell)
- **Related**: Task 1.3 (sidebar), Task 1.4 (header), Task 1.10 (error boundary), Task 2.4 (useAuth hook)
