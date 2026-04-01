# Task 14.7 — Third-Party Integration Config

> **Section**: 14. Integrations — Connected Backend  
> **Priority**: P2 — Future-facing  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/integrations.ts`  
> **Status**: ✅ Complete

---

## Objective

Add support for storing and retrieving third-party integration configuration (Slack, Salesforce, etc.) from organization-service metadata. This is the backend query that powers the integrations grid (Task 14.2).

---

## Requirements

### Query

Integration config is stored as JSON metadata in the organization-service:

```graphql
query GetIntegrationConfig($serviceProviderId: ID!) {
  serviceProvider(id: $serviceProviderId) {
    id
    integrations {
      name
      status
      config
      lastSyncAt
      errorMessage
    }
  }
}
```

### TypeScript Types

```typescript
export interface IntegrationConfig {
  name: string;
  status: 'CONNECTED' | 'NOT_CONNECTED' | 'COMING_SOON' | 'ERROR';
  config?: Record<string, unknown>;
  lastSyncAt?: string;
  errorMessage?: string;
}
```

### Hook

```typescript
export function useIntegrationConfigs(spId: string) { ... }
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/integrations.ts` | **Modify** | Add integration config query + types |

---

## Acceptance Criteria

- [ ] Query returns integration configs for the org
- [ ] TypeScript types for integration status
- [ ] Hook returns list of integrations with status

---

## Dependencies

- **Blocked by**: Task 14.5 (file creation)
- **Blocks**: Task 14.2 (integrations grid)
