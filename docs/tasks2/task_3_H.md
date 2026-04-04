# Task 3H — Settings: Blocked Providers (Tasks 3.31–3.33)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3H — Settings: Blocked Providers
> **Files**: `apps/web/src/app/(dashboard)/settings/blocked/page.tsx`, `apps/web/src/lib/graphql/blocked.ts` (new), `apps/web/src/hooks/useBlockedProviders.ts` (new), `apps/web/src/components/block-confirmation-dialog.tsx` (new)
> **GraphQL**: `unblockServiceProvider(serviceProviderId)` — NOTE: no `myBlockedProviders` query exists

---

## Objective

Replace the 100% mock blocked organizations page with real data, wire the unblock mutation, and create a reusable block confirmation dialog component shared across the SP directory, notification detail, and callback pages.

---

## Current State

```typescript
// apps/web/src/app/(dashboard)/settings/blocked/page.tsx — 89 lines, 100% MOCK
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

interface BlockedOrg {
  id: string;
  name: string;
  industry: string;
  blockedAt: string;
  reason: string;
}

const mockBlocked: BlockedOrg[] = [
  { id: '1', name: 'SpamCo Marketing', industry: 'Marketing', blockedAt: '2026-03-15T10:00:00Z', reason: 'Too many ads' },
  { id: '2', name: 'Aggressive Insurance', industry: 'Insurance', blockedAt: '2026-03-10T14:30:00Z', reason: 'Unsolicited callbacks' },
  { id: '3', name: 'Unknown Surveys Inc', industry: 'Research', blockedAt: '2026-02-20T09:15:00Z', reason: 'Spam notifications' },
];

// handleUnblock — state-only with GraphQL intent comment
const handleUnblock = useCallback(async (id: string) => {
  setUnblocking(id);
  // Will call: mutation { unblockServiceProvider(serviceProviderId: $id) }
  setTimeout(() => {
    setBlocked((prev) => prev.filter((b) => b.id !== id));
    setUnblocking(null);
  }, 400);
}, []);
```

**UI Elements Already Built** (keep these, rewire data):
- Blocked org cards: red icon, name, industry, blocked date, reason
- Unblock button with loading state ("Unblocking…")
- Empty state: "No blocked organizations" with checkmark icon
- Count label: "{N} blocked organization(s)"

**Gaps**:
- All data from `mockBlocked` — no backend query
- `handleUnblock` is a fake `setTimeout` — no real mutation
- No `myBlockedProviders` query in GraphQL schema
- No reusable block confirmation dialog
- No loading/error states for initial fetch
- `blockedAt` and `reason` fields may not be available from schema

### GraphQL Schema Available

```graphql
# Mutations only — no query for blocked list
blockServiceProvider(serviceProviderId: ID!): Boolean!
unblockServiceProvider(serviceProviderId: ID!): Boolean!

# ServiceProvider type does NOT include isBlocked field
type ServiceProvider {
  id: ID!; slug: String!; name: String!; legalName: String
  industry: String!; description: String; verificationStatus: String!
  status: String!; website: String
}

# NOTE: No myBlockedProviders query exists
# NOTE: No blockedAt or blockReason fields in schema
```

### Data Source Strategy

Since no `myBlockedProviders` query exists:
- **Option A**: Add gateway query `myBlockedProviders: [BlockedServiceProvider!]!` (requires backend change)
- **Option B**: Use REST endpoint if one exists (check gateway routes)
- **Option C**: Maintain client-side blocked list from block/unblock mutation responses + localStorage persistence

---

## Task 3.31 — Wire Blocked Page to Backend Query

### Requirements

- [x] Determine data source strategy:
  - [x] **Preferred**: Add `myBlockedProviders` query to gateway schema (requires Phase 1 gateway extension)
  - [x] **Fallback**: REST endpoint `GET /api/blocked-providers` → document-service or user-service
  - [x] **Interim**: If neither available, keep mock data with TODO and wire unblock mutation only
