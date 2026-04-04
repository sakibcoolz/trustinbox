# Task 3C — Service Providers (Tasks 3.10–3.14)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3C — Service Providers
> **Files**: `apps/web/src/app/(dashboard)/service-providers/page.tsx`, `apps/web/src/app/(dashboard)/service-providers/[id]/page.tsx` (new), `apps/web/src/lib/graphql/service-providers.ts` (new), `apps/web/src/hooks/useServiceProviders.ts` (new)
> **GraphQL**: `myServiceProviders`, `serviceProviders(search, limit, offset)`, `serviceProvider(id)`, `blockServiceProvider(id)`, `unblockServiceProvider(id)`

---

## Objective

Replace the 100% mock service providers page with real GraphQL data — wire the "My Providers" list and "Discover" directory, add trust score/verification display, block/unblock actions, and a new detail page at `/service-providers/[id]`.

---

## Current State

```typescript
// apps/web/src/app/(dashboard)/service-providers/page.tsx — 407 lines, 100% MOCK
'use client';

import { useState, useMemo, useCallback } from 'react';

interface ServiceProvider {
  id: string;
  name: string;
  industry: string;
  verified: boolean;
  isBlocked: boolean;
  description: string;
  trustScore: number;
  totalInteractions: number;
  lastContactedAt: string;
  history: { type: string; title: string; date: string }[];
}

const mockProviders: ServiceProvider[] = [
  {
    id: '1', name: 'Acme Insurance', industry: 'Insurance',
    verified: true, isBlocked: false, description: 'Leading provider...',
    trustScore: 92, totalInteractions: 15,
    lastContactedAt: '2026-03-28T10:00:00Z',
    history: [
      { type: 'notification', title: 'Policy Renewal Reminder', date: '2026-03-28' },
      { type: 'callback', title: 'Claims Discussion', date: '2026-03-25' },
    ],
  },
  // ... 4 more mock providers
];

// TrustBadge component — inline helper
function TrustBadge({ score }: { score: number }) {
  const color = score >= 80 ? 'text-status-success' : score >= 50 ? 'text-accent-orange' : 'text-accent-red';
  return <span className={`text-2xs font-bold ${color}`}>{score}/100</span>;
}

// handleToggleBlock — state-only, no API call
const handleToggleBlock = useCallback((id: string) => {
  setProviders((prev) => prev.map((p) =>
    p.id === id ? { ...p, isBlocked: !p.isBlocked } : p
  ));
}, []);
```

**UI Elements Already Built** (keep these, rewire data):
- Search filter (name matching)
- Provider list with avatar, name, industry, trust score
- Detail panel (right side) with Profile tab and History tab
- Block/Unblock toggle button
- Verification badge display
- `TrustBadge` component

**Gaps**:
- All data from `mockProviders` — no GraphQL query
- `handleToggleBlock` is state-only — no mutation
- No dedicated `/service-providers/[id]` detail page
- No discovery/directory tab with search across all providers
- No pagination
- No loading/error states
- Trust score, `totalInteractions`, `lastContactedAt`, `history` — not in schema (needs mock/compute)

### GraphQL Schema Available

```graphql
# Queries
myServiceProviders: [ServiceProvider!]!
serviceProviders(search: String, limit: Int, offset: Int): [ServiceProvider!]!
serviceProvider(id: ID!): ServiceProvider!

# Mutations
blockServiceProvider(serviceProviderId: ID!): Boolean!
unblockServiceProvider(serviceProviderId: ID!): Boolean!

# Types
type ServiceProvider {
  id: ID!; slug: String!; name: String!; legalName: String
  industry: String!; description: String; verificationStatus: String!
  status: String!; website: String
}
```

**Note**: `trustScore`, `totalInteractions`, `lastContactedAt`, `isBlocked`, `history` are NOT in the schema. The UI will need to derive/compute these or use placeholder values until the schema is extended.

---

## Task 3.10 — Wire Service Provider Directory to `myServiceProviders` Query

### Requirements

