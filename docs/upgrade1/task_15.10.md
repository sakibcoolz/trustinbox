# Task 15.10 — Team Management GraphQL Mutations

> **Section**: 15. Settings — Connected Backend  
> **Priority**: P0 — Foundation  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/graphql/settings.ts`  
> **Status**: ✅ Complete

---

## Objective

Add team management GraphQL mutations to `settings.ts`: `inviteTeamMember`, `acceptInvitation`, `revokeInvitation`, `changeTeamMemberRole`, `removeTeamMember`.

---

## GraphQL Schema Reference

```graphql
mutation inviteTeamMember(input: InviteTeamMemberInput!): InviteTeamMemberResult!
mutation acceptInvitation(token: String!): Boolean!
mutation revokeInvitation(invitationId: ID!, serviceProviderId: ID!): Boolean!
mutation changeTeamMemberRole(input: ChangeTeamMemberRoleInput!): Boolean!
mutation removeTeamMember(input: RemoveTeamMemberInput!): Boolean!

input InviteTeamMemberInput {
  serviceProviderId: ID!
  email: String!
  role: TeamRole!
}

input ChangeTeamMemberRoleInput {
  serviceProviderId: ID!
  targetUserId: ID!
  newRole: TeamRole!
}

input RemoveTeamMemberInput {
  serviceProviderId: ID!
  targetUserId: ID!
}
```

---

## Requirements

### Mutations

- `INVITE_TEAM_MEMBER` → returns `InviteTeamMemberResult { invitationId }`
- `REVOKE_INVITATION` → returns Boolean
- `CHANGE_TEAM_MEMBER_ROLE` → returns Boolean
- `REMOVE_TEAM_MEMBER` → returns Boolean

### Hooks

```typescript
export function useInviteTeamMember(spId: string) {
  return useMutation(INVITE_TEAM_MEMBER, {
    refetchQueries: [
      { query: GET_TEAM_MEMBERS, variables: { serviceProviderId: spId } },
      { query: GET_PENDING_INVITATIONS, variables: { serviceProviderId: spId } },
    ],
  });
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/settings.ts` | **Create or Modify** | Team mutations + hooks |

---

## Acceptance Criteria

- [ ] All 5 mutations defined
- [ ] Hooks with refetch strategies
- [ ] TypeScript input types

---

## Dependencies

- **Blocked by**: None (schema defined)
- **Blocks**: Task 15.8