- [x] Create `apps/web/src/lib/graphql/blocked.ts`:
  - [x] `GET_BLOCKED_PROVIDERS` query (if schema extended) or REST fetch function
  - [x] `UNBLOCK_SP` mutation — reuse from `service-providers.ts` or define here
  - [x] `BLOCK_SP` mutation — reuse from `service-providers.ts` or define here
- [x] Create `apps/web/src/hooks/useBlockedProviders.ts` hook:
  - [x] Return `{ blocked, loading, error, refetch, unblock }`
  - [x] If using GraphQL: `useQuery(GET_BLOCKED_PROVIDERS)`
  - [x] If using REST: `useEffect` + `fetch`
- [x] Update `blocked/page.tsx`:
  - [x] Remove `mockBlocked` array
  - [x] Use `useBlockedProviders()` hook
  - [x] Add loading skeleton
  - [x] Add error state with retry
  - [x] Handle missing fields gracefully (`blockedAt`, `reason` may not exist — show "—" or hide)

### Implementation Details

```typescript
// apps/web/src/lib/graphql/blocked.ts
import { gql } from '@apollo/client';

// If schema extended with myBlockedProviders:
export const GET_BLOCKED_PROVIDERS = gql`
  query GetBlockedProviders {
    myBlockedProviders {
      id name industry verificationStatus
      # blockedAt and reason may not be available
    }
  }
`;

// Reuse from service-providers.ts
export const UNBLOCK_SP = gql`
  mutation UnblockServiceProvider($serviceProviderId: ID!) {
    unblockServiceProvider(serviceProviderId: $serviceProviderId)
  }
`;
```

```typescript
// apps/web/src/hooks/useBlockedProviders.ts
import { useQuery, useMutation } from '@apollo/client';
import { GET_BLOCKED_PROVIDERS, UNBLOCK_SP } from '@/lib/graphql/blocked';

export function useBlockedProviders() {
  const { data, loading, error, refetch } = useQuery(GET_BLOCKED_PROVIDERS);
  const [unblockMutation, { loading: unblocking }] = useMutation(UNBLOCK_SP);

  return {
    blocked: data?.myBlockedProviders ?? [],
    loading,
    error,
    unblocking,
    refetch,
    unblock: async (serviceProviderId: string) => {
      await unblockMutation({
        variables: { serviceProviderId },
        optimisticResponse: { unblockServiceProvider: true },
        update(cache) {
          cache.modify({
            fields: {
              myBlockedProviders(existing = [], { readField }) {
                return existing.filter((ref: any) => readField('id', ref) !== serviceProviderId);
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

## Task 3.32 — Wire Unblock Action

### Requirements

- [x] Replace fake `setTimeout` unblock with real mutation:
  - [x] Call `unblockServiceProvider(serviceProviderId)` mutation
  - [x] Add confirmation dialog before unblocking:
    - [x] "Unblock {SP name}?"
    - [x] "This organization will be able to send you notifications and callback requests again."
    - [x] Confirm / Cancel buttons
  - [x] Optimistic removal from blocked list
  - [x] On success: show "Unblocked" toast
  - [x] On error: revert removal, show error toast
- [x] Keep loading state on individual unblock buttons:
  - [x] Track which SP is being unblocked via `unblocking` state
  - [x] Show "Unblocking…" text while mutation in-flight
- [x] After unblock: SP should reappear in "My Providers" list (refetch `myServiceProviders`)

---

## Task 3.33 — Add Block Confirmation Dialog (Shared Component)

### Requirements

- [x] Create `apps/web/src/components/block-confirmation-dialog.tsx`:
  - [x] Reusable modal/dialog component
  - [x] Props: `spName`, `spId`, `isOpen`, `onClose`, `onConfirm`
  - [x] Content: warning icon, SP name, consequences list, confirm/cancel buttons
  - [x] Consequences text:
    - [x] "You will no longer receive notifications from {name}"
    - [x] "Pending callback requests will be automatically rejected"
    - [x] "Active conversations will be archived"
  - [x] Confirm button: red "Block" with loading state
  - [x] Cancel button: ghost style
- [x] Wire the dialog to `blockServiceProvider` mutation:
  - [x] On confirm: call mutation → optimistic add to blocked list → close dialog
  - [x] On error: show error toast
- [x] Use this dialog in multiple places:
  - [x] Service providers page (Task 3C.12)
  - [x] SP detail page (Task 3C.13)
  - [x] Notification detail drawer — "Block Sender" (Task 3A.4)
  - [x] Callback page — "Block Provider" action (Task 3B.8)
- [x] Accessibility:
  - [x] Focus trap inside dialog
  - [x] Escape key to close
  - [x] `aria-modal`, `role="dialog"`

### Implementation Details

```typescript
// apps/web/src/components/block-confirmation-dialog.tsx
'use client';

