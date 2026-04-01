# Task 5.8 — Notification Policy Pre-Check

> **Section**: 5. Notifications  
> **Priority**: P0  
> **Estimated Scope**: Medium  
> **Route**: `/notifications/compose`  
> **File**: `apps/provider/src/app/notifications/compose/page.tsx`
> **Status**: ✅ Complete

---

## Objective

Replace the mock policy check in the compose form with real `checkCommunicationPolicy` GraphQL integration that auto-triggers when recipient, category, and channel are selected, blocking send if policy denies.

---

## Current State

```tsx
// apps/provider/src/app/notifications/compose/page.tsx — Mock policy check
function checkPolicy() {
  if (form.category === 'Advertisement') {
    setPolicyPreview({ allowed: false, reason: 'User has opted out of advertisement notifications.' });
  } else {
    setPolicyPreview({ allowed: true, reason: 'Notification passes all policy checks.' });
  }
}
```

And "Preview Policy" button triggers manual check only.

---

## Requirements

### 1. Auto-Trigger
- Automatically check policy when all three fields are set: recipient(s), category, channel
- Re-check on any change to these fields
- Debounce: 500ms after last change to avoid excessive queries
- For multi-recipient: check first recipient as sample (full check on send)

### 2. Visual Display
- Inline result card below the recipient section
- **Allowed**: Green card with ✅ icon, "Policy Passed" title, reason text, applied rules
- **Blocked**: Red card with ❌ icon, "Policy Blocked" title, decision code, reason text
- **Loading**: Skeleton with "Checking policy…" text
- **Error**: Warning card with "Policy check unavailable" + manual retry button

### 3. Send Button Behavior
- If policy blocked: disable Send button, show reason
- If policy check loading: disable Send button
- If policy check failed (network error): allow Send with warning disclaimer
- If no recipient selected: policy section shows "Select a recipient to check policy"

### 4. Multi-Recipient Summary
When multiple recipients are selected:
- Show: "Checked X of Y recipients"
- Summary: "N allowed, M blocked"
- List blocked recipients with reason codes
- "Send to allowed recipients only" option if some are blocked

### 5. Reuse `useCheckPolicy` Hook (task 4.14)

```typescript
// Auto-check effect
useEffect(() => {
  const timer = setTimeout(() => {
    if (form.recipients.length > 0 && form.category && form.channel && spId) {
      checkPolicy(spId, form.category, form.channel);
    }
  }, 500);
  return () => clearTimeout(timer);
}, [form.recipients, form.category, form.channel]);
```

---

## Implementation Plan

```tsx
// In compose/page.tsx — Policy Pre-Check Section
function PolicyPreCheckSection({ form, spId }: { form: ComposeForm; spId: string }) {
  const { checkPolicy, result, loading, error } = useCheckPolicy();

  useEffect(() => {
    if (form.recipients.length === 0) return;
    const timer = setTimeout(() => {
      checkPolicy(spId, form.category, form.channel);
    }, 500);
    return () => clearTimeout(timer);
  }, [form.recipients, form.category, form.channel]);

  if (form.recipients.length === 0) {
    return (
      <div className="bg-bg-card border border-border-primary rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
          <Shield size={14} /> Policy Check
        </h3>
        <p className="text-xs text-text-muted">Select a recipient to check communication policy</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-bg-card border border-border-primary rounded-xl p-6 animate-pulse">
        <p className="text-sm text-text-muted">Checking policy…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-status-warning/10 border border-status-warning/20 rounded-xl p-4 flex items-start gap-3">
        <AlertTriangle size={16} className="text-status-warning mt-0.5" />
        <div>
          <p className="text-sm font-medium text-status-warning">Policy check unavailable</p>
          <p className="text-xs text-text-muted">You can still send, but policy may block delivery.</p>
          <button onClick={() => checkPolicy(spId, form.category, form.channel)}
            className="text-xs text-accent-blue hover:underline mt-1">Retry</button>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const config = result.allowed
    ? { icon: CheckCircle, color: 'text-status-success', bg: 'bg-status-success/10 border-status-success/20', title: 'Policy Passed' }
    : { icon: XCircle, color: 'text-status-error', bg: 'bg-status-error/10 border-status-error/20', title: 'Policy Blocked' };

  return (
    <div className={`rounded-xl p-4 border ${config.bg} flex items-start gap-3`}>
      <config.icon size={16} className={`${config.color} mt-0.5`} />
      <div>
        <p className={`text-sm font-medium ${config.color}`}>{config.title}</p>
        <p className="text-xs text-text-muted mt-0.5">{result.reason}</p>
        <div className="flex flex-wrap gap-1 mt-2">
          {result.appliedRules.map((rule: string) => (
            <span key={rule} className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-muted">{rule}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/notifications/compose/page.tsx` | Modify — replace mock checkPolicy with auto-triggering PolicyPreCheckSection |

---

## Acceptance Criteria

- [ ] Auto-triggers when recipient + category + channel are set
- [ ] 500ms debounce after field changes
- [ ] Shows "Policy Passed" (green) or "Policy Blocked" (red) with reason
- [ ] Applied rules shown as chips
- [ ] Send button disabled when policy blocks
- [ ] Graceful degradation on API error (warning + allow send)
- [ ] "Select a recipient…" prompt when no recipient chosen
- [ ] Loading state with "Checking policy…"
- [ ] Replaces hardcoded mock policy check

---

## Dependencies

- **Blocked by**: Task 4.14 (useCheckPolicy hook), Task 5.7 (NotificationComposer)
- **Blocks**: None
- **Related**: Task 4.11 (customer detail policy check — same hook/pattern), Task 5.10 (send confirmation shows policy result)
