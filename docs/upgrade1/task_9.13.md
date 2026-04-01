# Task 9.13 — Campaign Analytics

> **Section**: 9. Campaigns  
> **Priority**: P1 — Analytics  
> **Estimated Scope**: Large  
> **Route**: `/campaigns/[id]`  
> **File**: `apps/provider/src/app/campaigns/[id]/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a campaign analytics section to the campaign detail page showing delivery rate, read rate, policy block reasons breakdown, and performance metrics. Fetch data from the `campaignAnalytics` GraphQL query and present as visual cards and charts.

---

## Current State

The detail page shows a hardcoded "Delivery Funnel" with bars for Targeted, Delivered, Opened, Clicked. No analytics query is called.

```tsx
const mockCampaign = {
  // ... computed metrics from hardcoded values
  targets: 5200, delivered: 4980, opened: 3200, clicked: 1850, optedOut: 24, failed: 220,
};
const deliveryRate = ((c.delivered / c.targets) * 100).toFixed(1);
const openRate = ((c.opened / c.delivered) * 100).toFixed(1);
const clickRate = ((c.clicked / c.delivered) * 100).toFixed(1);
```

### GraphQL Schema

```graphql
type CampaignAnalytics {
  totalTargets: Int!
  totalSent: Int!
  totalDelivered: Int!
  totalRead: Int!
  totalFailed: Int!
  totalSkipped: Int!
  deliveryRate: Float!
  readRate: Float!
}

# Query:
campaignAnalytics(
  serviceProviderId: ID!
  campaignId: ID!
  from: DateTime!
  to: DateTime!
): CampaignAnalytics!
```

---

## Requirements

### 1. Analytics Cards

| Metric | Source | Display |
|--------|--------|---------|
| Delivery Rate | `analytics.deliveryRate` | Percentage with color coding (green > 90%, orange 50-90%, red < 50%) |
| Read Rate | `analytics.readRate` | Percentage badge |
| Total Sent | `analytics.totalSent` | Formatted number |
| Total Delivered | `analytics.totalDelivered` | Formatted, green |
| Total Failed | `analytics.totalFailed` | Formatted, red |
| Total Skipped | `analytics.totalSkipped` | Formatted, muted |

### 2. Rate Cards Layout

```
┌──────────────┬──────────────┬──────────────┐
│ Delivery Rate│  Read Rate   │  Skip Rate   │
│    95.7%     │    62.3%     │    4.2%      │
│  ■■■■■■■■■░ │  ■■■■■■░░░░ │  ■░░░░░░░░░ │
└──────────────┴──────────────┴──────────────┘
```

### 3. Breakdown Table

| Category | Count | Percentage |
|----------|-------|------------|
| Delivered | 4,980 | 95.7% |
| Read | 3,240 | 65.1% |
| Failed | 150 | 2.9% |
| Skipped | 70 | 1.3% |

### 4. Policy Block Reasons (if available)

Integrate with CampaignPolicyPreview data (from task 9.6) or derive from recipient table data to show:
- Top block reasons by count
- Percentage of target audience affected by each reason

### 5. Display Rules

- Only show analytics for `RUNNING` or `COMPLETED` campaigns
- For `DRAFT_CAMPAIGN` / `SCHEDULED`: show placeholder "Analytics available after launch"
- Auto-refresh for RUNNING campaigns (poll every 30s or use subscription data)
- Date range defaults: campaign startedAt to now (for running) or completedAt (for completed)

---

## Implementation Plan

```tsx
import { useQuery } from '@apollo/client';
import { GET_CAMPAIGN_ANALYTICS } from '@/lib/graphql/campaigns';

function CampaignAnalyticsSection({ campaign }: { campaign: Campaign }) {
  const { serviceProviderId } = useServiceProvider();
  const isActive = campaign.status === 'RUNNING' || campaign.status === 'COMPLETED';

  const { data, loading } = useQuery(GET_CAMPAIGN_ANALYTICS, {
    variables: {
      serviceProviderId,
      campaignId: campaign.id,
      from: campaign.startedAt || campaign.createdAt,
      to: campaign.completedAt || new Date().toISOString(),
    },
    skip: !isActive,
    pollInterval: campaign.status === 'RUNNING' ? 30000 : 0,
  });

  if (!isActive) {
    return (
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 text-center text-sm text-text-muted">
        Analytics will be available after the campaign is launched.
      </div>
    );
  }

  if (loading) return <AnalyticsSkeleton />;
  const analytics = data?.campaignAnalytics;

  const rateCards = [
    { label: 'Delivery Rate', value: analytics.deliveryRate, color: analytics.deliveryRate > 90 ? 'text-status-success' : 'text-accent-orange' },
    { label: 'Read Rate', value: analytics.readRate, color: analytics.readRate > 50 ? 'text-accent-blue' : 'text-text-muted' },
    { label: 'Skip Rate', value: analytics.totalTargets > 0 ? (analytics.totalSkipped / analytics.totalTargets * 100) : 0, color: 'text-text-muted' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Campaign Analytics</h3>

      {/* Rate cards */}
      <div className="grid grid-cols-3 gap-4">
        {rateCards.map((card) => (
          <div key={card.label} className="bg-bg-card border border-border-primary rounded-xl p-4">
            <p className="text-xs text-text-muted">{card.label}</p>
            <p className={`text-2xl font-semibold mt-1 ${card.color}`}>
              {card.value.toFixed(1)}%
            </p>
            <div className="w-full h-1.5 bg-bg-tertiary rounded-full mt-2 overflow-hidden">
              <div className={`h-full rounded-full ${card.color.replace('text-', 'bg-')}`}
                style={{ width: `${Math.min(card.value, 100)}%` }} />
            </div>
          </div>
        ))}
      </div>

      {/* Breakdown */}
      <div className="bg-bg-card border border-border-primary rounded-xl p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <MetricItem label="Total Sent" value={analytics.totalSent} />
          <MetricItem label="Delivered" value={analytics.totalDelivered} color="text-status-success" />
          <MetricItem label="Failed" value={analytics.totalFailed} color="text-status-error" />
          <MetricItem label="Skipped" value={analytics.totalSkipped} />
        </div>
      </div>
    </div>
  );
}

function MetricItem({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={`text-lg font-semibold ${color || ''}`}>{value.toLocaleString()}</p>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/[id]/page.tsx` | **Modify** | Add CampaignAnalyticsSection component |
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add GET_CAMPAIGN_ANALYTICS query (task 9.20) |

---

## Acceptance Criteria

- [ ] Analytics section fetches from `campaignAnalytics` query
- [ ] Rate cards display delivery rate, read rate, skip rate with visual bars
- [ ] Color coding: green for high rates, orange/red for low rates
- [ ] Breakdown table shows sent, delivered, failed, skipped counts
- [ ] Hidden for DRAFT/SCHEDULED campaigns with placeholder message
- [ ] Auto-polls every 30s for RUNNING campaigns
- [ ] Loading state shows skeleton cards
- [ ] Handles zero-value edge cases gracefully
- [ ] Mock data (`opened`, `clicked`, `optedOut`) fully removed

---

## Dependencies

- **Blocked by**: Task 9.9 (campaign detail page), Task 9.20 (GraphQL campaignAnalytics query)
- **Blocks**: None
- **Related**: Task 9.10 (delivery progress bar — complementary view), Task 9.6 (policy preview data)