import { useMutation } from '@apollo/client';
import { BLOCK_SP } from '@/lib/graphql/service-providers';

interface BlockConfirmationDialogProps {
  spName: string;
  spId: string;
  isOpen: boolean;
  onClose: () => void;
  onBlocked: () => void;
}

export function BlockConfirmationDialog({ spName, spId, isOpen, onClose, onBlocked }: BlockConfirmationDialogProps) {
  const [blockSP, { loading }] = useMutation(BLOCK_SP);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      await blockSP({ variables: { serviceProviderId: spId } });
      onBlocked();
      onClose();
    } catch {
      // Error toast
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
      <div className="card max-w-md mx-4 p-6 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-accent-red/10 flex items-center justify-center mx-auto">
          <svg className="w-6 h-6 text-accent-red" /* shield-x icon */ />
        </div>
        <h3 className="text-lg font-semibold text-text-primary text-center">Block {spName}?</h3>
        <ul className="text-sm text-text-secondary space-y-2">
          <li>• You will no longer receive notifications from {spName}</li>
          <li>• Pending callback requests will be automatically rejected</li>
          <li>• Active conversations will be archived</li>
        </ul>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="btn-ghost">Cancel</button>
          <button onClick={handleConfirm} disabled={loading}
            className="px-4 py-2 rounded-lg bg-accent-red text-white text-sm font-medium hover:bg-accent-red/90 disabled:opacity-50">
            {loading ? 'Blocking…' : 'Block'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Verification Checklist

- [x] Blocked page loads real data (or shows clear TODO state if query unavailable)
- [x] Loading skeleton displays during fetch
- [x] Blocked org cards show name, industry, and available metadata
- [x] Unblock shows confirmation dialog
- [x] Unblock calls real mutation → removes from list → shows toast
- [x] Unblock loading state shows "Unblocking…" on button
- [x] Block confirmation dialog is reusable (exported component)
- [x] Block dialog shows consequences list
- [x] Block dialog has proper accessibility (focus trap, escape, aria)
- [x] Block mutation works from dialog
- [x] Empty state shows when no blocked organizations
- [x] Error states with retry/toast

---

## Dependencies

**Depends on**:
- Task 2.1 — Apollo Client configured
- Task 3C — Service providers GraphQL operations (reuse `BLOCK_SP` / `UNBLOCK_SP`)
- Gateway may need `myBlockedProviders` query extension

**Blocks**:
- All block/unblock UIs across the app use the shared dialog from Task 3.33

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/settings/blocked/page.tsx` | Blocked page (89 lines, 100% mock) |
| `apps/web/src/lib/graphql/blocked.ts` | **New** — GraphQL operations |
| `apps/web/src/hooks/useBlockedProviders.ts` | **New** — Data-fetching hook |
| `apps/web/src/components/block-confirmation-dialog.tsx` | **New** — Shared block dialog |
| `apps/web/src/lib/graphql/service-providers.ts` | Reuse `BLOCK_SP` / `UNBLOCK_SP` from Task 3C |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema — block/unblock mutations exist, query missing |
