# Task 5.7 — Conversation Agent Assignment

> **Phase**: 5 — Provider Portal: Completion
> **Goal**: Verify AgentAssignDrawer wiring, add transfer-with-note capability, build supervisor view with agent-based filtering, add unassigned queue mode, and surface agent workload indicators in the conversation list.
> **Primary Files**: `apps/provider/src/components/conversations/AgentAssignDrawer.tsx`, `apps/provider/src/app/conversations/page.tsx`
> **Reference Files**: `apps/provider/src/lib/graphql/conversations.ts`, `apps/provider/src/app/conversations/[id]/page.tsx`

---

## Objective

The `AgentAssignDrawer` component (210 lines) already provides core agent assignment with search, workload indicators, and assign/unassign actions. Task 5.7 builds on this foundation to add transfer-with-note, a supervisor view for managing all open conversations by agent, an unassigned queue for prioritizing conversations without an owner, and inline workload indicators on the conversation list cards.

---

## Current State

### AgentAssignDrawer (`components/conversations/AgentAssignDrawer.tsx`, 210 lines)

```tsx
interface AgentAssignDrawerProps {
  open: boolean;
  onClose: () => void;
  conversationId: string;
  currentAssigneeId?: string;
}

export function AgentAssignDrawer({ open, onClose, conversationId, currentAssigneeId }: AgentAssignDrawerProps) {
  // Uses useTeamMembers(spId, 'AGENT') — fetches agents for the SP
  // Uses useAssignConversation() — POST /api/gateway/v1/conversations/{id}/assign

  // handleAssign(agentId, name): assigns conversation, shows toast, closes drawer
  // handleUnassign(): assigns with empty string, shows toast, closes drawer
}
```

**Workload indicators already implemented:**
```tsx
function getWorkloadColor(count: number): string {
  if (count <= 3) return 'bg-status-success';   // Green — Low
  if (count <= 7) return 'bg-status-warning';    // Yellow — Moderate
  return 'bg-status-error';                       // Red — High
}

function AgentRow({ member, isCurrent, ... }) {
  // Shows: avatar (initials or image) | name + role | workload dot + count + label
}
```

### Conversations Page (`app/conversations/page.tsx`, 418 lines)

```tsx
// Stats: Open / Closed / Archived / Unread (4 cards)
// Filters: status chips (All/Open/Closed/Archived), unread toggle, sort dropdown
// Search: debounced search by name/VID/message
// List: infinite scroll with ConversationCard components
// URL state: ?status=, ?unread=, ?sort=, ?q=, ?offset=

function ConversationCard({ conversation: conv }) {
  // Shows: avatar | VID + status badge + unread count | last message preview | time + assignee
  // Assignee display: Bot icon (purple) or User icon (blue) + name
}
```

### Hooks (`lib/graphql/conversations.ts`)

```tsx
// TeamMember type:
interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  activeConversations: number;  // Used for workload indicators
}

// Available hooks:
useTeamMembers(spId, role?)      // GET /api/team/members?role=AGENT
useAssignConversation()          // POST /api/gateway/v1/conversations/{id}/assign { agentId }
useConversations(options)        // GET /api/conversations?status=&search=&...
useConversationStats(spId)       // GET /api/gateway/conversations/stats
useArchiveConversation()         // POST /api/gateway/v1/conversations/{id}/archive

// ConversationListOptions:
interface ConversationListOptions {
  status?: string;
  search?: string;
  unreadOnly?: boolean;
  orderBy?: { field: string; direction: string };
  limit?: number;
  offset?: number;
}
```

### What's Missing

1. **Transfer flow**: No way to reassign from one agent to another with a transfer note/reason
2. **Supervisor view**: No way to filter conversations by assigned agent
3. **Unassigned queue**: No dedicated mode to see conversations without an assignee
4. **Workload in list**: Conversation cards don't show agent workload inline
5. **No refetch**: After assign/unassign, the conversation list doesn't refresh

---

## Requirements

### Sub-task 5.7.1 — Verify End-to-End Assignment Wiring

- [ ] Verify AgentAssignDrawer is rendered from the conversation detail page:
  - Check `app/conversations/[id]/page.tsx` for an "Assign" button that opens the drawer
  - If missing, add an "Assign Agent" button in the conversation header
- [ ] Verify `useAssignConversation()` mutation completes successfully:
  - POST to `/api/gateway/v1/conversations/{id}/assign` with `{ agentId }`
  - Verify the gateway handler exists and routes to `communication-service`
  - Check that the conversation's `assignee` field updates after mutation
- [ ] Add list refetch after assignment:
  - After `handleAssign` or `handleUnassign`, trigger a refetch of the conversation detail
  - If opened from the conversations list, also refresh the list (pass a callback prop or use a shared refetch trigger)
- [ ] Verify assign/unassign toast messages show correctly
- [ ] Test edge cases:
  - Assigning when already assigned (should reassign, not error)
  - Unassigning when already unassigned (no-op or graceful handling)
  - Assigning to self

