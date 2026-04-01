# Task 7.4 — Callback Request Detail Expansion

> **Section**: 7. Callback Requests  
> **Priority**: P1 — Detail view  
> **Estimated Scope**: Medium  
> **Route**: `/callbacks`  
> **Component**: Expandable table row
> **Status**: ✅ Complete

---

## Objective

Implement a click-to-expand detail row for each callback request showing the customer's privacy preferences, DND windows, policy evaluation result, and full request details.

---

## Current State

No detail expansion exists. Table rows are flat with no click interaction beyond Approve/Reject buttons.

---

## Requirements

### Expanded Row Content

| Section | Content | Source |
|---------|---------|--------|
| **Customer Info** | Virtual ID, display name, avatar | Resolved from userId |
| **Request Details** | Full reason, details text, requestedAt | `callbackRequest.reason`, `.details` |
| **Privacy Preferences** | `allowCallbackRequests` status | `user.privacyPreference.allowCallbackRequests` |
| **DND Windows** | Active DND rules for this customer | `user.dndRules` filtered for active |
| **Availability Slots** | Customer's preferred callback times | `user.availabilitySlots` |
| **Policy Evaluation** | `checkCommunicationPolicy` result | Green allowed / Red blocked with reason |
| **Approved Slot** | Start–End times if approved | `callbackRequest.approvedSlotStart/End` |
| **Response Info** | `respondedAt` timestamp, assigned agent | If status != PENDING |

### UI Pattern
- Click on row toggles expansion below
- Expanded content uses card layout within table
- Smooth height animation with `transition-all`
- Only one row expanded at a time
- Close button or click again to collapse

### Policy Check
- On expansion, fetch `checkCommunicationPolicy` for this user
- Display result: "Communication Allowed" (green) or "Blocked: {reason}" (red)
- Shows `appliedRules` list

---

## Implementation Plan

```tsx
const [expandedId, setExpandedId] = useState<string | null>(null);

// In table body:
{callbacks.map((cb) => (
  <>
    <tr key={cb.id} onClick={() => setExpandedId(expandedId === cb.id ? null : cb.id)}
      className="cursor-pointer border-b border-border-primary hover:bg-bg-hover">
      {/* ... columns */}
    </tr>
    {expandedId === cb.id && (
      <tr>
        <td colSpan={8} className="px-4 py-4 bg-bg-surface">
          <CallbackDetailExpansion callbackRequest={cb} />
        </td>
      </tr>
    )}
  </>
))}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/callbacks/CallbackDetailExpansion.tsx` | Create — expanded detail content |
| `apps/provider/src/app/callbacks/page.tsx` | Modify — add expansion toggle logic |

---

## Acceptance Criteria

- [ ] Click row to expand/collapse detail view
- [ ] Shows customer VID, full reason, details
- [ ] Displays DND windows and availability slots
- [ ] Policy check result shown (allowed/blocked)
- [ ] Approved slot times shown when applicable
- [ ] Only one row expanded at a time
- [ ] Smooth expand/collapse animation

---

## Dependencies

- **Blocked by**: Task 7.1 (CallbackRequestTable), Task 7.10 (GraphQL query)
- **Blocks**: Task 7.5 (create callback uses similar detail view)
- **Related**: Task 5.4 (notification detail expansion — same pattern), Task 4.8 (privacy status display)
