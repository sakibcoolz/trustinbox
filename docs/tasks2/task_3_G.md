# Task 3G — Settings: Availability Slots (Tasks 3.27–3.30)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3G — Settings: Availability Slots
> **Files**: `apps/web/src/app/(dashboard)/settings/availability/page.tsx`, `apps/web/src/lib/graphql/availability.ts` (new), `apps/web/src/hooks/useAvailabilitySlots.ts` (new)
> **GraphQL**: `me { availabilitySlots { ... } }`, `createAvailabilitySlot(input)`, `deleteAvailabilitySlot(id)`

---

## Objective

Replace the 100% mock availability slots page with real GraphQL data — loading slots from `me.availabilitySlots`, creating via `createAvailabilitySlot` mutation, deleting via `deleteAvailabilitySlot` mutation, and enhancing the weekly calendar visualization.

---

## Current State

```typescript
// apps/web/src/app/(dashboard)/settings/availability/page.tsx — 137 lines, 100% MOCK
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface AvailabilitySlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotType: string;
  isActive: boolean;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const SLOT_TYPES = ['Callback', 'Meeting', 'Any'];

const mockSlots: AvailabilitySlot[] = [
  { id: '1', dayOfWeek: 1, startTime: '09:00', endTime: '12:00', slotType: 'Callback', isActive: true },
  { id: '2', dayOfWeek: 1, startTime: '14:00', endTime: '17:00', slotType: 'Callback', isActive: true },
  { id: '3', dayOfWeek: 3, startTime: '10:00', endTime: '15:00', slotType: 'Any', isActive: true },
  { id: '4', dayOfWeek: 5, startTime: '09:00', endTime: '11:00', slotType: 'Meeting', isActive: false },
];

// handleAdd — state-only (pushes to local array)
const handleAdd = useCallback(() => {
  setSlots((prev) => [...prev, { id: Date.now().toString(), dayOfWeek: day, startTime, endTime, slotType, isActive: true }]);
  setShowForm(false);
}, [day, startTime, endTime, slotType]);

// handleDelete — state-only (filters from local array)
const handleDelete = useCallback((id: string) => {
  setSlots((prev) => prev.filter((s) => s.id !== id));
}, []);

// handleToggle — state-only (flips isActive)
const handleToggle = useCallback((id: string) => {
  setSlots((prev) => prev.map((s) => s.id === id ? { ...s, isActive: !s.isActive } : s));
}, []);
```

**UI Elements Already Built** (keep these, rewire data):
- Weekly calendar view: 7-day grid with slots grouped by day
- Slot cards with type badge (color-coded), time range, toggle, delete
- Add Slot form: day dropdown, start/end time inputs, slot type dropdown
- Slot type color coding: Callback=blue, Meeting=purple, Any=green
- Empty day label: "No availability"

**Gaps**:
- All data from `mockSlots` — no GraphQL query
- Add/Delete/Toggle are state-only — no mutations
- No loading/error states
- No visual calendar grid (just list per day)
- No mobile-optimized vertical list view
- Schema has no `updateAvailabilitySlot` — toggle = delete + create

### GraphQL Schema Available

```graphql
# Query (nested under me)
me: User!
type User {
  availabilitySlots: [AvailabilitySlot!]!
}
type AvailabilitySlot {
  id: ID!; dayOfWeek: Int!; startTime: String!
  endTime: String!; slotType: String!; isActive: Boolean!
}

# Mutations
createAvailabilitySlot(input: CreateAvailabilitySlotInput!): AvailabilitySlot!
deleteAvailabilitySlot(id: ID!): Boolean!

input CreateAvailabilitySlotInput {
  dayOfWeek: Int!; startTime: String!; endTime: String!; slotType: String!
}

# NOTE: No updateAvailabilitySlot — isActive toggle = delete + create
# NOTE: CreateAvailabilitySlotInput has no isActive — new slots are always active
```

---

## Task 3.27 — Wire Availability Page to `me.availabilitySlots` Query

### Requirements

- [x] Create `apps/web/src/lib/graphql/availability.ts` with GraphQL operations:
  - [x] `GET_AVAILABILITY_SLOTS` query — `me { availabilitySlots { id dayOfWeek startTime endTime slotType isActive } }`
  - [x] `CREATE_AVAILABILITY_SLOT` mutation — accepts `CreateAvailabilitySlotInput`
  - [x] `DELETE_AVAILABILITY_SLOT` mutation — accepts `id`
- [x] Create `apps/web/src/hooks/useAvailabilitySlots.ts` hook:
  - [x] Use `useQuery(GET_AVAILABILITY_SLOTS)` to load slots
  - [x] Return `{ slots, loading, error, refetch, createSlot, deleteSlot }`
- [x] Update `availability/page.tsx`:
  - [x] Remove `mockSlots` array
  - [x] Use `useAvailabilitySlots()` hook
  - [x] Initialize slots from query result
  - [x] Add loading skeleton (7 day rows with placeholder blocks)
  - [x] Add error state with retry

### Implementation Details

```typescript
// apps/web/src/lib/graphql/availability.ts
import { gql } from '@apollo/client';

export const GET_AVAILABILITY_SLOTS = gql`
  query GetAvailabilitySlots {
    me {
      id
      availabilitySlots {
        id dayOfWeek startTime endTime slotType isActive
      }
    }
  }
`;

export const CREATE_AVAILABILITY_SLOT = gql`
  mutation CreateAvailabilitySlot($input: CreateAvailabilitySlotInput!) {
    createAvailabilitySlot(input: $input) {
      id dayOfWeek startTime endTime slotType isActive
    }
  }
