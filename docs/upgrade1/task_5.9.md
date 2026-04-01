# Task 5.9 — Notification Preview Panel

> **Section**: 5. Notifications  
> **Priority**: P2  
> **Estimated Scope**: Medium  
> **Route**: `/notifications/compose`  
> **File**: `apps/provider/src/app/notifications/compose/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Add a live preview panel showing how the notification will appear on the user's device, with different layouts for SMS, email, push, and in-app notifications.

---

## Current State

No preview panel exists. The compose form shows only form fields with no visual preview of the notification output.

---

## Requirements

### 1. Preview Panel Position
- Side panel on desktop (right column of a 2-column layout)
- Below form on mobile (stacked)
- Sticky positioning so preview scrolls with the user

### 2. Channel-Specific Previews

**SMS Preview**:
```
┌──────────────────┐
│ Messages         │
│ ─────────────────│
│ [OrgName]        │
│ Subject: [...]   │
│                  │
│ [Body text...]   │
│                  │
│ [Char count/160] │
└──────────────────┘
```

**Email Preview**:
```
┌──────────────────┐
│ From: [OrgName]  │
│ Subject: [...]   │
│ ─────────────────│
│                  │
│ [Body text...]   │
│                  │
│ Unsubscribe link │
└──────────────────┘
```

**Push Notification Preview**:
```
┌──────────────────┐
│ 🔔 [OrgName]     │
│ [Subject]        │
│ [Body preview..] │
│ ─────────────────│
│ [Timestamp]      │
└──────────────────┘
```

**In-App Preview**:
```
┌──────────────────┐
│ [Icon] [Subject] │
│ [Body preview..] │
│ [Action Button]  │
└──────────────────┘
```

### 3. Live Updates
- Preview updates in real-time as user types in form fields
- Empty state: "Start composing to see preview"
- Show placeholder text for empty fields

### 4. Device Frame
- Wrap in a phone-frame mockup for SMS/push
- Wrap in a browser/inbox frame for email
- In-app shows a TrustInbox app screen mockup

### 5. Component API

```typescript
interface NotificationPreviewProps {
  channel: string;
  subject: string;
  body: string;
  orgName: string;
  category: string;
  priority: string;
}
```

---

## Implementation Plan

```tsx
// apps/provider/src/components/notifications/NotificationPreview.tsx
import { Bell, Mail, MessageSquare, Smartphone } from 'lucide-react';

export function NotificationPreview({ channel, subject, body, orgName, category, priority }: NotificationPreviewProps) {
  if (!subject && !body) {
    return (
      <div className="bg-bg-card border border-border-primary rounded-xl p-8 text-center">
        <Bell size={24} className="text-text-muted mx-auto mb-2" />
        <p className="text-sm text-text-muted">Start composing to see preview</p>
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-4">
      <h3 className="text-xs text-text-muted uppercase tracking-wider mb-3">{channel} Preview</h3>
      {channel === 'SMS' && <SMSPreview subject={subject} body={body} orgName={orgName} />}
      {channel === 'Email' && <EmailPreview subject={subject} body={body} orgName={orgName} />}
      {channel === 'Push' && <PushPreview subject={subject} body={body} orgName={orgName} />}
      {channel === 'In-App' && <InAppPreview subject={subject} body={body} orgName={orgName} />}
    </div>
  );
}

function SMSPreview({ subject, body, orgName }: PreviewProps) {
  const charCount = (subject + ' ' + body).length;
  const segments = Math.ceil(charCount / 160);

  return (
    <div className="bg-bg-primary rounded-2xl p-4 max-w-xs mx-auto border border-border-secondary">
      <p className="text-xs text-text-muted mb-2">{orgName}</p>
      <div className="bg-accent-blue/10 rounded-xl p-3">
        {subject && <p className="text-sm font-medium mb-1">{subject}</p>}
        <p className="text-sm text-text-secondary">{body || 'Message body...'}</p>
      </div>
      <p className="text-xs text-text-muted mt-2 text-right">{charCount}/160 ({segments} segment{segments > 1 ? 's' : ''})</p>
    </div>
  );
}

function PushPreview({ subject, body, orgName }: PreviewProps) {
  return (
    <div className="bg-bg-primary rounded-xl p-3 max-w-xs mx-auto border border-border-secondary shadow-md">
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-lg bg-accent-blue/20 flex items-center justify-center">
          <Bell size={14} className="text-accent-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold">{orgName}</p>
          <p className="text-xs font-medium">{subject || 'Notification title'}</p>
          <p className="text-xs text-text-muted truncate">{body || 'Notification body...'}</p>
        </div>
        <span className="text-xs text-text-muted">now</span>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/notifications/NotificationPreview.tsx` | Create |
| `apps/provider/src/app/notifications/compose/page.tsx` | Modify — add 2-column layout with NotificationPreview on right |

---

## Acceptance Criteria

- [ ] Preview updates live as user types
- [ ] 4 channel-specific layouts: SMS, Email, Push, In-App
- [ ] SMS: character count and segment counter
- [ ] Push: notification card with icon, title, body preview
- [ ] Email: from, subject, body layout
- [ ] Empty state: "Start composing to see preview"
- [ ] 2-column layout on desktop, stacked on mobile
- [ ] Preview panel has sticky positioning

---

## Dependencies

- **Blocked by**: Task 5.7 (NotificationComposer — provides form data)
- **Blocks**: None
- **Related**: Task 5.10 (Send confirmation also shows notification summary)
