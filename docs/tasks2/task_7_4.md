# Task 7.4 — Web App Playwright E2E

> **Phase**: 7 — Testing & Quality
> **Goal**: Set up Playwright in the Web App and write end-to-end tests covering all critical customer flows — authentication, inbox, callbacks, settings (privacy, DND, availability, blocked providers), service provider directory, documents, conversations, and profile.
> **Type**: E2E infrastructure setup + test creation.
> **Prerequisite**: Web App pages wired to real data (Phases 2-4).

---

## Objective

Bootstrap Playwright in the Web App (config, scripts, directory), then create E2E test specs for every critical customer journey, running against the full application stack — verifying that real data flows from UI actions through the gateway to backend services and back.

---

## Current State

### Web App (`apps/web/`) — NO E2E INFRASTRUCTURE

- **No `playwright.config.ts`**
- **No `e2e/` directory**
- **No `@playwright/test` dependency** in `package.json`
- **No E2E scripts** in `package.json`

### Web App Auth Pattern

- **localStorage-based**: tokens stored in `localStorage` (not httpOnly cookies)
- Auth hook: `useAuth()` from `src/lib/auth-context.tsx`
- Login endpoint: `/api/auth/login` → returns `{ accessToken, refreshToken, user, xmppToken, xmppJid }`
- Auth pages: `/auth/login`, `/auth/register`

### Web App Key Routes

```
/                          — Dashboard (stats, recent notifications, pending callbacks)
/inbox                     — Notifications inbox with category tabs
/callbacks                 — Callback requests (approve/reject)
/conversations             — XMPP conversations list + detail
/documents                 — Shared documents
/service-providers         — SP directory (search, block)
/service-providers/[id]    — SP detail
/friends                   — Friends list + requests
/profile                   — User profile + avatar
/settings/privacy          — Privacy preference toggles
/settings/dnd              — DND rules
/settings/availability     — Availability slots
/settings/blocked          — Blocked providers
/activity                  — Activity feed
/auth/login                — Login
/auth/register             — Registration
```

### Provider Portal Playwright Config (Reference)

```typescript
// apps/provider/playwright.config.ts
- testDir: ./e2e
- browsers: chrome, firefox, webkit, mobile-chrome, mobile-safari, tablet
- trace & screenshot on failure, video on failure
- baseURL: http://localhost:6060
- webServer: npm run dev, reuseExistingServer: true
- timeout: 30s
```

---

## Requirements

### Sub-task 7.4.1 — Playwright Setup

- [ ] Install Playwright:
  ```bash
  cd apps/web && npx playwright install
  ```
- [ ] Add `@playwright/test` to `apps/web/package.json` devDependencies
- [ ] Add E2E scripts to `package.json`:
  ```json
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui"
  ```
- [ ] Create `apps/web/playwright.config.ts`:
  - testDir: `./e2e`
  - baseURL: `http://localhost:3000`
  - Projects: chrome, firefox, webkit, mobile-chrome, mobile-safari
  - Trace on failure, screenshot on failure
  - Video on first-retry
  - timeout: 30s
  - webServer: `npm run dev` with port 3000, reuseExistingServer: true
- [ ] Create `apps/web/e2e/` directory
- [ ] Create `apps/web/e2e/helpers.ts` — shared test utilities:
  - `loginAsCustomer(page)` — navigates to login, fills credentials, submits, waits for dashboard
  - `setupAuth(page, token)` — sets localStorage token directly (for faster test setup)
  - `waitForGraphQL(page, operationName)` — intercepts and waits for specific GraphQL operations
  - Test user credentials constant

### Sub-task 7.4.2 — Auth E2E Tests

