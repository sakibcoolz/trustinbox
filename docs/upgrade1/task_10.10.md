# Task 10.10 — Delete Bot

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P1 — Destructive action  
> **Estimated Scope**: Small  
> **Route**: `/bots/[id]`  
> **File**: `apps/provider/src/app/bots/[id]/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a "Delete Bot" action to the bot detail page with a strict confirmation flow. Calls the `deleteBot` mutation and redirects to the bots list.

---

## Current State

No delete functionality exists on the detail page.

### GraphQL Schema

```graphql
mutation { deleteBot(botId: ID!, serviceProviderId: ID!): Boolean! }
```

---

## Requirements

### 1. UI Placement

- Red "Delete Bot" button in bot header actions area (or in a "more" dropdown)
- Visually distinct from other actions (red/danger color)

### 2. Confirmation Dialog

```
┌─────────────────────────────────────────┐
│ ⚠ Delete Bot                           │
│                                         │
│ This will permanently delete            │
│ "Support Assistant" and all its:        │
│                                         │
│ • Configuration settings                │
│ • Knowledge sources                     │
│ • Action logs                           │
│ • Analytics data                        │
│                                         │
│ Type "DELETE" to confirm:               │
│ ┌─────────────────────────────────┐     │
│ │                                 │     │
│ └─────────────────────────────────┘     │
│                                         │
│ [Cancel]                [Delete Bot]    │
└─────────────────────────────────────────┘
```

### 3. Type-to-confirm

- User must type "DELETE" to enable the delete button
- Delete button disabled until confirmation text matches

### 4. Post-deletion

- Call `deleteBot(botId, serviceProviderId)` mutation
- On success: redirect to `/bots` with success toast
- On failure: show error toast, close dialog

### 5. RBAC

- Only users with `bots:create` permission can delete (creators)
- `PLATFORM_ADMIN` and `SP_ADMIN` only

---

## Implementation Plan

```tsx
function DeleteBotAction({ bot }: { bot: Bot }) {
  const router = useRouter();
  const { serviceProviderId } = useServiceProvider();
  const { hasPermission } = usePermissions();
  const [showDialog, setShowDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [deleteBot, { loading }] = useMutation(DELETE_BOT);

  if (!hasPermission('bots:create')) return null;

  async function handleDelete() {
    try {
      await deleteBot({
        variables: { botId: bot.id, serviceProviderId },
        update(cache) {
          cache.evict({ id: cache.identify(bot) });
          cache.gc();
        },
      });
      router.push('/bots');
    } catch {
      // error toast
    }
  }

  return (
    <>
      <button onClick={() => setShowDialog(true)}
        className="px-4 py-2 text-status-error border border-status-error/30 rounded-lg text-sm hover:bg-status-error/10">
        Delete Bot
      </button>
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-bg-surface border border-border-primary rounded-xl p-6 w-[420px] space-y-4">
            <h3 className="text-lg font-semibold text-status-error">Delete Bot</h3>
            <p className="text-sm text-text-secondary">
              This will permanently delete <strong>"{bot.name}"</strong> and all its configuration,
              knowledge sources, action logs, and analytics.
            </p>
            <div>
              <label className="text-xs text-text-muted">Type "DELETE" to confirm:</label>
              <input type="text" value={confirmText} onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm mt-1" />
            </div>
            <div className="flex justify-end gap-3">
              <button onClick={() => { setShowDialog(false); setConfirmText(''); }}
                className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
              <button onClick={handleDelete} disabled={confirmText !== 'DELETE' || loading}
                className="px-4 py-2 bg-status-error text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {loading ? 'Deleting…' : 'Delete Bot'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/[id]/page.tsx` | **Modify** | Add delete button + confirmation dialog |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add DELETE_BOT mutation (task 10.17) |

---

## Acceptance Criteria

- [ ] "Delete Bot" button visible for users with `bots:create` permission
- [ ] Clicking shows confirmation dialog with bot name
- [ ] User must type "DELETE" to enable delete button
- [ ] Calls `deleteBot` mutation on confirm
- [ ] Evicts bot from Apollo cache
- [ ] Redirects to `/bots` on success
- [ ] Error toast on failure
- [ ] Loading state during mutation
- [ ] Hidden for CONTENT_MANAGER/AGENT roles

---

## Dependencies

- **Blocked by**: Task 10.7 (bot detail with real data), Task 10.17 (deleteBot mutation)
- **Blocks**: None
- **Related**: Task 10.9 (status toggle — same header area)
