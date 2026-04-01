# Task 14.5 — API Key GraphQL Queries

> **Section**: 14. Integrations — Connected Backend  
> **Priority**: P0 — Foundation  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/graphql/integrations.ts`  
> **Status**: ✅ Complete

---

## Objective

Create `apps/provider/src/lib/graphql/integrations.ts` with GraphQL queries and mutations for API key management: `apiKeys(spId)`, `createAPIKey`, `revokeAPIKey`.

---

## GraphQL Schema Reference

```graphql
query apiKeys(serviceProviderId: ID!): APIKeyConnection!
mutation createAPIKey(input: CreateAPIKeyInput!): APIKeyWithSecret!
mutation revokeAPIKey(input: RevokeAPIKeyInput!): Boolean!
```

---

## Requirements

### Queries & Mutations

- `GET_API_KEYS` — list all API keys for service provider
- `CREATE_API_KEY` — create key with name, scopes, expiry → returns secret
- `REVOKE_API_KEY` — revoke by key ID

### TypeScript Types

```typescript
export interface APIKey {
  id: string;
  serviceProviderId: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface APIKeyWithSecret {
  apiKey: APIKey;
  secret: string;
}

export interface CreateAPIKeyInput {
  serviceProviderId: string;
  name: string;
  scopes: string[];
  expiresInDays?: number;
}
```

### Hooks

```typescript
export function useAPIKeys(spId: string) { ... }
export function useCreateAPIKey() { ... }
export function useRevokeAPIKey() { ... }
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/integrations.ts` | **Create** | API key queries, mutations, types, hooks |

---

## Acceptance Criteria

- [ ] GET_API_KEYS query with all APIKey fields
- [ ] CREATE_API_KEY mutation returning APIKeyWithSecret
- [ ] REVOKE_API_KEY mutation
- [ ] TypeScript types
- [ ] Reusable hooks

---

## Dependencies

- **Blocked by**: None (schema defined)
- **Blocks**: Task 14.1 (API key management)
