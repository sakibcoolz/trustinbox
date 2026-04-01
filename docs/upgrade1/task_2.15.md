# Task 2.15 — GraphQL AcceptInvitation Mutation

> **Section**: 2. Authentication & Authorization — Connected Backend  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/auth.ts`
> **Status**: ✅ Complete

---

## Objective

Define the GraphQL operations for team invitation acceptance and validation.

---

## Current State

Invitation acceptance uses REST: `team.acceptInvitation(token)` in `api.ts`. No GraphQL operations defined.

---

## Requirements

### 1. Mutations

```typescript
export const ACCEPT_INVITATION_MUTATION = gql`
  mutation AcceptInvitation($token: String!) {
    acceptInvitation(token: $token) {
      success
      serviceProvider {
        id
        name
        industry
      }
    }
  }
`;
```

### 2. Queries

```typescript
export const VALIDATE_INVITATION_QUERY = gql`
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
`;
```

### 3. TypeScript Types

```typescript
export interface InvitationValidation {
  valid: boolean;
  organizationName: string;
  inviterName: string;
  role: string;
  email: string;
  expiresAt: string;
}

export interface AcceptInvitationPayload {
  success: boolean;
  serviceProvider: {
    id: string;
    name: string;
    industry: string;
  };
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/auth.ts` | Modify — add invitation operations |

---

## Acceptance Criteria

- [x] `VALIDATE_INVITATION_QUERY` returns invitation details or invalid status
- [x] `ACCEPT_INVITATION_MUTATION` joins user to the org
- [x] Types are properly defined and exported
- [x] Used in task 2.3 (invite acceptance page)

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client), Task 2.14 (auth.ts file created)
- **Blocks**: Task 2.3 (invite page upgrade)
- **Related**: Gateway schema team/invitation types
