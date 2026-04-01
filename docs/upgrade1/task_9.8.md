# Task 9.8 — Launch Confirmation Modal

> **Section**: 9. Campaigns  
> **Priority**: P0 — Core launch flow  
> **Estimated Scope**: Medium  
> **Route**: `/campaigns/new` and `/campaigns/[id]`  
> **File**: `apps/provider/src/components/LaunchConfirmationModal.tsx`  
> **Status**: ✅ Complete

---

## Objective

Create a launch confirmation modal that shows the final audience count, policy preview summary, and a prominent "Launch Campaign" CTA. The modal is triggered from the wizard Review step or from the campaign detail page (for draft campaigns). It calls the `launchCampaign` mutation on confirmation.

---

## Current State

No confirmation modal exists. The wizard's submit button directly runs a mocked `setTimeout` with no real mutation:

```tsx
async function handleSubmit() {
  await new Promise((r) => setTimeout(r, 500));
  window.location.href = '/campaigns';
}
```

### GraphQL Schema

```graphql
mutation {
  launchCampaign(campaignId: ID!, serviceProviderId: ID!): Campaign!
}
```

---

## Requirements

### 1. Modal Layout

```
┌─────────────────────────────────────────────┐
│  🚀 Launch Campaign                    [X]  │
│                                              │
│  You are about to launch:                    │
│  ■ "Q2 Customer Onboarding"                 │
│  ■ Category: Organizational                  │
│  ■ Schedule: Immediately                     │
│                                              │
│  ┌─ Policy Summary ──────────────────────┐  │
│  │ ✅ 4,850 will receive                 │  │
│  │ 🚫 350 blocked by policy              │  │
│  └───────────────────────────────────────┘  │
│                                              │
│  ⚠ This action cannot be undone.            │
│     Active campaigns can only be cancelled.  │
│                                              │
│         [Cancel]    [Launch Campaign]         │
└─────────────────────────────────────────────┘
```

### 2. Props

```tsx
interface LaunchConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaign: {
    id: string;
    name: string;
    category: string;
    scheduledAt: string | null;
  };
  policyPreview?: {
    allowedCount: number;
    blockedCount: number;
  };
  serviceProviderId: string;
}
```

### 3. Behavior

- Modal opens over backdrop with `bg-black/50`
- Displays campaign summary (name, category, schedule)
- Shows policy preview if available (allowed/blocked counts)
- Warning text: "This action cannot be undone"
- "Cancel" closes modal
- "Launch Campaign" calls `launchCampaign` mutation
- On success: close modal, redirect to `/campaigns/[id]`, show success toast
- On error: show error in modal, keep open
- Disable buttons during mutation loading

### 4. Two Entry Points

1. **From wizard** (task 9.5): After clicking "Launch" on Review step, first save draft (`createCampaign`), then open modal with the returned campaign ID
2. **From detail page** (task 9.12): Direct launch of existing DRAFT_CAMPAIGN

---

## Implementation Plan

```tsx
'use client';

import { useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { X, Rocket } from 'lucide-react';
import { LAUNCH_CAMPAIGN } from '@/lib/graphql/campaigns';

export default function LaunchConfirmationModal({
  isOpen, onClose, campaign, policyPreview, serviceProviderId,
}: LaunchConfirmationModalProps) {
  const router = useRouter();
  const [launchCampaign, { loading }] = useMutation(LAUNCH_CAMPAIGN);

  if (!isOpen) return null;

  async function handleLaunch() {
    try {
      await launchCampaign({
        variables: { campaignId: campaign.id, serviceProviderId },
        refetchQueries: ['GetCampaigns'],
      });
      onClose();
      router.push(`/campaigns/${campaign.id}`);
    } catch (err) {
      // Show error in modal
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-bg-surface border border-border-primary rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Rocket size={18} className="text-accent-blue" /> Launch Campaign
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-bg-hover rounded">
            <X size={16} className="text-text-muted" />
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <p className="text-text-secondary">You are about to launch:</p>
          <div className="p-3 bg-bg-tertiary rounded-lg space-y-1">
            <p className="font-medium">{campaign.name}</p>
            <p className="text-xs text-text-muted">Category: {campaign.category}</p>
            <p className="text-xs text-text-muted">
              Schedule: {campaign.scheduledAt ? new Date(campaign.scheduledAt).toLocaleString() : 'Immediately'}
            </p>
          </div>
        </div>

        {policyPreview && (
          <div className="flex gap-4 p-3 bg-bg-tertiary rounded-lg">
            <div className="text-center flex-1">
              <p className="text-lg font-semibold text-status-success">{policyPreview.allowedCount.toLocaleString()}</p>
              <p className="text-xs text-text-muted">Will receive</p>
            </div>
            <div className="text-center flex-1">
              <p className="text-lg font-semibold text-status-error">{policyPreview.blockedCount.toLocaleString()}</p>
              <p className="text-xs text-text-muted">Blocked</p>
            </div>
          </div>
        )}

        <p className="text-xs text-accent-orange">
          ⚠ This action cannot be undone. Active campaigns can only be cancelled.
        </p>

        <div className="flex justify-end gap-3">
          <button onClick={onClose} disabled={loading}
            className="px-4 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary">
            Cancel
          </button>
          <button onClick={handleLaunch} disabled={loading}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? 'Launching…' : 'Launch Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/components/LaunchConfirmationModal.tsx` | **Create** | Reusable launch confirmation modal |
| `apps/provider/src/app/campaigns/new/page.tsx` | **Modify** | Wire "Launch" button to open modal |
| `apps/provider/src/app/campaigns/[id]/page.tsx` | **Modify** | Wire launch action for draft campaigns |

---

## Acceptance Criteria

- [ ] Modal renders with campaign summary (name, category, schedule)
- [ ] Policy preview shows allowed/blocked counts when available
- [ ] Warning text about irreversible action displayed
- [ ] "Launch Campaign" calls `launchCampaign` mutation
- [ ] On success: redirects to campaign detail page
- [ ] On error: shows error message inside modal
- [ ] Buttons disabled during mutation loading
- [ ] Modal closes on "Cancel" or backdrop click
- [ ] Keyboard: Escape closes modal

---

## Dependencies

- **Blocked by**: Task 9.5 (wizard with Launch button), Task 9.17 (GraphQL launchCampaign mutation)
- **Blocks**: None
- **Related**: Task 9.6 (policy preview — data source), Task 9.7 (save as draft — creates campaign first)