- [ ] Create `apps/web/e2e/auth.spec.ts`:
  - **Register new account**:
    - Navigate to `/auth/register`
    - Fill: first name, last name, email, password, confirm password
    - Submit → verify redirect to dashboard
    - Verify token in localStorage
  - **Login success**:
    - Navigate to `/auth/login`
    - Fill email + password
    - Click "Sign In"
    - Verify redirect to `/` (dashboard)
    - Verify user name in header/sidebar
    - Verify localStorage has `accessToken` and `refreshToken`
  - **Login validation**:
    - Submit empty form → verify errors
    - Submit invalid email → verify format error
    - Submit wrong password → verify error message
  - **Logout**:
    - Logged in → click logout
    - Verify redirect to `/auth/login`
    - Verify localStorage cleared (no tokens)
    - Navigate to `/` → verify redirect to login (protected route)
  - **Protected routes**:
    - Without login → navigate to `/inbox` → verify redirect to `/auth/login`
    - Without login → navigate to `/settings/privacy` → verify redirect

### Sub-task 7.4.3 — Inbox E2E Tests

- [ ] Create `apps/web/e2e/inbox.spec.ts`:
  - **View notifications**:
    - Login → navigate to `/inbox`
    - Verify notification list renders (at least 1 notification)
    - Verify each notification shows: title, SP name, timestamp, unread indicator
  - **Category tabs**:
    - Click "Personal" tab → verify list updates
    - Click "Service Provider" tab → verify
    - Click "All" tab → verify all shown
  - **Mark as read**:
    - Click unread notification → verify unread indicator removed
    - Verify unread count in sidebar decrements
  - **Archive notification**:
    - Find notification → click archive action
    - Verify notification removed from active list
  - **Notification detail**:
    - Click notification → verify detail view opens
    - Verify full body, category, SP info, timestamp shown
  - **Real-time SSE** (if testable):
    - With inbox open → trigger notification from another process
    - Verify new notification appears at top of list without refresh

### Sub-task 7.4.4 — Callbacks E2E Tests

- [ ] Create `apps/web/e2e/callbacks.spec.ts`:
  - **View pending callbacks**:
    - Login → navigate to `/callbacks`
    - Verify callback list with status badges
    - Verify "Pending" tab shows only PENDING callbacks
  - **Approve with time slot**:
    - Find PENDING callback → click "Approve"
    - Verify slot picker appears
    - Select date + time
    - Confirm → verify status changes to "Approved"
    - Verify success toast
  - **Reject with reason**:
    - Find another PENDING callback → click "Reject"
    - Enter reason text
    - Confirm → verify status changes to "Rejected"
  - **Callback detail**:
    - Click callback → verify detail shows:
      - SP name, reason, priority, timeline, approved time slot (if approved)
  - **Status change verification**:
    - After approve → refresh page → verify status persists as APPROVED

### Sub-task 7.4.5 — Settings E2E Tests

- [ ] Create `apps/web/e2e/settings.spec.ts`:
  - **Privacy preferences**:
    - Navigate to `/settings/privacy`
    - Verify all 7 toggles rendered with current state
    - Toggle `allowAdvertisements` off → wait for save
    - Refresh page → verify toggle is still off (persisted)
    - Toggle back on → verify save
  - **DND rules**:
    - Navigate to `/settings/dnd`
    - Click "Add Rule"
    - Fill: scope GLOBAL, start 22:00, end 07:00, select Mon-Fri
    - Save → verify rule appears in list
    - Delete the rule → confirm → verify removed from list
  - **Availability slots**:
    - Navigate to `/settings/availability`
    - Click on calendar to add slot
    - Fill: type "Callback", time range
    - Save → verify slot appears on calendar
    - Click slot → delete → verify removed
  - **Blocked providers**:
    - Navigate to `/settings/blocked`
    - If blocked SPs exist: verify list renders
    - Click "Unblock" → confirm dialog → verify removed from list
    - Navigate to SP directory → block an SP → navigate back → verify in blocked list

### Sub-task 7.4.6 — Service Providers E2E Tests

