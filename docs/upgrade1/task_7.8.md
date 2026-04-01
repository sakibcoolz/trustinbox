# Task 7.8 — Complete Callback

> **Section**: 7. Callback Requests  
> **Priority**: P1 — Workflow action  
> **Estimated Scope**: Medium  
> **Route**: `/callbacks`  
> **Component**: CompleteCallbackModal
> **Status**: ✅ Complete

---

## Objective

Implement a "Complete Callback" action that marks an approved callback as completed with notes (call duration, outcome, follow-up needed).

---

## Current State

No completion flow exists. The Approve/Reject buttons are the only actions. APPROVED callbacks have no further actions.

---

## Requirements

### Completion Form (Modal)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| **Outcome** | Dropdown | Yes | Resolved, Follow-up Needed, No Answer, Rescheduled |
| **Call Duration** | Number input | No | Minutes |
| **Notes** | Textarea | No | Max 500 chars |
| **Follow-up Date** | Date picker | Conditional | Required if outcome = Follow-up Needed |

### Completion Flow
1. Click "Complete" on APPROVED callback
2. Modal opens with form
3. Fill outcome + optional fields
4. Submit → mutation to update status
5. Success → row updates to completed state, toast shown
6. Error → modal stays open with error message

### Button Visibility
- "Complete" button only for APPROVED status
- Requires `callbacks:manage` permission
- Disabled during submission

---

## Implementation Plan

```tsx
import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

interface CompleteCallbackModalProps {
  callbackId: string;
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: CompletionData) => Promise<void>;
}

interface CompletionData {
  outcome: 'RESOLVED' | 'FOLLOW_UP' | 'NO_ANSWER' | 'RESCHEDULED';
  duration?: number;
  notes?: string;
  followUpDate?: string;
}

function CompleteCallbackModal({ callbackId, isOpen, onClose, onComplete }: CompleteCallbackModalProps) {
  const [form, setForm] = useState<CompletionData>({ outcome: 'RESOLVED' });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  async function handleSubmit() {
    setSubmitting(true);
    await onComplete(form);
    setSubmitting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-bg-elevated border border-border-primary rounded-xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Complete Callback</h2>
          <button onClick={onClose}><X size={18} className="text-text-muted" /></button>
        </div>
        {/* Outcome dropdown */}
        {/* Duration input */}
        {/* Notes textarea */}
        {/* Follow-up date (conditional) */}
        <button onClick={handleSubmit} disabled={submitting}
          className="w-full py-2.5 bg-status-success text-white rounded-lg text-sm font-medium disabled:opacity-50">
          <CheckCircle2 size={14} className="inline mr-1" /> Mark Complete
        </button>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/callbacks/CompleteCallbackModal.tsx` | Create — completion form modal |
| `apps/provider/src/app/callbacks/page.tsx` | Modify — add Complete button for APPROVED rows, wire modal |

---

## Acceptance Criteria

- [ ] "Complete" button visible only for APPROVED callbacks
- [ ] Modal with outcome, duration, notes, follow-up date
- [ ] Follow-up date required when outcome is "Follow-up Needed"
- [ ] Submission updates callback status
- [ ] Optimistic UI update in table
- [ ] Toast on success
- [ ] Requires `callbacks:manage` permission
- [ ] Modal closes on successful submission

---

## Dependencies

- **Blocked by**: Task 1.16 (Modal), Task 7.1 (CallbackRequestTable), Task 7.11 (mutations)
- **Blocks**: None
- **Related**: Task 7.9 (bulk actions — bulk complete), Task 5.5 (retry action — similar action pattern)
