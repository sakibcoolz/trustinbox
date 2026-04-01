# Task 9.7 — Save Campaign as Draft

> **Section**: 9. Campaigns  
> **Priority**: P1 — Creation flow  
> **Estimated Scope**: Small  
> **Route**: `/campaigns/new`  
> **File**: `apps/provider/src/app/campaigns/new/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Implement the "Save as Draft" action in the campaign wizard that persists the campaign to the backend via the `createCampaign` mutation without launching it. The campaign is created with `DRAFT_CAMPAIGN` status and the user is redirected to the campaigns list.

---

## Current State

```tsx
async function handleSubmit() {
  // Mock create
  await new Promise((r) => setTimeout(r, 500));
  window.location.href = '/campaigns';
}
```

The submit handler fakes a delay and does a hard redirect. No GraphQL mutation is called.

### GraphQL Schema

```graphql
input CreateCampaignInput {
  serviceProviderId: ID!
  name: String!
  description: String
  category: NotificationCategory!
  scheduledAt: DateTime
}

mutation {
  createCampaign(input: CreateCampaignInput!): Campaign!
}
```

The mutation creates a campaign with `DRAFT_CAMPAIGN` status by default (per the DB schema: `status VARCHAR(50) DEFAULT 'DRAFT'`).

---

## Requirements

### 1. Save as Draft Button

- Visible on Review step (step 5) alongside "Launch Campaign" button
- Also accessible from any step via a secondary action in the header or footer
- Button style: outline/secondary (not primary blue)
- Label: "Save as Draft"

### 2. Mutation Call

- Call `createCampaign` with form data mapped to `CreateCampaignInput`
- Set `scheduledAt: null` for drafts (or omit), unless user set a schedule
- On success: redirect to `/campaigns` with success toast
- On error: show error toast, keep user on current step

### 3. Form Validation for Draft

- Minimal validation for drafts: only `name` and `category` required
- Content and audience can be empty for drafts
- Show validation error if name is empty when saving draft

### 4. Loading State

- Disable both "Save as Draft" and "Launch" buttons during mutation
- Show spinner on the clicked button

---

## Implementation Plan

```tsx
import { useMutation } from '@apollo/client';
import { useRouter } from 'next/navigation';
import { CREATE_CAMPAIGN } from '@/lib/graphql/campaigns';

// Inside wizard component:
const router = useRouter();
const [createCampaign, { loading: saving }] = useMutation(CREATE_CAMPAIGN);

async function handleSaveAsDraft() {
  if (!form.name || !form.category) {
    // Show validation error
    return;
  }

  try {
    await createCampaign({
      variables: {
        input: {
          serviceProviderId,
          name: form.name,
          description: form.description || undefined,
          category: form.category,
          scheduledAt: form.scheduleType === 'scheduled' ? form.scheduledAt : null,
        },
      },
      refetchQueries: ['GetCampaigns'],
    });
    router.push('/campaigns');
    // Show success toast: "Campaign saved as draft"
  } catch (err) {
    // Show error toast
  }
}

// JSX in Review step:
<div className="flex justify-between">
  <button onClick={() => setStep(4)} disabled={saving}
    className="px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary">
    Back
  </button>
  <div className="flex gap-3">
    <button onClick={handleSaveAsDraft} disabled={saving}
      className="px-4 py-2.5 border border-border-secondary rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50">
      {saving ? 'Saving…' : 'Save as Draft'}
    </button>
    <button onClick={handleLaunch} disabled={saving}
      className="px-4 py-2.5 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors disabled:opacity-50">
      Launch Campaign
    </button>
  </div>
</div>
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/new/page.tsx` | **Modify** | Replace mock submit with `createCampaign` mutation |
| `apps/provider/src/lib/graphql/campaigns.ts` | **Modify** | Ensure CREATE_CAMPAIGN mutation is defined (task 9.15) |

---

## Acceptance Criteria

- [ ] "Save as Draft" button visible on Review step
- [ ] Clicking calls `createCampaign` mutation with form data
- [ ] Campaign created with `DRAFT_CAMPAIGN` status
- [ ] Only `name` and `category` required for draft save
- [ ] Success: redirect to `/campaigns` + success toast
- [ ] Error: show error toast, remain on current step
- [ ] Both buttons disabled during mutation loading
- [ ] Spinner shown on clicked button while saving
- [ ] Campaign list refetches after draft creation

---

## Dependencies

- **Blocked by**: Task 9.5 (wizard with aligned form fields), Task 9.15 (GraphQL createCampaign mutation)
- **Blocks**: Task 9.12 (edit draft — requires draft to exist)
- **Related**: Task 9.8 (launch confirmation — alternative action on Review step)