- [ ] Create `apps/web/e2e/service-providers.spec.ts`:
  - **Browse directory**:
    - Login → navigate to `/service-providers`
    - Verify SP list renders with names, verification badges, trust scores
  - **Search**:
    - Type SP name in search → verify list filters
    - Clear search → verify all SPs shown
  - **View SP detail**:
    - Click an SP → navigate to `/service-providers/[id]`
    - Verify detail page: name, description, verification status, trust score
    - Verify communication history section
  - **Block SP**:
    - Click "Block" → verify confirmation dialog with warning
    - Confirm → verify toast: "Provider blocked"
    - Verify SP removed from active list (or shows blocked status)
  - **Unblock SP**:
    - Navigate to `/settings/blocked`
    - Find blocked SP → click "Unblock"
    - Confirm → verify removed from blocked list

### Sub-task 7.4.7 — Documents and Conversations E2E Tests

- [ ] Create `apps/web/e2e/documents.spec.ts`:
  - Navigate to `/documents`
  - Verify document list with filename, type icon, SP name, date
  - Click download → verify file download initiates (intercept request)
  - Filter by SP → verify list updates
  - Preview image document → verify inline preview appears

- [ ] Create `apps/web/e2e/conversations.spec.ts`:
  - Navigate to `/conversations`
  - Verify conversation list renders
  - Click a conversation → verify messages load
  - Type message → send → verify message appears in thread
  - Verify sender name, timestamp, read receipt on messages

### Sub-task 7.4.8 — Dashboard and Profile E2E Tests

- [ ] Create `apps/web/e2e/dashboard.spec.ts`:
  - Login → verify dashboard loads as landing page
  - Verify 4 stats cards render with numeric values
  - Verify recent notifications widget shows items
  - Click notification in widget → verify navigation to inbox
  - Verify pending callbacks widget
  - Click callback → verify navigation to callbacks page

- [ ] Create `apps/web/e2e/profile.spec.ts`:
  - Navigate to `/profile`
  - Verify current profile data renders
  - Update first name → Save
  - Refresh → verify new name persists
  - Upload avatar (test with small image file)
  - Verify avatar updates across app (header, sidebar)

### Sub-task 7.4.9 — Run and Validate Web App E2E Suite

- [ ] Run: `cd apps/web && npm run test:e2e`
  - Prerequisite: full stack running (`./scripts/dev.sh`)
  - All tests pass on Chrome
- [ ] Run cross-browser:
  - `npx playwright test --project=firefox` — all pass
  - `npx playwright test --project=webkit` — all pass
- [ ] Run mobile viewport:
  - `npx playwright test --project=mobile-chrome` — all pass
- [ ] Verify test artifacts:
  - Trace files generated for failed tests
  - Screenshots captured on failure
- [ ] Add to Makefile:
  ```makefile
  test-web-e2e:
  	cd apps/web && npx playwright test
  ```

---

## Verification Checklist

- [ ] `playwright.config.ts` created with correct baseURL (:3000), browsers, trace settings
- [ ] `e2e/helpers.ts` provides login utility and GraphQL interceptors
- [ ] `auth.spec.ts`: register, login, validation, logout, protected routes, localStorage tokens
- [ ] `inbox.spec.ts`: view, tabs, mark-as-read, archive, detail
- [ ] `callbacks.spec.ts`: view, approve w/ slot, reject w/ reason, detail, persistence
- [ ] `settings.spec.ts`: privacy toggles, DND create/delete, availability slots, blocked providers
- [ ] `service-providers.spec.ts`: browse, search, detail view, block, unblock
- [ ] `documents.spec.ts`: list, download, filter, preview
- [ ] `conversations.spec.ts`: list, thread, send message
- [ ] `dashboard.spec.ts`: stats cards, widgets, navigation
- [ ] `profile.spec.ts`: edit, save, avatar upload
- [ ] All tests pass on Chrome, Firefox, WebKit
- [ ] Mobile viewport tests pass
