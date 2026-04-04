# Task 2.2 — Add ApolloProvider to Root

> **Phase**: 2 — Web App: Foundation & Data Layer
> **File**: `apps/web/src/components/providers.tsx`
> **Reference**: `apps/provider/src/lib/apollo-provider.tsx` (`ApolloWrapper` component)

---

## Objective

Wrap the web app's root component tree in `ApolloProvider` so that all descendant components can use Apollo Client hooks (`useQuery`, `useMutation`, `useLazyQuery`). The provider must be the outermost wrapper so that `AuthProvider` and `NotificationProvider` can also use GraphQL operations if needed.

---

## Current State

```typescript
// apps/web/src/components/providers.tsx — 15 lines
'use client';

import { AuthProvider } from '@/lib/auth-context';
import { NotificationProvider } from '@/lib/notification-context';
import { ToastContainer } from '@/components/ui/toast-container';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <NotificationProvider>
        {children}
        <ToastContainer />
      </NotificationProvider>
    </AuthProvider>
  );
}
```

**Gap**: No `ApolloProvider` wrapping the component tree. Apollo Client hooks will throw "Could not find 'client' in the context" errors if used in any component.

---

## Requirements

### ApolloProvider Integration
- [x] Import `ApolloProvider` from `@apollo/client`
- [x] Import the Apollo client instance from `@/lib/apollo-client`
- [x] Wrap `ApolloProvider` as the **outermost** provider (before `AuthProvider`)
- [x] Ensure `'use client'` directive remains at the top

### Provider Order
- [x] `ApolloProvider` → `AuthProvider` → `NotificationProvider` → `{children}` + `ToastContainer`
- [x] Rationale: Apollo must be outermost so auth and notification contexts can optionally use GraphQL hooks

### Export
- [x] Keep the existing `Providers` function name and named export
- [x] No changes to the layout file (`apps/web/src/app/layout.tsx`) are needed — it already uses `<Providers>`

---

## Implementation Details

### Target State
```typescript
'use client';

import { ApolloProvider } from '@apollo/client';
import { apolloClient } from '@/lib/apollo-client';
import { AuthProvider } from '@/lib/auth-context';
import { NotificationProvider } from '@/lib/notification-context';
import { ToastContainer } from '@/components/ui/toast-container';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <AuthProvider>
        <NotificationProvider>
          {children}
          <ToastContainer />
        </NotificationProvider>
      </AuthProvider>
    </ApolloProvider>
  );
}
```

### Alternative: Dynamic Client (if Task 2.1 exports a factory)
If Task 2.1 exports `getApolloClient()` instead of a singleton:
```typescript
import { useMemo } from 'react';
import { ApolloProvider } from '@apollo/client';
import { getApolloClient } from '@/lib/apollo-client';

export function Providers({ children }: { children: React.ReactNode }) {
  const client = useMemo(() => getApolloClient(), []);
  return (
    <ApolloProvider client={client}>
      {/* ... */}
    </ApolloProvider>
  );
}
```

---

## Verification Checklist

- [x] App renders without errors after adding ApolloProvider
- [x] No "Could not find 'client' in the context" errors in console
- [x] Existing auth flow (login/register/logout) still works
- [x] Existing SSE notifications still work
- [x] `useQuery` from any child component returns data (test with `me` query)
- [x] `'use client'` directive is present at top of file

---

## Dependencies

- **Depends on**: Task 2.1 (Apollo Client must be configured with auth/error links first)
- **Blocks**: Task 2.4 (Custom hooks need ApolloProvider in the tree)

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/components/providers.tsx` | **Target file** — add ApolloProvider |
| `apps/web/src/lib/apollo-client.ts` | Apollo Client instance to import |
| `apps/web/src/app/layout.tsx` | Root layout — already uses `<Providers>` |
| `apps/provider/src/lib/apollo-provider.tsx` | Reference — `ApolloWrapper` component at bottom |
