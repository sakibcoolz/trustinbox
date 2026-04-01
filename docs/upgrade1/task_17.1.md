# Task 17.1 — Apollo Client Provider Setup

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P0 — Infrastructure  
> **Estimated Scope**: Small (already exists — audit + harden)  
> **File**: `apps/provider/src/lib/apollo-provider.tsx`  
> **Status**: ✅ Complete

---

## Objective

Audit and harden the existing Apollo Client provider. The file already has httpLink, authLink, errorLink, and InMemoryCache with typePolicies. This task ensures all entity types are covered in the cache config, SSR hydration is correct, and default options are optimal.

---

## Current State

`apps/provider/src/lib/apollo-provider.tsx` already contains:
- `httpLink` — `HttpLink({ uri: GRAPHQL_URL })`
- `authLink` — `setContext` injecting Bearer token + X-Service-Provider-Id
- `errorLink` — `onError` handling UNAUTHENTICATED with token refresh + retry
- `InMemoryCache` with typePolicies for: notifications, conversations, callbackRequests, campaigns (Query fields) + User, Notification, CallbackRequest, Conversation, Campaign, Bot, ServiceProvider (keyFields)
- `defaultOptions`: watchQuery cache-and-network, query cache-first

---

## Requirements

### Add Missing Entity keyFields

Add keyFields for new entities introduced in upgrade1:

```typescript
typePolicies: {
  // Existing...
  WebhookSubscription: { keyFields: ['id'] },
  WebhookDelivery: { keyFields: ['id'] },
  APIKey: { keyFields: ['id'] },
  TeamMember: { keyFields: ['id'] },
  TeamInvitation: { keyFields: ['id'] },
  IndustryProfile: { keyFields: ['id'] },
  PolicyLog: { keyFields: ['id'] },
  AuditEvent: { keyFields: ['id'] },
  SpamReport: { keyFields: ['id'] },
}
```

### Add Missing Query Field Policies

For new list queries (merge + offset pagination):

```typescript
Query: {
  fields: {
    // Existing...
    webhookSubscriptions: { merge: false },
    webhookDeliveries: { merge: false },
    apiKeys: { merge: false },
    teamMembers: { merge: false },
    pendingInvitations: { merge: false },
    industryProfiles: { merge: false },
  }
}
```

### SSR Hydration

- Ensure `ApolloWrapper` properly hydrates on client
- Use `loadDevMessages()` / `loadErrorMessages()` in dev mode

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/apollo-provider.tsx` | **Modify** | Add missing typePolicies + verify config |

---

## Acceptance Criteria

- [ ] All new entities have keyFields in typePolicies
- [ ] All new query fields have merge policies
- [ ] SSR hydration works correctly
- [ ] Dev messages loaded in development
- [ ] No cache warnings in console

---

## Dependencies

- **Blocked by**: None (file already exists)
- **Blocks**: All GraphQL tasks
