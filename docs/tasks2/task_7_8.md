# Task 7.8 — Accessibility Audit

> **Phase**: 7 — Testing & Quality
> **Goal**: Ensure both the Provider Portal and Web App meet WCAG 2.1 AA standards — automated axe-core audits, keyboard navigation verification, screen reader compatibility, color contrast compliance, focus management, and ARIA attributes.
> **Type**: Accessibility audit + remediation + automated regression testing.
> **Prerequisite**: Phases 1-5 complete (pages functional), Playwright E2E tests in place (Tasks 7.3, 7.4).

---

## Objective

Audit every interactive page in both the Provider Portal and Web App for WCAG 2.1 AA compliance using axe-core automated checks and manual keyboard/screen-reader testing, fix all violations found, and integrate accessibility assertions into the existing Playwright E2E tests to prevent regressions.

---

## Current State

### Provider Portal (`apps/provider/`)

- Dark theme UI with semantic Tailwind tokens
- Color system: `bg-bg-primary (#0b0d0f)`, `text-text-primary (#e4e7eb)`, etc.
- Components: custom-built (Card, Badge, Modal, Tabs, DataTable, etc.)
- Forms: notification compose, callback new, campaign wizard, bot wizard, settings forms
- Modals: confirmation dialogs, detail drawers, launch confirmation
- Real-time: SSE notifications, live dashboard updates

### Web App (`apps/web/`)

- Dark theme UI similar to provider
- Components: inbox, callback list, settings toggles, DND rules, availability calendar
- Auth: login/register forms
- Chat: XMPP conversation interface with message input

### Key Accessibility Risk Areas

| Area | Risk | WCAG Criterion |
|------|------|---------------|
| Dark theme contrast | Low contrast text on dark backgrounds | 1.4.3 Contrast (Minimum) |
| Form inputs | Missing labels, placeholder-only inputs | 1.3.1 Info and Relationships |
| Buttons | Icon-only buttons without accessible names | 4.1.2 Name, Role, Value |
| Modals | Focus not trapped, no escape key handler | 2.4.7 Focus Visible |
| Toasts | Not announced to screen readers | 4.1.3 Status Messages |
| Data tables | Missing column headers, row semantics | 1.3.1 Info and Relationships |
| Calendar | Complex interaction not keyboard accessible | 2.1.1 Keyboard |
| Tabs | Missing ARIA tablist/tab/tabpanel roles | 4.1.2 Name, Role, Value |
| Notification badges | Color-only info (unread indicator) | 1.4.1 Use of Color |
| Skip navigation | No skip link for keyboard users | 2.4.1 Bypass Blocks |

---

## Requirements

### Sub-task 7.8.1 — Install axe-core and Configure

- [x] Install `@axe-core/playwright` in both apps:
  ```bash
  cd apps/provider && npm install -D @axe-core/playwright
  cd apps/web && npm install -D @axe-core/playwright
  ```
- [x] Create `apps/provider/e2e/helpers/a11y.ts`:
  ```typescript
  import AxeBuilder from '@axe-core/playwright';
  import { Page, expect } from '@playwright/test';

  export async function checkA11y(page: Page, options?: { exclude?: string[] }) {
    const builder = new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa']);

    if (options?.exclude) {
      for (const selector of options.exclude) {
        builder.exclude(selector);
      }
    }

    const results = await builder.analyze();
    expect(results.violations).toEqual([]);
  }
  ```
- [x] Create identical helper in `apps/web/e2e/helpers/a11y.ts`
- [x] Create in `tests/e2e/helpers/a11y.ts` for cross-app tests

### Sub-task 7.8.2 — Provider Portal: Automated axe-core Audit

- [x] Create `apps/provider/e2e/accessibility.spec.ts`:
  - **Login page**:
    - Navigate to `/auth/login`
    - Run `checkA11y(page)`
    - Verify: form labels, button names, contrast
  - **Dashboard**:
    - Login → navigate to `/`
    - Run `checkA11y(page)`
    - Verify: stats cards, chart labels, navigation
  - **Notifications list**:
    - Navigate to `/notifications`
    - Run `checkA11y(page)`
    - Verify: data table headers, action buttons, filter controls
  - **Notification compose**:
    - Navigate to `/notifications/compose`
    - Run `checkA11y(page)`
    - Verify: all form fields have labels, select inputs accessible
  - **Callbacks page**:
    - Navigate to `/callbacks`
    - Run `checkA11y(page)`
  - **Campaign wizard**:
    - Navigate to `/campaigns/new`
    - Run `checkA11y(page)` at each wizard step
    - Step through all 5 steps → audit each
  - **Bot wizard**:
    - Navigate to `/bots/new`
    - Run `checkA11y(page)` at each step
  - **Settings pages** (profile, team, industry, webhooks):
    - Navigate to each → `checkA11y(page)`
  - **Analytics**:
    - Navigate to `/analytics`
    - Run `checkA11y(page)`
    - Note: chart SVGs may need `role="img"` + `aria-label`
  - **Conversations**:
    - Navigate to `/conversations`
    - Run `checkA11y(page)`
  - **Documents**:
    - Navigate to `/documents`
    - Run `checkA11y(page)`

