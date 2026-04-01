# Task 9.12 — Campaign Actions (Edit / Cancel / Clone)

> **Section**: 9. Campaigns  
> **Priority**: P1 — Campaign management  
> **Estimated Scope**: Medium  
> **Route**: `/campaigns/[id]`  
> **File**: `apps/provider/src/app/campaigns/[id]/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Replace the non-functional Pause/Edit buttons on the campaign detail page with dynamic, status-conditional action buttons: Edit (for drafts), Cancel (for active/scheduled campaigns), and Clone (for any campaign). Wire each action to the corresponding GraphQL mutation.

---

## Current State

```tsx
// apps/provider/src/app/campaigns/[id]/page.tsx
<div className="flex gap-2">
  <button className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary">
    <Pause size={14} /> Pause
  </button>
  <button className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary">
    <Edit size={14} /> Edit
  </button>
</div>
```

**Issues**:
- Buttons are always visible regardless of campaign status
- "Pause" action doesn't exist in schema — should be "Cancel"
- No onClick handlers
- No Clone action
- No Launch button for draft campaigns
- No confirmation for destructive actions (cancel)

---

## Requirements

### 1. Action Visibility by Status

| Status | Edit | Cancel | Clone | Launch |
|--------|------|--------|-------|--------|
| `DRAFT_CAMPAIGN` | ✅ | ❌ | ✅ | ✅ |
| `SCHEDULED` | ✅ (limited) | ✅ | ✅ | ❌ |
| `RUNNING` | ❌ | ✅ | ✅ | ❌ |
| `COMPLETED` | ❌ | ❌ | ✅ | ❌ |
| `CANCELLED` | ❌ | ❌ | ✅ | ❌ |

### 2. Edit Action

- Navigate to `/campaigns/[id]/edit` or open inline edit mode
- Only for `DRAFT_CAMPAIGN` and `SCHEDULED` campaigns
- Uses `updateCampaign` mutation (task 9.16)
- Fields: name, description, scheduledAt

### 3. Cancel Action

- Confirmation modal: "Are you sure you want to cancel this campaign? This will stop all pending deliveries."
- Calls `cancelCampaign(campaignId, serviceProviderId)` mutation (task 9.18)
- On success: refresh campaign detail, show toast "Campaign cancelled"
- For RUNNING campaigns: warning that in-progress deliveries may still complete

### 4. Clone Action

- Creates a new draft campaign with same settings
- Calls `createCampaign` with values from current campaign
- Redirects to new campaign's edit page
- Available for any status

### 5. Launch Action

- Only for DRAFT_CAMPAIGN status
- Opens LaunchConfirmationModal (task 9.8)

### 6. RBAC

- Edit/Launch/Cancel: requires `campaigns:create` or `campaigns:launch` permission
- Clone: requires `campaigns:create` permission
- Launch: requires `campaigns:launch` permission (SP_ADMIN only)

---

## Implementation Plan

```tsx
import { useMutation } from '@apollo/client';
import { Edit, XCircle, Copy, Rocket } from 'lucide-react';
import { CANCEL_CAMPAIGN, CREATE_CAMPAIGN } from '@/lib/graphql/campaigns';

function CampaignActions({ campaign }: { campaign: Campaign }) {
  const { serviceProviderId } = useServiceProvider();
  const { hasPermission } = usePermissions();
  const router = useRouter();
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showLaunchModal, setShowLaunchModal] = useState(false);

  const [cancelCampaign, { loading: cancelling }] = useMutation(CANCEL_CAMPAIGN);
  const [cloneCampaign, { loading: cloning }] = useMutation(CREATE_CAMPAIGN);

  const isDraft = campaign.status === 'DRAFT_CAMPAIGN';
  const isScheduled = campaign.status === 'SCHEDULED';
  const isRunning = campaign.status === 'RUNNING';
  const canEdit = (isDraft || isScheduled) && hasPermission('campaigns:create');
  const canCancel = (isScheduled || isRunning) && hasPermission('campaigns:launch');
  const canLaunch = isDraft && hasPermission('campaigns:launch');

  async function handleCancel() {
    try {
      await cancelCampaign({
        variables: { campaignId: campaign.id, serviceProviderId },
        refetchQueries: ['GetCampaign'],
      });
      setShowCancelConfirm(false);
    } catch (err) { /* toast error */ }
  }

  async function handleClone() {
    try {
      const { data } = await cloneCampaign({
        variables: {
          input: {
            serviceProviderId,
            name: `${campaign.name} (Copy)`,
            description: campaign.description,
            category: campaign.category,
          },
        },
      });
      router.push(`/campaigns/${data.createCampaign.id}`);
    } catch (err) { /* toast error */ }
  }

  return (
    <div className="flex gap-2">
      {canEdit && (
        <button onClick={() => router.push(`/campaigns/${campaign.id}/edit`)}
          className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
          <Edit size={14} /> Edit
        </button>
      )}
      {canCancel && (
        <button onClick={() => setShowCancelConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 border border-status-error/30 rounded-lg text-sm text-status-error hover:bg-status-error/10 transition-colors">
          <XCircle size={14} /> Cancel
        </button>
      )}
      <button onClick={handleClone} disabled={cloning}
        className="flex items-center gap-2 px-3 py-2 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors">
        <Copy size={14} /> Clone
      </button>
      {canLaunch && (
        <button onClick={() => setShowLaunchModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
          <Rocket size={14} /> Launch
        </button>
      )}

      {/* Cancel confirmation modal */}
      {/* Launch confirmation modal (task 9.8) */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/[id]/page.tsx` | **Modify** | Replace mock buttons with CampaignActions component |
| `apps/provider/src/components/CancelCampaignModal.tsx` | **Create** | Cancel confirmation modal |
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Ensure CANCEL_CAMPAIGN mutation defined (task 9.18) |

---

## Acceptance Criteria

- [ ] Action buttons conditional on campaign status (see table above)
- [ ] Edit navigates to edit page for DRAFT/SCHEDULED campaigns
- [ ] Cancel shows confirmation modal with warning text
- [ ] Cancel calls `cancelCampaign` mutation and refreshes detail
- [ ] Clone creates new draft campaign with same settings and redirects
- [ ] Launch opens LaunchConfirmationModal for DRAFT campaigns
- [ ] Buttons disabled during mutation loading
- [ ] RBAC enforced: actions hidden for users without required permissions
- [ ] "Pause" button removed — not in schema

---

## Dependencies

- **Blocked by**: Task 9.9 (campaign detail page), Task 9.16 (updateCampaign), Task 9.17 (launchCampaign), Task 9.18 (cancelCampaign)
- **Blocks**: None
- **Related**: Task 9.8 (launch confirmation modal), Task 9.5 (edit flow reuses wizard)
