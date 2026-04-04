# Task 7.3 — Provider Portal Playwright E2E

> **Phase**: 7 — Testing & Quality
> **Goal**: Write Playwright end-to-end tests covering all critical Provider Portal flows — authentication, notification compose/send, callback management, team management, and settings configuration — running against the full stack.
> **Type**: E2E test creation using Playwright.
> **Infrastructure**: Playwright config exists at `apps/provider/playwright.config.ts`, E2E directory at `apps/provider/e2e/`.

---

## Objective

Create comprehensive Playwright E2E test specs for every critical Provider Portal workflow, running against the real application with full backend stack. Tests should cover the complete user journey from login through domain-specific operations, verifying real data persistence, navigation, form interactions, and real-time updates.

---

## Current State

### Existing Playwright Setup (`apps/provider/`)

**Config** (`playwright.config.ts`):
- testDir: `./e2e`
- Browsers: Chrome, Firefox, WebKit, Mobile Chrome, Mobile Safari, Tablet
- Trace & screenshot on failure, video on failure
- baseURL: `http://localhost:6060`
- webServer config with `reuseExistingServer`
- Timeout: 30s

**Existing E2E Tests** (`apps/provider/e2e/`):
```
critical-paths.spec.ts  — auth login, notification send, callback flows
mobile-viewport.spec.ts — responsive design across mobile/tablet viewports
```

