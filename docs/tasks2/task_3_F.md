# Task 3F — Settings: DND Rules (Tasks 3.23–3.26)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3F — Settings: DND Rules
> **Files**: `apps/web/src/app/(dashboard)/settings/dnd/page.tsx`, `apps/web/src/lib/graphql/dnd.ts` (new), `apps/web/src/hooks/useDNDRules.ts` (new)
> **GraphQL**: `me { dndRules { ... } }`, `createDNDRule(input)`, `deleteDNDRule(id)`

---

## Objective

Replace the 100% mock DND rules page with real GraphQL data — loading rules from `me.dndRules`, creating via `createDNDRule` mutation, deleting via `deleteDNDRule` mutation, and adding a DND active indicator in the app header.

---

## Current State

```typescript
// apps/web/src/app/(dashboard)/settings/dnd/page.tsx — 180 lines, 100% MOCK
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface DNDRule {
  id: string;
  scopeType: string;
  startTime: string;
  endTime: string;
  daysOfWeek: number[];
  isActive: boolean;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const mockRules: DNDRule[] = [
  { id: '1', scopeType: 'GLOBAL', startTime: '22:00', endTime: '07:00', daysOfWeek: [0, 1, 2, 3, 4, 5, 6], isActive: true },
  { id: '2', scopeType: 'GLOBAL', startTime: '09:00', endTime: '17:00', daysOfWeek: [0, 6], isActive: false },
];

// handleSave — state-only (adds/updates local array, no API call)
const handleSave = useCallback(() => {
  if (editId) {
    setRules((prev) => prev.map((r) => r.id === editId ? { ...r, startTime, endTime, daysOfWeek: days } : r));
  } else {
    setRules((prev) => [...prev, { id: Date.now().toString(), ... }]);
  }
}, [editId, startTime, endTime, days]);

// handleDelete — state-only (filters from local array)
const handleDelete = useCallback((id: string) => {
  setRules((prev) => prev.filter((r) => r.id !== id));
}, []);

// handleToggleActive — state-only (flips isActive in local array)
const handleToggleActive = useCallback((id: string) => {
  setRules((prev) => prev.map((r) => r.id === id ? { ...r, isActive: !r.isActive } : r));
}, []);
```

**UI Elements Already Built** (keep these, rewire data):
- Rule cards with time range, day pills, active/paused status
- Add Rule / Edit Rule form with time pickers and day selection buttons
- Delete button with immediate removal
- Toggle active/paused per rule
- Empty state with moon emoji

**Gaps**:
- All data from `mockRules` — no GraphQL query
- Create/Edit/Delete/Toggle are all state-only — no mutations
- No loading/error states
- No DND active indicator in header (moon icon when DND is active)
- Schema has `createDNDRule` and `deleteDNDRule` but no `updateDNDRule` — edit = delete + create

### GraphQL Schema Available

```graphql
# Query (nested under me)
me: User!
type User {
  dndRules: [DNDRule!]!
}
type DNDRule {
  id: ID!; scopeType: String!; scopeRefId: ID
  startTime: String!; endTime: String!
  daysOfWeek: [Int!]!; isActive: Boolean!
}

# Mutations
createDNDRule(input: CreateDNDRuleInput!): DNDRule!
deleteDNDRule(id: ID!): Boolean!

input CreateDNDRuleInput {
  scopeType: String!; scopeRefId: ID
  startTime: String!; endTime: String!
  daysOfWeek: [Int!]!; isActive: Boolean!
}

# NOTE: No updateDNDRule mutation — edit requires delete + create
```

---

## Task 3.23 — Wire DND Page to `me.dndRules` Query

### Requirements

- [ ] Create `apps/web/src/lib/graphql/dnd.ts` with GraphQL operations:
  - [ ] `GET_DND_RULES` query — `me { dndRules { id scopeType startTime endTime daysOfWeek isActive } }`
  - [ ] `CREATE_DND_RULE` mutation — accepts `CreateDNDRuleInput`
  - [ ] `DELETE_DND_RULE` mutation — accepts `id`
- [ ] Create `apps/web/src/hooks/useDNDRules.ts` hook:
  - [ ] Use `useQuery(GET_DND_RULES)` to load rules
  - [ ] Return `{ rules, loading, error, refetch }`
- [ ] Update `dnd/page.tsx`:
  - [ ] Remove `mockRules` array
  - [ ] Use `useDNDRules()` hook for data
  - [ ] Initialize rules from query result
  - [ ] Add loading skeleton (2 placeholder rule cards)
  - [ ] Add error state with retry

### Implementation Details

```typescript
// apps/web/src/lib/graphql/dnd.ts
import { gql } from '@apollo/client';

export const GET_DND_RULES = gql`
  query GetDNDRules {
    me {
      id
      dndRules {
        id scopeType scopeRefId
        startTime endTime daysOfWeek isActive
      }
    }
  }
`;

export const CREATE_DND_RULE = gql`
  mutation CreateDNDRule($input: CreateDNDRuleInput!) {
    createDNDRule(input: $input) {
      id scopeType scopeRefId
      startTime endTime daysOfWeek isActive
    }
  }
`;

export const DELETE_DND_RULE = gql`
  mutation DeleteDNDRule($id: ID!) {
    deleteDNDRule(id: $id)
  }
`;
```

