# Task 2.3 — Invite Acceptance Page

> **Section**: 2. Authentication & Authorization — Auth Flow  
> **Priority**: P1 — Important  
> **Estimated Scope**: Medium (already implemented, needs upgrade)  
> **Route**: `/auth/invite/[token]`  
> **File**: `apps/provider/src/app/auth/invite/[token]/page.tsx`

---

## Objective

Upgrade the team invitation acceptance page to use design system components and GraphQL mutations.

---

## Current State

The invite page **exists** with:
- Token resolution from Next.js 15 async params
- Three paths: "I'm new" (register), "I have an account" (login), success/error states
- Register form: fullName, email, password, confirmPassword
- Login form: email, password
- REST calls: `auth.login()`, `auth.register()`, `team.acceptInvitation()`

### Issues to Address
1. Uses REST calls — migrate to GraphQL
2. Token validation not shown (should verify token is valid before showing forms)
3. No loading state during token validation
4. Inline Tailwind — should use Card component

---

## Requirements

### 1. Token Validation
- [ ] On mount, call `VALIDATE_INVITATION_QUERY` with token
- [ ] Show loading spinner during validation
- [ ] If valid: show invitation details (org name, inviter name, role)
- [ ] If invalid/expired: show error state with "Go to Login" link

```graphql
query ValidateInvitation($token: String!) {
  validateInvitation(token: $token) {
    valid
    organizationName
    inviterName
    role
    email
    expiresAt
  }
}
```

### 2. Accept Flow — Existing User
- [ ] Pre-fill email from invitation data
- [ ] Login via GraphQL mutation
- [ ] Accept invitation via `ACCEPT_INVITATION_MUTATION`
- [ ] Navigate to dashboard

### 3. Accept Flow — New User
- [ ] Pre-fill email from invitation data (read-only)
- [ ] Minimal registration: fullName, password, confirmPassword
- [ ] Register via GraphQL mutation + accept invitation
- [ ] Navigate to dashboard

### 4. UI Improvements
- [ ] Use `<Card>` component
- [ ] Show org name and role in invitation banner
- [ ] Tab-style toggle: "New Account" / "Existing Account"
- [ ] Success state with confetti or checkmark animation

---

## Implementation Plan

```tsx
export default function InviteAcceptPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string>('');
  const { data, loading, error } = useQuery(VALIDATE_INVITATION_QUERY, {
    variables: { token },
    skip: !token,
  });

  // ... resolve async params, then show:
  // 1. Loading → spinner
  // 2. Invalid → error card
  // 3. Valid → invitation details + register/login tabs
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/auth/invite/[token]/page.tsx` | Modify — GraphQL, design system |
| `apps/provider/src/lib/graphql/auth.ts` | Modify — add VALIDATE_INVITATION_QUERY, ACCEPT_INVITATION_MUTATION |

---

## Acceptance Criteria

- [ ] Token validates on page load with loading state
- [ ] Invalid tokens show clear error message
- [ ] Valid tokens show org name, inviter, and role
- [ ] New user registration works with pre-filled email
- [ ] Existing user login + accept works
- [ ] Success state navigates to dashboard
- [ ] Accessible: form labels, error messages

---

## Dependencies

- **Blocked by**: Task 1.12 (Card), Task 1.17 (Tabs), Task 2.6 (Apollo auth link)
- **Blocks**: Task 2.15 (GraphQL acceptInvitation mutation)
- **Related**: Task 2.1 (login), Task 2.2 (register)
