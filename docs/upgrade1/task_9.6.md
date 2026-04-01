# Task 9.6 — Campaign Policy Preview

> **Section**: 9. Campaigns  
> **Priority**: P0 — Policy compliance  
> **Estimated Scope**: Medium  
> **Route**: `/campaigns/new`  
> **File**: `apps/provider/src/app/campaigns/new/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Integrate the `previewCampaignPolicy` GraphQL query into the campaign creation wizard (Step 5 — Review). Show the provider how many recipients would be allowed vs. blocked by the policy engine before launching, including specific block reasons.

---

## Current State

The review step (step 5) shows a static summary of form values with no policy evaluation:

```tsx
{step === 5 && (
  <>
    <h3 className="text-sm font-semibold">Review Campaign</h3>
    <div className="space-y-3">
      {[
        { label: 'Name', value: form.name || '—' },
        { label: 'Type', value: form.type },
        // ... more static rows
      ].map((r) => (
        <div key={r.label} className="flex justify-between text-sm">
          <span className="text-text-muted">{r.label}</span>
          <span className="text-text-primary font-medium">{r.value}</span>
        </div>
      ))}
    </div>
  </>
)}
```

### GraphQL Schema

```graphql
input PreviewCampaignPolicyInput {
  serviceProviderId: ID!
  category: NotificationCategory!
  targetUserIds: [ID!]!
}

type CampaignPolicyPreview {
  totalTargets: Int!
  allowedCount: Int!
  blockedCount: Int!
  blockedReasons: [PolicyBlockReason!]!
}

type PolicyBlockReason {
  decisionCode: String!
  reason: String!
  count: Int!
}

# Query
previewCampaignPolicy(input: PreviewCampaignPolicyInput!): CampaignPolicyPreview!
```

---

## Requirements

### 1. Policy Preview Card

Display a card in the Review step (step 5) showing:

| Field | Source | Display |
|-------|--------|---------|
| Total Targets | `preview.totalTargets` | Bold number |
| Allowed | `preview.allowedCount` | Green badge with count |
| Blocked | `preview.blockedCount` | Red badge with count |
| Block Reasons | `preview.blockedReasons[]` | List with `decisionCode`, `reason`, and `count` |

### 2. Visual Layout

```
┌─────────────────────────────────────────┐
│ Policy Preview                          │
│                                         │
│  Total Targets    5,200                 │
│  ────────────────────────────────────── │
│  ✅ Allowed       4,850  (93.3%)       │
│  🚫 Blocked         350  ( 6.7%)       │
│                                         │
│  Block Reasons:                         │
│  ├ OPT_OUT: User opted out (180)        │
│  ├ RATE_LIMIT: Rate limit exceeded (95) │
│  └ CATEGORY_BLOCKED: Category off (75)  │
└─────────────────────────────────────────┘
```

### 3. Trigger Behavior

- Auto-fetch policy preview when user reaches step 5 (Review)
- Use `useLazyQuery` or `useQuery` with `skip: step !== 5`
- Show loading spinner while preview loads
- Show error state if preview query fails (with retry button)
- Refetch if user goes back and changes audience/category then returns to Review

### 4. Warning Indicators

- If `blockedCount > 0`, show warning banner: "X recipients will not receive this campaign due to policy restrictions"
- If `blockedCount / totalTargets > 0.5`, show red alert: "More than 50% of your audience is blocked"
- If all blocked: disable Launch button + show error

---

## Implementation Plan

```tsx
import { useLazyQuery } from '@apollo/client';
import { PREVIEW_CAMPAIGN_POLICY } from '@/lib/graphql/campaigns';

// Inside wizard component:
const [fetchPreview, { data: previewData, loading: previewLoading, error: previewError }] =
  useLazyQuery(PREVIEW_CAMPAIGN_POLICY);

// Trigger on entering step 5:
useEffect(() => {
  if (step === 5 && form.targetUserIds.length > 0) {
    fetchPreview({
      variables: {
        input: {
          serviceProviderId,
          category: form.category,
          targetUserIds: form.targetUserIds,
        },
      },
    });
  }
}, [step]);

// Policy preview component:
function PolicyPreviewCard({ preview, loading, error }: PolicyPreviewProps) {
  if (loading) return <PolicyPreviewSkeleton />;
  if (error) return <ErrorCard message="Failed to load policy preview" onRetry={refetch} />;

  const { totalTargets, allowedCount, blockedCount, blockedReasons } = preview;
  const blockedPct = totalTargets > 0 ? (blockedCount / totalTargets) * 100 : 0;

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-5 space-y-3">
      <h4 className="text-sm font-semibold">Policy Preview</h4>

      {blockedPct > 50 && (
        <div className="p-3 bg-status-error/10 border border-status-error/20 rounded-lg text-xs text-status-error">
          ⚠ More than 50% of your audience is blocked by policy restrictions
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-text-muted">Total Targets</p>
          <p className="text-lg font-semibold">{totalTargets.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Allowed</p>
          <p className="text-lg font-semibold text-status-success">{allowedCount.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Blocked</p>
          <p className="text-lg font-semibold text-status-error">{blockedCount.toLocaleString()}</p>
        </div>
      </div>

      {blockedReasons.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs text-text-muted font-medium">Block Reasons</p>
          {blockedReasons.map((r) => (
            <div key={r.decisionCode} className="flex justify-between text-xs">
              <span className="text-text-secondary">{r.reason}</span>
              <span className="text-text-muted">{r.count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/new/page.tsx` | **Modify** | Add policy preview card in Review step |
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Add PREVIEW_CAMPAIGN_POLICY query (task 9.19) |

---

## Acceptance Criteria

- [ ] Policy preview auto-fetches when user reaches Review step
- [ ] Displays total targets, allowed count, blocked count
- [ ] Shows block reasons with decision codes and counts
- [ ] Warning banner when blockedCount > 0
- [ ] Red alert when > 50% blocked
- [ ] Launch button disabled when all targets blocked
- [ ] Loading spinner while preview query executes
- [ ] Error state with retry button if query fails
- [ ] Preview refetches if user changes audience/category and returns to Review

---

## Dependencies

- **Blocked by**: Task 9.5 (wizard with audience selection), Task 9.19 (GraphQL previewCampaignPolicy query)
- **Blocks**: Task 9.8 (launch confirmation — uses preview data)
- **Related**: Task 9.7 (save as draft — allowed even when blocked)
