# Task 7.2 — Web App Component Tests

> **Phase**: 7 — Testing & Quality
> **Goal**: Write component tests for all key Web App pages, verifying rendering, user interactions, Apollo query/mutation integration, loading/error states, and accessibility of the customer-facing UI.
> **Type**: Component test creation using Vitest + Testing Library + MockedProvider.
> **Prerequisite**: Task 7.1 (test infrastructure must be in place).

---

## Objective

Create component-level tests for every major Web App page — wrapping components in `MockedProvider` from Apollo Client, rendering with `@testing-library/react`, asserting correct UI elements, simulating user interactions (clicks, form fills, toggles), and verifying that the correct GraphQL mutations are fired with proper variables.

---

## Current State

### Provider Portal Component Tests (Reference — `apps/provider/src/__tests__/components/`)

```
Badge.test.tsx       — renders variants, color props, custom className
Card.test.tsx        — renders children, variant prop, click handler
DashboardSummary.test.tsx — renders stats cards, loading skeleton, error state
Modal.test.tsx       — open/close, focus trap, overlay click dismiss
Tabs.test.tsx        — tab switching, active indicator, disabled tab
```

**Pattern used**:
```tsx
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithProviders } from '../helpers';

describe('ComponentName', () => {
  it('renders correctly with default props', () => {
    renderWithProviders(<Component />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });

  it('handles user interaction', async () => {
    const onAction = vi.fn();
    renderWithProviders(<Component onAction={onAction} />);
    await userEvent.click(screen.getByRole('button', { name: /action/i }));
    expect(onAction).toHaveBeenCalled();
  });
});
```

### Web App Pages to Test

| Page | File | Key Interactions |
|------|------|-----------------|
| Inbox | `(dashboard)/inbox/page.tsx` | Category tabs, notification list, mark-as-read, archive, SSE updates |
| Callbacks | `(dashboard)/callbacks/page.tsx` | Status tabs, approve w/ slot picker, reject w/ reason |
| Privacy Settings | `(dashboard)/settings/privacy/page.tsx` | 7 toggle switches, debounced save, optimistic update |
| DND Settings | `(dashboard)/settings/dnd/page.tsx` | Rule list, add rule form, delete rule, day picker |
| Blocked Providers | `(dashboard)/settings/blocked/page.tsx` | Blocked list, unblock button, confirmation dialog |
| Documents | `(dashboard)/documents/page.tsx` | Document list, download, preview, filter by SP |
| Service Providers | `(dashboard)/service-providers/page.tsx` | Directory, search, block/unblock, detail view |
| Dashboard | `(dashboard)/page.tsx` | Stats cards, recent notifications, pending callbacks, AI summary |
| Profile | `(dashboard)/profile/page.tsx` | Multi-tab form, avatar upload, save |
| Auth Login | `auth/login/page.tsx` | Email/password validation, submit, error display |

---

## Requirements

### Sub-task 7.2.1 — Inbox Page Tests

- [x] Create `apps/web/src/app/(dashboard)/inbox/__tests__/page.test.tsx`:
  - **Renders notification list**:
    - Mock `myNotifications` query returning 5 notifications
    - Wrap in `MockedProvider` + auth context
    - Assert each notification renders: title, body preview, SP name, time ago
    - Assert unread indicator on unread notifications
  - **Category tab switching**:
    - Click "Personal" tab → verify filter applied → only PERSONAL notifications shown
    - Click "Service Provider" tab → verify SERVICE_PROVIDER filter
    - Click "All" tab → verify no filter
  - **Mark as read**:
    - Click/expand unread notification
    - Verify `markNotificationRead` mutation fired with correct `{id}` variable
    - Verify notification visually updates (unread indicator removed)
  - **Archive notification**:
    - Click archive button on a notification
    - Verify `archiveNotification` mutation fired
    - Verify notification removed from list (optimistic)
  - **Loading state**:
    - Before query resolves → verify skeleton/spinner renders
  - **Error state**:
    - Mock query error → verify error message + retry button
  - **Empty state**:
    - Mock empty query result → verify "No notifications" message

### Sub-task 7.2.2 — Callbacks Page Tests

