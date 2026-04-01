# Task 14.6 — API Key Create & Revoke Mutations

> **Section**: 14. Integrations — Connected Backend  
> **Priority**: P0 — CRUD  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/integrations.ts`  
> **Status**: ✅ Complete

---

## Objective

Add `createAPIKey` and `revokeAPIKey` mutation hooks to the integrations GraphQL file, with proper cache updates and refetch strategies.

---

## Requirements

### Create API Key

```typescript
export function useCreateAPIKey(spId: string) {
  return useMutation(CREATE_API_KEY, {
    refetchQueries: [{ query: GET_API_KEYS, variables: { serviceProviderId: spId } }],
  });
}
```

- On success: return `APIKeyWithSecret` with the secret shown once
- Cache update: refetch API keys list

### Revoke API Key

```typescript
export function useRevokeAPIKey(spId: string) {
  return useMutation(REVOKE_API_KEY, {
    refetchQueries: [{ query: GET_API_KEYS, variables: { serviceProviderId: spId } }],
  });
}
```

- On success: refetch API keys list, revoked key shows "Revoked" status
- Confirmation required before mutation

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/integrations.ts` | **Modify** | Add mutation hooks with cache updates |

---

## Acceptance Criteria

- [ ] `useCreateAPIKey` hook returns secret on success
- [ ] `useRevokeAPIKey` hook refetches list
- [ ] Both hooks handle loading and error states

---

## Dependencies

- **Blocked by**: Task 14.5 (file creation)
- **Blocks**: Task 14.1 (API key management UI)
