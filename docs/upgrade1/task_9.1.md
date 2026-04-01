# Task 9.1 — Campaign List Table

> **Section**: 9. Campaigns  
> **Priority**: P0 — Core feature page  
> **Estimated Scope**: Large  
> **Route**: `/campaigns`  
> **File**: `apps/provider/src/app/campaigns/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the campaigns page from hardcoded mock card layout to a dynamic, GraphQL-powered table showing all campaigns with name, status, target audience size, delivery stats, and creation date. Replace the three mock campaign objects with real data from `campaigns(serviceProviderId, status, limit, offset)`.

---

## Current State

```tsx
// apps/provider/src/app/campaigns/page.tsx — ~70 lines
export default function CampaignsPage() {
  // ...
  {[
    { name: 'Q4 Loan Offers', type: 'Personal', status: 'In Progress', targets: 1250, delivered: 980, optOuts: 12, date: 'Dec 1, 2024' },
    { name: 'New Feature Announcement', type: 'Service Provider', status: 'Completed', targets: 3400, delivered: 3350, optOuts: 3, date: 'Nov 15, 2024' },
    { name: 'Holiday Promotion', type: 'Advertisement', status: 'Draft', targets: 0, delivered: 0, optOuts: 0, date: 'Dec 20, 2024' },
  ].map((campaign, i) => (
    <div key={i} className="bg-bg-card border border-border-primary rounded-xl p-5 hover:border-border-secondary transition-colors cursor-pointer">
      // ... card layout
    </div>
  ))}
}
```

**Existing features**: Static filter chips (All, Draft, Scheduled, In Progress, Completed), 3 hardcoded campaign cards with name, type badge, status badge, date, targets, delivered, opt-outs. "+ New Campaign" button.

**Issues**:
- Only 3 campaigns, all hardcoded — no real data
- Status values ("Draft" / "In Progress" / "Completed") don't align with schema enum (`DRAFT_CAMPAIGN` / `RUNNING` / `COMPLETED` / `SCHEDULED` / `CANCELLED`)
- Type values ("Personal" / "Service Provider" / "Advertisement") should map to `NotificationCategory` enum
- No pagination, no loading/error states
- No link to campaign detail page (`/campaigns/[id]`)
- Card layout — plan asks for table format
- No empty state when no campaigns exist

---

## Requirements

### 1. Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| **Name** | `campaign.name` | Link to `/campaigns/${campaign.id}`, semibold |
| **Category** | `campaign.category` | Badge: `PERSONAL`, `ORGANIZATIONAL`, `ADVERTISEMENT` |
| **Status** | `campaign.status` | See status alignment below |
| **Targets** | `campaign.targetCount` | Formatted with `toLocaleString()` |
| **Sent** | `campaign.sentCount` | — |
| **Delivered** | `campaign.deliveredCount` | Green text if > 0 |
| **Failed** | `campaign.failedCount` | Red text if > 0 |
| **Created** | `campaign.createdAt` | Relative time + absolute on hover |
| **Actions** | — | View, Edit (if DRAFT), Clone |

### 2. Status Alignment

Map schema `CampaignStatus` enum to UI:

| Schema | UI Label | Color |
|--------|----------|-------|
| `DRAFT_CAMPAIGN` | Draft | `bg-border-secondary text-text-muted` |
| `SCHEDULED` | Scheduled | `bg-accent-blue/10 text-accent-blue` |
| `RUNNING` | Active | `bg-status-success/10 text-status-success` |
| `COMPLETED` | Completed | `bg-accent-purple/10 text-accent-purple` |
| `CANCELLED` | Cancelled | `bg-status-error/10 text-status-error` |

### 3. Category Badge Colors

| Category | Color |
|----------|-------|
| `PERSONAL` | `bg-accent-blue/10 text-accent-blue` |
| `ORGANIZATIONAL` | `bg-accent-purple/10 text-accent-purple` |
| `ADVERTISEMENT` | `bg-accent-orange/10 text-accent-orange` |

### 4. Data Integration

- Fetch from `campaigns(serviceProviderId, status, limit, offset)` query (task 9.14)
- Replace hardcoded array entirely
- Add offset-based pagination with page size selector (10 / 25 / 50)
- Show `totalCount` badge near page title

### 5. States

- **Loading**: Skeleton table rows (8 rows)
- **Error**: Error card with retry button
- **Empty**: Illustration + "No campaigns yet" + CTA to create first campaign
- **Empty filtered**: "No campaigns match your filters" + clear filters button

---

## Implementation Plan

### Convert to client component with GraphQL

```tsx
'use client';