- [x] Create `apps/web/src/app/(dashboard)/callbacks/__tests__/page.test.tsx`:
  - **Renders callback list**:
    - Mock `myCallbackRequests` query returning mixed statuses
    - Assert each callback renders: SP name, reason, status badge, requested time
  - **Status tab filtering**:
    - Click "Pending" tab → only PENDING callbacks shown
    - Click "Approved" tab → only APPROVED callbacks
    - Click "All" tab → all callbacks
  - **Approve callback flow**:
    - Click "Approve" on PENDING callback
    - Verify slot picker opens/appears
    - Select date + time slot
    - Click confirm → verify `approveCallbackRequest` mutation fired with `{id, slotStart, slotEnd}`
    - Verify status badge changes to APPROVED (optimistic)
  - **Reject callback flow**:
    - Click "Reject" on PENDING callback
    - Enter reason in dialog
    - Confirm → verify `rejectCallbackRequest` mutation fired with `{id, reason}`
    - Verify status badge changes to REJECTED
  - **Callback detail expansion**:
    - Click callback → verify detail view shows: SP info, full reason, timeline, action buttons

### Sub-task 7.2.3 — Privacy Settings Page Tests

- [x] Create `apps/web/src/app/(dashboard)/settings/privacy/__tests__/page.test.tsx`:
  - **Renders current preferences**:
    - Mock `myPrivacyPreferences` query returning all 7 toggle states
    - Verify each toggle renders in correct on/off position:
      - allowPersonalNotifications ✓
      - allowSPNotifications ✓
      - allowAdvertisements ✗
      - allowCallbackRequests ✓
      - allowChat ✓
      - allowDocumentShares ✓
      - requireCallApproval ✓
  - **Toggle save with debounce**:
    - Toggle `allowAdvertisements` on
    - Verify mutation NOT fired immediately (debounce 500ms)
    - Wait 500ms → verify `updateMyPrivacyPreferences` mutation fired
    - Verify mutation variable includes updated field
  - **Optimistic update**:
    - Toggle switch → verify UI updates immediately
    - Mock mutation failure → verify toggle reverts
  - **Loading state**:
    - Before query → verify skeletons render for each toggle
  - **Save confirmation**:
    - After mutation completes → verify toast: "Privacy preferences updated"

### Sub-task 7.2.4 — DND Settings Page Tests

- [x] Create `apps/web/src/app/(dashboard)/settings/dnd/__tests__/page.test.tsx`:
  - **Renders existing rules**:
    - Mock `myDNDRules` query returning 2 rules
    - Verify each rule card: scope type, time range, active days, status toggle
  - **Create new rule**:
    - Click "Add Rule" → verify form appears
    - Fill scope: GLOBAL
    - Fill time: start 22:00, end 07:00
    - Select days: Monday-Friday checkboxes
    - Click Save → verify `createDNDRule` mutation fired with correct variables
    - Verify new rule appears in list
  - **Delete rule**:
    - Click delete icon on rule → verify confirmation dialog
    - Confirm → verify `deleteDNDRule` mutation fired with `{id}`
    - Verify rule removed from list (optimistic)
  - **Validation**:
    - Submit form with start === end time → verify error message
    - Submit empty form → verify required field errors
  - **Empty state**:
    - Mock empty rules → verify: "No DND rules configured. Add one to control when you can be contacted."

### Sub-task 7.2.5 — Block Confirm Dialog Tests

- [x] Create `apps/web/src/components/ui/__tests__/block-confirm-dialog.test.tsx`:
  - **Renders dialog**:
    - Pass SP name → verify warning text includes name
    - Verify consequence text: "You will no longer receive any communications from this provider"
  - **Confirm action**:
    - Click "Block" → verify `onConfirm` callback fired
  - **Cancel action**:
    - Click "Cancel" → verify `onCancel` callback fired
    - Click overlay → verify `onCancel` fired (dismiss)
  - **Keyboard interaction**:
    - Press Escape → verify dialog closes
  - **Accessibility**:
    - Verify dialog has `role="dialog"` or `role="alertdialog"`
    - Verify focus trapped within dialog
    - Verify ARIA labels present

### Sub-task 7.2.6 — Documents Page Tests

