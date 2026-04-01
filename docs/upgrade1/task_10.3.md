# Task 10.3 — Bot Quick Toggle (Activate/Deactivate)

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P1 — List management  
> **Estimated Scope**: Medium  
> **Route**: `/bots`  
> **File**: `apps/provider/src/app/bots/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a quick toggle switch on each bot card to activate or deactivate the bot directly from the list without navigating to the detail page. The toggle calls `updateBot` mutation to change the bot's status between `ACTIVE` and `PAUSED`.

---

## Current State

No toggle exists. Status is displayed as a static badge. No way to change bot status from the list.

### GraphQL Schema

```graphql
input UpdateBotInput {
  botId: ID!
  serviceProviderId: ID!
  name: String
  purpose: String
  department: String
  avatarUrl: String
  status: BotStatus
}

mutation { updateBot(input: UpdateBotInput!): Bot! }
```

---

## Requirements

### 1. Toggle Behavior

| Current Status | Toggle Action | New Status |
|---------------|--------------|------------|
| `ACTIVE` | Deactivate | `PAUSED` |
| `PAUSED` | Activate | `ACTIVE` |
| `DRAFT` | No toggle (show "Not deployed" tooltip) | — |
| `ARCHIVED` | No toggle (show "Archived" tooltip) | — |

### 2. Visual Design

- Small toggle switch in top-right of bot card (replacing or alongside status badge)
- Green when ACTIVE, gray when PAUSED
- Disabled state for DRAFT/ARCHIVED with tooltip
- Loading spinner on toggle during mutation

### 3. Confirmation

- Deactivating (ACTIVE → PAUSED): Show brief inline warning "Bot will stop responding to conversations"
- Activating (PAUSED → ACTIVE): No confirmation needed

### 4. RBAC

- Toggle only visible/enabled for users with `bots:deploy` permission
- `PLATFORM_ADMIN` and `SP_ADMIN` can toggle

---

## Implementation Plan

```tsx
function BotStatusToggle({ bot }: { bot: Bot }) {
  const { serviceProviderId } = useServiceProvider();
  const [updateBot, { loading }] = useMutation(UPDATE_BOT);
  const { hasPermission } = usePermissions();

  const canToggle = (bot.status === 'ACTIVE' || bot.status === 'PAUSED') && hasPermission('bots:deploy');

  async function handleToggle() {
    const newStatus = bot.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await updateBot({
      variables: {
        input: { botId: bot.id, serviceProviderId, status: newStatus },
      },
      refetchQueries: ['GetBots'],
    });
  }

  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleToggle(); }}
      disabled={!canToggle || loading}
      className={`relative w-9 h-5 rounded-full transition-colors ${
        bot.status === 'ACTIVE' ? 'bg-status-success' : 'bg-border-secondary'
      } ${!canToggle ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
        bot.status === 'ACTIVE' ? 'left-[18px]' : 'left-0.5'
      }`} />
    </button>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/page.tsx` | **Modify** | Add toggle to bot cards |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Ensure UPDATE_BOT mutation (task 10.17) |

---

## Acceptance Criteria

- [ ] Toggle switch visible on ACTIVE/PAUSED bot cards
- [ ] Clicking toggle calls `updateBot` mutation with status change
- [ ] ACTIVE → PAUSED and PAUSED → ACTIVE work correctly
- [ ] Toggle disabled for DRAFT/ARCHIVED bots
- [ ] Loading state during mutation
- [ ] RBAC: only `bots:deploy` users can toggle
- [ ] Card link click doesn't trigger toggle (event propagation handled)

---

## Dependencies

- **Blocked by**: Task 10.1 (bot list with real data), Task 10.17 (updateBot mutation)
- **Blocks**: None
- **Related**: Task 10.9 (status toggle on detail page — same logic)
