# Task 9.9 — Campaign Detail View

> **Section**: 9. Campaigns  
> **Priority**: P0 — Core feature page  
> **Estimated Scope**: Large  
> **Route**: `/campaigns/[id]`  
> **File**: `apps/provider/src/app/campaigns/[id]/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the campaign detail page from a single hardcoded `mockCampaign` object to a dynamic, GraphQL-powered view showing full campaign settings, audience breakdown, delivery progress, timeline, and action buttons. Replace all mock data with the `campaign(id, serviceProviderId)` query.

---

## Current State

```tsx
// apps/provider/src/app/campaigns/[id]/page.tsx — ~130 lines
const mockCampaign = {
  id: 'camp-1',
  name: 'Spring Onboarding 2024',
  type: 'Organizational',
  status: 'Active',
  channel: 'Email + Push',
  createdAt: '2024-03-01',
  startedAt: '2024-03-05',
  targets: 5200,
  delivered: 4980,
  opened: 3200,
  clicked: 1850,
  optedOut: 24,
  failed: 220,
};

const timeline = [
  { time: '2024-03-01 10:00', event: 'Campaign created', actor: 'Admin' },
  // ... 5 more hardcoded timeline entries
];
```

**Existing features**: Header with campaign name + status badge, 6 metric cards (Targets, Delivered, Opened, Clicked, Opted Out, Failed), Delivery Funnel bar chart, Timeline. Pause and Edit action buttons.

**Issues**:
- All data hardcoded — no GraphQL query
- `type` field should be `category` (NotificationCategory)
- `channel` not part of Campaign schema
- Status "Active" should be `RUNNING`
- `opened`/`clicked`/`optedOut` not in Campaign schema (in CampaignAnalytics)
- Timeline events hardcoded — no real timeline data
- Metrics mix Campaign fields with analytics fields
- No loading/error states
- Pause/Edit buttons non-functional

---

## Requirements

### 1. Campaign Info Header

| Element | Source |
|---------|--------|
| Campaign name | `campaign.name` |
| Status badge | `campaign.status` → mapped label + color |
| Category | `campaign.category` → badge |
| Description | `campaign.description` |
| Schedule | `campaign.scheduledAt` or "Sent immediately" |
| Created | `campaign.createdAt` |
| Started | `campaign.startedAt` (if launched) |
| Completed | `campaign.completedAt` (if completed) |

### 2. Metric Cards

| Metric | Source | Notes |
|--------|--------|-------|
| Targets | `campaign.targetCount` | Total audience size |
| Sent | `campaign.sentCount` | Currently sent |
| Delivered | `campaign.deliveredCount` | Successfully delivered |
| Read | `campaign.readCount` | Opened/Read |
| Failed | `campaign.failedCount` | Failed deliveries (red) |
| Delivery Rate | Computed: `deliveredCount / targetCount * 100` | Green if > 90% |

### 3. Status-Dependent Sections

| Status | Show |
|--------|------|
| `DRAFT_CAMPAIGN` | Settings summary, Edit button, Launch button |
| `SCHEDULED` | Settings + scheduled time, Cancel button |
| `RUNNING` | Live progress, delivery funnel, cancel button |
| `COMPLETED` | Final metrics, analytics link |
| `CANCELLED` | Cancelled banner, final state metrics |

### 4. Data Integration

- Query: `campaign(id, serviceProviderId)` — returns full `Campaign` type
- Also fetch `campaignAnalytics(campaignId, serviceProviderId, from, to)` for extended metrics (task 9.13)
- Subscribe to `providerCampaignProgressUpdated` for live updates on RUNNING campaigns (task 9.21)

---

## Implementation Plan

```tsx
'use client';

import { use } from 'react';
import { useQuery } from '@apollo/client';
import { ArrowLeft, Users, BarChart3, Clock, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { GET_CAMPAIGN } from '@/lib/graphql/campaigns';
import { useServiceProvider } from '@/hooks/useServiceProvider';

const STATUS_MAP = {
  DRAFT_CAMPAIGN: { label: 'Draft', className: 'bg-border-secondary text-text-muted' },
  SCHEDULED: { label: 'Scheduled', className: 'bg-accent-blue/10 text-accent-blue' },
  RUNNING: { label: 'Active', className: 'bg-status-success/10 text-status-success' },
  COMPLETED: { label: 'Completed', className: 'bg-accent-purple/10 text-accent-purple' },
  CANCELLED: { label: 'Cancelled', className: 'bg-status-error/10 text-status-error' },
};

export default function CampaignDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { serviceProviderId } = useServiceProvider();

  const { data, loading, error } = useQuery(GET_CAMPAIGN, {
    variables: { id, serviceProviderId },
  });

  if (loading) return <CampaignDetailSkeleton />;
  if (error) return <ErrorCard message="Failed to load campaign" />;

  const campaign = data.campaign;
  const status = STATUS_MAP[campaign.status];
  const deliveryRate = campaign.targetCount > 0
    ? ((campaign.deliveredCount / campaign.targetCount) * 100).toFixed(1)
    : '0';

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/campaigns" className="p-2 rounded-lg hover:bg-bg-hover transition-colors">
            <ArrowLeft size={18} className="text-text-muted" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold">{campaign.name}</h1>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.className}`}>
                {status.label}
              </span>
            </div>
            {campaign.description && (
              <p className="text-text-secondary text-sm mt-0.5">{campaign.description}</p>
            )}
          </div>
        </div>
        {/* Action buttons — conditional per status (task 9.12) */}
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-6 gap-4">
        {/* ... dynamic metric cards from campaign fields */}
      </div>

      {/* Delivery funnel + additional sections */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/[id]/page.tsx` | **Modify** | Replace mock data with GraphQL query |
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add GET_CAMPAIGN query (task 9.14) |

---

## Acceptance Criteria

- [ ] Campaign data fetched from `campaign(id, serviceProviderId)` query on mount
- [ ] Header shows name, status badge (correct color), category, description
- [ ] Metric cards show targetCount, sentCount, deliveredCount, readCount, failedCount
- [ ] Delivery rate computed and displayed with conditional coloring
- [ ] Status-dependent sections render correctly for each CampaignStatus
- [ ] Loading state shows skeleton layout
- [ ] Error state shows error card with back navigation
- [ ] Back arrow navigates to `/campaigns`
- [ ] Mock data (`mockCampaign`, `timeline`, `statusColors`) fully removed

---

## Dependencies

- **Blocked by**: Task 9.14 (GraphQL campaign query)
- **Blocks**: Tasks 9.10, 9.11, 9.12, 9.13 (progress bar, recipient table, actions, analytics)
- **Related**: Task 9.1 (list page — link source), Task 9.21 (subscription for live updates)
