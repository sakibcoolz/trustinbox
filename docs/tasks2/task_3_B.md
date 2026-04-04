# Task 3B — Callback Requests (Tasks 3.5–3.9)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3B — Callback Requests
> **Files**: `apps/web/src/app/(dashboard)/callbacks/page.tsx`, `apps/web/src/lib/graphql/callbacks.ts` (new), `apps/web/src/hooks/useCallbackRequests.ts` (new)
> **GraphQL**: `callbackRequests(status, limit, offset)`, `callbackRequest(id)`, `approveCallbackRequest(input)`, `rejectCallbackRequest(input)`

---

## Objective

Replace the 100% mock callbacks page with real GraphQL data — wire status-filtered queries, approve/reject mutations with time slot picker, a callback detail view, and a dashboard reminder widget for the next upcoming callback.

---

## Current State

```typescript
// apps/web/src/app/(dashboard)/callbacks/page.tsx — 329 lines, 100% MOCK
'use client';

import { useState, useMemo, useCallback } from 'react';

interface CallbackRequest {
  id: string;
  serviceProvider: { name: string; industry: string; verified: boolean };
  reason: string;
  details: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  requestedAt: string;
  respondedAt?: string;
  approvedSlotStart?: string;
  approvedSlotEnd?: string;
}

const mockCallbacks: CallbackRequest[] = [
  {
    id: '1',
    serviceProvider: { name: 'Acme Insurance', industry: 'Insurance', verified: true },
    reason: 'Policy renewal discussion',
    details: 'Your auto insurance policy #AUT-2024-7789 is due for renewal...',
    status: 'PENDING',
    requestedAt: '2026-03-28T10:00:00Z',
  },
  // ... 4 more mock items with APPROVED, REJECTED, PENDING, EXPIRED statuses
];

// handleApprove — state-only, no API call
const handleApprove = useCallback((id: string) => {
  setCallbacks((prev) => prev.map((c) =>
    c.id === id ? { ...c, status: 'APPROVED', respondedAt: new Date().toISOString(),
      approvedSlotStart: slotDate + 'T' + slotStart, approvedSlotEnd: slotDate + 'T' + slotEnd } : c
  ));
  setApproveId(null);
}, [slotDate, slotStart, slotEnd]);

// handleReject — state-only, no API call
const handleReject = useCallback((id: string) => {
  setCallbacks((prev) => prev.map((c) =>
    c.id === id ? { ...c, status: 'REJECTED', respondedAt: new Date().toISOString() } : c
  ));
  setRejectId(null);
}, []);
```

**UI Elements Already Built** (keep these, just rewire data):
- Status filter tabs: All / Pending / Approved / Rejected / Expired
- Detail panel with timeline (requested → responded → scheduled)
- Slot picker form with date input + start time + end time
- Status config with colors and icons per status
- Approve confirmation modal with slot picker
- Reject confirmation modal

**Gaps**:
- All data from `mockCallbacks` array — no GraphQL query
- `handleApprove` / `handleReject` are local state mutations — no backend persistence
- No loading/error states
- No pagination
- No real slot picker tied to user's availability slots
- Dashboard widget (`features/callback-requests/callback-request-list.tsx`) is also 100% mock

### GraphQL Schema Available

```graphql
# Queries
callbackRequests(status: CallbackRequestStatus, limit: Int, offset: Int): CallbackRequestConnection!
callbackRequest(id: ID!): CallbackRequest!

# Mutations
approveCallbackRequest(input: ApproveCallbackRequestInput!): CallbackRequest!
rejectCallbackRequest(input: RejectCallbackRequestInput!): CallbackRequest!

# Input Types
input ApproveCallbackRequestInput {
  callbackRequestId: ID!
  approvedSlotStart: DateTime!
  approvedSlotEnd: DateTime!
}
input RejectCallbackRequestInput {
  callbackRequestId: ID!
  reason: String
}

# Types
type CallbackRequestConnection { nodes: [CallbackRequest!]!; totalCount: Int! }
type CallbackRequest {
  id: ID!; serviceProvider: ServiceProvider!; reason: String!; details: String
  status: CallbackRequestStatus!; requestedAt: DateTime!; respondedAt: DateTime
  approvedSlotStart: DateTime; approvedSlotEnd: DateTime
}
enum CallbackRequestStatus { PENDING, APPROVED, REJECTED, RESCHEDULED, EXPIRED }

# Subscription
callbackRequestUpdated(id: ID!): CallbackRequest!
```

---

## Task 3.5 — Wire Callbacks Page to `callbackRequests` Query

### Requirements

- [ ] Create `apps/web/src/lib/graphql/callbacks.ts` with GraphQL operations:
  - [ ] `GET_CALLBACK_REQUESTS` query — accepts `status`, `limit`, `offset`
  - [ ] `GET_CALLBACK_REQUEST` query — accepts `id`
  - [ ] `APPROVE_CALLBACK` mutation — accepts `ApproveCallbackRequestInput`
  - [ ] `REJECT_CALLBACK` mutation — accepts `RejectCallbackRequestInput`
