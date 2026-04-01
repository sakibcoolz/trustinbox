# Task 9.11 — Campaign Recipient Table

> **Section**: 9. Campaigns  
> **Priority**: P1 — Detail page  
> **Estimated Scope**: Large  
> **Route**: `/campaigns/[id]`  
> **File**: `apps/provider/src/app/campaigns/[id]/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a per-recipient delivery status table to the campaign detail page showing each target user's delivery lifecycle (pending → policy checking → sent → delivered → read / failed / skipped) with timestamps and policy decision details.

---

## Current State

No recipient table exists on the campaign detail page. The page only shows aggregate metrics and a delivery funnel. No GraphQL query for per-recipient data exists in the schema.

### Database Schema (reference)

```sql
-- campaign_targets table
CREATE TABLE campaign_targets (
  id UUID PRIMARY KEY,
  campaign_id UUID REFERENCES campaigns(id),
  user_id UUID REFERENCES users(id),
  notification_id UUID REFERENCES notifications(id),
  status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, POLICY_CHECKING, SENT, DELIVERED, READ, FAILED, SKIPPED
  policy_decision VARCHAR(50),
  policy_reason TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  failed_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Note**: No GraphQL type for `CampaignTarget` currently exists in the schema. This task assumes the backend will expose a query for campaign targets, or outlines the needed schema extension.

---

## Requirements

### 1. Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| **Recipient** | `target.userId` → resolve to virtual ID | Monospace `font-mono text-xs` |
| **Status** | `target.status` | Badge with lifecycle colors |
| **Policy** | `target.policyDecision` | ALLOWED / BLOCKED |
| **Policy Reason** | `target.policyReason` | Shown on hover or in expanded row |
| **Sent At** | `target.sentAt` | Relative time or "—" |
| **Delivered At** | `target.deliveredAt` | Relative time or "—" |
| **Read At** | `target.readAt` | Relative time or "—" |
| **Error** | `target.failedReason` | Shown if status is FAILED |

### 2. Status Badge Colors

| Status | Label | Color |
|--------|-------|-------|
| `PENDING` | Pending | `bg-border-secondary text-text-muted` |
| `POLICY_CHECKING` | Checking | `bg-accent-orange/10 text-accent-orange` |
| `SENT` | Sent | `bg-accent-blue/10 text-accent-blue` |
| `DELIVERED` | Delivered | `bg-status-success/10 text-status-success` |
| `READ` | Read | `bg-accent-purple/10 text-accent-purple` |
| `FAILED` | Failed | `bg-status-error/10 text-status-error` |
| `SKIPPED` | Skipped | `bg-border-secondary text-text-muted` |

### 3. Filtering & Pagination

- Filter chips: All, Pending, Sent, Delivered, Read, Failed, Skipped
- Pagination: offset-based with page size 25/50/100
- Search by recipient virtual ID

### 4. Schema Extension Needed

```graphql
type CampaignTarget {
  id: ID!
  campaignId: ID!
  userId: ID!
  userVirtualId: String
  status: CampaignTargetStatus!
  policyDecision: String
  policyReason: String
  sentAt: DateTime
  deliveredAt: DateTime
  readAt: DateTime
  failedReason: String
  createdAt: DateTime!
}

type CampaignTargetConnection {
  nodes: [CampaignTarget!]!
  totalCount: Int!
}

enum CampaignTargetStatus {
  PENDING
  POLICY_CHECKING
  SENT
  DELIVERED
  READ
  FAILED
  SKIPPED
}

# Add to Query type:
campaignTargets(
  campaignId: ID!
  serviceProviderId: ID!
  status: CampaignTargetStatus
  limit: Int
  offset: Int
): CampaignTargetConnection!
```

---

## Implementation Plan

```tsx
function RecipientTable({ campaignId }: { campaignId: string }) {
  const { serviceProviderId } = useServiceProvider();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, loading } = useQuery(GET_CAMPAIGN_TARGETS, {
    variables: {
      campaignId,
      serviceProviderId,
      status: statusFilter,
      limit: pageSize,
      offset: page * pageSize,
    },
  });

  const targets = data?.campaignTargets?.nodes ?? [];
  const totalCount = data?.campaignTargets?.totalCount ?? 0;

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Recipients ({totalCount.toLocaleString()})</h3>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 mb-4">
        {['All', 'Pending', 'Sent', 'Delivered', 'Read', 'Failed', 'Skipped'].map((f) => (
          <button key={f} onClick={() => setStatusFilter(f === 'All' ? null : f.toUpperCase())}
            className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
              (f === 'All' ? statusFilter === null : statusFilter === f.toUpperCase())
                ? 'bg-accent-blue/10 text-accent-blue border-accent-blue'
                : 'border-border-secondary text-text-muted'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-primary text-xs text-text-muted">
            <th className="text-left py-2 px-3">Recipient</th>
            <th className="text-left py-2 px-3">Status</th>
            <th className="text-left py-2 px-3">Policy</th>
            <th className="text-left py-2 px-3">Sent</th>
            <th className="text-left py-2 px-3">Delivered</th>
            <th className="text-left py-2 px-3">Read</th>
          </tr>
        </thead>
        <tbody>
          {loading ? <SkeletonRows count={10} cols={6} /> : targets.map((target) => (
            <RecipientRow key={target.id} target={target} />
          ))}
        </tbody>
      </table>

      {/* Pagination */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/[id]/page.tsx` | **Modify** | Add RecipientTable component |
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add GET_CAMPAIGN_TARGETS query |
| `gateway/graphql-bff/graph/schema.graphqls` | **Modify** | Add CampaignTarget type + query (backend) |

---

## Acceptance Criteria

- [ ] Recipient table shows all target users with delivery status
- [ ] Status badges use correct colors per CampaignTargetStatus
- [ ] Filter chips filter by target status
- [ ] Pagination with configurable page size
- [ ] Policy decision and reason shown for blocked/skipped recipients
- [ ] Timestamps show relative time with absolute on hover
- [ ] Failed recipients show error reason
- [ ] Loading state shows skeleton rows
- [ ] Empty state when no recipients match filter

---

## Dependencies

- **Blocked by**: Task 9.9 (campaign detail page), Backend schema extension for CampaignTarget type
- **Blocks**: None
- **Related**: Task 9.10 (progress bar — aggregate of same data), Task 9.13 (analytics — complementary view)
