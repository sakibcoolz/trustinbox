# Task 2.1 — Login Page

> **Section**: 2. Authentication & Authorization — Auth Flow  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium (already partially implemented)  
> **Route**: `/auth/login`  
> **File**: `apps/provider/src/app/auth/login/page.tsx`

---

## Objective

Upgrade the existing login page to use design system components, Apollo Client (GraphQL), proper form validation, and improved UX with password visibility toggle and persistent loading states.

---

## Current State

The login page **exists** with:
- Email/password form with inline Tailwind styles
- `auth.login()` REST call → stores tokens in localStorage
- SP picker (multi-org selection) after login
- Forgot password sub-flow (email submission → success state)
- Dev credentials auto-fill button

### Issues to Address
1. Uses REST (`/api/auth/login`) — should migrate to GraphQL mutation
2. No password visibility toggle icon wired (state exists but Eye/EyeOff not shown)
3. Error messages use raw strings — should use toast system (task 1.7)
4. SP picker is inline in the same component — should be extracted
5. Form validation is minimal — no email format check before submit
6. No "Remember me" checkbox
7. `window.location.href = '/'` hard redirect — should use `router.push()`

---

## Requirements

### 1. UI Upgrades
- [x] Replace inline card with `<Card variant="default" padding="lg">` (task 1.12)
- [x] Add password visibility toggle (Eye/EyeOff icons already imported)
- [x] Add "Remember me" checkbox — saves email to localStorage
- [x] Add loading spinner inside submit button
- [x] Error display uses toast system for network errors, inline for validation
- [x] Focus auto-set to email input on mount

### 2. GraphQL Migration
- [x] Replace `auth.login()` REST call with `LOGIN_MUTATION`
- [x] Replace `profileApi.serviceProviders()` with `MY_SERVICE_PROVIDERS` query
- [x] Use Apollo Client's `useMutation` hook

```graphql
mutation Login($input: LoginInput!) {
  login(input: $input) {
    accessToken
    refreshToken
    user {
      id
      email
      fullName
      username
      role
    }
  }
}
```

### 3. Post-Login Flow
- [x] Store tokens in `localStorage`
- [x] Fetch service providers via GraphQL
- [x] If single SP → set `activeSpId`, navigate to `/`
- [x] If multiple SPs → show SP picker (extract to `<ServiceProviderPicker>`)
- [x] Use `router.push('/')` instead of `window.location.href`

### 4. Form Validation
- [x] Email: required, valid format `^[^\s@]+@[^\s@]+\.[^\s@]+$`
- [x] Password: required, min 1 character (server validates strength)
- [x] Show inline validation errors below each field
- [x] Disable submit when fields are empty or loading

### 5. Extract SP Picker
- [x] Move SP selection UI to `apps/provider/src/components/ServiceProviderPicker.tsx`
- [x] Accept `spList`, `onSelect` props
- [x] Reuse in login and future org-switch scenarios

---

## Implementation Plan

```tsx
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useMutation, useLazyQuery } from '@apollo/client';
import { LOGIN_MUTATION, MY_SERVICE_PROVIDERS_QUERY } from '@/lib/graphql/auth';

export default function LoginPage() {
  const router = useRouter();
  const [login, { loading }] = useMutation(LOGIN_MUTATION);
  const [fetchSPs] = useLazyQuery(MY_SERVICE_PROVIDERS_QUERY);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const { data } = await login({ variables: { input: { email, password } } });
    localStorage.setItem('accessToken', data.login.accessToken);
    localStorage.setItem('refreshToken', data.login.refreshToken);
    
    const { data: spData } = await fetchSPs();
    const sps = spData.myServiceProviders;
    if (sps.length > 1) { setShowSPPicker(true); setSPList(sps); return; }
    if (sps.length === 1) { localStorage.setItem('activeSpId', sps[0].id); }
    router.push('/');
  }
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/auth/login/page.tsx` | Modify — upgrade to GraphQL, add design system |
| `apps/provider/src/components/ServiceProviderPicker.tsx` | Create — extracted SP picker |
| `apps/provider/src/lib/graphql/auth.ts` | Create — LOGIN_MUTATION, MY_SERVICE_PROVIDERS_QUERY |

---

## Acceptance Criteria

- [x] Email/password login works via GraphQL mutation
- [x] Password visibility toggle works
- [x] Loading spinner shows during submission
- [x] Validation errors show inline below fields
- [x] Network errors show via toast
- [x] Multi-org users see SP picker after login
- [x] Single-org users navigate directly to dashboard
- [x] Dev credentials button works in development mode
- [x] Forgot password flow works (can remain REST until backend supports GraphQL)
- [x] "Remember me" pre-fills email from localStorage
- [x] Accessible: form labels, input types, focus management

---

## Dependencies

- **Blocked by**: Task 1.12 (Card), Task 1.7 (Toast), Task 2.6 (Apollo auth link)
- **Blocks**: Task 2.4 (useAuth hook upgrade)
- **Related**: Task 2.2 (register), Task 2.3 (invite)
