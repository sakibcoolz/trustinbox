# Task 7.5 — Cross-App E2E Tests

> **Phase**: 7 — Testing & Quality
> **Goal**: Write Playwright E2E tests that span BOTH the Provider Portal and Web App, verifying complete round-trip flows — provider sends → customer receives → customer acts → provider sees result.
> **Type**: Cross-application E2E test creation at the project root level.
> **Prerequisite**: Tasks 7.3 + 7.4 (individual app E2E tests), full stack running.

---

## Objective

Create a dedicated Playwright test project at the repository root level (`tests/e2e/`) that orchestrates interactions across both the Provider Portal (`:6060`) and Web App (`:3000`) in a single test scenario — verifying that actions in one app propagate correctly through the backend to the other app.

---

## Current State

### Tests Directory (`tests/`)

- **COMPLETELY EMPTY** — no e2e, integration, or load tests

### Infrastructure Required

Both apps + gateway + all 13 services must be running:
```
scripts/dev.sh starts:
  Docker infra → 13 Go services (50051-50063) → gateway (4000) → web-app (3000) → provider-ui (6060)
```

### Cross-App Challenges

| Challenge | Approach |
|-----------|----------|
| Two different auth systems | Provider: httpOnly cookies; Web App: localStorage tokens |
| Two different base URLs | Provider: `localhost:6060`; Web App: `localhost:3000` |
| Two different data fetching | Provider: REST via `server-fetch.ts`; Web App: Apollo Client GraphQL |
| Real-time propagation | Provider: SSE; Web App: SSE + XMPP |
| Timing | Actions in one app take time to propagate through backend to other app |

### Playwright Multi-App Pattern

```typescript
// Use separate browser contexts for each app
const providerContext = await browser.newContext({ baseURL: 'http://localhost:6060' });
const webAppContext = await browser.newContext({ baseURL: 'http://localhost:3000' });
const providerPage = await providerContext.newPage();
const webAppPage = await webAppContext.newPage();
```

---

## Requirements

### Sub-task 7.5.1 — Cross-App Playwright Setup

- [ ] Create directory: `tests/e2e/`
- [ ] Create `tests/e2e/playwright.config.ts`:
  ```typescript
  import { defineConfig } from '@playwright/test';

  export default defineConfig({
    testDir: '.',
    timeout: 60_000,  // longer timeout for cross-app flows
    retries: 1,
    use: {
      trace: 'on-first-retry',
      screenshot: 'only-on-failure',
      video: 'on-first-retry',
    },
    projects: [
      { name: 'chromium', use: { browserName: 'chromium' } },
    ],
  });
  ```
- [ ] Create `tests/e2e/package.json`:
  ```json
  {
    "name": "trustinbox-cross-app-e2e",
    "private": true,
    "devDependencies": {
      "@playwright/test": "^1.59.0"
    },
    "scripts": {
      "test": "playwright test",
      "test:ui": "playwright test --ui"
    }
  }
  ```
- [ ] Install: `cd tests/e2e && npm install && npx playwright install`

### Sub-task 7.5.2 — Shared Test Fixtures

- [ ] Create `tests/e2e/fixtures.ts`:
  - **Provider login fixture**:
    ```typescript
    async function loginAsProvider(page: Page) {
      await page.goto('http://localhost:6060/auth/login');
      await page.fill('[name="email"]', PROVIDER_EMAIL);
      await page.fill('[name="password"]', PROVIDER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('http://localhost:6060/');
    }
    ```
  - **Customer login fixture**:
    ```typescript
    async function loginAsCustomer(page: Page) {
      await page.goto('http://localhost:3000/auth/login');
      await page.fill('[name="email"]', CUSTOMER_EMAIL);
      await page.fill('[name="password"]', CUSTOMER_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL('http://localhost:3000/');
    }
    ```
  - **Wait for propagation helper**:
    ```typescript
    async function waitForPropagation(ms = 3000) {
      await new Promise(resolve => setTimeout(resolve, ms));
    }
    ```
  - **Test data constants**:
    - Provider email/password (AGENT or SP_ADMIN role)
    - Customer email/password (CUSTOMER role)
    - Known customer virtual ID
    - Test SP name

### Sub-task 7.5.3 — Notification Flow Cross-App Test

- [ ] Create `tests/e2e/notification-flow.spec.ts`:
  - **Setup**: Create provider page + customer page in separate browser contexts
  - **Step 1 — Provider sends notification**:
    - Login as provider on provider page
    - Navigate to `/notifications/compose`
    - Select the test customer as recipient
    - Fill: category "SERVICE_PROVIDER", title "Cross-App E2E Test", body "Testing notification delivery"
    - Click Send → verify success toast
  - **Step 2 — Customer receives notification**:
    - Login as customer on web app page
    - Navigate to `/inbox`
    - Wait for propagation (up to 10 seconds, poll or use `page.waitForSelector`)
    - Verify notification appears: title "Cross-App E2E Test", correct SP name
    - Verify unread indicator present
  - **Step 3 — Customer marks as read**:
    - Click the notification → verify detail opens
    - Verify unread indicator removed
  - **Step 4 — Provider sees delivery status**:
    - Switch to provider page
    - Navigate to `/notifications`
    - Find the sent notification
    - Verify status column shows "DELIVERED" (or "READ" after customer opened it)
  - **Timeout strategy**: Use polling with `page.waitForSelector` or `expect(locator).toBeVisible({ timeout: 10000 })`

