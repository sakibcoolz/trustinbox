# Task 2.16 — GraphQL ME Query

> **Section**: 2. Authentication & Authorization — Connected Backend  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/auth.ts`
> **Status**: ✅ Complete

---

## Objective

Define the `me` GraphQL query that returns the current authenticated user's profile, role, and service provider context.

---

## Current State

REST endpoint `GET /api/auth/me` returns:
```typescript
{ id: string; email: string; fullName: string; username: string; role: string }
```

No service provider context or detailed role info included.

---

## Requirements

### 1. ME Query

```typescript
export const ME_QUERY = gql`
  query Me {
    me {
      id
      email
      fullName
      username
      role
      avatarUrl
      phone
      createdAt
      serviceProviders {
        id
        name
        industry
        role
        logoUrl
        plan
        status
      }
      activeServiceProvider {
        id
        name
        industry
        logoUrl
        plan
        status
        memberCount
        createdAt
      }
    }
  }
`;
```

### 2. TypeScript Types

```typescript
export interface MeUser {
  id: string;
  email: string;
  fullName: string;
  username: string;
  role: string;
  avatarUrl?: string;
  phone?: string;
  createdAt: string;
  serviceProviders: ServiceProviderMembership[];
  activeServiceProvider: ServiceProviderDetail | null;
}

export interface ServiceProviderMembership {
  id: string;
  name: string;
  industry: string;
  role: string;
  logoUrl?: string;
  plan?: string;
  status: string;
}

export interface ServiceProviderDetail {
  id: string;
  name: string;
  industry: string;
  logoUrl?: string;
  plan?: string;
  status: string;
  memberCount: number;
  createdAt: string;
}
```

### 3. Usage Context
- [x] Called once on app mount in `AuthProvider` (task 2.4)
- [x] Cached by Apollo — components reading `useAuth()` don't trigger additional requests
- [x] Refetched on: login, SP switch, token refresh

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/auth.ts` | Modify — add ME_QUERY + types |

---

## Acceptance Criteria

- [x] ME_QUERY returns complete user profile with role
- [x] Service providers list includes role per SP
- [x] Active SP includes membership details
- [x] Types exported for use in AuthContext
- [x] Query result shapes match gateway schema

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client)
- **Blocks**: Task 2.4 (AuthContext), Task 2.12 (sidebar user data)
- **Related**: Task 2.17 (multiServiceProvider query)