```typescript
// apps/web/src/hooks/useDNDRules.ts
import { useQuery, useMutation } from '@apollo/client';
import { GET_DND_RULES, CREATE_DND_RULE, DELETE_DND_RULE } from '@/lib/graphql/dnd';

export function useDNDRules() {
  const { data, loading, error, refetch } = useQuery(GET_DND_RULES);
  const [createRule, { loading: creating }] = useMutation(CREATE_DND_RULE);
  const [deleteRule, { loading: deleting }] = useMutation(DELETE_DND_RULE);

  return {
    rules: data?.me?.dndRules ?? [],
    loading,
    error,
    creating,
    deleting,
    refetch,
    createRule: async (input: CreateDNDRuleInput) => {
      await createRule({
        variables: { input },
        refetchQueries: [{ query: GET_DND_RULES }],
      });
    },
    deleteRule: async (id: string) => {
      await deleteRule({
        variables: { id },
        optimisticResponse: { deleteDNDRule: true },
        update(cache) {
          cache.modify({
            id: cache.identify({ __typename: 'User', id: data?.me?.id }),
            fields: {
              dndRules(existing = [], { readField }) {
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

## Task 3.24 — Add Create DND Rule Form

### Requirements

- [ ] Replace state-only `handleSave` (create mode) with `createRule` mutation:
  - [ ] Collect form values: `startTime`, `endTime`, `daysOfWeek`
  - [ ] Set `scopeType: 'GLOBAL'` and `isActive: true` as defaults
  - [ ] Call `createDNDRule` mutation with input
  - [ ] Optimistic: add rule to cache immediately
  - [ ] On success: close form, show success toast
  - [ ] On error: show error toast
- [ ] Form validation:
  - [ ] Start time must be different from end time
  - [ ] At least one day must be selected
  - [ ] Show validation errors inline
- [ ] Edit flow (since no `updateDNDRule` mutation):
  - [ ] Edit = delete old rule + create new rule
  - [ ] Pre-fill form with existing rule values
  - [ ] On save: delete old, create new → refetch
  - [ ] Show loading state during this two-step operation
- [ ] Add loading state to Create/Update button

---

## Task 3.25 — Add Delete DND Rule

### Requirements

- [ ] Replace state-only `handleDelete` with `deleteRule` mutation:
  - [ ] Add confirmation dialog: "Delete this DND rule?"
  - [ ] Show rule summary in dialog (time range + days)
  - [ ] On confirm: call `deleteDNDRule` mutation
  - [ ] Optimistic removal: filter rule from cache list immediately
  - [ ] On success: show "Rule deleted" toast
  - [ ] On error: revert removal, show error toast
- [ ] Replace state-only `handleToggleActive`:
  - [ ] Since no update mutation, toggle = delete + create with flipped `isActive`
  - [ ] Show brief loading state on the toggle button
  - [ ] On error: revert toggle state

---

## Task 3.26 — Add DND Active Indicator

### Requirements

- [ ] Add moon icon (🌙) in the app header/sidebar when DND is currently active:
  - [ ] Client-side time comparison: check if current time falls within any active rule
  - [ ] Match current day of week against rule's `daysOfWeek`
  - [ ] Match current time against rule's `startTime`–`endTime` range
  - [ ] Handle overnight rules (e.g., 22:00–07:00 spans midnight)
- [ ] Tooltip on hover: "Do Not Disturb active until {endTime}"
- [ ] Indicator location: next to user avatar in sidebar or header
- [ ] Auto-update: check every minute via `setInterval`
- [ ] Use DND rules from the same query (share data with settings page)

### Implementation Details

```typescript
// isDNDActive helper function
function isDNDActive(rules: DNDRule[]): { active: boolean; until?: string } {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  for (const rule of rules) {
    if (!rule.isActive) continue;
    if (!rule.daysOfWeek.includes(currentDay)) continue;

    // Handle overnight rules (start > end means crosses midnight)
    if (rule.startTime > rule.endTime) {
      if (currentTime >= rule.startTime || currentTime < rule.endTime) {
        return { active: true, until: rule.endTime };
      }
    } else {
      if (currentTime >= rule.startTime && currentTime < rule.endTime) {
        return { active: true, until: rule.endTime };
      }
    }
  }
  return { active: false };
}
```

---

## Verification Checklist

- [ ] DND page loads real rules from `me.dndRules` (no mock data)
- [ ] Loading skeleton displays during query
- [ ] Create form submits via `createDNDRule` mutation
- [ ] New rule appears in list after creation
- [ ] Edit workflow: deletes old + creates new with updated values
- [ ] Delete shows confirmation dialog → calls mutation → optimistic removal
- [ ] Toggle active/paused works (delete + create with flipped `isActive`)
- [ ] Day selection buttons work in form
- [ ] Time picker inputs validate correctly
- [ ] Error states show with retry/toast
- [ ] DND active indicator appears in header when rule matches current time
- [ ] Overnight rules (22:00–07:00) handle midnight crossing correctly
- [ ] Indicator tooltip shows "until {endTime}"

---

## Dependencies

**Depends on**:
- Task 2.1 — Apollo Client configured
- Task 2.2 — ApolloProvider
- `me` query must return `dndRules` (already in schema)

**Blocks**:
- None directly

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/settings/dnd/page.tsx` | DND settings page (180 lines, 100% mock) |
| `apps/web/src/lib/graphql/dnd.ts` | **New** — GraphQL operations |
| `apps/web/src/hooks/useDNDRules.ts` | **New** — Apollo query/mutation hook |
| `apps/web/src/app/(dashboard)/layout.tsx` | Dashboard layout — add DND indicator here |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema — `DNDRule` type + mutations |
