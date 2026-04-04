# Task 7.1 — Web App Unit Tests Setup

> **Phase**: 7 — Testing & Quality
> **Goal**: Set up Vitest test infrastructure in the Web App and write unit tests for all custom hooks, mirroring the Provider Portal's established test patterns.
> **Type**: Test infrastructure + unit test creation.

---

## Objective

Bootstrap the Web App's unit testing framework (Vitest + Testing Library + jsdom) following the Provider Portal's proven configuration, then write comprehensive unit tests for every custom hook — covering Apollo Client mocking, optimistic updates, mutation calls, error handling, and auth token management.

---

## Current State

### Provider Portal (Reference Implementation — `apps/provider/`)

**Test infrastructure fully established**:
- `vitest.config.ts` — globals: true, environment: jsdom, setupFiles: `./src/__tests__/setup.tsx`
- `package.json` scripts: `test` (vitest run), `test:watch`, `test:coverage`
- DevDeps: vitest 4.1.2, @testing-library/react 16.3.2, @testing-library/jest-dom 6.9.1, @testing-library/user-event 14.6.1, jsdom 29.0.1

**Test directory structure** (`apps/provider/src/__tests__/`):
```
__tests__/
├── setup.tsx           — mocks next/navigation, next/image, IntersectionObserver, matchMedia
├── helpers.tsx          — createMockUser(), setupFetchMock(), renderWithProviders(), data factories
├── components/          — Badge, Card, DashboardSummary, Modal, Tabs
├── hooks/               — useAuth, usePermission
├── integration/         — auth-flow, bot-flow, callback-flow, campaign-flow, conversation-flow, notification-delivery, webhook-lifecycle
└── unit/                — csv-export, format, roles, utils
```

### Web App (`apps/web/`) — NO TEST INFRASTRUCTURE

- **No test scripts** in `package.json`
- **No test dependencies** (vitest, testing-library, jsdom all missing)
- **No `vitest.config.ts`**
- **No `__tests__/` directory**
- **No test setup or helpers**

### Web App Hooks to Test

| Hook / Context | File | Key Behaviors |
|----------------|------|---------------|
| `useAuth` | `src/lib/auth-context.tsx` | login, register, logout, refreshAccessToken, xmppToken, localStorage persistence |
| `useNotifications` | `src/lib/notification-context.tsx` | fetchNotifications, markRead, markAllRead, SSE event handling, unreadCount |
| `useChat` | `src/lib/chat-context.tsx` | XMPP message send/receive, presence, typing |
| `useAvatarUpload` | `src/hooks/useAvatarUpload.ts` | file validation (type, size), multipart upload, status tracking, optimistic update |
| `useProfile` | `src/hooks/useProfile.ts` | profile fetch, update mutation |
| Apollo query hooks | `src/hooks/use*.ts` (Phase 2 hooks) | useCallbacks, usePrivacySettings, useDNDRules, useAvailabilitySlots, useBlockedProviders, useDocuments, useServiceProviders, useDashboard |

---

## Requirements

### Sub-task 7.1.1 — Install Test Dependencies

- [ ] Add test dependencies to `apps/web/package.json`:
  ```json
  "devDependencies": {
    "vitest": "^4.1.2",
    "@testing-library/react": "^16.3.2",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^29.0.1"
  }
  ```
- [ ] Add test scripts:
  ```json
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
  ```
- [ ] Run `npm install` in `apps/web/`
- [ ] Verify dependencies installed without conflicts

### Sub-task 7.1.2 — Create Vitest Configuration

- [ ] Create `apps/web/vitest.config.ts` mirroring provider pattern:
  ```typescript
  import { defineConfig } from 'vitest/config';
  import path from 'path';

  export default defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/__tests__/setup.tsx'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        reporter: ['text', 'html', 'lcov'],
        exclude: ['node_modules/', 'src/__tests__/'],
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  });
  ```
- [ ] Verify `@` alias matches `tsconfig.json` paths configuration

### Sub-task 7.1.3 — Create Test Setup File

