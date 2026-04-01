# Task 5.7 — NotificationComposer Component

> **Section**: 5. Notifications  
> **Priority**: P0 — Core sending workflow  
> **Estimated Scope**: Large  
> **Route**: `/notifications/compose`  
> **File**: `apps/provider/src/app/notifications/compose/page.tsx`, `apps/provider/src/components/NotificationComposer.tsx`

---

## Objective

Upgrade the notification compose page and reusable NotificationComposer component to include: GraphQL-powered recipient selector (multi-select via CustomerLookup), rich text/plain text toggle, schedule delivery, priority selector, and policy pre-check integration.

---

## Current State

**Compose Page** (`notifications/compose/page.tsx`, ~170 lines):
```tsx
const [form, setForm] = useState({
  category: 'Personal', priority: 'Normal', channel: 'SMS', subject: '', body: '',
  targetType: 'individual', targetId: '', scheduleType: 'now', scheduledAt: '',
});
```
- Sections: Classification (category/priority/channel), Target (individual/segment/all), Content (subject/body), Schedule (now/scheduled), Policy Check (mock)
- Mock policy check (hardcoded: ads → blocked, else → passed)
- `window.location.href` for navigation after send
- No real sending — just simulates with `setTimeout`

**Reusable Component** (`NotificationComposer.tsx`, ~120 lines):
```tsx
interface NotificationComposerProps {
  onSend?: (data: NotificationData) => void;
  onPolicyCheck?: (data: NotificationData) => Promise<{ allowed: boolean; reason: string }>;
}
```
- Simpler version: flat form with category/priority/channel/target/subject/body
- Mock policy check
- No schedule, no recipient search, no preview

---

## Requirements

### 1. Recipient Selector
- Replace plain text `targetId` input with `CustomerLookup` component (task 4.15)
- **Individual**: Single customer search/select
- **Segment**: Select from predefined segments (future)
- **All**: Send to all customers (requires SP_ADMIN)
- Pre-fill from URL: `?recipients=VID-a,VID-b` (from bulk actions, task 4.6)

### 2. Content Section
- Subject: max 100 chars, character counter
- Body: rich text toggle (plain text / rich text)
  - Plain text: `<textarea>`
  - Rich text: basic formatting toolbar (bold, italic, links) — defer to P2 if needed
- Character/SMS segment counter for SMS channel

### 3. Category + Priority + Channel (preserved)
- Category: Personal, Organizational, Advertisement (dropdown, existing)
- Priority: Low, Normal, High, Urgent (dropdown, existing)
- Channel: SMS, Email, Push, In-App (radio buttons or dropdown, existing)
- Channel-specific constraints:
  - SMS: character limit, segment counter
  - Email: subject required
  - Push: subject = notification title, body = short text

