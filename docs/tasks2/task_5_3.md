# Task 5.3 — Settings → Team Sub-Page Polish

> **Phase**: 5 — Provider Portal: Completion
> **Task**: 5.3 — Settings → Team Management
> **File**: `apps/provider/src/app/settings/team/page.tsx` (352 lines — exists, largely wired)
> **Dependencies**: `organization-service` (team RPCs), `gateway/graphql-bff/cmd/server/team_handlers.go` (REST endpoints)
> **Data Sources**: `@/lib/graphql/settings` (all team hooks)

---

## Objective

Verify and polish the existing team management page — ensure all CRUD operations (invite, role change, remove, revoke) are fully wired to backend via gateway REST endpoints, add optimistic UI updates, add RBAC guards, and polish edge cases like self-removal prevention and last admin protection.

---

## Current State

### Team Page — Substantially Complete (352 lines)
```typescript
// apps/provider/src/app/settings/team/page.tsx
// ✅ Header with refresh button and "Invite Member" button
// ✅ Invite form: email + role selector (SP_ADMIN/AGENT/ANALYST)
// ✅ Stats row: total members, admins, agents, pending invites
// ✅ Members table: avatar/name/email, role dropdown, status badge, joined date, remove button + confirm
// ✅ Pending Invitations table: email, role, status, expiry, revoke action
// ✅ Team Activity Log: recent entries with typed icons
// ✅ Error state display
```

### Team Hooks — All Wired
```typescript
// apps/provider/src/lib/graphql/settings.ts
export function useTeamMembers(spId: string)            // GET /api/team/members
export function usePendingInvitations(spId: string)      // GET /api/team/invitations
export function useInviteTeamMember(spId: string)        // POST /api/team/invitations
export function useRevokeInvitation(spId: string)        // POST /api/team/invitations/revoke
export function useChangeTeamMemberRole(spId: string)    // PATCH /api/team/members/role
export function useRemoveTeamMember(spId: string)        // DELETE /api/team/members/role
export function useTeamActivity(spId: string)            // GET /api/gateway/v1/team-activity
```

### Gateway REST Endpoints — 369 lines
```go
// gateway/graphql-bff/cmd/server/team_handlers.go
// ✅ handleTeamMembers — GET members with user profile enrichment, POST operations
// ✅ invite, revoke, change role, remove member
// ✅ Uses org-service gRPC + user-service gRPC for profile enrichment
```

### Handlers Wired — But Need Verification
```typescript
// Current invite flow:
async function handleInvite(e: React.FormEvent) {
  await inviteTeamMember(inviteEmail, inviteRole);
  // ✅ Calls POST /api/team/invitations
  // ⚠️ No refetch after success — list may not update
}

// Current role change:
async function handleRoleChange(userId: string, newRole: string) {
  await changeRole(userId, newRole as TeamRole);
  // ⚠️ No refetch after success
}

// Current remove:
async function handleRemove(userId: string) {
  await removeMember(userId);
  // ⚠️ No refetch after success
}
```

---

## Requirements

### 5.3.1 — Verify End-to-End Wiring
- [ ] Test invite flow end-to-end:
  - [ ] Enter email + select role → Submit → verify invitation appears in Pending table
  - [ ] Verify invitation email is sent (or at least backend creates invitation record)
  - [ ] Verify gateway `POST /api/team/invitations` calls `organization-service.InviteMember` RPC
- [ ] Test role change flow:
  - [ ] Change role dropdown → verify backend persists new role
  - [ ] Verify gateway `PATCH /api/team/members/role` calls `organization-service.UpdateMemberRole` RPC
- [ ] Test remove flow:
  - [ ] Click remove → confirm → verify member disappears
  - [ ] Verify gateway `DELETE /api/team/members/role` calls `organization-service.RemoveMember` RPC
- [ ] Test revoke invitation flow:
  - [ ] Click revoke on pending invitation → verify it's removed
  - [ ] Verify gateway `POST /api/team/invitations/revoke` works

### 5.3.2 — Add Optimistic Updates and Refetch
- [ ] After successful invite:
  - [ ] Refetch pending invitations list (`refetchInvitations()`)
  - [ ] Or optimistically add the new invitation to the list
- [ ] After successful role change:
  - [ ] Refetch members list (`refetchMembers()`)
  - [ ] Or optimistically update the member's role in the list
- [ ] After successful remove:
  - [ ] Refetch members list
  - [ ] Or optimistically remove from list
- [ ] After successful revoke:
  - [ ] Refetch invitations list
  - [ ] Or optimistically remove the invitation

### 5.3.3 — Add Safety Guards
- [ ] Prevent self-removal:
  - [ ] Disable "Remove" button for current user's row
  - [ ] Or hide it entirely with tooltip: "You cannot remove yourself"
- [ ] Prevent last admin removal:
  - [ ] If only 1 SP_ADMIN exists → disable remove and role change for that member
  - [ ] Show tooltip: "At least one admin is required"