- [x] Create `apps/web/src/app/(dashboard)/documents/__tests__/page.test.tsx`:
  - **Renders document list**:
    - Mock `myDocuments` query returning documents
    - Assert each row: filename, type icon, size, SP name, shared date
  - **Download action**:
    - Click download → verify presigned URL fetched
    - Verify download initiated (window.open or anchor click)
  - **Preview action**:
    - Image document → verify inline preview rendered
    - PDF document → verify PDF viewer rendered
    - Unsupported type → verify fallback file icon
  - **Filter by SP**:
    - Select SP from dropdown → verify query refetched with SP filter
  - **Search**:
    - Type in search input → verify debounced query with search term
  - **Pagination**:
    - Mock total > page size → verify pagination controls
    - Click next page → verify query with offset

### Sub-task 7.2.7 — Dashboard Page Tests

- [x] Create `apps/web/src/app/(dashboard)/__tests__/page.test.tsx`:
  - **Renders stats cards**:
    - Mock dashboard summary query
    - Verify 4 cards: unread notifications, active conversations, unread chats, friends count
    - Verify numbers displayed correctly
  - **Recent notifications widget**:
    - Mock recent notifications data
    - Verify renders: title, SP name, time ago, unread indicator
    - Click notification → verify navigation to inbox
  - **Pending callbacks widget**:
    - Mock pending callbacks data
    - Verify renders: SP name, reason preview, requested time
    - Click callback → verify navigation to callbacks page
  - **AI summary widget**:
    - Mock AI summary data → verify rendered
    - Mock AI service unavailable → verify fallback (simple counts)
  - **Loading state**:
    - Before queries resolve → verify skeleton components render

### Sub-task 7.2.8 — Auth Login Page Tests

- [x] Create `apps/web/src/app/auth/login/__tests__/page.test.tsx`:
  - **Renders login form**:
    - Verify email input, password input, submit button present
    - Verify "Forgot password" link
    - Verify "Register" link
  - **Form validation**:
    - Submit empty form → verify validation errors ("Email is required", "Password is required")
    - Enter invalid email → verify "Invalid email format"
  - **Successful login**:
    - Fill valid email + password → submit
    - Mock auth context login → verify called with credentials
    - Verify redirect to dashboard
  - **Failed login**:
    - Mock login failure → verify error message displayed
    - Verify form not cleared (email preserved)
  - **Password visibility toggle**:
    - Click show/hide → verify input type toggles between "password" and "text"

### Sub-task 7.2.9 — Service Providers and Profile Page Tests

- [x] Create `apps/web/src/app/(dashboard)/service-providers/__tests__/page.test.tsx`:
  - Renders SP directory with names, verification badges, trust scores
  - Search: type in search → debounced query
  - Block: click block → confirmation dialog → mutation
  - Pagination: navigate pages

- [x] Create `apps/web/src/app/(dashboard)/profile/__tests__/page.test.tsx`:
  - Renders profile form with current data
  - Edit fields → save → verify mutation
  - Avatar upload: trigger file input → verify useAvatarUpload called
  - Tab switching: profile, security, etc.

### Sub-task 7.2.10 — Run Full Component Test Suite

- [x] Run: `cd apps/web && npm test`
  - All component tests pass
  - No console warnings about missing providers or unhandled mutations
- [x] Run: `cd apps/web && npm run test:coverage`
  - Page components: at least 70% line coverage
  - Shared components: at least 80% line coverage
- [x] Verify no snapshot test drift (if snapshots used)

---

## Verification Checklist

- [x] Inbox page test: renders, tabs, mark-as-read, archive, loading, error, empty states
- [x] Callbacks page test: renders, status tabs, approve w/ slots, reject w/ reason
- [x] Privacy settings test: renders toggles, debounced save, optimistic update, revert on error
- [x] DND settings test: renders rules, create, delete, validation, empty state
- [x] Block confirm dialog test: renders, confirm/cancel callbacks, keyboard, accessibility
- [x] Documents page test: renders, download, preview, filter, search, pagination
- [x] Dashboard test: stats cards, recent notifications, pending callbacks, AI summary
- [x] Auth login test: form validation, successful login, failed login, password toggle
- [x] Service providers test: directory, search, block flow
- [x] Profile test: form, save mutation, avatar upload
- [x] All tests pass with `npm test`
- [x] Coverage ≥70% on page components, ≥80% on shared components