### 4. Schedule
- Send Now (default) or Schedule for specific date/time
- Timezone selector (default: user's timezone from browser)
- Minimum schedule time: 5 minutes from now
- Scheduled notifications show in list with "Scheduled" status

### 5. Policy Pre-Check (task 5.8)
- Auto-trigger when recipient + category + channel are all selected
- Show result inline (green/red card)
- Block send button if policy blocks

### 6. Preview Panel (task 5.9)
- Right column showing how notification appears on user device
- Different preview for SMS vs Email vs Push

### 7. Send Confirmation Modal (task 5.10)
- Summary: recipient count, category, channel, schedule, policy verdict
- "Send" or "Schedule" CTA
- Cancel option

### 8. Draft Auto-Save (task 5.11)
- Save form state to localStorage every 5 seconds
- Restore on revisit
- "Restore draft?" prompt

### 9. GraphQL Integration
- Call `sendNotification(input)` mutation on send
- Navigate to `/notifications` on success with success toast

---

## Implementation Plan

```tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMutation } from '@apollo/client';
import { SEND_NOTIFICATION } from '@/lib/graphql/notifications';
import { ArrowLeft, Send, Eye, Clock } from 'lucide-react';
import Link from 'next/link';
import CustomerLookup from '@/components/CustomerLookup';
import { useCheckPolicy } from '@/lib/graphql/customers';
import { useToast } from '@/hooks/useToast';
import { useAuth } from '@/hooks/useAuth';

interface ComposeForm {
  category: string;
  priority: string;
  channel: string;
  subject: string;
  body: string;
  targetType: 'individual' | 'segment' | 'all';
  recipients: string[];       // virtualId array
  scheduleType: 'now' | 'scheduled';
  scheduledAt: string;
}

export default function ComposeNotificationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { currentSp } = useAuth();
  
  // Pre-fill recipients from URL
  const urlRecipients = searchParams.get('recipients')?.split(',').filter(Boolean) ?? [];
  
  const [form, setForm] = useState<ComposeForm>({
    category: 'Personal',
    priority: 'Normal',
    channel: 'SMS',
    subject: '',
    body: '',
    targetType: urlRecipients.length > 0 ? 'individual' : 'individual',
    recipients: urlRecipients,
    scheduleType: 'now',
    scheduledAt: '',
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { checkPolicy, result: policyResult } = useCheckPolicy();

  const [sendNotification, { loading: sending }] = useMutation(SEND_NOTIFICATION, {
    onCompleted: () => {
      toast({ type: 'success', message: 'Notification sent successfully' });
      localStorage.removeItem('notification-draft');
      router.push('/notifications');
    },
    onError: (err) => toast({ type: 'error', message: err.message }),
  });

  // Auto policy check when fields are filled
  useEffect(() => {
    if (form.recipients.length > 0 && form.category && form.channel && currentSp) {
      checkPolicy(currentSp.id, form.category, form.channel);
    }
  }, [form.recipients, form.category, form.channel]);

  // Draft auto-save (task 5.11)
  useEffect(() => {
    const timer = setInterval(() => {
      localStorage.setItem('notification-draft', JSON.stringify(form));
    }, 5000);
    return () => clearInterval(timer);
  }, [form]);

  async function handleSend() {
    await sendNotification({
      variables: {
        input: {
          recipientIds: form.recipients,
          category: form.category,
          channel: form.channel,
          title: form.subject,
          body: form.body,
          priority: form.priority,
          scheduledAt: form.scheduleType === 'scheduled' ? form.scheduledAt : undefined,
        },
      },
    });
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl">
      {/* Header with back button */}
      {/* Form sections: Classification, Recipients, Content, Schedule, Policy Check */}
      {/* Send button → opens confirmation modal */}
      {/* ConfirmationModal (task 5.10) */}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/notifications/compose/page.tsx` | Modify — full upgrade with GraphQL, CustomerLookup, schedule, policy check |
| `apps/provider/src/components/NotificationComposer.tsx` | Modify — upgrade props, add multi-select, policy integration |

---

## Acceptance Criteria

- [ ] Recipient selector uses CustomerLookup (multi-select mode)
- [ ] Pre-fill recipients from URL query params
- [ ] Category, Priority, Channel selectors with current options
- [ ] Subject (max 100 chars) and Body (textarea or rich text) fields
- [ ] Schedule: Send Now or pick date/time with timezone
- [ ] Policy pre-check auto-triggers, shows result inline
- [ ] Send confirmation modal with summary
- [ ] `sendNotification` GraphQL mutation on send
- [ ] Navigate to `/notifications` on success with toast
- [ ] Draft auto-saves to localStorage every 5s
- [ ] Loading state on send button
- [ ] Replaces all mock data with real GraphQL calls

---

## Dependencies

- **Blocked by**: Task 4.15 (CustomerLookup), Task 4.14 (useCheckPolicy), Task 5.13 (sendNotification mutation), Task 1.7 (Toast), Task 1.16 (Modal)
- **Blocks**: Task 5.8 (policy pre-check), Task 5.9 (preview), Task 5.10 (confirmation modal), Task 5.11 (draft save)
- **Related**: Task 4.6 (bulk actions → pre-filled recipients)
