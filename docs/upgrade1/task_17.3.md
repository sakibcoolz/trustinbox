# Task 17.3 — Optimistic Updates

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P2 — UX  
> **Estimated Scope**: Medium  
> **File**: Multiple mutation files  
> **Status**: ✅ Complete

---

## Objective

Add optimistic UI updates to key mutations so the UI responds instantly before the server confirms. Roll back on error.

---

## Requirements

### Mutations with Optimistic Updates

| Mutation | Optimistic Behavior |
|----------|-------------------|
| `updateWebhookSubscription` | Immediately update status/URL in table row |
| `deleteWebhookSubscription` | Immediately remove row from table |
| `revokeAPIKey` | Immediately grey out / remove key row |
| `changeTeamMemberRole` | Immediately update role badge |
| `removeTeamMember` | Immediately remove member row |

### Pattern

```typescript
const [updateWebhook] = useMutation(UPDATE_WEBHOOK_SUBSCRIPTION, {
  optimisticResponse: {
    updateWebhookSubscription: {
      __typename: 'WebhookSubscription',
      id: webhookId,
      ...updatedFields,
    },
  },
});
```

### Error Rollback

- Apollo Client automatically reverts optimistic updates on mutation error
- Show toast: "Failed to update — reverted"
- Log error to console / telemetry

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| All mutation hooks in `src/lib/graphql/` | **Modify** | Add optimisticResponse |
| Component files that call mutations | **Modify** | Handle rollback UX (toasts) |

---

## Acceptance Criteria

- [ ] Optimistic updates for delete/update mutations
- [ ] Instant UI feedback before server response
- [ ] Automatic rollback on error
- [ ] Toast notification on rollback
- [ ] No stale data after rollback

---

## Dependencies

- **Blocked by**: Task 17.2 (cache strategy)
- **Blocks**: None