### Sub-task 5.7.2 — Transfer with Note

- [ ] Extend `AgentAssignDrawer` to support transfer mode:
  - When `currentAssigneeId` is set, show a "Transfer" header instead of "Assign"
  - Add an optional transfer note textarea above the agent list:
    ```tsx
    {currentAssigneeId && (
      <div className="px-4 pb-3">
        <label className="block text-xs text-text-muted mb-1.5">Transfer Note (optional)</label>
        <textarea
          value={transferNote}
          onChange={(e) => setTransferNote(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm text-text-primary resize-none placeholder:text-text-muted focus:outline-none focus:border-border-active"
          placeholder="Reason for transfer…"
        />
      </div>
    )}
    ```
- [ ] Update `handleAssign` to include the transfer note:
  ```tsx
  async function handleAssign(agentId: string, name: string) {
    await assignConversation(conversationId, agentId, transferNote || undefined);
    success(`Conversation transferred to ${name}`);
  }
  ```
- [ ] Add `useTransferConversation()` hook (or extend `useAssignConversation`) to support the note:
  ```tsx
  export function useTransferConversation() {
    const { run, loading, error } = useMutationHelper();
    return {
      transfer: (conversationId: string, agentId: string, note?: string) =>
        run(`/api/gateway/v1/conversations/${conversationId}/transfer`, 'POST', { agentId, note }),
      loading,
      error,
    };
  }
  ```
- [ ] Show the current assignee's name at the top of the drawer when in transfer mode:
  ```tsx
  {currentAssigneeId && currentAgent && (
    <div className="px-4 pb-2 flex items-center gap-2 text-xs text-text-muted">
      <span>Currently assigned to</span>
      <span className="font-medium text-text-secondary">{currentAgent.name}</span>
    </div>
  )}
  ```
- [ ] Highlight the "from" agent (current assignee) differently from the "to" agent list

### Sub-task 5.7.3 — Supervisor View (Filter by Agent)

- [ ] Add "Assigned To" filter to the conversations page:
  - New filter chip row or dropdown beside existing status chips
  - Options: "All Agents", "Me", each agent by name, "Unassigned"
  - URL state: `?assignee=<agentId>` or `?assignee=unassigned`
- [ ] Fetch team members for the filter dropdown:
  ```tsx
  const { data: teamData } = useTeamMembers(spId);
  const agents = teamData?.teamMembers ?? [];

  const ASSIGNEE_OPTIONS = [
    { value: 'all', label: 'All Agents' },
    { value: 'me', label: 'My Conversations' },
    { value: 'unassigned', label: 'Unassigned' },
    ...agents.map(a => ({ value: a.id, label: a.name })),
  ];
  ```
- [ ] Pass the assignee filter to `useConversations`:
  - Extend `ConversationListOptions` with `assigneeId?: string`:
    ```tsx
    interface ConversationListOptions {
      // ...existing
      assigneeId?: string;
    }
    ```
  - Add to query params: `if (options.assigneeId) params.set('assigneeId', options.assigneeId);`