import { useState } from 'react';
import { useQuery } from '@apollo/client';
import Link from 'next/link';
import { GET_CAMPAIGNS } from '@/lib/graphql/campaigns';
import { useServiceProvider } from '@/hooks/useServiceProvider';
import { CampaignStatus } from '@/types/campaigns';

const STATUS_MAP: Record<CampaignStatus, { label: string; className: string }> = {
  DRAFT_CAMPAIGN: { label: 'Draft', className: 'bg-border-secondary text-text-muted' },
  SCHEDULED: { label: 'Scheduled', className: 'bg-accent-blue/10 text-accent-blue' },
  RUNNING: { label: 'Active', className: 'bg-status-success/10 text-status-success' },
  COMPLETED: { label: 'Completed', className: 'bg-accent-purple/10 text-accent-purple' },
  CANCELLED: { label: 'Cancelled', className: 'bg-status-error/10 text-status-error' },
};

export default function CampaignsPage() {
  const { serviceProviderId } = useServiceProvider();
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 25;

  const { data, loading, error } = useQuery(GET_CAMPAIGNS, {
    variables: {
      serviceProviderId,
      status: statusFilter,
      limit: pageSize,
      offset: page * pageSize,
    },
  });

  const campaigns = data?.campaigns?.nodes ?? [];
  const totalCount = data?.campaigns?.totalCount ?? 0;

  return (
    <div className="p-8">
      {/* Header + filters + table */}
    </div>
  );
}
```

### Table row component

```tsx
function CampaignRow({ campaign }: { campaign: Campaign }) {
  const status = STATUS_MAP[campaign.status];
  return (
    <tr className="border-b border-border-primary hover:bg-bg-hover/50 transition-colors">
      <td className="py-3 px-4">
        <Link href={`/campaigns/${campaign.id}`} className="text-sm font-medium hover:text-accent-blue">
          {campaign.name}
        </Link>
      </td>
      <td className="py-3 px-4">
        <span className={`text-xs px-2 py-0.5 rounded-full ${status.className}`}>
          {status.label}
        </span>
      </td>
      <td className="py-3 px-4 text-sm">{campaign.targetCount.toLocaleString()}</td>
      <td className="py-3 px-4 text-sm">{campaign.deliveredCount.toLocaleString()}</td>
      <td className="py-3 px-4 text-sm text-status-error">{campaign.failedCount}</td>
      <td className="py-3 px-4 text-xs text-text-muted">{formatRelativeTime(campaign.createdAt)}</td>
    </tr>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/page.tsx` | **Modify** | Replace mock data with GraphQL query, table layout |
| `apps/provider/src/types/campaigns.ts` | **Create** | CampaignStatus, Campaign, CampaignConnection types |
| `apps/provider/src/lib/graphql/campaigns.ts` | **Create** (partial) | GET_CAMPAIGNS query (expanded in task 9.14) |

---

## Acceptance Criteria

- [ ] Campaigns fetch from `campaigns()` GraphQL query on mount
- [ ] Table displays all columns: name, category, status, targets, sent, delivered, failed, created, actions
- [ ] Status badges use correct colors per `CampaignStatus` enum
- [ ] Campaign name links to `/campaigns/[id]`
- [ ] Pagination works with page size selector
- [ ] Loading state shows skeleton rows
- [ ] Error state shows error card with retry
- [ ] Empty state shows CTA to create first campaign
- [ ] "+ New Campaign" button navigates to `/campaigns/new`

---

## Dependencies

- **Blocked by**: Task 9.14 (GraphQL campaigns query)
- **Blocks**: Tasks 9.2, 9.3, 9.4 (filter chips, search, mini-chart)
- **Related**: Task 9.9 (campaign detail — link target), Task 9.5 (create wizard — CTA target)