- [ ] Create `apps/web/src/__tests__/setup.tsx`:
  - Mock `next/navigation` (useRouter, usePathname, useSearchParams)
  - Mock `next/image`
  - Mock `IntersectionObserver`
  - Mock `window.matchMedia`
  - Mock `localStorage` (web app uses localStorage for auth)
  - Import `@testing-library/jest-dom` for DOM matchers
- [ ] Mirror provider pattern from `apps/provider/src/__tests__/setup.tsx`
- [ ] Add web-app-specific mocks:
  - Mock `EventSource` (for SSE notifications)
  - Mock XMPP WebSocket connection

### Sub-task 7.1.4 — Create Test Helpers

- [ ] Create `apps/web/src/__tests__/helpers.tsx`:
  - `createMockUser()` — user with id, name, email, avatar, role: CUSTOMER
  - `createMockAuthValue()` — full auth context mock with tokens, login/logout/refresh methods
  - `createMockNotification()` — notification with id, title, body, category, SP name, timestamps
  - `createMockCallback()` — callback with id, spName, reason, status, slots
  - `createMockDocument()` — document with id, name, type, size, SP name
  - `createMockServiceProvider()` — SP with id, name, verified, trustScore
  - `createMockDNDRule()` — DND rule with id, scopeType, startTime, endTime, daysOfWeek
  - `renderWithProviders(component, options)` — wraps in AuthProvider + NotificationProvider + ApolloProvider (MockedProvider)
  - `createApolloMock(query, variables, data)` — helper for Apollo MockedProvider mocks
- [ ] Ensure all mock factories return properly typed objects

### Sub-task 7.1.5 — Test `useAuth` Hook

- [ ] Create `apps/web/src/lib/__tests__/auth-context.test.ts`:
  - **Login flow**:
    - Mock fetch for `/api/auth/login` returning tokens
    - Verify tokens stored in localStorage
    - Verify user state updated
    - Verify XMPP token handled if present
  - **Logout flow**:
    - Call logout → verify localStorage cleared
    - Verify user state reset to null
    - Verify redirect to login page
  - **Token refresh**:
    - Mock fetch for `/api/auth/refresh` returning new accessToken
    - Verify refreshAccessToken updates token state
    - Verify token stored in localStorage
  - **Invalid token detection**:
    - Pass expired JWT → verify auto-refresh triggered
    - Pass malformed token → verify logout triggered
  - **Register flow**:
    - Mock fetch for `/api/auth/register`
    - Verify account creation → auto-login
  - **Avatar update**:
    - Call updateAvatar → verify user state updated
- [ ] Use `renderHook` from `@testing-library/react`
- [ ] Wrap in auth provider for context access

### Sub-task 7.1.6 — Test Notification Hook

- [ ] Create `apps/web/src/hooks/__tests__/useNotifications.test.ts` (or test via notification-context):
  - **Fetch notifications**:
    - Mock Apollo query for `myNotifications`
    - Verify notifications list populated
    - Verify loading/error states
  - **Mark as read**:
    - Call `markRead(id)` → verify mutation fired with correct variables
    - Verify optimistic update: notification marked read before server response
    - Verify unreadCount decremented
  - **Mark all read**:
    - Call `markAllRead()` → verify mutation
    - Verify all notifications updated optimistically
    - Verify unreadCount reset to 0
  - **SSE event handling**:
    - Mock EventSource emitting `notification` event
    - Verify new notification prepended to list
    - Verify unreadCount incremented
    - Verify toast triggered for new notification
  - **Category filtering**:
    - Query with category filter (PERSONAL, SERVICE_PROVIDER, ADVERTISEMENT)
    - Verify correct query variables passed

### Sub-task 7.1.7 — Test Callback Hook