- [ ] Prevent self-demotion:
  - [ ] Disable role dropdown for current user's row
  - [ ] Tooltip: "You cannot change your own role"
- [ ] RBAC: hide team page link for non-admin roles
  - [ ] Verify settings index page already hides Team card for non-admins
  - [ ] Add redirect guard on `team/page.tsx` if non-admin accesses directly

### 5.3.4 — Add Resend Invitation
- [ ] Add "Resend" action for pending invitations:
  - [ ] Button next to revoke on each pending invitation
  - [ ] Calls: revoke old invitation → create new invitation with same email/role
  - [ ] Or: dedicated resend endpoint if gateway supports it
  - [ ] Toast: "Invitation resent to [email]"
- [ ] Add expiry indicator:
  - [ ] Show "Expires in 2 days" or "Expired" based on `expiresAt`
  - [ ] Visual: warning/error color for near-expiry/expired

### 5.3.5 — Polish UX
- [ ] Add loading states on individual actions:
  - [ ] "Inviting…" state on invite button
  - [ ] Spinner on role change dropdown while saving
  - [ ] Spinner on remove button while deleting
  - [ ] Spinner on revoke button while revoking
- [ ] Add empty states:
  - [ ] No team members (unlikely but handle): "No team members yet. Invite your first team member."
  - [ ] No pending invitations: "No pending invitations"
  - [ ] No activity: "No recent team activity"
- [ ] Add member count in page header: "Team Members (5)"
- [ ] Add search/filter for members (useful when team grows):
  - [ ] Search by name or email
  - [ ] Filter by role
- [ ] Add pagination for activity log if > 20 entries

---

## Implementation Details

### Safety Guards

```tsx
// In members table — determine if row actions should be disabled:
const currentUserId = /* from useAuth() */;
const adminCount = members.filter(m => m.role === 'SP_ADMIN').length;

{members.map((member) => {
  const isSelf = member.userId === currentUserId;
  const isLastAdmin = member.role === 'SP_ADMIN' && adminCount <= 1;

  return (
    <tr key={member.id}>
      {/* ... name, email, status ... */}
      <td>
        <select
          value={member.role}
          onChange={(e) => handleRoleChange(member.userId, e.target.value)}
          disabled={isSelf || isLastAdmin}
          className="..."
          title={isSelf ? 'Cannot change own role' : isLastAdmin ? 'Last admin cannot be demoted' : ''}
        >
          {roleOptions.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
        </select>
      </td>
      <td>
        <button
          onClick={() => setConfirmRemove(member.userId)}
          disabled={isSelf || isLastAdmin}
          className="..."
          title={isSelf ? 'Cannot remove yourself' : isLastAdmin ? 'Last admin cannot be removed' : 'Remove member'}
        >
          <Trash2 size={14} />
        </button>
      </td>
    </tr>
  );
})}
```

### Refetch After Mutations

```typescript
// Wire refetch into each handler:
async function handleInvite(e: React.FormEvent) {
  e.preventDefault();
  if (!inviteEmail) return;
  setError('');
  try {
    await inviteTeamMember(inviteEmail, inviteRole);
    setInviteEmail('');
    setShowInvite(false);
    toast.success('Invitation sent');
    refetchInvitations();  // ← add this
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to send invitation');
  }
}

async function handleRoleChange(userId: string, newRole: string) {
  try {
    await changeRole(userId, newRole as TeamRole);
    toast.success('Role updated');
    refetchMembers();  // ← add this
  } catch (err) { /* ... */ }
}

async function handleRemove(userId: string) {
  try {
    await removeMember(userId);
    setConfirmRemove(null);
    toast.success('Member removed');
    refetchMembers();  // ← add this
  } catch (err) { /* ... */ }
}

async function handleRevokeInvitation(invitationId: string) {
  try {
    await revokeInvitation(invitationId);
    toast.success('Invitation revoked');
    refetchInvitations();  // ← add this
  } catch (err) { /* ... */ }
}
```

---

## Verification

- [ ] Invite: enter email + role → submit → invitation appears in Pending table (after refetch)
- [ ] Role change: select new role from dropdown → persists across page reload
- [ ] Remove member: click → confirm → member disappears from list
- [ ] Revoke invitation: click → invitation disappears from list
- [ ] Self-removal prevented: current user's Remove button disabled
- [ ] Self-demotion prevented: current user's role dropdown disabled
- [ ] Last admin protection: sole SP_ADMIN cannot be demoted or removed
- [ ] Non-admin access: AGENT/ANALYST redirected or see "access denied" on team page
- [ ] Resend invitation: button works, creates new invite
- [ ] Expired invitations: show visual indicator (red "Expired" badge)
- [ ] Loading states: buttons show spinner/disabled during API calls
- [ ] Error handling: API failures show toast, don't corrupt UI state
- [ ] Activity log: shows recent events (invited, accepted, role changed, removed)
- [ ] Stats row: accurate counts (total, admins, agents, pending)