**Package Scripts**:
```json
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

### Provider Portal Pages to Cover

| Page | Route | Key Actions |
|------|-------|-------------|
| Login | `/auth/login` | Email/password, SP picker, remember me |
| Dashboard | `/` | Stats cards, live widgets, navigation |
| Notifications | `/notifications` | List, filter, detail, delivery status |
| Compose | `/notifications/compose` | Form, policy preview, draft save, send |
| Callbacks | `/callbacks` | List, filter, status badges, detail |
| Campaigns | `/campaigns` | List, wizard, launch, progress |
| Conversations | `/conversations` | List, message thread, send, file attach |
| Bots | `/bots` | List, wizard, deploy, test |
| Documents | `/documents` | Upload, share, list, preview |
| Customers | `/customers` | Directory, detail, communication history |
| Settings: Profile | `/settings/profile` | Org name, logo, contact info |
| Settings: Team | `/settings/team` | Invite, role change, remove |
| Settings: Industry | `/settings/industry` | Template selection, apply |
| Settings: Webhooks | `/settings/webhooks` | Create, events, secret, test |
| Analytics | `/analytics` | Charts, date range, breakdowns |

---

## Requirements

### Sub-task 7.3.1 — Auth E2E Tests

- [ ] Create `apps/provider/e2e/auth.spec.ts`:
  - **Login success**:
    - Navigate to `/auth/login`
    - Fill email and password fields
    - Click "Sign In"
    - Verify redirect to dashboard (`/`)
    - Verify dashboard loads with correct SP name in header
    - Verify sidebar navigation visible with all menu items
  - **Login validation**:
    - Submit empty form → verify error messages
    - Submit invalid email → verify format error
    - Submit wrong credentials → verify "Invalid credentials" error
  - **SP context switching**:
    - Login with user who has multiple SPs
    - Verify SP picker appears
    - Select different SP → verify dashboard refreshes with new SP context
    - Verify header shows selected SP name
  - **Logout**:
    - Click user avatar → click "Logout"
    - Verify redirect to `/auth/login`
    - Verify protected routes inaccessible (redirect back to login)
  - **Session persistence**:
    - Login → navigate away → return → verify still authenticated
    - Verify httpOnly cookies set (check via API response, not JS access)

### Sub-task 7.3.2 — Notification Flow E2E Tests

- [ ] Create `apps/provider/e2e/notifications.spec.ts`:
  - **Compose and send notification**:
    - Navigate to `/notifications/compose`
    - Select customer from recipient picker (search + select)
    - Select category: "SERVICE_PROVIDER"
    - Enter title: "E2E Test Notification"
    - Enter body: "This is an automated E2E test notification"
    - Select priority: "NORMAL"
    - Verify policy preview shows ALLOW (green checkmark)
    - Click "Send Notification"
    - Verify success toast appears
    - Verify redirect to notifications list
  - **Notification list**:
    - Navigate to `/notifications`
    - Verify the sent notification appears in list
    - Verify columns: recipient, title, category, status, delivery time
    - Click notification → verify detail panel opens with full information
  - **Filter and search**:
    - Filter by status: DELIVERED → verify list filters
    - Filter by category: SERVICE_PROVIDER → verify
    - Search by title → verify matching results
  - **Draft auto-save**:
    - Start composing → fill partial fields → navigate away
    - Return to compose page → verify draft restored
  - **Policy denial scenario**:
    - Select a customer who has blocked this SP (or set up DND)
    - Verify policy preview shows DENIED with reason
    - Attempt send → verify rejection message displayed

### Sub-task 7.3.3 — Callback Flow E2E Tests

- [ ] Create `apps/provider/e2e/callbacks.spec.ts`:
  - **View callback list**:
    - Navigate to `/callbacks`
    - Verify data table renders with columns: customer, reason, priority, status, created
    - Verify status badges: PENDING (yellow), APPROVED (green), REJECTED (red)
  - **Filter by status**:
    - Click "Pending" chip → verify only PENDING callbacks shown
    - Click "Approved" chip → verify only APPROVED
    - Clear filters → verify all shown
  - **Callback detail**:
    - Click a callback row → verify detail expansion or navigation
    - Verify detail shows: customer info, full reason, timeline, available actions
  - **Create callback request** (if available):
    - Navigate to `/callbacks/new`
    - Select customer, enter reason, select priority
    - Submit → verify success + appears in list
  - **Pagination and sorting**:
    - If more than one page → click page 2 → verify data changes
    - Click column header → verify sort order changes

### Sub-task 7.3.4 — Team Management E2E Tests

- [ ] Create `apps/provider/e2e/team.spec.ts`:
  - **View team members**:
    - Navigate to `/settings/team`
    - Verify team member list: name, email, role badge, joined date, status
  - **Invite member**:
    - Click "Invite Member"
    - Fill email: "newmember@test.com"
    - Select role: "AGENT"
    - Click "Send Invitation"
    - Verify success toast
    - Verify pending invitation appears in list with "Invited" status badge
  - **Change member role**:
    - Find existing member → click role dropdown
    - Change from AGENT to ANALYST
    - Confirm → verify role badge updates
  - **Revoke invitation**:
    - Find pending invitation → click "Revoke"
    - Confirm dialog → verify removed from list
  - **Remove member**:
    - Find active member → click "Remove"
    - Confirm dialog (with warning text)
    - Verify member removed from list

### Sub-task 7.3.5 — Settings E2E Tests

- [ ] Create `apps/provider/e2e/settings.spec.ts`:
  - **Profile settings**:
    - Navigate to `/settings/profile`
    - Verify current org name, description, contact info rendered
    - Update organization name → click Save
    - Verify success toast
    - Refresh page → verify saved value persists
    - Verify verification status badge is read-only (not editable)
  - **Industry settings**:
    - Navigate to `/settings/industry`
    - Verify current industry profile displayed
    - Browse available templates → select one
    - Click "Apply Template" → confirm warning dialog
    - Verify defaults applied (reason codes, notification settings updated)
  - **Webhook settings** (if implemented):
    - Navigate to `/settings/webhooks`
    - Create webhook: URL, select events, save
    - Verify webhook appears in list
    - Test webhook → verify test delivery

### Sub-task 7.3.6 — Campaign Flow E2E Tests

- [ ] Create `apps/provider/e2e/campaigns.spec.ts`:
  - **Create campaign via wizard**:
    - Navigate to `/campaigns/new`
    - Step 1 (Basics): enter name, description → Next
    - Step 2 (Audience): select target type, add targets → Next
    - Step 3 (Content): select category, enter subject/body → Next
    - Step 4 (Schedule): select "Send Now" → Next
    - Step 5 (Review): verify summary → Launch
    - Verify redirect to campaign detail page
  - **Campaign detail page**:
    - Verify progress bar shows real-time update
    - Verify analytics cards: sent, delivered, failed, rejected
    - Verify recipients tab shows per-target status
  - **Campaign list**:
    - Navigate to `/campaigns`
    - Verify campaign appears with correct status and target count

### Sub-task 7.3.7 — Conversation and Bot E2E Tests

- [ ] Create `apps/provider/e2e/conversations.spec.ts`:
  - Navigate to `/conversations`
  - Verify conversation list renders
  - Click a conversation → verify message thread loads
  - Type message in input → click send
  - Verify message appears in thread with timestamp

- [ ] Create `apps/provider/e2e/bots.spec.ts`:
  - Navigate to `/bots`
  - Verify bot list renders (if bots exist)
  - Click "New Bot" → verify wizard loads
  - Fill step 1 (name, purpose) → navigate through steps
  - Verify review step shows all configured values

### Sub-task 7.3.8 — Analytics and Navigation E2E

- [ ] Create `apps/provider/e2e/analytics.spec.ts`:
  - Navigate to `/analytics`
  - Verify stats cards render with numeric values
  - Change date range → verify data refreshes
  - Verify charts render (SVG elements or canvas present)

- [ ] Create `apps/provider/e2e/navigation.spec.ts`:
  - Verify all sidebar links navigate to correct pages
  - Verify breadcrumbs update correctly
  - Verify back button navigation works
  - Verify 404 page for invalid routes
  - Verify deep linking: navigate directly to `/notifications/compose` → works after auth

### Sub-task 7.3.9 — Run and Validate E2E Suite

- [ ] Run: `cd apps/provider && npm run test:e2e`
  - Prerequisite: full stack running (`./scripts/dev.sh`)
  - All tests pass on Chrome
- [ ] Run cross-browser:
  - `npx playwright test --project=firefox` — all pass
  - `npx playwright test --project=webkit` — all pass
- [ ] Run mobile viewports:
  - `npx playwright test --project=mobile-chrome` — all pass
- [ ] Verify trace artifacts generated on failure
- [ ] Verify screenshots captured for failed tests

---

## Verification Checklist

- [ ] `auth.spec.ts`: login, validation, SP switching, logout, session persistence
- [ ] `notifications.spec.ts`: compose, send, list, filter, detail, draft auto-save, policy denial
- [ ] `callbacks.spec.ts`: list, filter, detail, pagination
- [ ] `team.spec.ts`: view, invite, role change, revoke, remove
- [ ] `settings.spec.ts`: profile save, industry template, webhook config
- [ ] `campaigns.spec.ts`: wizard, launch, detail with progress, list
- [ ] `conversations.spec.ts`: list, thread, send message
- [ ] `bots.spec.ts`: list, wizard navigation
- [ ] `analytics.spec.ts`: cards, date range, charts
- [ ] `navigation.spec.ts`: sidebar links, breadcrumbs, deep linking, 404
- [ ] All tests pass on Chrome, Firefox, WebKit
- [ ] Mobile viewport tests pass
- [ ] Trace/screenshot artifacts generated on failure
