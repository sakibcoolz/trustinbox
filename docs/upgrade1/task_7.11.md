# Task 7.11 — GraphQL Approve/Reject Mutations

> **Section**: 7. Callback Requests — Connected Backend  
> **Priority**: P0 — Core actions  
> **Estimated Scope**: Medium  
> **Route**: N/A (hooks)  
> **File**: `apps/provider/src/lib/graphql/callbacks.ts`
> **Status**: ✅ Complete

---

## Objective

Create GraphQL mutation definitions, TypeScript types, and Apollo hooks for approving and rejecting callback requests with optimistic updates.

---

## Current State

No mutations exist in the frontend. The Approve/Reject buttons in the table are non-functional. Schema defines:

```graphql
approveCallbackRequest(input: ApproveCallbackRequestInput!): CallbackRequest!
rejectCallbackRequest(input: RejectCallbackRequestInput!): CallbackRequest!
createCallbackRequest(input: CreateCallbackRequestInput!): CallbackRequest!
```

Inputs:
```graphql
input ApproveCallbackRequestInput {
  callbackRequestId: ID!
  approvedSlotStart: DateTime!
  approvedSlotEnd: DateTime!
}

input RejectCallbackRequestInput {
  callbackRequestId: ID!
  reason: String
}

input CreateCallbackRequestInput {
  userId: ID!
  reason: String!
  details: String
}
```

---

## Requirements

### Mutations

```graphql
mutation ApproveCallbackRequest($input: ApproveCallbackRequestInput!) {
  approveCallbackRequest(input: $input) {
    id
    status
    respondedAt
    approvedSlotStart
    approvedSlotEnd
  }
}

mutation RejectCallbackRequest($input: RejectCallbackRequestInput!) {
  rejectCallbackRequest(input: $input) {
    id
    status
    respondedAt
  }
}

mutation CreateCallbackRequest($input: CreateCallbackRequestInput!) {
  createCallbackRequest(input: $input) {
    id
    serviceProvider { id name }
    reason
    details
    status
    requestedAt
  }
}
```

### Hooks with Optimistic Updates

```typescript
export function useApproveCallbackRequest() {
  return useMutation(APPROVE_CALLBACK_REQUEST, {
    optimisticResponse: ({ input }) => ({
      approveCallbackRequest: {
        __typename: 'CallbackRequest',
        id: input.callbackRequestId,
        status: 'APPROVED',
        respondedAt: new Date().toISOString(),
        approvedSlotStart: input.approvedSlotStart,
        approvedSlotEnd: input.approvedSlotEnd,
      },
    }),
    update(cache, { data }) {
      // Move from PENDING list to APPROVED list
      // Update PENDING totalCount
    },
  });
}

export function useRejectCallbackRequest() {
  return useMutation(REJECT_CALLBACK_REQUEST, {
    optimisticResponse: ({ input }) => ({
      rejectCallbackRequest: {
        __typename: 'CallbackRequest',
        id: input.callbackRequestId,
        status: 'REJECTED',
        respondedAt: new Date().toISOString(),
      },
    }),
    update(cache, { data }) {
      // Move from PENDING list to REJECTED list
    },
  });
}

export function useCreateCallbackRequest() {
  return useMutation(CREATE_CALLBACK_REQUEST, {
    refetchQueries: ['CallbackRequests'],
  });
}
```

### Approve Flow
1. Click Approve → modal with time slot picker (start + end)
2. Submit → `approveCallbackRequest` mutation
3. Optimistic: row moves from Pending to Approved tab
4. Success toast: "Callback approved"
5. Error → revert optimistic update, show error toast

### Reject Flow
1. Click Reject → modal with optional reason
2. Submit → `rejectCallbackRequest` mutation
3. Optimistic: row moves from Pending to Rejected tab
4. Success toast: "Callback rejected"

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/callbacks.ts` | Modify — add mutations + hooks |
| `apps/provider/src/components/callbacks/ApproveCallbackModal.tsx` | Create — time slot picker modal |
| `apps/provider/src/components/callbacks/RejectCallbackModal.tsx` | Create — rejection reason modal |

---

## Acceptance Criteria

- [ ] `approveCallbackRequest` mutation with ApproveCallbackRequestInput
- [ ] `rejectCallbackRequest` mutation with RejectCallbackRequestInput
- [ ] `createCallbackRequest` mutation with CreateCallbackRequestInput
- [ ] Optimistic updates move rows between status tabs
- [ ] Approve modal requires time slot selection
- [ ] Reject modal has optional reason field
- [ ] Success/error toasts
- [ ] Cache updates on mutation completion

---

## Dependencies

- **Blocked by**: Task 7.10 (query types), Task 2.6 (Apollo Client)
- **Blocks**: Task 7.5 (create form), Task 7.8 (complete), Task 7.9 (bulk actions)
- **Related**: Task 6.14 (sendMessage mutation — optimistic pattern), Task 17.3 (optimistic updates)