### Sub-task 7.5.4 — Callback Flow Cross-App Test

- [ ] Create `tests/e2e/callback-flow.spec.ts`:
  - **Setup**: Provider page + customer page
  - **Step 1 — Provider requests callback**:
    - Login as provider
    - Navigate to `/callbacks/new`
    - Select customer, enter reason "Discuss account details", select priority
    - Submit → verify success
  - **Step 2 — Customer sees pending callback**:
    - Login as customer on web app
    - Navigate to `/callbacks`
    - Wait for propagation
    - Verify callback appears with status "Pending"
    - Verify SP name and reason displayed
  - **Step 3 — Customer approves with time slot**:
    - Click "Approve" on the callback
    - Select an availability slot (date + time)
    - Confirm → verify status changes to "Approved"
  - **Step 4 — Provider sees approval**:
    - Switch to provider page
    - Navigate to `/callbacks`
    - Wait for propagation
    - Find the callback → verify status "Approved"
    - Verify scheduled time matches customer's slot selection
  - **Step 5 — Reject flow (separate test)**:
    - Provider creates another callback
    - Customer rejects with reason "Not available this week"
    - Provider sees "Rejected" status with reason displayed

### Sub-task 7.5.5 — Block Flow Cross-App Test

- [ ] Create `tests/e2e/block-flow.spec.ts`:
  - **Setup**: Provider page + customer page
  - **Step 1 — Customer blocks SP**:
    - Login as customer on web app
    - Navigate to `/service-providers` or `/settings/blocked`
    - Block the test SP → verify confirmation dialog → confirm
    - Verify SP appears in blocked list
  - **Step 2 — Provider attempts notification to blocked customer**:
    - Login as provider
    - Navigate to `/notifications/compose`
    - Select the customer who blocked
    - Fill notification details
    - Submit → verify rejection message: "User has blocked your organization" (or policy denial)
  - **Step 3 — Provider attempts callback to blocked customer**:
    - Navigate to `/callbacks/new`
    - Select same blocked customer
    - Submit → verify rejection
  - **Step 4 — Customer unblocks**:
    - Switch to customer page
    - Navigate to `/settings/blocked`
    - Click "Unblock" on the SP → confirm
  - **Step 5 — Provider can now send**:
    - Switch to provider page
    - Retry notification send → verify success
    - Customer receives notification in inbox

### Sub-task 7.5.6 — DND Enforcement Cross-App Test

- [ ] Create `tests/e2e/dnd-flow.spec.ts`:
  - **Step 1 — Customer sets DND (covers current time)**:
    - Login as customer
    - Navigate to `/settings/dnd`
    - Create GLOBAL rule covering current time window
    - Verify rule saved
  - **Step 2 — Provider sends during DND**:
    - Login as provider
    - Send notification to DND-protected customer
    - Verify policy denial or deferral message
  - **Step 3 — Customer removes DND rule**:
    - Switch to customer page
    - Delete the DND rule
    - Verify removed
  - **Step 4 — Provider sends again**:
    - Switch to provider page
    - Resend notification → verify success
    - Customer receives notification

### Sub-task 7.5.7 — Document Sharing Cross-App Test

- [ ] Create `tests/e2e/document-flow.spec.ts`:
  - **Step 1 — Provider uploads and shares document**:
    - Login as provider
    - Navigate to `/documents`
    - Upload a test file (small text or image)
    - Click "Share" → select customer → confirm
  - **Step 2 — Customer sees shared document**:
    - Login as customer
    - Navigate to `/documents`
    - Wait for propagation
    - Verify document appears with correct name, SP name, shared date
  - **Step 3 — Customer downloads**:
    - Click download on the document
    - Verify download initiated (intercept network request for presigned URL)

### Sub-task 7.5.8 — Run and Validate Cross-App Suite

- [ ] Run: `cd tests/e2e && npx playwright test`
  - Prerequisite: full stack running via `./scripts/dev.sh`
- [ ] Verify all cross-app tests pass:
  - notification-flow: provider send → customer receive → mark read → provider sees status
  - callback-flow: provider request → customer approve → provider sees approval
  - block-flow: customer block → provider denied → customer unblock → provider succeeds
  - dnd-flow: customer DND → provider denied → remove DND → provider succeeds
  - document-flow: provider share → customer sees → customer downloads
- [ ] Verify timeouts are appropriate (propagation delays handled)
- [ ] Add to Makefile:
  ```makefile
  test-e2e:
  	cd tests/e2e && npx playwright test
  ```

---

## Verification Checklist

- [ ] `tests/e2e/playwright.config.ts` created with 60s timeout and chromium project
- [ ] `tests/e2e/fixtures.ts` provides login helpers for both apps + propagation wait
- [ ] `notification-flow.spec.ts`: provider send → customer receive → mark read → provider status
- [ ] `callback-flow.spec.ts`: provider request → customer approve/reject → provider sees result
- [ ] `block-flow.spec.ts`: customer block → provider denied → unblock → provider succeeds
- [ ] `dnd-flow.spec.ts`: DND set → provider denied → DND removed → provider succeeds
- [ ] `document-flow.spec.ts`: provider share → customer sees → downloads
- [ ] All tests use separate browser contexts for each app
- [ ] Propagation delays handled with polling/waitFor (not hard sleep)
- [ ] Tests are idempotent — can run repeatedly without manual cleanup
- [ ] Full suite passes with `./scripts/dev.sh` running
