# Task 2.14 — GraphQL Auth Mutations (Login, Register, RefreshToken)

> **Section**: 2. Authentication & Authorization — Connected Backend  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/graphql/auth.ts`

---

## Objective

Define all authentication-related GraphQL operations (mutations and queries) used by the auth flow.

---

## Current State

No GraphQL operations defined. Auth uses REST endpoints via `api.ts`.

---

## Requirements

### 1. Mutations

```typescript
// LOGIN_MUTATION
export const LOGIN_MUTATION = gql`
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
`;

// REGISTER_MUTATION
export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
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
`;

// REFRESH_TOKEN_MUTATION
export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken($refreshToken: String!) {
    refreshToken(refreshToken: $refreshToken) {
      accessToken
      refreshToken
    }
  }
`;

// LOGOUT_MUTATION (optional — server-side invalidation)
export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout
  }
`;

// FORGOT_PASSWORD_MUTATION
export const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

// RESET_PASSWORD_MUTATION
export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword)
  }
`;
```

### 2. TypeScript Types

```typescript
export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
  username: string;
  orgName?: string;
  industry?: string;
  legalName?: string;
  website?: string;
  registrationNumber?: string;
  proofIdType?: string;
  taxId?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  authorizedSignatory?: string;
  termsAccepted?: boolean;
}

export interface AuthPayload {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    username: string;
    role: string;
  };
}

export interface TokenPayload {
  accessToken: string;
  refreshToken: string;
}
```

### 3. GraphQL Schema Alignment
- [ ] Verify mutations exist in `gateway/graphql-bff/graph/schema.graphqls`
- [ ] If mutations don't exist, document what needs to be added to the gateway
- [ ] Input types must match gateway schema exactly

---

## Implementation Plan

1. Create `apps/provider/src/lib/graphql/auth.ts` with all operations
2. Create `apps/provider/src/lib/graphql/types.ts` for shared types
3. Ensure typing aligns with gqlgen schema

### Fallback Strategy
If the GraphQL gateway doesn't yet support auth mutations:
- [ ] Keep REST fallback in `api.ts` 
- [ ] Use REST for auth, GraphQL for everything else
- [ ] Document which operations need gateway implementation

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/auth.ts` | Create — all auth mutations + types |
| `apps/provider/src/lib/graphql/types.ts` | Create — shared GraphQL type interfaces |

---

## Acceptance Criteria

- [ ] All 6 mutations defined with proper `gql` template literals
- [ ] TypeScript interfaces for all input/output types
- [ ] Operations importable in auth pages and hooks
- [ ] Types match backend GraphQL schema (or discrepancies documented)

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client setup)
- **Blocks**: Tasks 2.1 (login), 2.2 (register), 2.4 (useAuth), 2.5 (token refresh)
- **Related**: Gateway schema `gateway/graphql-bff/graph/schema.graphqls`
