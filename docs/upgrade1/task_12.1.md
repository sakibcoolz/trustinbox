# Task 12.1 — WebhookManager Component

> **Section**: 12. Webhooks  
> **Priority**: P1 — Core component  
> **Estimated Scope**: Large  
> **Route**: `/webhooks`  
> **File**: `apps/provider/src/app/webhooks/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Replace the hardcoded webhook table on `/webhooks` with a fully functional `WebhookManager` component that fetches `webhookSubscriptions(spId)` and displays a table of webhook subscriptions showing URL, events, status (active/paused), success rate, failure count, and last delivery timestamp.

---

## Current State

`apps/provider/src/app/webhooks/page.tsx` (55 lines) — hardcoded array of 3 webhooks rendered in a static table. No GraphQL queries, no state management, no CRUD actions.

### GraphQL Schema

```graphql
type WebhookSubscription {
  id: ID!
  serviceProviderId: ID!
  url: String!
  description: String
  events: [String!]!
  status: WebhookSubscriptionStatus!
  failureCount: Int!
  maxRetries: Int!
  lastDeliveryAt: DateTime
  lastFailureAt: DateTime
  createdAt: DateTime!
  updatedAt: DateTime!
}

type WebhookSubscriptionConnection {
  nodes: [WebhookSubscription!]!
  totalCount: Int!
}

query webhookSubscriptions(
  serviceProviderId: ID!
  status: WebhookSubscriptionStatus
  limit: Int
  offset: Int
): WebhookSubscriptionConnection!
```

---

## Requirements

### Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| Endpoint URL | `url` | Monospace, truncated with tooltip |
| Description | `description` | Optional |
| Events | `events[]` | Badge chips |
| Status | `status` | Active (green), Paused (yellow) |
| Failure Count | `failureCount` | Red text if > 0 |
| Last Delivery | `lastDeliveryAt` | Relative time |
| Actions | — | Edit, Test, Delete buttons |

### Features

- SP_ADMIN role guard (entire page)
- Fetch via `webhookSubscriptions(spId)` query
- Status filter chips: All, Active, Paused
- Empty state: "No webhook subscriptions yet"
- Loading skeleton
- "+ Add Webhook" button in header

---

## Implementation Plan

```tsx
'use client';

import { useQuery } from '@apollo/client';
import { useAuth } from '@/contexts/AuthContext';
import { GET_WEBHOOK_SUBSCRIPTIONS } from '@/lib/graphql/webhooks';

export default function WebhooksPage() {
  const { activeServiceProvider } = useAuth();
  const spId = activeServiceProvider?.id ?? '';
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data, loading } = useQuery(GET_WEBHOOK_SUBSCRIPTIONS, {
    variables: { serviceProviderId: spId, status: statusFilter, limit: 50 },
    skip: !spId,
  });

  const webhooks = data?.webhookSubscriptions?.nodes ?? [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Webhooks</h1>
          <p className="text-text-secondary mt-1">Manage webhook subscriptions and monitor deliveries</p>
        </div>
        <button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium">
          + Add Webhook
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2">
        {['All', 'ACTIVE', 'PAUSED'].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s === 'All' ? null : s)}
            className={`px-3 py-1.5 text-xs rounded-full border ${...}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Webhook table */}
      <WebhookTable webhooks={webhooks} loading={loading} />
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/webhooks/page.tsx` | **Modify** | Replace hardcoded table with live data |
| `apps/provider/src/lib/graphql/webhooks.ts` | **Create** | Webhook queries, mutations, types, hooks |

---

## Acceptance Criteria

- [ ] Table fetches `webhookSubscriptions(spId)` via GraphQL
- [ ] URL displayed in monospace
- [ ] Events shown as badge chips
- [ ] Status badge: Active (green), Paused (yellow)
- [ ] Failure count highlighted red when > 0
- [ ] Status filter chips (All, Active, Paused)
- [ ] Loading skeleton
- [ ] Empty state
- [ ] SP_ADMIN role guard

---

## Dependencies

- **Blocked by**: Task 12.9 (GraphQL queries/mutations)
- **Blocks**: Tasks 12.2-12.8
- **Related**: Integrations page webhooks tab (similar but simpler view)
