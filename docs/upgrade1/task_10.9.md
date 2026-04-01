# Task 10.9 — Bot Status Toggle on Detail Page

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P1 — Core action  
> **Estimated Scope**: Small  
> **Route**: `/bots/[id]`  
> **File**: `apps/provider/src/app/bots/[id]/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add Activate/Pause/Archive status controls to the bot detail page header. Allow the provider to change bot status with confirmation dialogs for destructive actions.

---

## Current State

```tsx
// apps/provider/src/app/bots/[id]/page.tsx (mock)
<button className="px-4 py-2 bg-status-warning/10 text-status-warning rounded-lg text-sm font-medium">
  Pause Bot
</button>
<button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium">
  Edit
</button>
```

**Issues**: Buttons are non-functional — no mutation calls, no state management.

### GraphQL Schema

```graphql
enum BotStatus { DRAFT, ACTIVE, PAUSED, ARCHIVED }
input UpdateBotInput { botId: ID!, serviceProviderId: ID!, status: BotStatus }
mutation { updateBot(input: UpdateBotInput!): Bot! }
```

---

## Requirements

### 1. Status Transitions

| Current → Available Actions |
|------|
| `DRAFT` → **Activate** (→ ACTIVE), **Archive** (→ ARCHIVED) |
| `ACTIVE` → **Pause** (→ PAUSED), **Archive** (→ ARCHIVED) |
| `PAUSED` → **Activate** (→ ACTIVE), **Archive** (→ ARCHIVED) |
| `ARCHIVED` → **Reactivate** (→ DRAFT) |

### 2. Confirmation Dialogs

| Action | Confirmation Required | Message |
|--------|----------------------|---------|
| Activate | No | — |
| Pause | Yes | "Pausing will stop all bot conversations. Continue?" |
| Archive | Yes | "Archiving will permanently disable this bot. Continue?" |
| Reactivate | No | Moves to DRAFT |

### 3. RBAC

- `bots:deploy` permission required for status changes
- Hide status buttons for users without permission

### 4. Optimistic UI

- Update status badge immediately on toggle
- Rollback if mutation fails

---

## Implementation Plan

```tsx
function BotStatusActions({ bot }: { bot: Bot }) {
  const { serviceProviderId } = useServiceProvider();
  const { hasPermission } = usePermissions();
  const [updateBot, { loading }] = useMutation(UPDATE_BOT);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  if (!hasPermission('bots:deploy')) return null;

  async function changeStatus(newStatus: string) {
    await updateBot({
      variables: { input: { botId: bot.id, serviceProviderId, status: newStatus } },
      optimisticResponse: { updateBot: { ...bot, status: newStatus } },
    });
    setConfirmAction(null);
  }

  const actions = getAvailableActions(bot.status);

  return (
    <div className="flex items-center gap-2">
      {actions.map((action) => (
        <button key={action.status} onClick={() => action.confirm ? setConfirmAction(action.status) : changeStatus(action.status)}
          disabled={loading}
          className={action.className}>
          {action.label}
        </button>
      ))}
      {confirmAction && (
        <ConfirmDialog
          message={getConfirmMessage(confirmAction)}
          onConfirm={() => changeStatus(confirmAction)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/[id]/page.tsx` | **Modify** | Replace mock buttons with real status controls |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Ensure UPDATE_BOT mutation exists (task 10.17) |

---

## Acceptance Criteria

- [ ] Status transition buttons shown based on current status
- [ ] Clicking Activate calls `updateBot` with `ACTIVE` status
- [ ] Clicking Pause shows confirmation then calls with `PAUSED`
- [ ] Clicking Archive shows confirmation then calls with `ARCHIVED`
- [ ] Status badge updates optimistically
- [ ] RBAC: hidden for users without `bots:deploy`
- [ ] Loading state during mutation

---

## Dependencies

- **Blocked by**: Task 10.7 (bot detail with real data), Task 10.17 (updateBot mutation)
- **Blocks**: None
- **Related**: Task 10.3 (quick toggle on list — same mutation)