- [ ] Create `apps/web/src/hooks/__tests__/useCallbacks.test.ts`:
  - **Fetch callbacks**:
    - Mock Apollo query for `myCallbackRequests`
    - Verify callbacks list with status filtering (PENDING, APPROVED, REJECTED)
  - **Approve callback**:
    - Call `approveCallback(id, slotStart, slotEnd)` → verify mutation variables
    - Verify optimistic update: status changes from PENDING to APPROVED
    - Verify slot data attached to callback
  - **Reject callback**:
    - Call `rejectCallback(id, reason)` → verify mutation variables
    - Verify optimistic update: status changes to REJECTED
    - Verify reason stored
  - **Error handling**:
    - Mock network error → verify error state
    - Mock GraphQL error → verify error displayed

### Sub-task 7.1.8 — Test Privacy, DND, and Remaining Hooks

- [ ] Create `apps/web/src/hooks/__tests__/usePrivacySettings.test.ts`:
  - Fetch current preferences → verify all toggles populated
  - Update preference toggle → verify mutation with debounce (500ms)
  - Optimistic update: toggle reflects immediately, reverts on error
  - Verify all 7 privacy fields testable: allowPersonalNotifications, allowSPNotifications, allowAdvertisements, allowCallbackRequests, allowChat, allowDocumentShares, requireCallApproval

- [ ] Create `apps/web/src/hooks/__tests__/useDNDRules.test.ts`:
  - Fetch existing rules → verify list populated
  - Create new rule → verify mutation variables (scopeType, startTime, endTime, daysOfWeek)
  - Delete rule → verify delete mutation fired + optimistic removal
  - Validate: end time differs from start time → error if identical

- [ ] Create `apps/web/src/hooks/__tests__/useAvailabilitySlots.test.ts`:
  - Fetch slots → verify list
  - Create slot → verify mutation
  - Delete slot → verify optimistic removal

- [ ] Create `apps/web/src/hooks/__tests__/useBlockedProviders.test.ts`:
  - Fetch blocked list → verify
  - Unblock → verify mutation + optimistic removal from list
  - Block (from SP page) → verify mutation + list update

- [ ] Create `apps/web/src/hooks/__tests__/useDocuments.test.ts`:
  - Fetch documents → verify list with pagination
  - Presigned URL generation → verify query/mutation

- [ ] Create `apps/web/src/hooks/__tests__/useAvatarUpload.test.ts`:
  - Upload valid file → verify status transitions: idle → uploading → success
  - Invalid file type → verify rejection with error message
  - File too large (>5MB) → verify rejection
  - Upload failure → verify status: error, error message set
  - Remove avatar → verify API call + status reset

### Sub-task 7.1.9 — Verify Test Suite Passes

- [ ] Run: `cd apps/web && npm test`
  - All tests pass
  - No console errors or warnings
- [ ] Run: `cd apps/web && npm run test:coverage`
  - Verify coverage report generated
  - Hooks coverage: at least 80% line coverage
- [ ] Add to Makefile: `test-web` target:
  ```makefile
  test-web:
  	cd apps/web && npm test
  ```

---

## Verification Checklist

- [ ] `apps/web/vitest.config.ts` created with jsdom environment and correct aliases
- [ ] `apps/web/src/__tests__/setup.tsx` mocks Next.js, localStorage, EventSource, matchMedia
- [ ] `apps/web/src/__tests__/helpers.tsx` provides mock factories + renderWithProviders
- [ ] `auth-context.test.ts` covers login, logout, refresh, register, expired token
- [ ] `useNotifications.test.ts` covers fetch, markRead, markAllRead, SSE events, filtering
- [ ] `useCallbacks.test.ts` covers fetch, approve with slots, reject with reason, error handling
- [ ] `usePrivacySettings.test.ts` covers fetch, toggle with debounce, optimistic update
- [ ] `useDNDRules.test.ts` covers create, delete, validation
- [ ] Remaining hooks tested: useAvailabilitySlots, useBlockedProviders, useDocuments, useAvatarUpload
- [ ] `npm test` passes all tests in `apps/web/`
- [ ] Coverage report shows ≥80% line coverage on hooks
- [ ] No test dependencies conflict with existing app dependencies
