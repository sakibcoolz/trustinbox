# Task 7.10 — GraphQL Callback Requests Query

> **Section**: 7. Callback Requests — Connected Backend  
> **Priority**: P0 — Data layer  
> **Estimated Scope**: Medium  
> **Route**: N/A (hook)  
> **File**: `apps/provider/src/lib/graphql/callbacks.ts`
> **Status**: ✅ Complete

---

## Objective

Create GraphQL query definitions, TypeScript types, and Apollo hooks for fetching callback request lists and individual callback details.

---

## Current State

No `callbacks.ts` GraphQL module exists. The callbacks page uses hardcoded mock data. `customers.ts` has a `CustomerCallback` interface and references `callbackRequests(virtualId)` in customer detail.

---

## Requirements

### Types

```typescript
export enum CallbackRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  RESCHEDULED = 'RESCHEDULED',
  EXPIRED = 'EXPIRED',
}

export interface CallbackRequest {
  id: string;
  serviceProvider: {
    id: string;
    name: string;
  };
  reason: string;
  details: string | null;
  status: CallbackRequestStatus;
  requestedAt: string;
  respondedAt: string | null;
  approvedSlotStart: string | null;
  approvedSlotEnd: string | null;
}

export interface CallbackRequestConnection {
  nodes: CallbackRequest[];
  totalCount: number;
}

export interface CallbackRequestsData {
  callbackRequests: CallbackRequestConnection;
}

export interface CallbackRequestData {
  callbackRequest: CallbackRequest;
}
```

### Queries

```graphql
query CallbackRequests($status: CallbackRequestStatus, $limit: Int, $offset: Int) {
  callbackRequests(status: $status, limit: $limit, offset: $offset) {
    nodes {
      id
      serviceProvider { id name }
      reason
      details
      status
      requestedAt
      respondedAt
      approvedSlotStart
      approvedSlotEnd
    }
    totalCount
  }
}

query CallbackRequest($id: ID!) {
  callbackRequest(id: $id) {
    id
    serviceProvider { id name }
    reason
    details
    status
    requestedAt
    respondedAt
    approvedSlotStart
    approvedSlotEnd
  }
}
```

### Hooks

```typescript
export function useCallbackRequests(variables: CallbackRequestsVariables) {
  return useQuery<CallbackRequestsData>(CALLBACK_REQUESTS_QUERY, {
    variables,
    fetchPolicy: 'cache-and-network',
    notifyOnNetworkStatusChange: true,
  });
}

export function useCallbackRequest(id: string) {
  return useQuery<CallbackRequestData>(CALLBACK_REQUEST_QUERY, {
    variables: { id },
    skip: !id,
  });
}
```

### Apollo Cache Config

```typescript
// In apollo-provider.tsx
CallbackRequest: { keyFields: ['id'] },
callbackRequests: {
  keyArgs: ['status'],
  merge(existing, incoming) { return incoming; },
},
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/callbacks.ts` | Create — queries, types, hooks |
| `apps/provider/src/lib/apollo-provider.tsx` | Modify — add CallbackRequest cache config |

---

## Acceptance Criteria

- [ ] `CALLBACK_REQUESTS_QUERY` with status, limit, offset variables
- [ ] `CALLBACK_REQUEST_QUERY` with id variable
- [ ] TypeScript interfaces match GraphQL schema
- [ ] `useCallbackRequests` hook with cache-and-network policy
- [ ] `useCallbackRequest` hook with skip when no id
- [ ] `CallbackRequestStatus` enum exported
- [ ] Apollo cache config for CallbackRequest

---

## Dependencies

- **Blocked by**: Task 2.6 (Apollo Client auth link)
- **Blocks**: Task 7.1 (table uses hook), Task 7.3 (filters pass variables), Task 7.4 (detail uses hook)
- **Related**: Task 5.12 (notifications query — same pattern), Task 6.12 (conversations query)
