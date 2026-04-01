# Task 5.11 — Notification Draft Auto-Save

> **Section**: 5. Notifications  
> **Priority**: P2  
> **Estimated Scope**: Small  
> **Route**: `/notifications/compose`  
> **File**: `apps/provider/src/app/notifications/compose/page.tsx`

---

## Objective

Auto-save notification compose drafts to localStorage and offer to restore them when the user revisits the compose page, preventing loss of in-progress work.

---

## Current State

No draft saving exists. Navigating away from the compose page loses all form data.

---

## Requirements

### 1. Auto-Save
- Save form state to localStorage every 5 seconds if form has content
- Key: `notification-draft-{spId}` (SP-scoped)
- Include timestamp of last save
- Only save if at least subject or body is non-empty

### 2. Draft Structure

```typescript
interface NotificationDraft {
  form: ComposeForm;
  savedAt: string; // ISO datetime
}
```

### 3. Restore Prompt
- On page load, check for existing draft
- If draft exists and is < 24 hours old:
  - Show banner: "You have an unsaved draft from [relative time]. Restore? | Discard"
  - "Restore" → populate form with draft data
  - "Discard" → clear draft from localStorage
- If draft > 24 hours old: silently discard

### 4. Clear Draft
- On successful send: clear draft
- On explicit discard: clear draft
- On "Cancel" button: prompt "Discard draft?" if form has content

### 5. Visual Indicator
- Small "Draft saved" text indicator near the form, fades in/out
- Format: "Draft saved 2s ago" → updates relative time
- Gray text, subtle animation

---

## Implementation Plan

```tsx
// apps/provider/src/hooks/useDraftSave.ts
import { useState, useEffect, useCallback } from 'react';

const DRAFT_EXPIRY_HOURS = 24;

export function useDraftSave<T>(key: string, defaultValue: T) {
  const [form, setForm] = useState<T>(defaultValue);
  const [hasDraft, setHasDraft] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Check for existing draft on mount
  useEffect(() => {
    const raw = localStorage.getItem(key);
    if (raw) {
      try {
        const draft = JSON.parse(raw);
        const savedAt = new Date(draft.savedAt);
        const hoursAgo = (Date.now() - savedAt.getTime()) / (1000 * 60 * 60);
        if (hoursAgo < DRAFT_EXPIRY_HOURS) {
          setHasDraft(true);
        } else {
          localStorage.removeItem(key);
        }
      } catch { localStorage.removeItem(key); }
    }
  }, [key]);

  // Auto-save every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      if (hasContent(form)) {
        const draft = { form, savedAt: new Date().toISOString() };
        localStorage.setItem(key, JSON.stringify(draft));
        setLastSaved(new Date());
      }
    }, 5000);
    return () => clearInterval(timer);
  }, [form, key]);

  const restore = useCallback(() => {
    const raw = localStorage.getItem(key);
    if (raw) {
      const draft = JSON.parse(raw);
      setForm(draft.form);
      setHasDraft(false);
    }
  }, [key]);

  const discard = useCallback(() => {
    localStorage.removeItem(key);
    setHasDraft(false);
  }, [key]);

  const clear = useCallback(() => {
    localStorage.removeItem(key);
    setLastSaved(null);
  }, [key]);

  return { form, setForm, hasDraft, restore, discard, clear, lastSaved };
}
```

```tsx
// In compose/page.tsx — Draft restore banner
{hasDraft && (
  <div className="flex items-center justify-between p-3 bg-accent-blue/10 border border-accent-blue/20 rounded-xl">
    <p className="text-sm text-accent-blue">
      You have an unsaved draft from {formatRelativeTime(draftSavedAt)}.
    </p>
    <div className="flex gap-2">
      <button onClick={restore} className="text-sm font-medium text-accent-blue hover:underline">Restore</button>
      <button onClick={discard} className="text-sm text-text-muted hover:text-text-primary">Discard</button>
    </div>
  </div>
)}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/hooks/useDraftSave.ts` | Create — generic draft save/restore hook |
| `apps/provider/src/app/notifications/compose/page.tsx` | Modify — integrate useDraftSave |

---

## Acceptance Criteria

- [ ] Form auto-saved to localStorage every 5 seconds
- [ ] Draft is SP-scoped: `notification-draft-{spId}`
- [ ] Only saves if subject or body is non-empty
- [ ] Restore banner on revisit if draft < 24 hours old
- [ ] "Restore" populates form, "Discard" clears draft
- [ ] Old drafts (> 24 hours) silently discarded
- [ ] Draft cleared on successful send
- [ ] "Draft saved Xs ago" indicator
- [ ] Unsaved changes prompt on page leave (optional)

---

## Dependencies

- **Blocked by**: Task 5.7 (NotificationComposer — form state to save)
- **Blocks**: None
- **Related**: Task 17.9 (localStorage user preferences — similar pattern)
