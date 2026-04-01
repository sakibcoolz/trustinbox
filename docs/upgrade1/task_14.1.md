# Task 14.1 — APIKeyManager Component

> **Section**: 14. Integrations  
> **Priority**: P1 — Core component  
> **Estimated Scope**: Large  
> **Route**: `/integrations`  
> **File**: `apps/provider/src/app/integrations/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Replace the mock API key management on the integrations page with a fully functional `APIKeyManager` that lists existing API keys, creates new keys with name/scopes/expiry, shows secret once, and revokes keys. The page currently has 163 lines with hardcoded `mockApiKeys`.

---

## Current State

`apps/provider/src/app/integrations/page.tsx` (163 lines):
- Three tabs: `keys`, `webhooks`, `accounts`
- `mockApiKeys` — 3 items (name, prefix, created, lastUsed, status)
- "Generate Key" button opens inline form with name input only
- Table: Name, Key (prefix), Created, Last Used, Status, Actions (Copy, Revoke)
- No scopes, no expiry, no real mutations

### GraphQL Schema

```graphql
type APIKey {
  id: ID!
  serviceProviderId: ID!
  name: String!
  prefix: String!
  scopes: [String!]!
  expiresAt: DateTime
  lastUsedAt: DateTime
  createdAt: DateTime!
}

type APIKeyWithSecret {
  apiKey: APIKey!
  secret: String!
}

type APIKeyConnection {
  nodes: [APIKey!]!
  totalCount: Int!
}

input CreateAPIKeyInput {
  serviceProviderId: ID!
  name: String!
  scopes: [String!]!
  expiresInDays: Int
}

input RevokeAPIKeyInput {
  apiKeyId: ID!
  serviceProviderId: ID!
}

query apiKeys(serviceProviderId: ID!): APIKeyConnection!
mutation createAPIKey(input: CreateAPIKeyInput!): APIKeyWithSecret!
mutation revokeAPIKey(input: RevokeAPIKeyInput!): Boolean!
```

---

## Requirements

### List View

| Column | Source | Notes |
|--------|--------|-------|
| Name | `name` | Editable label |
| Key Prefix | `prefix` | Monospace (e.g., `pk_live_***a3f2`) |
| Scopes | `scopes[]` | Badge chips |
| Created | `createdAt` | Formatted date |
| Last Used | `lastUsedAt` | Relative time or "Never" |
| Expires | `expiresAt` | Date or "Never" |
| Status | derived | Active (green), Revoked (red), Expired (yellow) |
| Actions | — | Copy prefix, Revoke button |

### Create Form

- Name input (required)
- Scopes multi-select: `read:notifications`, `write:notifications`, `read:callbacks`, `write:callbacks`, `read:campaigns`, `write:campaigns`, `read:conversations`, `read:analytics`
- Expiry: dropdown (30 days, 90 days, 1 year, Never)
- On success: show `APIKeyWithSecret.secret` once with copy button + warning banner
- SP_ADMIN role guard

### Revoke

- Revoke button → confirmation modal with impact warning
- Calls `revokeAPIKey` mutation
- Grayed out row after revocation

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/integrations/page.tsx` | **Modify** | Replace mock API keys with live data |
| `apps/provider/src/lib/graphql/integrations.ts` | **Create** | API key queries, mutations, types |

---

## Acceptance Criteria

- [ ] List fetches `apiKeys(spId)` via GraphQL
- [ ] All columns displayed with proper formatting
- [ ] Create form with name, scopes checkboxes, expiry dropdown
- [ ] Secret shown once on creation with copy button + warning
- [ ] Revoke with confirmation modal
- [ ] SP_ADMIN role guard
- [ ] Mock data removed
- [ ] Loading and empty states

---

## Dependencies

- **Blocked by**: Task 14.5 (GraphQL queries)
- **Blocks**: None
