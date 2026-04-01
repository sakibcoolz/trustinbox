# Task 15.11 — Team Management GraphQL Queries

> **Section**: 15. Settings — Connected Backend  
> **Priority**: P0 — Foundation  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/settings.ts`  
> **Status**: ✅ Complete

---

## Objective

Add team management GraphQL queries to `settings.ts`: `teamMembers(spId)` and `pendingInvitations(spId)`.

---

## GraphQL Schema Reference

```graphql
type TeamMember {
  id: ID!
  userId: ID!
  serviceProviderId: ID!
  username: String!
  email: String!
  fullName: String!
  role: TeamRole!
  status: String!
  createdAt: DateTime!
}

type TeamInvitation {
  id: ID!
  email: String!
  serviceProviderId: ID!
  role: TeamRole!
  status: InvitationStatus!
  invitedBy: ID!
  expiresAt: DateTime!
  createdAt: DateTime!
}

query teamMembers(serviceProviderId: ID!, limit: Int, offset: Int): TeamMemberConnection!
query pendingInvitations(serviceProviderId: ID!, limit: Int, offset: Int): InvitationConnection!
```

---

## Requirements

### Queries

- `GET_TEAM_MEMBERS` — list with pagination
- `GET_PENDING_INVITATIONS` — list pending invitations

### TypeScript Types

```typescript
export interface TeamMember {
  id: string;
  userId: string;
  serviceProviderId: string;
  username: string;
  email: string;
  fullName: string;
  role: 'SP_ADMIN' | 'AGENT' | 'ANALYST';
  status: string;
  createdAt: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  serviceProviderId: string;
  role: 'SP_ADMIN' | 'AGENT' | 'ANALYST';
  status: 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';
  invitedBy: string;
  expiresAt: string;
  createdAt: string;
}
```

### Hooks

```typescript
export function useTeamMembers(spId: string) { ... }
export function usePendingInvitations(spId: string) { ... }
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/settings.ts` | **Modify** | Add team queries + types |

---

## Acceptance Criteria

- [ ] Both queries with pagination
- [ ] TypeScript types for TeamMember and TeamInvitation
- [ ] Hooks with skip logic

---

## Dependencies

- **Blocked by**: Task 15.10 (file creation)
- **Blocks**: Task 15.8
