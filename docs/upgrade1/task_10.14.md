# Task 10.14 — Remove Knowledge Source

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P1 — Knowledge management  
> **Estimated Scope**: Small  
> **Route**: `/bots/[id]/knowledge`  
> **File**: `apps/provider/src/app/bots/[id]/knowledge/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Wire the "Remove" button on each knowledge source row to the `removeKnowledgeSource` mutation with a confirmation dialog.

---

## Current State

```tsx
<button className="text-xs text-status-error hover:text-status-error/80 transition-colors">
  Remove
</button>
```

Button is non-functional — no mutation call, no confirmation.

### GraphQL Schema

```graphql
mutation {
  removeKnowledgeSource(knowledgeSourceId: ID!, botId: ID!, serviceProviderId: ID!): Boolean!
}
```

---

## Requirements

### 1. Confirmation Dialog

- "Are you sure you want to remove '{source.name}'?"
- Warn that chunks will be deleted and bot will lose access to this data
- Cancel + Confirm buttons

### 2. Mutation Call

- Call `removeKnowledgeSource` with (knowledgeSourceId, botId, serviceProviderId)
- Optimistically remove from list
- Rollback on failure

### 3. Post-deletion

- Source removed from table
- Stats cards recalculated
- Success toast: "Knowledge source removed"

---

## Implementation Plan

```tsx
function RemoveSourceButton({ source, botId }: { source: KnowledgeSource; botId: string }) {
  const { serviceProviderId } = useServiceProvider();
  const [showConfirm, setShowConfirm] = useState(false);
  const [removeSource, { loading }] = useMutation(REMOVE_KNOWLEDGE_SOURCE, {
    refetchQueries: ['GetBotKnowledgeSources'],
    optimisticResponse: { removeKnowledgeSource: true },
    update(cache) {
      cache.evict({ id: cache.identify(source) });
      cache.gc();
    },
  });

  async function handleRemove() {
    await removeSource({
      variables: { knowledgeSourceId: source.id, botId, serviceProviderId },
    });
    setShowConfirm(false);
  }

  return (
    <>
      <button onClick={() => setShowConfirm(true)}
        className="text-xs text-status-error hover:text-status-error/80">
        Remove
      </button>
      {showConfirm && (
        <ConfirmDialog
          title={`Remove "${source.name}"?`}
          message="This will delete all indexed chunks and the bot will lose access to this knowledge source."
          confirmLabel="Remove"
          confirmVariant="danger"
          loading={loading}
          onConfirm={handleRemove}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/[id]/knowledge/page.tsx` | **Modify** | Wire remove button to mutation |
| `apps/provider/src/lib/graphql/bots.ts` | **Modify** | Add REMOVE_KNOWLEDGE_SOURCE mutation (task 10.20) |

---

## Acceptance Criteria

- [ ] Remove button shows confirmation dialog
- [ ] Confirmation states source name and consequences
- [ ] Calls `removeKnowledgeSource` mutation on confirm
- [ ] Source removed from list (optimistic)
- [ ] Stats cards recalculated after removal
- [ ] Success toast shown
- [ ] Error handling with rollback

---

## Dependencies

- **Blocked by**: Task 10.11 (knowledge base page), Task 10.20 (removeKnowledgeSource mutation)
- **Blocks**: None
- **Related**: Task 10.12 (add source), Task 10.13 (status management)