- [x] Create `apps/web/src/lib/graphql/service-providers.ts` with GraphQL operations:
  - [x] `GET_MY_SERVICE_PROVIDERS` query — no params (returns all user's SPs)
  - [x] `SEARCH_SERVICE_PROVIDERS` query — accepts `search`, `limit`, `offset`
  - [x] `GET_SERVICE_PROVIDER` query — accepts `id`
  - [x] `BLOCK_SP` mutation — accepts `serviceProviderId`
  - [x] `UNBLOCK_SP` mutation — accepts `serviceProviderId`
- [x] Create `apps/web/src/hooks/useServiceProviders.ts` hook:
  - [x] Use `useQuery(GET_MY_SERVICE_PROVIDERS)` for the default "My Providers" tab
  - [x] Return `{ providers, loading, error, refetch }`
  - [x] Client-side search filtering (since `myServiceProviders` has no search param)
- [x] Update `service-providers/page.tsx`:
  - [x] Remove `mockProviders` array
  - [x] Import and use `useServiceProviders()` hook
  - [x] Add loading skeleton matching existing card layout
  - [x] Add error state with retry
  - [x] Keep existing search bar — filter client-side on hook results
  - [x] Adapt to schema shape: `verificationStatus` instead of `verified` boolean

### Implementation Details

```typescript
// apps/web/src/lib/graphql/service-providers.ts
import { gql } from '@apollo/client';

export const GET_MY_SERVICE_PROVIDERS = gql`
  query GetMyServiceProviders {
    myServiceProviders {
      id slug name legalName industry description
      verificationStatus status website
    }
  }
`;

export const SEARCH_SERVICE_PROVIDERS = gql`
  query SearchServiceProviders($search: String, $limit: Int, $offset: Int) {
    serviceProviders(search: $search, limit: $limit, offset: $offset) {
      id slug name industry description verificationStatus status website
    }
  }
`;

export const GET_SERVICE_PROVIDER = gql`
  query GetServiceProvider($id: ID!) {
    serviceProvider(id: $id) {
      id slug name legalName industry description
      verificationStatus status website
    }
  }
`;

export const BLOCK_SP = gql`
  mutation BlockServiceProvider($serviceProviderId: ID!) {
    blockServiceProvider(serviceProviderId: $serviceProviderId)
  }
`;

export const UNBLOCK_SP = gql`
  mutation UnblockServiceProvider($serviceProviderId: ID!) {
    unblockServiceProvider(serviceProviderId: $serviceProviderId)
  }
`;
```

```typescript
// apps/web/src/hooks/useServiceProviders.ts
import { useQuery } from '@apollo/client';
import { GET_MY_SERVICE_PROVIDERS, SEARCH_SERVICE_PROVIDERS } from '@/lib/graphql/service-providers';

export function useMyServiceProviders() {
  const { data, loading, error, refetch } = useQuery(GET_MY_SERVICE_PROVIDERS, {
    fetchPolicy: 'cache-and-network',
  });
  return {
    providers: data?.myServiceProviders ?? [],
    loading,
    error,
    refetch,
  };
}

export function useServiceProviderSearch(search: string, page: number) {
  const PAGE_SIZE = 20;
  const { data, loading, error, refetch } = useQuery(SEARCH_SERVICE_PROVIDERS, {
    variables: { search: search || undefined, limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE },
    fetchPolicy: 'cache-and-network',
    skip: !search, // only search when user types
  });
  return {
    providers: data?.serviceProviders ?? [],
    loading,
    error,
    refetch,
  };
}
```

### Verification Badge Mapping

```typescript
// Map verificationStatus string to existing UI patterns
const verificationDisplay = (status: string) => {
  switch (status) {
    case 'verified': return { icon: '✓', label: 'Verified', class: 'chip-green' };
    case 'pending': return { icon: '⏳', label: 'Pending', class: 'chip-orange' };
    case 'rejected': return { icon: '✗', label: 'Rejected', class: 'chip-red' };
    case 'suspended': return { icon: '⚠', label: 'Suspended', class: 'chip-red' };
    default: return { icon: '?', label: 'Unknown', class: 'chip-default' };
  }
};
```

---

## Task 3.11 — Add Trust Score and Verification Display

### Requirements

- [x] Keep the existing `TrustBadge` component design
- [x] Since `trustScore` is not in the GraphQL schema:
  - [x] Option A: Show verification badge only (no numeric score) until schema adds it
  - [x] Option B: Compute a placeholder score from `verificationStatus` (verified=90, pending=50, etc.)
  - [x] Document which approach is chosen; prefer Option A for accuracy
- [x] Show verification status prominently on provider cards:
  - [x] Green checkmark + "Verified" for `verified`
  - [x] Orange clock + "Pending" for `pending`
  - [x] Red X + "Unverified" for others
- [x] Show interaction stats where available:
  - [x] `totalInteractions` and `lastContactedAt` not in schema — show "N/A" or hide until available
  - [x] Add TODO comment for future schema extension
- [x] Display industry badge with icon

---

## Task 3.12 — Wire Block/Unblock Actions

### Requirements

- [x] Replace state-only `handleToggleBlock` with GraphQL mutations:
  - [x] If currently blocked → call `UNBLOCK_SP` mutation
  - [x] If not blocked → call `BLOCK_SP` mutation
- [x] Add confirmation dialog before blocking:
  - [x] "Are you sure you want to block {SP name}?"
  - [x] "You will no longer receive notifications, callbacks, or documents from this organization."
  - [x] Confirm / Cancel buttons
- [x] Optimistic update:
  - [x] Immediately update local UI (toggle visual state)
  - [x] Revert on error
- [x] Note: `isBlocked` is not in the SP schema — track locally or refetch `me` data
  - [x] Consider maintaining a client-side `Set<string>` of blocked SP IDs
  - [x] Or query blocked list from `myBlockedProviders` (not yet in schema — see Task 3H)
- [x] After blocking: remove SP from "My Providers" list (they should move to blocked page)
- [x] After unblocking: SP reappears in "My Providers"
- [x] Show success toast after block/unblock

---

## Task 3.13 — Add Service Provider Detail View

### Requirements

- [x] Create `apps/web/src/app/(dashboard)/service-providers/[id]/page.tsx`:
  - [x] Fetch SP data using `useQuery(GET_SERVICE_PROVIDER, { variables: { id: params.id } })`
  - [x] Show SP profile card: name, legal name, industry, description, website link, verification badge
  - [x] Communication history tab (fetch via related queries):
    - [x] Recent notifications from this SP
    - [x] Callback requests from this SP
    - [x] Conversations with this SP
  - [x] Documents tab: documents shared by this SP
  - [x] Actions: Block/Unblock, Report Spam
- [x] Navigation:
  - [x] Back button → `/service-providers`
  - [x] Click provider in list → navigate to `/service-providers/{id}`
- [x] Loading skeleton for the detail page
- [x] 404 handling if SP not found

### Implementation Details

```typescript
// apps/web/src/app/(dashboard)/service-providers/[id]/page.tsx
'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@apollo/client';
import { GET_SERVICE_PROVIDER } from '@/lib/graphql/service-providers';

export default function ServiceProviderDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data, loading, error } = useQuery(GET_SERVICE_PROVIDER, {
    variables: { id },
    skip: !id,
  });

  const sp = data?.serviceProvider;

  if (loading) return <DetailSkeleton />;
  if (error || !sp) return <NotFoundState />;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-bg-primary">
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        {/* Back button + SP header */}
        {/* Tab bar: Profile | History | Documents */}
        {/* Tab content */}
        {/* Action buttons */}
      </div>
    </div>
  );
}
```

---

## Task 3.14 — Add Service Provider Discovery/Search

### Requirements

- [x] Add "Discover" tab alongside "My Providers" on the main page:
  - [x] "My Providers" — uses `myServiceProviders` query (existing providers the user interacts with)
  - [x] "Discover" — uses `serviceProviders(search)` query with debounced search input
- [x] Search behavior on Discover tab:
  - [x] Debounced input (300ms) triggers `SEARCH_SERVICE_PROVIDERS` query
  - [x] Show search results with SP cards
  - [x] Industry filter chips (Insurance, Banking, Healthcare, etc.)
  - [x] Pagination for results
- [x] Each discovered SP card:
  - [x] Name, industry, verification status
  - [x] "View Details" → navigate to `/service-providers/{id}`
- [x] Empty state: "Search for service providers to connect with"

---

## Verification Checklist

- [x] "My Providers" tab loads real data from `myServiceProviders` query
- [x] "Discover" tab searches real data via `serviceProviders(search)` query
- [x] Search is debounced (300ms) and triggers refetch
- [x] Verification badges display correctly per status
- [x] Block action shows confirmation dialog → calls mutation → removes from list
- [x] Unblock action calls mutation → SP reappears
- [x] Detail page loads at `/service-providers/{id}` with full SP info
- [x] Detail page shows communication history tabs
- [x] Loading skeletons display during queries
- [x] Error states with retry buttons
- [x] Mobile responsive layout

---

## Dependencies

**Depends on**:
- Task 2.1 — Apollo Client configured
- Task 2.2 — ApolloProvider wrapping the app

**Blocks**:
- Task 3H — Blocked providers page (shares block/unblock mutations)
- Task 3A.3 — Inbox "Mute Sender" (shares block mutation)

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/service-providers/page.tsx` | Main SP page (407 lines, 100% mock) |
| `apps/web/src/app/(dashboard)/service-providers/[id]/page.tsx` | **New** — SP detail page |
| `apps/web/src/lib/graphql/service-providers.ts` | **New** — GraphQL operations |
| `apps/web/src/hooks/useServiceProviders.ts` | **New** — Apollo query hooks |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema reference |