### Sub-task 7.8.3 — Web App: Automated axe-core Audit

- [x] Create `apps/web/e2e/accessibility.spec.ts`:
  - **Login page**: navigate → `checkA11y(page)`
  - **Register page**: navigate → `checkA11y(page)`
  - **Dashboard**: login → `checkA11y(page)`
  - **Inbox**: navigate → `checkA11y(page)`
  - **Callbacks**: navigate → `checkA11y(page)`
  - **Conversations**: navigate → `checkA11y(page)`
  - **Documents**: navigate → `checkA11y(page)`
  - **Service providers**: navigate → `checkA11y(page)`
  - **Profile**: navigate → `checkA11y(page)`
  - **Settings: Privacy**: navigate → `checkA11y(page)`
  - **Settings: DND**: navigate → `checkA11y(page)`
  - **Settings: Availability**: navigate → `checkA11y(page)`
  - **Settings: Blocked**: navigate → `checkA11y(page)`
  - **Friends**: navigate → `checkA11y(page)`

### Sub-task 7.8.4 — Fix: Form Input Labels

- [x] Audit all `<input>`, `<select>`, `<textarea>` elements across both apps:
  - Every input must have an associated `<label>` (via `htmlFor`/`id` or wrapping)
  - Placeholder text is NOT sufficient as a label
  - Search inputs: add `aria-label="Search"` if no visible label
  - File inputs: add accessible label describing expected file type
- [x] Fix violations found:
  - Provider notifications compose form
  - Provider callback new form
  - Provider campaign wizard fields
  - Provider bot wizard fields
  - Web app login/register forms
  - Web app DND rule form (time inputs)
  - Web app search inputs

### Sub-task 7.8.5 — Fix: Button Accessible Names

- [x] Audit all `<button>` and clickable elements:
  - Icon-only buttons must have `aria-label`:
    - Close buttons: `aria-label="Close"`
    - Delete buttons: `aria-label="Delete [item]"`
    - Filter buttons: `aria-label="Filter by [criterion]"`
    - Sort buttons: `aria-label="Sort by [column]"`
    - Menu toggle: `aria-label="Open menu"` / `"Close menu"`
  - Buttons with just icons (SVG): add `aria-hidden="true"` to icon + `aria-label` on button
- [x] Fix violations in:
  - Provider sidebar collapse button
  - Provider data table action buttons (edit, delete, view)
  - Provider notification action buttons
  - Web app notification archive/dismiss buttons
  - Web app settings toggle buttons
  - Both apps: header user menu button

### Sub-task 7.8.6 — Fix: Color Contrast

- [x] Verify contrast ratios meet WCAG AA (4.5:1 normal text, 3:1 large text):
  - `text-text-primary (#e4e7eb)` on `bg-bg-primary (#0b0d0f)` → verify ≥4.5:1
  - `text-text-secondary (#8b929a)` on `bg-bg-card (#151820)` → verify ≥4.5:1
  - `text-text-muted (#545b65)` on `bg-bg-primary (#0b0d0f)` → **LIKELY FAILS** — check and fix
  - Status colors on dark backgrounds: `status-success`, `status-warning`, `status-error`
  - Badge text on badge backgrounds: `bg-status-success/10 text-status-success`
  - Link colors: accent-blue on dark backgrounds
- [x] Fix any failing contrast:
  - Increase `text-text-muted` luminosity if needed
  - Ensure status badges have sufficient contrast
  - Update `tailwind.config.js` color tokens if necessary

### Sub-task 7.8.7 — Fix: Focus Management

- [x] **Keyboard navigation**:
  - Verify ALL interactive elements reachable via Tab key
  - Verify logical tab order (left-to-right, top-to-bottom)
  - Verify focus visible (`:focus-visible` outline) on all focusable elements
  - Sidebar navigation: Tab through all items, Enter/Space to activate
  - Data tables: Tab to rows, Enter to expand details
- [x] **Modal focus management**:
  - Modal open → focus moves to first focusable element inside modal
  - Tab cycles within modal (focus trap)
  - Escape key closes modal
  - Modal close → focus returns to the trigger element
  - Apply to: confirmation dialogs, detail drawers, compose modals, wizard modals
