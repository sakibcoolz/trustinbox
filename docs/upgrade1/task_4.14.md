# Task 4.14 — GraphQL Policy Check Query Integration

> **Section**: 4. Customers — Connected Backend  
> **Priority**: P0  
> **Estimated Scope**: Small  
> **Route**: N/A (Data layer, used by multiple components)  
> **File**: `apps/provider/src/lib/graphql/customers.ts`

---

## Objective

Implement the `checkCommunicationPolicy` GraphQL query integration for real-time policy validation before any communication attempt. This query is used by the customer detail policy check indicator (task 4.11), the notification compose policy preview (task 5.8), and the callback creation flow (task 7.5).

---

## Current State

Mock policy check in compose page:
```tsx
// apps/provider/src/app/notifications/compose/page.tsx
function checkPolicy() {
  if (form.category === 'Advertisement') {
    setPolicyPreview({ allowed: false, reason: 'User has opted out of advertisement notifications.' });
  } else {
    setPolicyPreview({ allowed: true, reason: 'Notification passes all policy checks.' });
  }
}
```

And in reusable component:
```tsx
// apps/provider/src/components/NotificationComposer.tsx
setPolicyResult(
  form.category === 'Advertisement'
    ? { allowed: false, reason: 'User has opted out of advertisement notifications.' }
    : { allowed: true, reason: 'Notification passes all policy checks.' }
);
```

---

## Requirements

### 1. GraphQL Query (from schema)

```graphql
query CheckCommunicationPolicy(
  $serviceProviderId: ID!
  $category: NotificationCategory!
  $channel: String!
) {
  checkCommunicationPolicy(
    serviceProviderId: $serviceProviderId
    category: $category
    channel: $channel
  ) {
    allowed
    decisionCode
    reason
    appliedRules
  }
}
```

### 2. Lazy Query Hook

```typescript
export function useCheckPolicy() {
  const [check, { data, loading, error }] = useLazyQuery<{
    checkCommunicationPolicy: PolicyCheckResult;
  }>(CHECK_COMMUNICATION_POLICY, {
    fetchPolicy: 'no-cache', // Always fresh policy evaluation
  });

  return {
    checkPolicy: (serviceProviderId: string, category: string, channel: string) =>
      check({ variables: { serviceProviderId, category, channel } }),
    result: data?.checkCommunicationPolicy ?? null,
    loading,
    error,
  };
}
```

### 3. Usage Patterns

**Customer detail page (task 4.11)**:
```tsx
const { checkPolicy, result, loading } = useCheckPolicy();
// User selects category + channel, clicks "Check"
checkPolicy(spId, category, channel);
```

**Notification compose (task 5.8)**:
```tsx
const { checkPolicy, result, loading } = useCheckPolicy();
// Auto-check when all fields are filled
useEffect(() => {
  if (form.targetId && form.category && form.channel) {
    checkPolicy(spId, form.category, form.channel);
  }
}, [form.targetId, form.category, form.channel]);
```

### 4. Error Handling
- On GraphQL error: show warning that policy check unavailable, allow send with disclaimer
- On network error: retry with exponential backoff (1s, 2s, 4s)
- Never block the UI with a failed policy check — degrade gracefully

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/customers.ts` | Modify — add CHECK_COMMUNICATION_POLICY query + useCheckPolicy hook |

---

## Acceptance Criteria

- [ ] `CHECK_COMMUNICATION_POLICY` query matches GraphQL schema
- [ ] `useCheckPolicy()` returns checkPolicy function, result, loading, error
- [ ] Uses `no-cache` fetch policy for always-fresh results
- [ ] Returns full `PolicyCheckResult` with allowed, decisionCode, reason, appliedRules
- [ ] Graceful degradation on error (warning, not blocking)
- [ ] Replaces mock policy check in compose page and NotificationComposer component

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client), Task 4.13 (customer GraphQL file)
- **Blocks**: Task 4.11 (policy check indicator), Task 5.8 (compose policy preview)
- **Related**: Task 5.14 (checkCommunicationPolicy used in notifications section)
