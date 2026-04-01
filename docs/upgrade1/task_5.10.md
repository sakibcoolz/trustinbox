# Task 5.10 — Send Confirmation Modal

> **Section**: 5. Notifications  
> **Priority**: P1  
> **Estimated Scope**: Small  
> **Route**: `/notifications/compose`  
> **File**: `apps/provider/src/app/notifications/compose/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Implement a confirmation modal that shows a summary of the notification before sending, including recipients, policy verdicts, and a "Send" or "Schedule" CTA.

---

## Current State

No confirmation modal. The compose page submits directly on form submit with no summary or review step.

---

## Requirements

### 1. Trigger
- "Send" button on compose form opens the modal instead of directly sending
- Only opened if form validation passes
- Only opened if policy check is not blocked (or user acknowledges risk)

### 2. Modal Content

| Section | Content |
|---------|---------|
| **Header** | "Confirm Notification" |
| **Recipients** | Count: "Sending to 3 customers" or "Sending to VID-xxxx" |
| **Category** | Badge: Personal/Organizational/Advertisement |
| **Channel** | SMS / Email / Push / In-App |
| **Priority** | Badge: Low/Normal/High/Urgent |
| **Subject** | Full subject text |
| **Body Preview** | Truncated body (first 200 chars) |
| **Schedule** | "Send Now" or "Scheduled for: [date/time]" |
| **Policy** | ✅ Passed or ⚠ Warning |

### 3. Actions
- Primary: "Send Notification" or "Schedule Notification" (based on schedule type)
- Secondary: "Cancel" — closes modal, returns to form
- Loading state on primary button during send

### 4. Visual Design
- Use Modal component (task 1.16)
- Centered, max-width `max-w-lg`
- Backdrop blur
- Sections separated by subtle dividers

### 5. Component API

```typescript
interface SendConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  form: ComposeForm;
  policyResult: PolicyCheckResult | null;
  sending: boolean;
}
```

---

## Implementation Plan

```tsx
// apps/provider/src/components/notifications/SendConfirmModal.tsx
import { Modal } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Send, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export function SendConfirmModal({ open, onClose, onConfirm, form, policyResult, sending }: SendConfirmModalProps) {
  const isScheduled = form.scheduleType === 'scheduled';

  return (
    <Modal open={open} onClose={onClose} title="Confirm Notification" maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Recipients */}
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Recipients</span>
          <span className="font-medium">
            {form.recipients.length === 1 ? form.recipients[0] : `${form.recipients.length} customers`}
          </span>
        </div>

        <div className="h-px bg-border-primary" />

        {/* Category + Channel + Priority */}
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Category</span>
          <Badge variant={categoryVariant(form.category)}>{form.category}</Badge>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Channel</span>
          <span className="font-medium">{form.channel}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-text-muted">Priority</span>
          <Badge>{form.priority}</Badge>
        </div>

        <div className="h-px bg-border-primary" />

        {/* Content */}
        <div>
          <p className="text-xs text-text-muted mb-1">Subject</p>
          <p className="text-sm font-medium">{form.subject}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted mb-1">Body</p>
          <p className="text-sm text-text-secondary line-clamp-3">{form.body}</p>
        </div>

        <div className="h-px bg-border-primary" />

        {/* Schedule */}
        <div className="flex items-center gap-2 text-sm">
          {isScheduled ? <Clock size={14} className="text-text-muted" /> : <Send size={14} className="text-text-muted" />}
          <span>{isScheduled ? `Scheduled for: ${form.scheduledAt}` : 'Send immediately'}</span>
        </div>

        {/* Policy */}
        {policyResult && (
          <div className={`flex items-center gap-2 p-2 rounded-lg text-sm ${policyResult.allowed ? 'bg-status-success/10' : 'bg-status-warning/10'}`}>
            {policyResult.allowed
              ? <><CheckCircle size={14} className="text-status-success" /> Policy check passed</>
              : <><AlertTriangle size={14} className="text-status-warning" /> Policy warning: {policyResult.reason}</>}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 mt-6">
        <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary border border-border-secondary rounded-lg">Cancel</button>
        <button onClick={onConfirm} disabled={sending}
          className="flex items-center gap-2 px-6 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium disabled:opacity-50">
          {isScheduled ? <Clock size={14} /> : <Send size={14} />}
          {sending ? 'Sending…' : isScheduled ? 'Schedule Notification' : 'Send Notification'}
        </button>
      </div>
    </Modal>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/notifications/SendConfirmModal.tsx` | Create |
| `apps/provider/src/app/notifications/compose/page.tsx` | Modify — add modal state, open on send button click |

---

## Acceptance Criteria

- [ ] Modal opens on "Send" button click (not direct send)
- [ ] Shows: recipients, category, channel, priority, subject, body preview, schedule, policy result
- [ ] Primary CTA: "Send Notification" or "Schedule Notification"
- [ ] Cancel closes modal, returns to form
- [ ] Loading state on primary button during send
- [ ] Uses Modal component (task 1.16)
- [ ] Recipient count or individual VID displayed

---

## Dependencies

- **Blocked by**: Task 1.16 (Modal/Dialog component), Task 5.7 (NotificationComposer — provides form state), Task 5.8 (policy pre-check — provides result)
- **Blocks**: None
- **Related**: Task 5.9 (preview panel — similar content display)
