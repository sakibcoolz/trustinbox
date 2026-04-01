# Task 13.7 — Verification Status from Organization Service

> **Section**: 13. Compliance — Connected Backend  
> **Priority**: P1 — Trust  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/compliance.ts`  
> **Status**: ✅ Complete

---

## Objective

Add a query to fetch the organization's verification status, submitted documents, and compliance requirements from the organization-service. Used by the verification status card (Task 13.2) and compliance checklist (Task 13.3).

---

## Requirements

### Query

Uses existing `serviceProvider(id)` query — may need additional fields for verification status. Alternatively a dedicated compliance status query:

```graphql
query GetComplianceStatus($serviceProviderId: ID!) {
  serviceProvider(id: $serviceProviderId) {
    id
    name
    verificationStatus
    verifiedAt
    complianceScore
  }
}
```

### TypeScript Types

```typescript
export interface ComplianceStatus {
  verificationStatus: 'VERIFIED' | 'PENDING' | 'NOT_VERIFIED';
  verifiedAt?: string;
  complianceScore: number;
  documentsSubmitted: number;
  documentsRequired: number;
  pendingItems: string[];
}
```

### Hook

```typescript
export function useComplianceStatus(spId: string) { ... }
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/compliance.ts` | **Modify** | Add compliance status query + types |

---

## Acceptance Criteria

- [ ] Query returns verification status, score, document counts
- [ ] TypeScript types
- [ ] Hook with skip logic

---

## Dependencies

- **Blocked by**: Task 13.6 (file creation)
- **Blocks**: Tasks 13.2, 13.3