- [ ] Create `apps/web/src/hooks/useCallbackRequests.ts` hook:
  - [ ] Use `useQuery(GET_CALLBACK_REQUESTS, { variables })` from Apollo Client
  - [ ] Accept `status` filter (null = all) and `page` number
  - [ ] Return `{ callbacks, totalCount, loading, error, refetch }`
  - [ ] Page size: 20
- [ ] Update `callbacks/page.tsx`:
  - [ ] Remove `mockCallbacks` array entirely
  - [ ] Import and use `useCallbackRequests()` instead of `useState(mockCallbacks)`
  - [ ] Map tab filter to query variable: `null` → all, `'PENDING'`, `'APPROVED'`, `'REJECTED'`, `'EXPIRED'`
  - [ ] Add loading skeleton (3 placeholder cards matching existing card layout)
  - [ ] Add error state with retry
  - [ ] Add pagination controls

### Implementation Details

```typescript
// apps/web/src/lib/graphql/callbacks.ts
import { gql } from '@apollo/client';

export const GET_CALLBACK_REQUESTS = gql`
  query GetCallbackRequests($status: CallbackRequestStatus, $limit: Int, $offset: Int) {
    callbackRequests(status: $status, limit: $limit, offset: $offset) {
      nodes {
        id
        serviceProvider { id name industry verificationStatus }
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
`;

export const GET_CALLBACK_REQUEST = gql`
  query GetCallbackRequest($id: ID!) {
    callbackRequest(id: $id) {
      id
      serviceProvider { id name industry verificationStatus description }
      reason details status requestedAt respondedAt
      approvedSlotStart approvedSlotEnd
    }
  }
`;

export const APPROVE_CALLBACK = gql`
  mutation ApproveCallback($input: ApproveCallbackRequestInput!) {
    approveCallbackRequest(input: $input) {
      id status respondedAt approvedSlotStart approvedSlotEnd
    }
  }
`;

export const REJECT_CALLBACK = gql`
  mutation RejectCallback($input: RejectCallbackRequestInput!) {
    rejectCallbackRequest(input: $input) {
      id status respondedAt
    }
  }
`;
```

```typescript
// apps/web/src/hooks/useCallbackRequests.ts
import { useQuery } from '@apollo/client';
import { GET_CALLBACK_REQUESTS } from '@/lib/graphql/callbacks';

const PAGE_SIZE = 20;

export function useCallbackRequests(status: string | null, page: number) {
  const { data, loading, error, refetch } = useQuery(GET_CALLBACK_REQUESTS, {
    variables: {
      status: status ?? undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    },
    fetchPolicy: 'cache-and-network',
  });

  return {
    callbacks: data?.callbackRequests?.nodes ?? [],
    totalCount: data?.callbackRequests?.totalCount ?? 0,
    loading,
    error,
    refetch,
  };
}
```

---

## Task 3.6 — Wire Approve Callback with Time Slot Picker

### Requirements

- [ ] Replace state-only `handleApprove` with `useMutation(APPROVE_CALLBACK)`:
  - [ ] Pass `callbackRequestId`, `approvedSlotStart`, `approvedSlotEnd` from slot picker form
  - [ ] Format dates as ISO DateTime strings
  - [ ] Optimistic update: set `status: 'APPROVED'` in cache
  - [ ] On success: close modal, show success toast
  - [ ] On error: show error toast, revert
- [ ] Enhance slot picker to show user's availability:
  - [ ] Fetch `me { availabilitySlots { dayOfWeek startTime endTime slotType isActive } }` 
  - [ ] Highlight available slots in the picker
  - [ ] Validate that selected time falls within an availability window
  - [ ] Show warning if picking outside availability hours
- [ ] Add loading state to approve button while mutation in-flight

### Implementation Details

```typescript
// Approve handler replacement
const [approveCallback, { loading: approving }] = useMutation(APPROVE_CALLBACK);

const handleApprove = async (id: string) => {
  const slotStartISO = `${slotDate}T${slotStart}:00Z`;
  const slotEndISO = `${slotDate}T${slotEnd}:00Z`;

  try {
    await approveCallback({
      variables: {
        input: {
          callbackRequestId: id,
          approvedSlotStart: slotStartISO,
          approvedSlotEnd: slotEndISO,
        },
      },
      optimisticResponse: {
        approveCallbackRequest: {
          __typename: 'CallbackRequest',
          id,
          status: 'APPROVED',
          respondedAt: new Date().toISOString(),
          approvedSlotStart: slotStartISO,
          approvedSlotEnd: slotEndISO,
        },
      },
    });
    setApproveId(null);
    // Show success toast
  } catch (err) {
    // Show error toast
  }
};
```

---

## Task 3.7 — Wire Reject Callback with Reason

### Requirements

- [ ] Replace state-only `handleReject` with `useMutation(REJECT_CALLBACK)`:
  - [ ] Pass `callbackRequestId` and optional `reason` from textarea
  - [ ] Add reason textarea to reject modal (optional, max 500 chars)
  - [ ] Optimistic update: set `status: 'REJECTED'` in cache
  - [ ] On success: close modal, show toast
  - [ ] On error: show error toast, revert
- [ ] Add loading state to reject button while mutation in-flight

### Implementation Details

```typescript
// Reject handler replacement
const [rejectCallback, { loading: rejecting }] = useMutation(REJECT_CALLBACK);

const handleReject = async (id: string) => {
  try {
    await rejectCallback({
      variables: {
        input: {
          callbackRequestId: id,
          reason: rejectReason || undefined,
        },
      },
      optimisticResponse: {
        rejectCallbackRequest: {
          __typename: 'CallbackRequest',
          id,
          status: 'REJECTED',
          respondedAt: new Date().toISOString(),
        },
      },
    });
    setRejectId(null);
    setRejectReason('');
  } catch (err) {
    // Show error toast
  }
};
```

---

## Task 3.8 — Add Callback Detail View

### Requirements

- [ ] Expand the existing detail panel (right side) to be a full detail view:
  - [ ] Fetch full callback via `GET_CALLBACK_REQUEST` query when selected
  - [ ] Show SP info: name, industry, verification badge
  - [ ] Show callback reason and details (full text)
  - [ ] Show timeline: requested → responded → scheduled (if approved)
  - [ ] Show proposed time slot (if approved)
- [ ] Add action buttons in detail view:
  - [ ] "Approve" / "Reject" for PENDING callbacks
  - [ ] "Block Provider" for any status
  - [ ] "Report" for spam/abuse
- [ ] Mobile: detail view becomes full-screen overlay
- [ ] Desktop: detail panel occupies right third (existing layout)

---

## Task 3.9 — Wire Callback Reminders to Dashboard

### Requirements

- [ ] Update `apps/web/src/features/callback-requests/callback-request-list.tsx`:
  - [ ] Replace mock data with `useQuery(GET_CALLBACK_REQUESTS, { variables: { status: 'PENDING', limit: 3 } })`
  - [ ] Remove the fake `setTimeout` delay
  - [ ] Show real pending callbacks with SP name, reason, and requested time
  - [ ] "View All" link to `/callbacks`
- [ ] Update `apps/web/src/features/dashboard/pending-callbacks.tsx`:
  - [ ] Replace empty stub with real pending callbacks query
  - [ ] Show next upcoming approved callback with countdown
  - [ ] Show pending count badge
  - [ ] Inline approve/reject buttons for quick action
- [ ] Add sidebar badge for pending callbacks count

### Implementation Details

```typescript
// features/dashboard/pending-callbacks.tsx — replace stub
import { useQuery } from '@apollo/client';
import { GET_CALLBACK_REQUESTS } from '@/lib/graphql/callbacks';

export function PendingCallbacks() {
  const { data, loading } = useQuery(GET_CALLBACK_REQUESTS, {
    variables: { status: 'PENDING', limit: 5, offset: 0 },
    fetchPolicy: 'cache-and-network',
  });

  const callbacks = data?.callbackRequests?.nodes ?? [];
  const total = data?.callbackRequests?.totalCount ?? 0;

  if (loading) return <CallbacksSkeleton />;

  return (
    <div className="card space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-text-primary">Callback Requests</h2>
        {total > 0 && <span className="badge-count">{total}</span>}
      </div>
      {callbacks.length === 0 ? (
        <p className="text-sm text-text-muted text-center py-4">No pending callbacks</p>
      ) : (
        callbacks.map((cb) => (
          <div key={cb.id} className="flex items-center gap-3 py-2">
            {/* SP name, reason, time, quick actions */}
          </div>
        ))
      )}
      {total > 5 && <Link href="/callbacks" className="text-2xs text-accent-blue">View all {total}</Link>}
    </div>
  );
}
```

---

## Verification Checklist

- [ ] Callbacks page loads real data from GraphQL (no mock data)
- [ ] Status tab switching triggers re-query with correct filter
- [ ] Pagination works with Previous/Next controls
- [ ] Approve flow: modal opens → slot picker → submit → mutation → optimistic update → success toast
- [ ] Reject flow: modal opens → optional reason → submit → mutation → optimistic update → success toast
- [ ] Detail panel shows full callback info with SP verification badge
- [ ] Timeline visualization shows request → response → scheduled dates
- [ ] Dashboard widget shows real pending callbacks (not mock)
- [ ] Loading skeletons display during queries
- [ ] Error states show with retry buttons
- [ ] Mobile responsive layout works

---

## Dependencies

**Depends on**:
- Task 2.1 — Apollo Client configured
- Task 2.2 — ApolloProvider wrapping the app
- Task 3G (availability slots) — for slot picker integration

**Blocks**:
- Task 3K.42 — Dashboard pending callbacks widget

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/callbacks/page.tsx` | Main callbacks page (329 lines, 100% mock) |
| `apps/web/src/lib/graphql/callbacks.ts` | **New** — GraphQL operations |
| `apps/web/src/hooks/useCallbackRequests.ts` | **New** — Apollo query hook |
| `apps/web/src/features/callback-requests/callback-request-list.tsx` | Dashboard widget (59 lines, mock) |
| `apps/web/src/features/dashboard/pending-callbacks.tsx` | Dashboard stub (9 lines, empty) |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema reference |