`;

export const DELETE_AVAILABILITY_SLOT = gql`
  mutation DeleteAvailabilitySlot($id: ID!) {
    deleteAvailabilitySlot(id: $id)
  }
`;
```

```typescript
// apps/web/src/hooks/useAvailabilitySlots.ts
import { useQuery, useMutation } from '@apollo/client';
import { GET_AVAILABILITY_SLOTS, CREATE_AVAILABILITY_SLOT, DELETE_AVAILABILITY_SLOT } from '@/lib/graphql/availability';

export function useAvailabilitySlots() {
  const { data, loading, error, refetch } = useQuery(GET_AVAILABILITY_SLOTS);
  const [createMutation, { loading: creating }] = useMutation(CREATE_AVAILABILITY_SLOT);
  const [deleteMutation, { loading: deleting }] = useMutation(DELETE_AVAILABILITY_SLOT);

  const userId = data?.me?.id;

  return {
    slots: data?.me?.availabilitySlots ?? [],
    loading,
    error,
    creating,
    deleting,
    refetch,
    createSlot: async (input: { dayOfWeek: number; startTime: string; endTime: string; slotType: string }) => {
      await createMutation({
        variables: { input },
        refetchQueries: [{ query: GET_AVAILABILITY_SLOTS }],
      });
    },
    deleteSlot: async (id: string) => {
      await deleteMutation({
        variables: { id },
        optimisticResponse: { deleteAvailabilitySlot: true },
        update(cache) {
          cache.modify({
            id: cache.identify({ __typename: 'User', id: userId }),
            fields: {
              availabilitySlots(existing = [], { readField }) {
                return existing.filter((ref: any) => readField('id', ref) !== id);
              },
            },
          });
        },
      });
    },
  };
}
```

---

## Task 3.28 — Add Create Availability Slot Form

### Requirements

- [x] Replace state-only `handleAdd` with `createSlot` mutation:
  - [x] Collect form: `dayOfWeek`, `startTime`, `endTime`, `slotType`
  - [x] Call `createAvailabilitySlot` mutation
  - [x] On success: close form, refetch slots, show success toast
  - [x] On error: show error toast
- [x] Form validation:
  - [x] End time must be after start time
  - [x] No overlapping slots on the same day
  - [x] At least 30-minute minimum duration
  - [x] Show validation errors inline
- [x] Add loading state on "Add Slot" button during mutation
- [x] Alternative: click on a day row in the calendar → pre-fill the day dropdown → open form

---

## Task 3.29 — Add Delete Availability Slot

### Requirements

- [x] Replace state-only `handleDelete` with `deleteSlot` mutation:
  - [x] Click delete (✗) button on slot → popover confirmation
  - [x] "Remove this availability slot?" + slot summary
  - [x] On confirm: call `deleteAvailabilitySlot` mutation
  - [x] Optimistic removal from cache
  - [x] On success: show "Slot removed" toast
  - [x] On error: revert, show error toast
- [x] Replace state-only `handleToggle`:
  - [x] Since no update mutation, toggle = delete + create with flipped `isActive`
  - [x] Note: `CreateAvailabilitySlotInput` has no `isActive` field — new slots always active
  - [x] Option: hide toggle, only support delete. Or track `isActive` client-side until schema extends
  - [x] Document chosen approach with TODO for future `updateAvailabilitySlot`

---

## Task 3.30 — Visual Weekly Calendar View

### Requirements

- [x] Enhance existing 7-day list into a visual calendar grid:
  - [x] Desktop: 7-column grid, each column = one day of week
  - [x] Rows represent time blocks (e.g., 8:00 AM to 8:00 PM)
  - [x] Colored blocks represent availability slots, height proportional to duration
  - [x] Color coding: Callback=`bg-accent-blue/20`, Meeting=`bg-accent-purple/20`, Any=`bg-accent-green/20`
  - [x] Current time indicator: red horizontal line showing "now"
- [x] Interactive calendar:
  - [x] Click on empty time slot → open create form pre-filled with day + time
  - [x] Click on existing slot → show popover with details + delete button
- [x] Mobile layout:
  - [x] Vertical scrollable list (one day per section, current design)
  - [x] Swipe between days or accordion-style expand/collapse
- [x] Keep the existing list view as a fallback tab ("List" | "Calendar" toggle)

---

## Verification Checklist

- [x] Availability page loads real slots from `me.availabilitySlots`
- [x] Loading skeleton shows during query
- [x] Create form submits via `createAvailabilitySlot` mutation
- [x] New slot appears in calendar/list after creation
- [x] Delete shows confirmation → calls mutation → optimistic removal
- [x] Slot type colors display correctly (blue/purple/green)
- [x] Weekly calendar grid shows slots as colored blocks
- [x] Current time indicator visible on calendar
- [x] Clicking empty slot opens pre-filled form
- [x] Clicking existing slot shows popover with delete
- [x] Form validates: end > start, no overlap, min 30min
- [x] Mobile fallback to list view
- [x] Error states with retry/toast

---

## Dependencies

**Depends on**:
- Task 2.1 — Apollo Client configured
- Task 2.2 — ApolloProvider
- `me` query must return `availabilitySlots` (already in schema)

**Blocks**:
- Task 3B.6 — Callback approve slot picker (shows user's availability)

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/settings/availability/page.tsx` | Availability settings (137 lines, 100% mock) |
| `apps/web/src/lib/graphql/availability.ts` | **New** — GraphQL operations |
| `apps/web/src/hooks/useAvailabilitySlots.ts` | **New** — Apollo query/mutation hook |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema — `AvailabilitySlot` type + mutations |
