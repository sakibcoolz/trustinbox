# Task 13.6 — Audit Log Data Integration

> **Section**: 13. Compliance — Connected Backend  
> **Priority**: P0 — Foundation  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/graphql/compliance.ts`  
> **Status**: ✅ Complete

---

## Objective

Create `apps/provider/src/lib/graphql/compliance.ts` with queries and types for fetching audit log data from the analytics-service event trail. Audit logs capture all admin actions (team changes, webhook updates, campaign launches, bot config changes).

---

## Requirements

### Query

```graphql
query GetAuditLogs(
  $serviceProviderId: ID!
  $from: DateTime
  $to: DateTime
  $actorId: ID
  $actionType: String
  $limit: Int
  $offset: Int
) {
  auditLogs(
    serviceProviderId: $serviceProviderId
    from: $from
    to: $to
    actorId: $actorId
    actionType: $actionType
    limit: $limit
    offset: $offset
  ) {
    nodes {
      id
      actorId
      actorName
      actorRole
      action
      resourceType
      resourceId
      details
      timestamp
    }
    totalCount
  }
}
```

### TypeScript Types

```typescript
export interface AuditLogEntry {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  timestamp: string;
}

export interface AuditLogConnection {
  nodes: AuditLogEntry[];
  totalCount: number;
}
```

### Hook

```typescript
export function useAuditLogs(spId: string, filters?: AuditLogFilters) { ... }
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/compliance.ts` | **Create** | Audit log queries, types, hooks |

---

## Acceptance Criteria

- [ ] Query with filter by actorId, actionType, date range
- [ ] Pagination support
- [ ] TypeScript types for audit log entries
- [ ] Reusable hook

---

## Dependencies

- **Blocked by**: None (assumes analytics-service exposes audit logs)
- **Blocks**: Task 13.1 (Audit Log tab)
