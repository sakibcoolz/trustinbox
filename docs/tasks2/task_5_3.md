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
- [x] Test invite flow end-to-end:
  - [x] Enter email + select role → Submit → verify invitation appears in Pending table
  - [x] Verify invitation email is sent (or at least backend creates invitation record)
  - [x] Verify gateway `POST /api/team/invitations` calls `organization-service.InviteMember` RPC
- [x] Test role change flow:
  - [x] Change role dropdown → verify backend persists new role
  - [x] Verify gateway `PATCH /api/team/members/role` calls `organization-service.UpdateMemberRole` RPC
- [x] Test remove flow:
  - [x] Click remove → confirm → verify member disappears
  - [x] Verify gateway `DELETE /api/team/members/role` calls `organization-service.RemoveMember` RPC
- [x] Test revoke invitation flow:
  - [x] Click revoke on pending invitation → verify it's removed
  - [x] Verify gateway `POST /api/team/invitations/revoke` works

### 5.3.2 — Add Optimistic Updates and Refetch
- [x] After successful invite:
  - [x] Refetch pending invitations list (`refetchInvitations()`)
  - [x] Or optimistically add the new invitation to the list
- [x] After successful role change:
  - [x] Refetch members list (`refetchMembers()`)
  - [x] Or optimistically update the member's role in the list
- [x] After successful remove:
  - [x] Refetch members list
  - [x] Or optimistically remove from list
- [x] After successful revoke:
  - [x] Refetch invitations list
  - [x] Or optimistically remove the invitation

### 5.3.3 — Add Safety Guards
- [x] Prevent self-removal:
  - [x] Disable "Remove" button for current user's row
  - [x] Or hide it entirely with tooltip: "You cannot remove yourself"
- [x] Prevent last admin removal:
  - [x] If only 1 SP_ADMIN exists → disable remove and role change for that member
  - [x] Show tooltip: "At least one admin is required"
- [x] Prevent self-demotion:
  - [x] Disable role dropdown for current user's row
  - [x] Tooltip: "You cannot change your own role"
- [x] RBAC: hide team page link for non-admin roles
  - [x] Verify settings index page already hides Team card for non-admins
  - [x] Add redirect guard on `team/page.tsx` if non-admin accesses directly

### 5.3.4 — Add Resend Invitation
- [x] Add "Resend" action for pending invitations:
  - [x] Button next to revoke on each pending invitation
  - [x] Calls: revoke old invitation → create new invitation with same email/role
  - [x] Or: dedicated resend endpoint if gateway supports it
  - [x] Toast: "Invitation resent to [email]"
- [x] Add expiry indicator:
  - [x] Show "Expires in 2 days" or "Expired" based on `expiresAt`
  - [x] Visual: warning/error color for near-expiry/expired

### 5.3.5 — Polish UX
- [x] Add loading states on individual actions:
  - [x] "Inviting…" state on invite button
  - [x] Spinner on role change dropdown while saving
  - [x] Spinner on remove button while deleting
  - [x] Spinner on revoke button while revoking
- [x] Add empty states:
  - [x] No team members (unlikely but handle): "No team members yet. Invite your first team member."
  - [x] No pending invitations: "No pending invitations"
  - [x] No activity: "No recent team activity"
- [x] Add member count in page header: "Team Members (5)"
- [x] Add search/filter for members (useful when team grows):
  - [x] Search by name or email
  - [x] Filter by role
- [x] Add pagination for activity log if > 20 entries

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

- [x] Invite: enter email + role → submit → invitation appears in Pending table (after refetch)
- [x] Role change: select new role from dropdown → persists across page reload
- [x] Remove member: click → confirm → member disappears from list
- [x] Revoke invitation: click → invitation disappears from list
- [x] Self-removal prevented: current user's Remove button disabled
- [x] Self-demotion prevented: current user's role dropdown disabled
- [x] Last admin protection: sole SP_ADMIN cannot be demoted or removed
- [x] Non-admin access: AGENT/ANALYST redirected or see "access denied" on team page
- [x] Resend invitation: button works, creates new invite
- [x] Expired invitations: show visual indicator (red "Expired" badge)
- [x] Loading states: buttons show spinner/disabled during API calls
- [x] Error handling: API failures show toast, don't corrupt UI state
- [x] Activity log: shows recent events (invited, accepted, role changed, removed)
- [x] Stats row: accurate counts (total, admins, agents, pending)