- [x] **Toast announcements**:
  - Add `aria-live="polite"` to toast container
  - Success/error toasts announced to screen readers
  - Toasts auto-dismiss with sufficient time (≥5 seconds)
- [x] **Skip navigation link**:
  - Add skip link as first focusable element in both apps:
    ```html
    <a href="#main-content" class="sr-only focus:not-sr-only focus:absolute ...">
      Skip to main content
    </a>
    ```
  - `<main id="main-content">` wraps page content
  - Visible only on Tab focus (visually hidden otherwise)

### Sub-task 7.8.8 — Fix: ARIA Attributes and Semantics

- [x] **Tabs**:
  - Tab containers: `role="tablist"`
  - Tab buttons: `role="tab"`, `aria-selected="true/false"`, `aria-controls="panelId"`
  - Tab panels: `role="tabpanel"`, `id="panelId"`, `aria-labelledby="tabId"`
  - Apply to: inbox category tabs, callback status tabs, settings tabs, profile tabs
- [x] **Data tables**:
  - `<table>` with `<thead>` and `<th>` for column headers
  - `scope="col"` on `<th>` elements
  - Sortable columns: `aria-sort="ascending/descending/none"`
  - Apply to: provider notifications table, callbacks table, campaigns table, customers table
- [x] **Notification badges** (unread count):
  - Not color-only — include text count
  - Badge: `aria-label="5 unread notifications"`
  - Apply to: sidebar badges, inbox unread indicators
- [x] **Status indicators**:
  - Not color-only — include text label or icon
  - Status badges: "Pending" text, not just yellow dot
  - Verification badge: "Verified" text, not just green checkmark
- [x] **Calendar/date pickers** (availability, DND):
  - Keyboard navigable: arrow keys to move between days/times
  - `aria-label` on each date cell
  - Selected state: `aria-selected="true"`

### Sub-task 7.8.9 — Integrate into E2E Suites

- [x] Add `checkA11y(page)` call to every existing Playwright test spec:
  - Provider: `auth.spec.ts`, `notifications.spec.ts`, `callbacks.spec.ts`, `team.spec.ts`, `settings.spec.ts`
  - Web app: `auth.spec.ts`, `inbox.spec.ts`, `callbacks.spec.ts`, `settings.spec.ts`
  - Cross-app: Add after each navigation in flow tests
- [x] Example integration:
  ```typescript
  import { checkA11y } from './helpers/a11y';

  test('notifications page is accessible', async ({ page }) => {
    await loginAsProvider(page);
    await page.goto('/notifications');
    await checkA11y(page);
    // ... rest of functional test
  });
  ```
- [x] Verify: E2E test failures now include a11y violations in error output

### Sub-task 7.8.10 — Manual Screen Reader Testing

- [x] Test with VoiceOver (macOS) or NVDA (Windows) on key flows:
  - **Provider Portal**:
    - Login → read form labels → submit
    - Dashboard → navigate stats cards → hear values read
    - Compose notification → fill form → read policy preview → submit
    - Navigate sidebar → hear menu items and active state
  - **Web App**:
    - Login → register → dashboard
    - Inbox → hear notification titles → expand → hear full content
    - Settings → toggle privacy switches → hear state change
    - Callbacks → approve → hear confirmation
- [x] Document issues found and fix

---

## Verification Checklist

- [x] `@axe-core/playwright` installed in both apps and cross-app test project
- [x] Automated axe-core audit passes on ALL pages in Provider Portal (zero violations)
- [x] Automated axe-core audit passes on ALL pages in Web App (zero violations)
- [x] Form inputs: every input has an associated label or aria-label
- [x] Buttons: every button has an accessible name (aria-label for icon-only)
- [x] Color contrast: all text/background combinations meet 4.5:1 AA ratio
- [x] `text-text-muted` contrast verified and fixed if needed
- [x] Keyboard navigation: all interactive elements reachable and operable via keyboard
- [x] Focus management: modals trap focus, return focus on close, Escape to dismiss
- [x] Toast notifications: `aria-live="polite"` on container, announced to screen readers
- [x] Skip navigation link: visible on focus, skips to main content
- [x] Tabs: proper ARIA tablist/tab/tabpanel roles and attributes
- [x] Data tables: proper `<th>` headers with scope, sortable columns have aria-sort
- [x] Status indicators: not color-only, include text labels
- [x] `checkA11y()` integrated into all existing Playwright E2E test files
- [x] Screen reader testing completed on key flows (no blocking issues)
