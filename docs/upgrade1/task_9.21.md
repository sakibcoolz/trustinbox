# Task 9.21 — GraphQL providerCampaignProgressUpdated Subscription

> **Section**: 9. Campaigns — Connected Backend  
> **Priority**: P1 — Real-time updates  
> **Estimated Scope**: Medium  
> **Route**: N/A (shared GraphQL layer)  
> **File**: `apps/provider/src/lib/graphql/campaigns.ts`  
> **Status**: ✅ Complete

---

## Objective

Add the `CAMPAIGN_PROGRESS_SUBSCRIPTION` to the campaigns GraphQL operations file and integrate it into the campaign detail page for real-time delivery progress updates. When a campaign is running, the subscription pushes updated campaign counts as the worker-service processes targets.

---

## Current State

No subscription exists. The detail page uses static mock data with no live updates.

### GraphQL Schema

```graphql
type Subscription {
  providerCampaignProgressUpdated(serviceProviderId: ID!): Campaign!
}
```

The subscription emits the full `Campaign` object with updated `sentCount`, `deliveredCount`, `readCount`, `failedCount`, and `status` as the worker-service processes each batch.

### Backend Flow

1. Worker-service `CampaignSendProcessor` processes targets in batches
2. After each batch: updates campaign aggregate counts in DB
3. Emits campaign update event
4. Gateway pushes updated Campaign object to all subscribed clients
5. On full completion: status changes to `COMPLETED`, emits `campaign.completed` event

---

## Requirements

### Subscription Definition

```graphql
subscription CampaignProgressUpdated($serviceProviderId: ID!) {
  providerCampaignProgressUpdated(serviceProviderId: $serviceProviderId) {
    ...CampaignFields
  }
}
```

### Integration Points

| Page | Behavior |
|------|----------|
| Campaign detail (`/campaigns/[id]`) | Update delivery counts + progress bar in real-time |
| Campaign list (`/campaigns`) | Update status badges and mini-charts for running campaigns |

### 1. Detail Page Integration

```tsx
// In campaign detail page
useSubscription(CAMPAIGN_PROGRESS_SUBSCRIPTION, {
  variables: { serviceProviderId },
  skip: campaign?.status !== 'RUNNING',
  onData: ({ data }) => {
    // Apollo auto-merges by Campaign ID (keyFields: ['id'])
    // Progress bar, metrics auto-update
  },
});
```

### 2. List Page Integration

```tsx
// In campaigns list page  
useSubscription(CAMPAIGN_PROGRESS_SUBSCRIPTION, {
  variables: { serviceProviderId },
  // Applies to all running campaigns in the list
  // Apollo cache auto-updates matching Campaign objects
});
```

### 3. Cache Behavior

Since the subscription returns the full `Campaign` object with the `CampaignFields` fragment:
- Apollo automatically merges updates into the cache by `Campaign.id` (keyFields: `['id']`)
- All components referencing the same Campaign ID will re-render with new counts
- No manual cache manipulation needed

### 4. Connection Management

- Subscribe only when there are RUNNING campaigns visible
- Unsubscribe when leaving the page or when no campaigns are running
- Handle WebSocket reconnection gracefully
- Show "Reconnecting…" indicator if connection drops

### 5. UI Indicators

- "Live" badge with pulsing green dot when subscription is active
- Smooth CSS transitions on count changes (numbers animate)
- Progress bar segments animate width changes

---

## Implementation Plan

```tsx
// Add to apps/provider/src/lib/graphql/campaigns.ts

export const CAMPAIGN_PROGRESS_SUBSCRIPTION = gql`
  ${CAMPAIGN_FIELDS}
  subscription CampaignProgressUpdated($serviceProviderId: ID!) {
    providerCampaignProgressUpdated(serviceProviderId: $serviceProviderId) {
      ...CampaignFields
    }
  }
`;
```

### Hook wrapper (optional)

```tsx
// apps/provider/src/hooks/useCampaignProgress.ts
import { useSubscription } from '@apollo/client';
import { CAMPAIGN_PROGRESS_SUBSCRIPTION } from '@/lib/graphql/campaigns';
import { useServiceProvider } from '@/hooks/useServiceProvider';

export function useCampaignProgress(options?: { skip?: boolean }) {
  const { serviceProviderId } = useServiceProvider();

  return useSubscription(CAMPAIGN_PROGRESS_SUBSCRIPTION, {
    variables: { serviceProviderId },
    skip: options?.skip,
  });
}
```

### Usage in detail page

```tsx
import { useCampaignProgress } from '@/hooks/useCampaignProgress';

export default function CampaignDetailPage({ params }) {
  const { id } = use(params);
  const { data: campaign, loading } = useQuery(GET_CAMPAIGN, { ... });

  // Real-time updates for running campaigns
  const { data: progressData } = useCampaignProgress({
    skip: campaign?.campaign?.status !== 'RUNNING',
  });

  // Apollo cache merges subscription data automatically
  // The progress bar and metrics re-render with updated counts

  const isLive = campaign?.campaign?.status === 'RUNNING';

  return (
    <div className="p-8 space-y-6">
      {/* ... */}
      <DeliveryProgressBar campaign={campaign.campaign} isLive={isLive} />
      {/* ... */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add CAMPAIGN_PROGRESS_SUBSCRIPTION |
| `apps/provider/src/hooks/useCampaignProgress.ts` | **Create** (optional) | Subscription hook wrapper |
| `apps/provider/src/app/campaigns/[id]/page.tsx` | **Modify** | Integrate subscription for live updates |
| `apps/provider/src/app/campaigns/page.tsx` | **Modify** | Integrate subscription for list updates |

---

## Acceptance Criteria

- [ ] `CAMPAIGN_PROGRESS_SUBSCRIPTION` exported from `campaigns.ts`
- [ ] Uses `CampaignFields` fragment for full campaign data
- [ ] Subscribes to `providerCampaignProgressUpdated` with `serviceProviderId`
- [ ] Detail page: real-time count updates for RUNNING campaigns
- [ ] List page: status badges and mini-charts update in real-time
- [ ] Apollo cache auto-merges updates by Campaign ID
- [ ] "Live" indicator shown when subscription is active
- [ ] Subscription skipped for non-RUNNING campaigns
- [ ] Graceful handling of WebSocket disconnection/reconnection

---

## Dependencies

- **Blocked by**: Task 9.14 (campaigns.ts file + fragment)
- **Blocks**: None (enhancement layer)
- **Related**: Task 9.10 (progress bar — primary consumer), Task 9.9 (detail page — integration target)
