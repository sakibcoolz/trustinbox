# Task 15.8 — TeamManager Component

> **Section**: 15. Settings  
> **Priority**: P1 — Core settings  
> **Estimated Scope**: Large  
> **Route**: `/settings/team`  
> **File**: `apps/provider/src/app/settings/team/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

The team management page already exists (257 lines) with functional team member CRUD via REST API. This task upgrades it to use GraphQL queries/mutations instead: `teamMembers(spId)`, `inviteTeamMember`, `changeTeamMemberRole`, `removeTeamMember`, `revokeInvitation`.

---

## Current State

`apps/provider/src/app/settings/team/page.tsx` (257 lines):
- Invite form: email + role dropdown (SP_ADMIN, AGENT, ANALYST) → calls `team.invite()`
- Members table: avatar, userId, role (select dropdown), status badge, actions (shield, trash)
- Pending invitations table: email, role, status, expires, revoke action
- Activity log: timeline of recent team actions
- Stats cards: Total Members, Admins, Agents, Pending Invites
- Remove confirmation: inline "Confirm? Remove / Cancel"
- All via REST API (`@/lib/api` → `team.listMembers()`, `team.invite()`, etc.)

### GraphQL Schema

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

enum TeamRole { SP_ADMIN, AGENT, ANALYST }

query teamMembers(serviceProviderId: ID!, limit: Int, offset: Int): TeamMemberConnection!
query pendingInvitations(serviceProviderId: ID!, limit: Int, offset: Int): InvitationConnection!

mutation inviteTeamMember(input: InviteTeamMemberInput!): InviteTeamMemberResult!
mutation acceptInvitation(token: String!): Boolean!
mutation revokeInvitation(invitationId: ID!, serviceProviderId: ID!): Boolean!
mutation changeTeamMemberRole(input: ChangeTeamMemberRoleInput!): Boolean!
mutation removeTeamMember(input: RemoveTeamMemberInput!): Boolean!
```

---

## Requirements

### Migration: REST → GraphQL

Replace all REST API calls with GraphQL:

| Current REST Call | Replace With |
|------------------|--------------|
| `team.listMembers()` | `useQuery(GET_TEAM_MEMBERS)` |
| `team.listInvitations('PENDING')` | `useQuery(GET_PENDING_INVITATIONS)` |
| `team.invite(email, role)` | `useMutation(INVITE_TEAM_MEMBER)` |
| `team.changeRole(userId, role)` | `useMutation(CHANGE_TEAM_MEMBER_ROLE)` |
| `team.removeMember(userId)` | `useMutation(REMOVE_TEAM_MEMBER)` |
| `team.revokeInvitation(id)` | `useMutation(REVOKE_INVITATION)` |

### Preserve Existing UI

- Keep the existing UI layout (invite form, stats cards, members table, invitations table, activity log)
- Keep role dropdown, confirmation flows, error handling pattern
- Update to show `fullName` and `email` from TeamMember instead of just `userId`

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/settings/team/page.tsx` | **Modify** | Replace REST with GraphQL |
| `apps/provider/src/lib/graphql/settings.ts` | **Modify** | Add team management queries/mutations |

---

## Acceptance Criteria

- [ ] Members table fetches from `teamMembers(spId)` GraphQL query
- [ ] Invitations from `pendingInvitations(spId)` query
- [ ] Invite calls `inviteTeamMember` mutation
- [ ] Role change calls `changeTeamMemberRole` mutation
- [ ] Remove calls `removeTeamMember` mutation
- [ ] Revoke calls `revokeInvitation` mutation
- [ ] Shows fullName + email instead of just userId
- [ ] All REST API calls removed
- [ ] Existing UI layout preserved

---

## Dependencies

- **Blocked by**: Tasks 15.10, 15.11 (GraphQL queries/mutations)
- **Blocks**: None
