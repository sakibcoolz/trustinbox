# Task 9.5 — CampaignBuilder Multi-Step Wizard

> **Section**: 9. Campaigns  
> **Priority**: P0 — Core creation flow  
> **Estimated Scope**: XL  
> **Route**: `/campaigns/new`  
> **File**: `apps/provider/src/app/campaigns/new/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Upgrade the campaign creation wizard from mock-only form state to a fully functional 5-step wizard backed by GraphQL mutations. Consolidate the inline 5-step wizard in `new/page.tsx` with the standalone `CampaignBuilder.tsx` component. Align form fields with the `CreateCampaignInput` schema and the actual `Campaign` type.

---

## Current State

### `apps/provider/src/app/campaigns/new/page.tsx` (~175 lines)

```tsx
const [step, setStep] = useState(1);
const [form, setForm] = useState({
  name: '', type: 'Organizational', channel: 'Email', targetType: 'all', segmentId: '',
  subject: '', body: '', scheduleType: 'now', scheduledAt: '', batchSize: '1000', batchInterval: '60',
});

// 5-step inline wizard: Details → Audience → Content → Schedule → Review
// Submit handler:
async function handleSubmit() {
  await new Promise((r) => setTimeout(r, 500)); // Mock delay
  window.location.href = '/campaigns';
}
```

### `apps/provider/src/components/CampaignBuilder.tsx` (~120 lines)

```tsx
interface CampaignData {
  name: string; type: string; channel: string; targetType: string;
  subject: string; body: string; scheduleType: string;
}
// 4-step wizard (Details, Audience, Content, Review) — simpler, not used by new/page.tsx
```

### GraphQL `CreateCampaignInput`

```graphql
input CreateCampaignInput {
  serviceProviderId: ID!
  name: String!
  description: String
  category: NotificationCategory!  # PERSONAL, ORGANIZATIONAL, ADVERTISEMENT
  scheduledAt: DateTime
}
```

**Issues**:
- Form has `type` / `channel` / `batchSize` / `batchInterval` fields not in schema
- Missing `description` field (in schema but not in form)
- `type` should be `category` using `NotificationCategory` enum
- `channel` is not part of campaign schema — notifications determine channel
- `subject`/`body` in form but not in `CreateCampaignInput` — these are part of campaign content (metadata or notification template, not the campaign entity)
- Submit is mocked — needs `createCampaign` mutation
- Two parallel wizard components — need consolidation
- No policy preview integration (task 9.6)
- No save-as-draft flow (task 9.7)

---

## Requirements

### 1. Wizard Steps

| Step | Title | Fields | Notes |
|------|-------|--------|-------|
| 1 | **Basics** | `name`, `description`, `category` | Category: dropdown with PERSONAL / ORGANIZATIONAL / ADVERTISEMENT |
| 2 | **Audience** | Target selection | Filter by tags/segments or manual selection of customer virtual IDs |
| 3 | **Content** | Notification subject, body | Rich text for body, channel selection |
| 4 | **Schedule** | `scheduledAt` or immediate | Date/time picker with timezone display |
| 5 | **Review** | Summary of all settings | Audience count, estimated delivery rate, policy preview |

### 2. Form State Interface

```tsx
interface CampaignFormState {
  name: string;
  description: string;
  category: 'PERSONAL' | 'ORGANIZATIONAL' | 'ADVERTISEMENT';
  targetType: 'all' | 'segment' | 'manual';
  targetUserIds: string[];
  segmentId: string;
  subject: string;
  body: string;
  scheduleType: 'now' | 'scheduled';
  scheduledAt: string;
}
```

### 3. Step Validation

| Step | Required Fields | Validation |
|------|----------------|------------|
| 1 (Basics) | `name`, `category` | Name ≥ 3 chars, category selected |
| 2 (Audience) | at least one target | `targetType` chosen, IDs populated if manual |
| 3 (Content) | `subject`, `body` | Subject ≥ 3 chars, body ≥ 10 chars |
| 4 (Schedule) | `scheduleType` | If scheduled, `scheduledAt` must be future |
| 5 (Review) | — | Read-only summary |

### 4. Navigation

- Step indicator with clickable completed steps
- "Back" / "Next" buttons
- "Next" disabled if current step validation fails
- Step 5 shows "Save as Draft" + "Launch Campaign" buttons
- Keyboard: Enter to advance if valid

### 5. Consolidation

- **Remove** standalone `CampaignBuilder.tsx` (not imported anywhere)
- Keep all wizard logic in `new/page.tsx` or extract to a new `CampaignWizard` component used only by `new/page.tsx`

---

## Implementation Plan

### Step 1 — Basics

```tsx
{step === 1 && (
  <div className="space-y-4">
    <h3 className="text-sm font-semibold">Campaign Basics</h3>
    <div>
      <label className="block text-xs text-text-muted mb-1.5">Campaign Name *</label>
      <input type="text" value={form.name} onChange={(e) => update('name', e.target.value)}
        className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm" 
        placeholder="Q2 Customer Onboarding" />
    </div>
    <div>
      <label className="block text-xs text-text-muted mb-1.5">Description</label>
      <textarea value={form.description} onChange={(e) => update('description', e.target.value)} rows={3}
        className="w-full px-3 py-2 bg-bg-input border border-border-secondary rounded-lg text-sm resize-none"
        placeholder="Brief description of this campaign…" />
    </div>
    <div>
      <label className="block text-xs text-text-muted mb-1.5">Category *</label>
      <div className="grid grid-cols-3 gap-3">
        {(['PERSONAL', 'ORGANIZATIONAL', 'ADVERTISEMENT'] as const).map((cat) => (
          <button key={cat} onClick={() => update('category', cat)}
            className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
              form.category === cat
                ? 'border-accent-blue bg-accent-blue/5 text-accent-blue'
                : 'border-border-secondary text-text-secondary hover:border-border-active'
            }`}>
            {cat.charAt(0) + cat.slice(1).toLowerCase()}
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

### Submit handler

```tsx
async function handleSaveAsDraft() {
  await createCampaign({
    variables: {
      input: {
        serviceProviderId,
        name: form.name,
        description: form.description,
        category: form.category,
        scheduledAt: form.scheduleType === 'scheduled' ? form.scheduledAt : null,
      },
    },
  });
  router.push('/campaigns');
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/campaigns/new/page.tsx` | **Modify** | Rewrite wizard with schema-aligned fields, real mutations |
| `apps/provider/src/components/CampaignBuilder.tsx` | **Delete** | Remove duplicate wizard component |
| `apps/provider/src/lib/graphql/campaigns.ts` | **Create** (partial) | CREATE_CAMPAIGN mutation (expanded in task 9.15) |

---

## Acceptance Criteria

- [ ] 5-step wizard: Basics → Audience → Content → Schedule → Review
- [ ] Form fields align with `CreateCampaignInput` schema
- [ ] Category uses `NotificationCategory` enum (not freeform "type")
- [ ] Step validation prevents advancing with missing required fields
- [ ] Step indicator shows completed/current/upcoming states
- [ ] "Save as Draft" saves via `createCampaign` mutation and redirects to `/campaigns`
- [ ] "Launch Campaign" redirects to launch confirmation modal (task 9.8)
- [ ] `CampaignBuilder.tsx` standalone component removed
- [ ] Loading state shown during mutation execution
- [ ] Error toast shown on mutation failure

---

## Dependencies

- **Blocked by**: Task 9.15 (GraphQL `createCampaign` mutation)
- **Blocks**: Tasks 9.6 (policy preview), 9.7 (save as draft), 9.8 (launch confirmation)
- **Related**: Task 9.1 (list page — redirect target after save)
