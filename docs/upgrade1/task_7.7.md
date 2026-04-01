# Task 7.7 — Assign Callback to Agent

> **Section**: 7. Callback Requests  
> **Priority**: P1 — Workflow action  
> **Estimated Scope**: Medium  
> **Route**: `/callbacks`  
> **Component**: AgentAssignDropdown
> **Status**: ✅ Complete

---

## Objective

Implement a dropdown to assign a callback request to a specific team member (agent role), with a searchable list and current workload indicator.

---

## Current State

```tsx
// apps/provider/src/app/callbacks/page.tsx
// agent field exists in mock data but is non-functional
{ id: '3', ..., agent: 'Sarah K.' },
```

The agent column shows hardcoded names. No assignment functionality exists.

---

## Requirements

### Agent Dropdown

| Feature | Detail |
|---------|--------|
| **Trigger** | Click "Assign" button or agent name in table row |
| **List** | Searchable team member list (agents + admins) |
| **Current** | Highlight currently assigned agent |
| **Unassign** | "Unassigned" option at top |
| **Workload** | Show active callback count per agent |
| **Search** | Filter by name, debounced 300ms |

### Workload Indicator
- Green dot: 0–3 active callbacks
- Yellow dot: 4–7 active callbacks
- Red dot: 8+ active callbacks
- Show count in parentheses

### Assignment Flow
1. Click assign → dropdown opens
2. Search/select agent
3. Mutation: update callback `assignedAgent`
4. Optimistic update in table
5. Toast: "Assigned to {name}"

### Permissions
- Requires `callbacks:assign` permission
- Button disabled/hidden without permission
- Agent can self-assign

---

## Implementation Plan

```tsx
import { useState } from 'react';
import { Search, User, ChevronDown } from 'lucide-react';
import { useTeamMembers } from '@/lib/graphql/team';

function AgentAssignDropdown({ callbackId, currentAgent, onAssign }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: teamData } = useTeamMembers();

  const agents = teamData?.teamMembers.filter(m =>
    m.role === 'AGENT' || m.role === 'SP_ADMIN'
  ).filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  const workloadColor = (count: number) =>
    count <= 3 ? 'bg-status-success' : count <= 7 ? 'bg-status-warning' : 'bg-status-error';

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs text-text-secondary hover:text-text-primary">
        <User size={12} /> {currentAgent ?? 'Assign'} <ChevronDown size={10} />
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1 w-56 bg-bg-elevated border border-border-primary rounded-lg shadow-lg z-50">
          <div className="p-2">
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search agents…"
              className="w-full px-2 py-1.5 bg-bg-input border border-border-secondary rounded text-xs" />
          </div>
          <div className="max-h-48 overflow-y-auto">
            <button onClick={() => { onAssign(null); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-xs text-text-muted hover:bg-bg-hover">Unassigned</button>
            {agents.map(agent => (
              <button key={agent.id} onClick={() => { onAssign(agent.id); setOpen(false); }}
                className="w-full px-3 py-2 text-left text-xs hover:bg-bg-hover flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${workloadColor(agent.activeCallbacks)}`} />
                {agent.name} ({agent.activeCallbacks})
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/callbacks/AgentAssignDropdown.tsx` | Create — searchable agent picker |
| `apps/provider/src/app/callbacks/page.tsx` | Modify — integrate assignment dropdown in table |

---

## Acceptance Criteria

- [ ] Searchable agent dropdown
- [ ] Workload indicator (green/yellow/red)
- [ ] Optimistic UI update on assignment
- [ ] Toast on assignment success
- [ ] "Unassigned" option available
- [ ] Requires `callbacks:assign` permission
- [ ] Click outside closes dropdown

---

## Dependencies

- **Blocked by**: Task 7.1 (CallbackRequestTable), Task 15.8 (TeamManager — provides team data)
- **Blocks**: Task 7.8 (complete callback — agent context)
- **Related**: Task 6.10 (agent assignment in conversations — same pattern)