- [ ] Update the conversations API route to accept and forward the `assigneeId` parameter
- [ ] Add agent workload summary bar at the top (visible only for SP_ADMIN/supervisor):
  ```tsx
  {hasPermission('conversations:manage') && agents.length > 0 && (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {agents.map(agent => (
        <button
          key={agent.id}
          onClick={() => updateUrl({ assignee: agent.id })}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border shrink-0 ${
            assigneeFilter === agent.id
              ? 'border-accent-blue bg-accent-blue/5'
              : 'border-border-secondary hover:border-border-active'
          }`}
        >
          <div className={`w-2 h-2 rounded-full ${getWorkloadColor(agent.activeConversations)}`} />
          <span className="text-xs font-medium">{agent.name}</span>
          <span className="text-[10px] text-text-muted">{agent.activeConversations}</span>
        </button>
      ))}
    </div>
  )}
  ```

### Sub-task 5.7.4 — Unassigned Queue

- [ ] Add "Unassigned" as a first-class filter option:
  - Quick-access button in the stats cards row (or beside Open/Closed/Archived/Unread):
    ```tsx
    <StatCard
      label="Unassigned"
      value={stats ? formatNumber(stats.unassigned ?? 0) : '—'}
      color="text-status-warning"
      onClick={() => updateUrl({ assignee: 'unassigned', status: 'OPEN' })}
      active={assigneeFilter === 'unassigned'}
    />
    ```
- [ ] Add unassigned count to `ConversationStats` type (if not already present):
  ```tsx
  interface ConversationStats {
    open: number;
    closed: number;
    archived: number;
    unreadTotal: number;
    unassigned: number;  // NEW
  }
  ```
- [ ] When in unassigned queue mode:
  - Show a yellow banner: "Showing unassigned conversations — click 'Assign' on any conversation to claim it"
  - Add a "Claim" quick-action button on each conversation card that assigns to the current user:
    ```tsx
    {assigneeFilter === 'unassigned' && (
      <button
        onClick={(e) => { e.preventDefault(); handleQuickClaim(conv.id); }}
        className="px-2.5 py-1 bg-accent-blue/10 text-accent-blue rounded-lg text-xs font-medium hover:bg-accent-blue/20 transition-colors"
      >
        Claim
      </button>
    )}
    ```
- [ ] Implement `handleQuickClaim`:
  ```tsx
  const { assign } = useAssignConversation();
  async function handleQuickClaim(conversationId: string) {
    await assign(conversationId, currentUserId);
    success('Conversation claimed');
    // Refresh list
  }
  ```

### Sub-task 5.7.5 — Agent Workload Indicators in Conversation List

- [ ] Add an inline workload dot next to the assignee name in `ConversationCard`:
  - Requires knowing the agent's `activeConversations` count
  - Option A: Enrich conversation data to include `assignee.activeConversations` from backend
  - Option B: Build a local lookup map from `useTeamMembers` data:
    ```tsx
    const agentWorkloadMap = useMemo(() => {
      const map = new Map<string, number>();
      agents.forEach(a => map.set(a.id, a.activeConversations));
      return map;
    }, [agents]);
    ```
- [ ] Update `ConversationCard` to show workload:
  ```tsx
  {conv.assignee && (
    <p className="text-xs text-text-muted mt-1 flex items-center gap-1 justify-end">
      {isBot ? (
        <Bot size={12} className="text-accent-purple" />
      ) : (
        <>
          <User size={12} className="text-accent-blue" />
          {agentWorkload !== undefined && (
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${getWorkloadColor(agentWorkload)}`} />
          )}
        </>
      )}
      <span className="truncate max-w-[120px]">{conv.assignee.name}</span>
    </p>
  )}
  ```
- [ ] Show "Unassigned" badge on cards with no assignee:
  ```tsx
  {!conv.assignee && (
    <StatusBadge variant="warning" size="sm">Unassigned</StatusBadge>
  )}
  ```
- [ ] Import `getWorkloadColor` from `AgentAssignDrawer` or move it to a shared location:
  - Consider moving to `lib/graphql/conversations.ts` or a shared `lib/utils/workload.ts`:
    ```tsx
    // lib/utils/workload.ts
    export function getWorkloadColor(count: number): string { ... }
    export function getWorkloadLabel(count: number): string { ... }
    ```

---

## Implementation Notes

### Communication Service Dependency

The `communication-service` tracks conversation ownership. Verify these RPCs exist or need to be created:
- `AssignConversation(conversation_id, agent_id)` — existing (used by `useAssignConversation`)
- `TransferConversation(conversation_id, to_agent_id, note)` — may need to be added
- `ListConversations(assignee_id filter)` — verify the filter is supported

### Gateway Endpoints

| Action | Endpoint | Method |
|--------|----------|--------|
| Assign | `/api/gateway/v1/conversations/{id}/assign` | POST |
| Transfer | `/api/gateway/v1/conversations/{id}/transfer` | POST (new) |
| List with filter | `/api/conversations?assigneeId={id}` | GET (extend) |
| Stats with unassigned | `/api/gateway/conversations/stats` | GET (extend) |

### Permission Checks

- **Assign**: Any agent can assign to themselves or another agent (if they have `conversations:manage`)
- **Transfer**: Requires `conversations:manage` or being the current assignee
- **Supervisor view**: Only `SP_ADMIN` or users with `conversations:manage` can see all agents' conversations
- **Quick claim**: Any agent with `conversations:respond` can claim unassigned conversations

### Workload Helper Location

Currently in `AgentAssignDrawer.tsx`:
```tsx
function getWorkloadColor(count: number): string { ... }
function getWorkloadLabel(count: number): string { ... }
```
Move to shared utility since it will be needed in both the drawer and conversation list.

---

## Verification Checklist

- [ ] AgentAssignDrawer opens from conversation detail page with "Assign" button
- [ ] Assigning an agent updates the conversation and shows a success toast
- [ ] Unassigning clears the assignee and shows a success toast
- [ ] Conversation list refreshes after assign/unassign
- [ ] Transfer mode: shows current assignee, transfer note textarea, and "Transfer" header
- [ ] Transfer note is sent with the reassignment request
- [ ] Supervisor view: "Assigned To" filter dropdown appears for users with `conversations:manage`
- [ ] Filtering by agent shows only that agent's conversations
- [ ] "My Conversations" filter shows only the current user's assigned conversations
- [ ] "Unassigned" filter shows conversations with no assignee
- [ ] Unassigned count appears in the stats row
- [ ] "Claim" button in unassigned queue mode assigns conversation to the current user
- [ ] Agent workload dot appears next to assignee name in conversation cards
- [ ] "Unassigned" badge appears on cards without an assignee
- [ ] Agent workload summary bar shows for supervisors with correct workload colors
- [ ] Workload colors are consistent: green (≤3), yellow (≤7), red (>7)
- [ ] All URL state params (`?assignee=`) persist across navigation and page refresh
