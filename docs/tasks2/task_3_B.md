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

- [x] Create `apps/web/src/lib/graphql/callbacks.ts` with GraphQL operations:
  - [x] `GET_CALLBACK_REQUESTS` query — accepts `status`, `limit`, `offset`
  - [x] `GET_CALLBACK_REQUEST` query — accepts `id`
  - [x] `APPROVE_CALLBACK` mutation — accepts `ApproveCallbackRequestInput`
  - [x] `REJECT_CALLBACK` mutation — accepts `RejectCallbackRequestInput`
- [x] Create `apps/web/src/hooks/useCallbackRequests.ts` hook:
  - [x] Use `useQuery(GET_CALLBACK_REQUESTS, { variables })` from Apollo Client
  - [x] Accept `status` filter (null = all) and `page` number
  - [x] Return `{ callbacks, totalCount, loading, error, refetch }`
  - [x] Page size: 20
- [x] Update `callbacks/page.tsx`:
  - [x] Remove `mockCallbacks` array entirely
  - [x] Import and use `useCallbackRequests()` instead of `useState(mockCallbacks)`
  - [x] Map tab filter to query variable: `null` → all, `'PENDING'`, `'APPROVED'`, `'REJECTED'`, `'EXPIRED'`
  - [x] Add loading skeleton (3 placeholder cards matching existing card layout)
  - [x] Add error state with retry
  - [x] Add pagination controls

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

- [x] Replace state-only `handleApprove` with `useMutation(APPROVE_CALLBACK)`:
  - [x] Pass `callbackRequestId`, `approvedSlotStart`, `approvedSlotEnd` from slot picker form
  - [x] Format dates as ISO DateTime strings
  - [x] Optimistic update: set `status: 'APPROVED'` in cache
  - [x] On success: close modal, show success toast
  - [x] On error: show error toast, revert
- [x] Enhance slot picker to show user's availability:
  - [x] Fetch `me { availabilitySlots { dayOfWeek startTime endTime slotType isActive } }` 
  - [x] Highlight available slots in the picker
  - [x] Validate that selected time falls within an availability window
  - [x] Show warning if picking outside availability hours
- [x] Add loading state to approve button while mutation in-flight

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

- [x] Replace state-only `handleReject` with `useMutation(REJECT_CALLBACK)`:
  - [x] Pass `callbackRequestId` and optional `reason` from textarea
  - [x] Add reason textarea to reject modal (optional, max 500 chars)
  - [x] Optimistic update: set `status: 'REJECTED'` in cache
  - [x] On success: close modal, show toast
  - [x] On error: show error toast, revert
- [x] Add loading state to reject button while mutation in-flight

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

- [x] Expand the existing detail panel (right side) to be a full detail view:
  - [x] Fetch full callback via `GET_CALLBACK_REQUEST` query when selected
  - [x] Show SP info: name, industry, verification badge
  - [x] Show callback reason and details (full text)
  - [x] Show timeline: requested → responded → scheduled (if approved)
  - [x] Show proposed time slot (if approved)
- [x] Add action buttons in detail view:
  - [x] "Approve" / "Reject" for PENDING callbacks
  - [x] "Block Provider" for any status
  - [x] "Report" for spam/abuse
- [x] Mobile: detail view becomes full-screen overlay
- [x] Desktop: detail panel occupies right third (existing layout)

---

## Task 3.9 — Wire Callback Reminders to Dashboard

### Requirements

- [x] Update `apps/web/src/features/callback-requests/callback-request-list.tsx`:
  - [x] Replace mock data with `useQuery(GET_CALLBACK_REQUESTS, { variables: { status: 'PENDING', limit: 3 } })`
  - [x] Remove the fake `setTimeout` delay
  - [x] Show real pending callbacks with SP name, reason, and requested time
  - [x] "View All" link to `/callbacks`
- [x] Update `apps/web/src/features/dashboard/pending-callbacks.tsx`:
  - [x] Replace empty stub with real pending callbacks query
  - [x] Show next upcoming approved callback with countdown
  - [x] Show pending count badge
  - [x] Inline approve/reject buttons for quick action
- [x] Add sidebar badge for pending callbacks count

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

- [x] Callbacks page loads real data from GraphQL (no mock data)
- [x] Status tab switching triggers re-query with correct filter
- [x] Pagination works with Previous/Next controls
- [x] Approve flow: modal opens → slot picker → submit → mutation → optimistic update → success toast
- [x] Reject flow: modal opens → optional reason → submit → mutation → optimistic update → success toast
- [x] Detail panel shows full callback info with SP verification badge
- [x] Timeline visualization shows request → response → scheduled dates
- [x] Dashboard widget shows real pending callbacks (not mock)
- [x] Loading skeletons display during queries
- [x] Error states show with retry buttons
- [x] Mobile responsive layout works

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
