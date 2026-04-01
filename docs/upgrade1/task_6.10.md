# Task 6.10 — Agent Assignment

> **Section**: 6. Conversations  
> **Priority**: P1  
> **Estimated Scope**: Medium  
> **Route**: `/conversations/[id]`  
> **File**: `apps/provider/src/components/conversations/AgentAssignDrawer.tsx`

---

## Objective

Implement agent assignment functionality that allows SP_ADMIN and CONTENT_MANAGER to assign a conversation to a specific team member with the AGENT role, showing a searchable team member list with current workload.

---

## Current State

No assignment functionality exists. The conversation detail page shows a hardcoded `assignee` field in `convInfo`.

---

## Requirements

### 1. Agent Selector
- Opens as dropdown or small drawer from "Assign to Agent" action
- Searchable list of team members with AGENT+ role
- Each row shows: avatar, name, role, current conversation count (workload)
- Current assignee has checkmark indicator
- "Unassign" option at top (if currently assigned)

### 2. Assignment Data

```typescript
interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
  activeConversations: number; // workload indicator
}
```

### 3. Assignment Flow
1. Open agent selector
2. Search/scroll to find agent
3. Click agent name
4. Optimistic update: assignee changes immediately
5. System message added: "Conversation assigned to [Agent Name]"
6. Toast: "Conversation assigned to [Name]"

### 4. GraphQL Integration

```graphql
mutation AssignConversation($conversationId: ID!, $agentId: ID!) {
  assignConversation(conversationId: $conversationId, agentId: $agentId) {
    id
    assignee { id fullName }
  }
}
```

> **Note**: If mutation doesn't exist in schema, define the interface now and mark as backend dependency.
> **Status**: ✅ Complete

### 5. Permissions
- Requires: `conversations:manage` (SP_ADMIN, CONTENT_MANAGER)
- Agents cannot self-assign (enforced by button visibility, not hard block)

### 6. Workload Indicator
- Green (0-3 active): low workload
- Yellow (4-7 active): moderate workload
- Red (8+ active): high workload
- Helps admins balance conversation distribution

---

## Implementation Plan

```tsx
// apps/provider/src/components/conversations/AgentAssignDrawer.tsx
import { useState } from 'react';
import { Search, Check, User } from 'lucide-react';
import { useTeamMembers } from '@/lib/graphql/settings';
import { useMutation } from '@apollo/client';

export function AgentAssignDrawer({ conversationId, currentAssigneeId, onClose }: Props) {
  const [search, setSearch] = useState('');
  const { data } = useTeamMembers({ role: 'AGENT' });
  const [assign, { loading }] = useMutation(ASSIGN_CONVERSATION);

  const members = (data?.teamMembers ?? []).filter(m =>
    m.fullName.toLowerCase().includes(search.toLowerCase())
  );

  async function handleAssign(agentId: string) {
    await assign({ variables: { conversationId, agentId } });
    onClose();
  }

  function workloadColor(count: number) {
    if (count <= 3) return 'text-status-success';
    if (count <= 7) return 'text-status-warning';
    return 'text-status-error';
  }

  return (
    <div className="w-72 bg-bg-card border border-border-primary rounded-xl shadow-lg p-3">
      <div className="relative mb-2">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-8 pr-3 py-1.5 bg-bg-input border border-border-secondary rounded-lg text-xs"
          placeholder="Search agents…" />
      </div>

      {currentAssigneeId && (
        <button onClick={() => handleUnassign()} className="w-full text-left px-3 py-2 text-xs text-text-muted hover:bg-bg-hover rounded-lg">
          Unassign
        </button>
      )}

      <div className="max-h-60 overflow-y-auto">
        {members.map((m) => (
          <button key={m.id} onClick={() => handleAssign(m.id)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-bg-hover text-left text-sm">
            <div className="w-7 h-7 rounded-full bg-bg-tertiary flex items-center justify-center text-xs font-medium">
              {m.fullName.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{m.fullName}</p>
              <p className="text-xs text-text-muted">{m.role}</p>
            </div>
            <span className={`text-xs font-mono ${workloadColor(m.activeConversations)}`}>
              {m.activeConversations}
            </span>
            {m.id === currentAssigneeId && <Check size={14} className="text-accent-blue" />}
          </button>
        ))}
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/conversations/AgentAssignDrawer.tsx` | Create |
| `apps/provider/src/components/conversations/ConversationHeader.tsx` | Modify — wire "Assign to Agent" button to AgentAssignDrawer |

---

## Acceptance Criteria

- [ ] Searchable list of AGENT+ team members
- [ ] Shows: avatar, name, role, active conversation count (workload)
- [ ] Workload indicator: green (0-3), yellow (4-7), red (8+)
- [ ] Current assignee highlighted with checkmark
- [ ] "Unassign" option when assigned
- [ ] `assignConversation` mutation called on selection
- [ ] System message: "Conversation assigned to [Name]"
- [ ] Toast notification on success
- [ ] Permission-gated: `conversations:manage`

---

## Dependencies

- **Blocked by**: Task 6.9 (Conversation actions toolbar), Task 15.11 (GraphQL teamMembers query)
- **Blocks**: None
- **Related**: Task 7.7 (Callback assign — similar UI), Task 15.8 (TeamManager — same team member data)
