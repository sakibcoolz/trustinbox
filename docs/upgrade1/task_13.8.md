# Task 13.8 — Policy Decision Logs from Policy Service

> **Section**: 13. Compliance — Connected Backend  
> **Priority**: P1 — Audit trail  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/compliance.ts`  
> **Status**: ✅ Complete

---

## Objective

Add a query to fetch policy decision logs from the policy-service. These are the communication audit records showing every allowed/blocked decision with reason codes.

---

## Requirements

### Query

```graphql
query GetPolicyDecisionLogs(
  $serviceProviderId: ID!
  $from: DateTime
  $to: DateTime
  $result: String  # "ALLOWED" | "BLOCKED"
  $category: String
  $limit: Int
  $offset: Int
) {
  policyDecisionLogs(
    serviceProviderId: $serviceProviderId
    from: $from
    to: $to
    result: $result
    category: $category
    limit: $limit
    offset: $offset
  ) {
    nodes {
      id
      action
      result
      category
      channel
      targetVirtualId
      reasonCode
      reasonDescription
      timestamp
    }
    totalCount
  }
}
```

### TypeScript Types

```typescript
export interface PolicyDecisionLog {
  id: string;
  action: string;
  result: 'ALLOWED' | 'BLOCKED';
  category: string;
  channel: string;
  targetVirtualId: string;
  reasonCode: string;
  reasonDescription: string;
  timestamp: string;
}
```

### Hook

```typescript
export function usePolicyDecisionLogs(spId: string, filters?: PolicyLogFilters) { ... }
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/compliance.ts` | **Modify** | Add policy decision log query + types |

---

## Acceptance Criteria

- [ ] Query with filters (result, category, date range)
- [ ] Pagination support
- [ ] TypeScript types
- [ ] Hook replaces `mockPolicyLogs` in compliance page

---

## Dependencies

- **Blocked by**: Task 13.6 (file creation)
- **Blocks**: Task 13.1 (Communication Audit tab)
