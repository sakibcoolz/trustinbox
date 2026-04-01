# Task 7.5 — Create Callback Request

> **Section**: 7. Callback Requests  
> **Priority**: P0 — Core action  
> **Estimated Scope**: Large  
> **Route**: `/callbacks/new` or Modal  
> **Component**: CreateCallbackForm
> **Status**: ✅ Complete

---

## Objective

Implement a form to create a new callback request with customer selection, preferred time slots, reason, and notes, gated by policy pre-check.

---

## Current State

No create callback form exists. The page has no "New Request" button. `CustomerActions.tsx` has a "Request Callback" button that links to `/callbacks/new?recipient={virtualId}` but no page exists at that route.

---

## Requirements

### Form Fields

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| **Customer** | Search dropdown | Yes | Search by VID or name, pre-filled if `?recipient=` param |
| **Reason** | Text input | Yes | Max 200 chars |
| **Details** | Textarea | No | Max 1000 chars, markdown support |
| **Preferred Slots** | Time range picker | No | Multiple slots selectable, aligned with customer availability |
| **Priority** | Dropdown | Yes | Low, Normal, High, Urgent |

### Policy Pre-Check
- After customer selection, call `checkCommunicationPolicy(spId, userId, category, 'CALLBACK')`
- Show result: "Callback allowed" (green) or "Blocked: {reason}" (red)
- Block form submission if policy denies
- Show customer's `allowCallbackRequests` preference status

### Customer Availability
- If available, show customer's `availabilitySlots` to help pick preferred time
- Display DND windows so agent avoids scheduling during DND

### Submission Flow
1. Fill form → Policy pre-check passes
2. Click "Create Request" → Confirmation modal with summary
3. Submit → `createCallbackRequest(input)` mutation (task 7.13)
4. Success → Navigate to `/callbacks` with success toast
5. Error → Show error inline, allow retry

### Permissions
- Requires `callbacks:manage` permission
- Button hidden if user lacks permission

---

## Implementation Plan

```tsx
'use client';

import { useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCreateCallbackRequest, usePolicyCheck } from '@/lib/graphql/callbacks';
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/useToast';

export default function CreateCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const recipientVid = searchParams.get('recipient');
  const canManage = usePermission('callbacks:manage');

  const [form, setForm] = useState({
    userId: '',
    reason: '',
    details: '',
  });

  const [policyResult, setPolicyResult] = useState(null);
  const [createCallback, { loading: creating }] = useCreateCallbackRequest();

  async function handleSubmit() {
    const result = await createCallback({
      variables: { input: form },
    });
    toast({ title: 'Callback request created', variant: 'success' });
    router.push('/callbacks');
  }

  if (!canManage) return <AccessDenied />;

  return (
    <div className="p-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Create Callback Request</h1>
      {/* Customer search */}
      {/* Policy pre-check result */}
      {/* Reason + Details */}
      {/* Time slot selection */}
      {/* Submit button */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/callbacks/new/page.tsx` | Create — callback request creation form |
| `apps/provider/src/app/callbacks/page.tsx` | Modify — add "New Request" button linking to `/callbacks/new` |

---

## Acceptance Criteria

- [ ] Form with customer search, reason, details, preferred time
- [ ] Customer pre-filled from `?recipient=` URL param
- [ ] Policy pre-check runs on customer selection
- [ ] Blocked submissions when policy denies callback
- [ ] Shows customer availability slots and DND windows
- [ ] Confirmation modal before submission
- [ ] Success → navigate to `/callbacks` with toast
- [ ] Requires `callbacks:manage` permission
- [ ] Form validation: reason required, max lengths enforced

---

## Dependencies

- **Blocked by**: Task 7.1 (CallbackRequestTable page), Task 7.10 (GraphQL query), Task 7.13 (policy integration)
- **Blocks**: Task 7.7 (assign to agent — after creation)
- **Related**: Task 4.10 (customer quick actions — "Request Callback"), Task 5.7 (notification composer — similar form pattern)
