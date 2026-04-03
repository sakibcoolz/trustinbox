# Task 2 — End-to-End Application Completion

> **Goal**: Take the **Web App** (Customer Portal) from ~70% UI-only mockups to fully integrated real-data pages, complete the **Provider Portal's** remaining stubs, and verify **end-to-end flows** between both apps through all 13 backend services.
>
> **Scope**: Application features only. Admin portal deferred to `task3.md`. CI/CD and Terraform out of scope.
>
> **Decisions**:
> - Web app auth stays **localStorage** (Next.js 14) — migrate to httpOnly cookies when upgrading to Next.js 15
> - XMPP direct chat **preserved** (already working in web app)
> - Admin portal **deferred** to separate task

---

## Current State Summary

| App | Status | Details |
|-----|--------|---------|
| **Backend (13 services)** | ✅ 100% | All services fully implemented: entity → repo → usecase → gRPC handler → postgres |
| **Gateway (graphql-bff)** | ✅ 100% | GraphQL + REST for provider portal, gRPC clients to all services |
| **Provider Portal** (`apps/provider/`) | ⚠️ ~95% | 13/14 pages real implementations; settings sub-pages are stubs; some chart placeholders |
| **Web App** (`apps/web/`) | ⚠️ ~70% | Auth + dashboard + chat working; callbacks, SPs, documents, settings all use **mock data** |
| **Admin Portal** (`apps/admin/`) | 🔴 ~5% | Minimal scaffold — 6 route stubs, no components (deferred) |

---

## Phase 1 — Gateway: Customer Portal API Surface

> The gateway currently serves the provider portal. The web app needs customer-facing GraphQL queries and mutations that call the same backend services with `CUSTOMER` role authorization.
>
> **Relevant files**:
> - `gateway/graphql-bff/graph/schema.graphqls` — add types, queries, mutations
> - `gateway/graphql-bff/graph/resolver.go` — implement resolvers
> - `gateway/graphql-bff/internal/clients/service_clients.go` — existing gRPC clients (reuse)
> - `gateway/graphql-bff/cmd/server/main.go` — middleware registration

### Task 1.1 — Customer GraphQL Query Types

- [ ] **Add customer-facing query types to GraphQL schema**
  - File: `gateway/graphql-bff/graph/schema.graphqls`
  - Add to `type Query`:
    ```graphql
    # ─── Customer Portal Queries ────────────────────────────
    myProfile: UserProfile!
    myNotifications(limit: Int, offset: Int, category: NotificationCategory, status: String): NotificationConnection!
    myCallbackRequests(limit: Int, offset: Int, status: CallbackRequestStatus): CallbackRequestConnection!
    myConversations(limit: Int, offset: Int, status: ConversationStatus): ConversationConnection!
    myDocuments(limit: Int, offset: Int, serviceProviderId: ID, classification: String): DocumentConnection!
    myServiceProviders(limit: Int, offset: Int, search: String): ServiceProviderConnection!
    myPrivacyPreferences: PrivacyPreference!
    myDNDRules: [DNDRule!]!
    myAvailabilitySlots: [AvailabilitySlot!]!
    myBlockedProviders(limit: Int, offset: Int): BlockedProviderConnection!
    myDashboardSummary: CustomerDashboardSummary!
    serviceProviderDirectory(limit: Int, offset: Int, search: String, industry: String): ServiceProviderConnection!
    ```
  - Add new types:
    ```graphql
    type CustomerDashboardSummary {
      unreadNotifications: Int!
      pendingCallbacks: Int!
      activeConversations: Int!
      sharedDocuments: Int!
      blockedProviders: Int!
      dndActive: Boolean!
    }

    type BlockedProviderConnection {
      nodes: [BlockedProvider!]!
      totalCount: Int!
    }

    type BlockedProvider {
      serviceProvider: ServiceProvider!
      blockedAt: Time!
      reason: String
    }

    type DocumentConnection {
      nodes: [DocumentShare!]!
      totalCount: Int!
    }

    type ServiceProviderConnection {
      nodes: [ServiceProvider!]!
      totalCount: Int!
    }
    ```
  - Pattern: follow existing `NotificationConnection`, `CallbackRequestConnection` types
  - Pointer: queries use `x-user-id` from JWT context (not `x-service-provider-id`)

### Task 1.2 — Customer GraphQL Mutations

- [ ] **Add customer-facing mutations to GraphQL schema**
  - File: `gateway/graphql-bff/graph/schema.graphqls`
  - Add to `type Mutation`:
    ```graphql
    # ─── Customer Portal Mutations ──────────────────────────
    updateMyProfile(input: UpdateProfileInput!): UserProfile!
    updateMyPrivacyPreferences(input: UpdatePrivacyPreferenceInput!): PrivacyPreference!
    createDNDRule(input: CreateDNDRuleInput!): DNDRule!
    deleteDNDRule(id: ID!): Boolean!
    createAvailabilitySlot(input: CreateAvailabilitySlotInput!): AvailabilitySlot!
    deleteAvailabilitySlot(id: ID!): Boolean!
    blockServiceProvider(serviceProviderId: ID!, reason: String): Boolean!
    unblockServiceProvider(serviceProviderId: ID!): Boolean!
    approveCallbackRequest(id: ID!, slotId: ID!): CallbackRequest!
    rejectCallbackRequest(id: ID!, reason: String): CallbackRequest!
    markNotificationRead(id: ID!): Notification!
    markAllNotificationsRead: Boolean!
    archiveNotification(id: ID!): Boolean!
    updateMyAvatar(url: String!): UserProfile!
    ```
  - Add input types if not existing:
    ```graphql
    input UpdateProfileInput {
      firstName: String
      lastName: String
      avatarUrl: String
    }

    input CreateAvailabilitySlotInput {
      dayOfWeek: Int!
      startTime: String!
      endTime: String!
      slotType: String!
    }
    ```
  - Pointer: mutations call existing gRPC methods on `user-service` (privacy, DND, availability, blocked), `communication-service` (callbacks), `notification-service` (read/archive)

### Task 1.3 — Customer Auth Middleware

- [ ] **Add customer role authorization in gateway**
  - File: `gateway/graphql-bff/cmd/server/main.go` (middleware registration)
  - File: `gateway/graphql-bff/cmd/server/rbac_middleware.go` (RBAC rules)
  - Customer JWT carries `role: "CUSTOMER"` — differentiate from provider roles (`SP_ADMIN`, `AGENT`, `ANALYST`)
  - Customer queries (`my*`) require `CUSTOMER` role
  - Provider queries require provider roles
  - Shared queries (e.g., `serviceProviderDirectory`) accessible by both
  - Pointer: `cornerstone/auth/rbac` already defines `CUSTOMER` role with permissions — wire into gateway middleware
  - Pointer: `cornerstone/auth/requestctx` extracts `x-user-id` from JWT — customer queries use this as the user identifier

### Task 1.4 — Implement Customer Resolvers

- [ ] **Run `make gqlgen` and implement resolver stubs**
  - After adding schema changes, run: `make gqlgen`
  - Implement each resolver in `gateway/graphql-bff/graph/resolver.go` (or split into `customer_resolver.go`)
  - Pattern for each resolver:
    ```go
    func (r *queryResolver) MyNotifications(ctx context.Context, limit *int, offset *int, category *string, status *string) (*model.NotificationConnection, error) {
        userID := requestctx.UserID(ctx)
        // Call notification-service via gRPC client
        resp, err := r.clients.NotificationService.ListNotifications(ctx, &notificationv1.ListNotificationsRequest{
            UserId: userID,
            Limit:  int32(limitVal),
            Offset: int32(offsetVal),
        })
        // Map proto response → GraphQL model
    }
    ```
  - Pointer: `r.clients` is `*clients.ServiceClients` — already has connections to all 13 services
  - Pointer: follow existing `Notifications` resolver pattern for proto → GraphQL mapping

### Task 1.5 — Verify Gateway Customer API

- [ ] **Manual test all customer queries and mutations via GraphQL Playground**
  - Start gateway: `make dev-gateway`
  - Open: `http://localhost:4000/graphql`
  - Test with customer JWT in `Authorization` header
  - Verify each query returns correct data shape
  - Verify each mutation persists changes
  - Verify unauthorized access (provider JWT on customer queries) returns 403
  - Verification command: `make test` (gateway tests should pass)

---

## Phase 2 — Web App: Foundation & Data Layer

> Build the data-fetching infrastructure for the web app, matching the provider app's pattern (Apollo Client + hooks + API proxy).
>
> **Relevant files**:
> - `apps/web/src/lib/apollo-client.ts` — configure Apollo
> - `apps/web/src/components/providers.tsx` — add ApolloProvider
> - `apps/web/src/lib/auth-context.tsx` — harden auth flow
> - `apps/web/package.json` — already has `@apollo/client` dependency

### Task 2.1 — Configure Apollo Client

- [ ] **Wire Apollo Client with auth headers and error handling**
  - File: `apps/web/src/lib/apollo-client.ts`
  - Currently: basic HTTP link configured, no auth header
  - Add: auth link that reads token from localStorage and attaches `Authorization: Bearer <token>` header
  - Add: error link that catches 401 responses → attempts token refresh → retries request → redirects to login on failure
  - Add: cache policies for frequently accessed data (notifications, profile, preferences)
  - Pattern: follow `apps/provider/src/lib/apollo-provider.tsx` for error handling pattern
  - Pointer: web app uses `localStorage.getItem('token')` for auth (see `apps/web/src/lib/auth-context.tsx`)
  ```typescript
  import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
  import { setContext } from '@apollo/client/link/context';
  import { onError } from '@apollo/client/link/error';

  const httpLink = createHttpLink({
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:4000/graphql',
  });

  const authLink = setContext((_, { headers }) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return {
      headers: { ...headers, authorization: token ? `Bearer ${token}` : '' },
    };
  });

  const errorLink = onError(({ graphQLErrors, networkError }) => {
    if (graphQLErrors) {
      for (const err of graphQLErrors) {
        if (err.extensions?.code === 'UNAUTHENTICATED') {
          // Attempt refresh or redirect to login
        }
      }
    }
  });
  ```

### Task 2.2 — Add ApolloProvider to Root

- [ ] **Wrap app in ApolloProvider**
  - File: `apps/web/src/components/providers.tsx`
  - Currently: wraps with `AuthProvider`, `NotificationProvider`, `ToastContainer`
  - Add: `ApolloProvider` wrapping all other providers
  - Pointer: import `client` from `../lib/apollo-client`
  ```tsx
  import { ApolloProvider } from '@apollo/client';
  import { client } from '../lib/apollo-client';

  export function Providers({ children }: { children: React.ReactNode }) {
    return (
      <ApolloProvider client={client}>
        <AuthProvider>
          <NotificationProvider>
            {children}
            <ToastContainer />
          </NotificationProvider>
        </AuthProvider>
      </ApolloProvider>
    );
  }
  ```

### Task 2.3 — Create GraphQL Query Files

- [ ] **Create query definitions for all customer data**
  - Create directory: `apps/web/src/lib/graphql/`
  - Create files:
    - `notifications.ts` — `MY_NOTIFICATIONS`, `MY_NOTIFICATION_BY_ID`, `MARK_NOTIFICATION_READ`, `ARCHIVE_NOTIFICATION`, `MARK_ALL_READ`
    - `callbacks.ts` — `MY_CALLBACK_REQUESTS`, `APPROVE_CALLBACK`, `REJECT_CALLBACK`
    - `conversations.ts` — `MY_CONVERSATIONS`, `CONVERSATION_MESSAGES`
    - `documents.ts` — `MY_DOCUMENTS`, `DOCUMENT_DOWNLOAD_URL`
    - `service-providers.ts` — `MY_SERVICE_PROVIDERS`, `SP_DIRECTORY`, `BLOCK_SP`, `UNBLOCK_SP`
    - `settings.ts` — `MY_PRIVACY_PREFERENCES`, `UPDATE_PRIVACY`, `MY_DND_RULES`, `CREATE_DND_RULE`, `DELETE_DND_RULE`, `MY_AVAILABILITY_SLOTS`, `CREATE_SLOT`, `DELETE_SLOT`, `MY_BLOCKED_PROVIDERS`
    - `dashboard.ts` — `MY_DASHBOARD_SUMMARY`
    - `profile.ts` — `MY_PROFILE`, `UPDATE_PROFILE`, `UPDATE_AVATAR`
  - Pattern: follow `apps/provider/src/lib/graphql/notifications.ts`
  ```typescript
  // apps/web/src/lib/graphql/notifications.ts
  import { gql } from '@apollo/client';

  export const MY_NOTIFICATIONS = gql`
    query MyNotifications($limit: Int, $offset: Int, $category: NotificationCategory, $status: String) {
      myNotifications(limit: $limit, offset: $offset, category: $category, status: $status) {
        nodes {
          id
          title
          body
          category
          priority
          status
          serviceProvider { id name logoUrl verified }
          createdAt
          readAt
        }
        totalCount
      }
    }
  `;
  ```

### Task 2.4 — Create Custom Data Hooks

- [ ] **Create reusable hooks for each domain**
  - Create files in `apps/web/src/hooks/`:
    - `useNotifications.ts` — wraps `useQuery(MY_NOTIFICATIONS)` with pagination, category filter, refetch
    - `useCallbacks.ts` — wraps query + `useMutation` for approve/reject
    - `useServiceProviders.ts` — wraps query + block/unblock mutations
    - `useDocuments.ts` — wraps query + presigned URL lazy query
    - `usePrivacySettings.ts` — wraps query + update mutation, optimistic updates
    - `useDNDRules.ts` — wraps query + create/delete mutations
    - `useAvailabilitySlots.ts` — wraps query + create/delete mutations
    - `useBlockedProviders.ts` — wraps query + unblock mutation
    - `useDashboard.ts` — wraps dashboard summary query
  - Pattern:
  ```typescript
  // apps/web/src/hooks/useNotifications.ts
  import { useQuery, useMutation } from '@apollo/client';
  import { MY_NOTIFICATIONS, MARK_NOTIFICATION_READ } from '../lib/graphql/notifications';

  export function useNotifications(options?: { category?: string; limit?: number; offset?: number }) {
    const { data, loading, error, refetch } = useQuery(MY_NOTIFICATIONS, {
      variables: { limit: options?.limit ?? 20, offset: options?.offset ?? 0, category: options?.category },
    });

    const [markRead] = useMutation(MARK_NOTIFICATION_READ, {
      refetchQueries: [{ query: MY_NOTIFICATIONS }],
    });

    return {
      notifications: data?.myNotifications?.nodes ?? [],
      totalCount: data?.myNotifications?.totalCount ?? 0,
      loading,
      error,
      refetch,
      markRead: (id: string) => markRead({ variables: { id } }),
    };
  }
  ```

### Task 2.5 — Add Gateway Proxy API Route

- [ ] **Create catch-all API route to proxy GraphQL requests**
  - Create: `apps/web/src/app/api/gateway/[...path]/route.ts`
  - Purpose: forward GraphQL from client → gateway with server-side auth token injection
  - Pointer: this is needed if using server-side rendering or if CORS blocks direct gateway access
  - Pattern: follow `apps/provider/src/app/api/gateway/[...path]/route.ts`
  ```typescript
  import { NextRequest, NextResponse } from 'next/server';

  const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:4000';

  export async function POST(request: NextRequest, { params }: { params: { path: string[] } }) {
    const path = params.path.join('/');
    const body = await request.text();
    const token = request.headers.get('authorization');

    const response = await fetch(`${GATEWAY_URL}/${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: token } : {}),
      },
      body,
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  }
  ```

### Task 2.6 — Harden Auth Hook

- [ ] **Add automatic token refresh and expiry detection to useAuth**
  - File: `apps/web/src/lib/auth-context.tsx`
  - Currently: stores token in localStorage, no refresh logic
  - Add: JWT expiry check before each request (decode token, check `exp` claim)
  - Add: auto-refresh when token is within 2 minutes of expiry
  - Add: redirect to `/auth/login` on refresh failure (clear localStorage)
  - Add: `isAuthenticated` computed from token presence + validity
  - Pointer: auth-service has `RefreshToken` RPC — call via gateway
  ```typescript
  // Add to auth-context.tsx
  function isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  function isTokenExpiringSoon(token: string, bufferMs = 120000): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 - Date.now() < bufferMs;
    } catch {
      return true;
    }
  }
  ```

### Task 2.7 — Extend Toast System

- [ ] **Add success/error/info variants to toast notifications**
  - File: `apps/web/src/components/ui/toast-container.tsx`
  - Add: `type` field to toast interface (`success | error | info | warning`)
  - Add: color-coded styling using semantic tokens (`status-success`, `status-error`, `status-info`, `status-warning`)
  - Add: auto-dismiss timer (5s for success, 10s for error, persistent for warning)
  - Add: `useToast()` hook exposing `toast.success()`, `toast.error()`, `toast.info()`
  - Pattern: follow `apps/provider/src/components/Toast.tsx`

---

## Phase 3 — Web App: Core Feature Integration

> Replace local/mock state on every page with real GraphQL data. Each task wires a specific page to the backend.
>
> **Pointer**: Every page follows this pattern: import hook → replace `useState` mock data with hook return → replace local handlers with mutation calls → add loading/error states.

### 3A — Inbox / Notifications

> **Currently**: SSE notifications stream works, but no query for history, no mutations.
> **File**: `apps/web/src/app/(dashboard)/inbox/page.tsx`, `apps/web/src/features/inbox/inbox-tabs.tsx`

- [ ] **Task 3.1 — Wire inbox to `myNotifications` query**
  - Replace mock notification list with `useNotifications()` hook
  - Add category tab filtering: All / Personal / Service Provider / Advertisement
  - Add pagination (load more / infinite scroll)
  - Add search bar for filtering by title/body
  - Merge SSE real-time events with query data (new notifications prepend to list)

- [ ] **Task 3.2 — Add mark-as-read mutation**
  - On notification click/expand → call `markRead(id)` from hook
  - Update unread count in sidebar badge
  - Optimistic UI: immediately mark as read, revert on error

- [ ] **Task 3.3 — Add notification actions**
  - Archive: move to "Archived" section (call `archiveNotification` mutation)
  - Mark all read: bulk action button (call `markAllNotificationsRead` mutation)
  - Mute sender: quick action → navigates to service provider block flow

- [ ] **Task 3.4 — Add notification detail drawer**
  - Click notification → slide-in drawer showing:
    - Full body text
    - Sender (service provider) info with verification badge
    - Category and priority badges
    - Related documents (if any)
    - Timestamp and delivery channel
    - "Block this sender" action
  - Pattern: follow `apps/provider/src/components/notifications/NotificationDetailPanel.tsx`

### 3B — Callback Requests

> **Currently**: Full UI with mock data in local `useState`. Has approve/reject/slot-picker UI but no API calls.
> **File**: `apps/web/src/app/(dashboard)/callbacks/page.tsx`, `apps/web/src/features/callback-requests/callback-request-list.tsx`

- [ ] **Task 3.5 — Wire callbacks page to `myCallbackRequests` query**
  - Replace mock `callbacks` state with `useCallbacks()` hook
  - Add status filter tabs: Pending / Approved / Rejected / Completed / Expired
  - Add pagination
  - Pointer: callbacks come from `communication-service` via gateway

- [ ] **Task 3.6 — Wire approve callback with time slot picker**
  - Current: slot picker UI exists, button handler is local state
  - Wire "Approve" button to `approveCallbackRequest` mutation with selected `slotId`
  - Show user's availability slots (from `useAvailabilitySlots()`) as selectable options
  - If no slots configured → prompt user to set up availability in settings
  - Toast: "Callback approved — scheduled for [date/time]"

- [ ] **Task 3.7 — Wire reject callback with reason**
  - Wire "Reject" button to `rejectCallbackRequest` mutation
  - Add optional reason textarea in reject dialog
  - Toast: "Callback request rejected"

- [ ] **Task 3.8 — Add callback detail view**
  - Click callback → expand or navigate to detail showing:
    - Service provider info, verification status
    - Reason for callback
    - Proposed time window
    - User's matching availability slots
    - Timeline: requested → approved/rejected → completed/expired
  - Pattern: follow `apps/provider/src/components/callbacks/CallbackDetailExpansion.tsx`

- [ ] **Task 3.9 — Wire callback reminders to dashboard**
  - Dashboard widget: show next upcoming approved callback (date, time, SP name)
  - Count of pending callbacks in sidebar badge
  - Pointer: `apps/web/src/features/dashboard/pending-callbacks.tsx` already has UI — wire to real data

### 3C — Service Providers

> **Currently**: Mock SP list with local search and block toggle. Trust scores are fake.
> **File**: `apps/web/src/app/(dashboard)/service-providers/page.tsx`

- [ ] **Task 3.10 — Wire service provider directory to `myServiceProviders` query**
  - Replace mock SPs with `useServiceProviders()` hook
  - Show: name, industry, verification badge, trust score, last interaction date
  - Add search filter (by name, industry)
  - Add pagination

- [ ] **Task 3.11 — Add trust score and verification display**
  - Verification badge: ✓ Verified (green), ⏳ Pending (yellow), ✕ Unverified (red)
  - Trust score: visual indicator (0-100 scale with color gradient)
  - Show interaction stats: total notifications received, callbacks, messages
  - Pointer: trust score comes from `organization-service` SP entity

- [ ] **Task 3.12 — Wire block/unblock actions**
  - "Block" button → confirmation dialog with warning ("You will no longer receive any communications from this provider")
  - Call `blockServiceProvider` mutation on confirm
  - "Unblock" button on blocked SPs → call `unblockServiceProvider` mutation
  - Toast feedback on success/error

- [ ] **Task 3.13 — Add service provider detail view**
  - Create: `apps/web/src/app/(dashboard)/service-providers/[id]/page.tsx`
  - Show: full org info, industry profile, team size
  - Communication history tab: recent notifications, conversations, callbacks with this SP
  - Shared documents tab: documents shared by this SP
  - Actions: block, adjust notification preferences per SP

- [ ] **Task 3.14 — Add service provider discovery/search**
  - "Discover" tab or section: browse verified SPs by industry
  - Wire to `serviceProviderDirectory` query (public, not limited to user's relationships)
  - Industry filter chips: Banking, Healthcare, Real Estate, Hospitality, Logistics
  - Pointer: industry categories from `industry-service`

### 3D — Documents

> **Currently**: Mock document list with file icons. No real data, no downloads.
> **File**: `apps/web/src/app/(dashboard)/documents/page.tsx`

- [ ] **Task 3.15 — Wire documents page to `myDocuments` query**
  - Replace mock docs with `useDocuments()` hook
  - Show: file name, type icon, shared by (SP name), classification, date, size
  - Add filters: by service provider, by classification, by date range
  - Add pagination

- [ ] **Task 3.16 — Add document download via presigned URLs**
  - On "Download" click → fetch presigned URL from `document-service` via gateway
  - Open URL in new tab or trigger browser download
  - Track download event (analytics)
  - Pointer: `document-service` has `GetPresignedURL` RPC → gateway exposes as query

- [ ] **Task 3.17 — Add document preview**
  - Inline preview for images (jpg, png) and PDFs
  - Use presigned URL as `<img>` src or `<iframe>` src for PDF
  - "Full screen" button to open in new tab
  - Fallback: file type icon for unsupported formats (xlsx, zip, etc.)

- [ ] **Task 3.18 — Add document filtering and search**
  - Filter by SP: dropdown of SPs who have shared documents
  - Filter by classification: dropdown (e.g., Statement, Invoice, Agreement, Report)
  - Sort: newest first (default), name A-Z, size
  - Search: by document name

### 3E — Settings: Privacy Preferences

> **Currently**: Toggle UI exists with local state. No persistence.
> **File**: `apps/web/src/app/(dashboard)/settings/privacy/page.tsx`

- [ ] **Task 3.19 — Wire privacy page to `myPrivacyPreferences` query**
  - On mount: fetch current preferences with `usePrivacySettings()` hook
  - Pre-populate all toggles with real values
  - Show loading skeleton while fetching
  - Handle error state (retry button)

- [ ] **Task 3.20 — Add save handler for privacy toggles**
  - On toggle change → debounce 500ms → call `updateMyPrivacyPreferences` mutation
  - Show saving indicator (spinner on toggle)
  - Optimistic update: toggle immediately, revert on error
  - Toast: "Privacy preferences updated"

- [ ] **Task 3.21 — Wire category communication controls**
  - Three sections: Personal, Service Provider, Advertisement
  - Per category: enable/disable toggle
  - Advertisement: additional "max per day" slider (maps to ad cap policy)
  - Pointer: policy-service enforces these — user-service stores preferences

- [ ] **Task 3.22 — Wire per-channel controls**
  - Per category, per channel toggles: Push, Email, SMS, In-App
  - Allow user to enable push for Personal but disable email for Ads, etc.
  - Save individually or as batch

### 3F — Settings: DND Rules

> **Currently**: Time picker UI exists with day selection. No persistence.
> **File**: `apps/web/src/app/(dashboard)/settings/dnd/page.tsx`

- [ ] **Task 3.23 — Wire DND page to `myDNDRules` query**
  - On mount: fetch existing rules with `useDNDRules()` hook
  - Display as list of rule cards: "Weekdays 10 PM — 8 AM", "Weekends All Day"
  - Show empty state if no rules: "No DND rules configured. Add one to control when you can be contacted."

- [ ] **Task 3.24 — Add create DND rule form**
  - "Add Rule" button → modal/drawer with:
    - Day selection: checkboxes for Mon-Sun (or "Weekdays" / "Weekends" presets)
    - Start time picker (e.g., 22:00)
    - End time picker (e.g., 08:00)
    - Exception SPs: optional multi-select of SPs allowed to bypass DND
  - Submit → call `createDNDRule` mutation
  - Toast: "DND rule created"
  - Validate: end time must differ from start time; no duplicate time windows

- [ ] **Task 3.25 — Add delete DND rule**
  - Each rule card → "Delete" icon button
  - Confirmation dialog: "Remove this DND rule? You may receive communications during this time."
  - Call `deleteDNDRule` mutation
  - Optimistic removal from list

- [ ] **Task 3.26 — Add DND active indicator**
  - In the header component (`apps/web/src/components/layout/header.tsx`):
  - Show 🌙 moon icon or "DND Active" badge when current time falls within any DND rule
  - Compute client-side: compare current time + day against fetched rules
  - Tooltip: "Do Not Disturb active until 8:00 AM"

### 3G — Settings: Availability Slots

> **Currently**: Slot UI exists with day/time selection. No persistence.
> **File**: `apps/web/src/app/(dashboard)/settings/availability/page.tsx`

- [ ] **Task 3.27 — Wire availability page to `myAvailabilitySlots` query**
  - On mount: fetch existing slots with `useAvailabilitySlots()` hook
  - Display as weekly calendar grid (Mon-Sun rows, time columns)
  - Each slot shown as colored block with type label (Callback, Meeting)

- [ ] **Task 3.28 — Add create availability slot form**
  - Click on calendar grid → modal with:
    - Day pre-filled from click position
    - Start time, End time
    - Slot type: Callback / Meeting / Any
  - Submit → call `createAvailabilitySlot` mutation
  - Visual: new block appears on calendar

- [ ] **Task 3.29 — Add delete availability slot**
  - Click existing slot → popover with details + "Remove" button
  - Call `deleteAvailabilitySlot` mutation
  - Optimistic removal from calendar

- [ ] **Task 3.30 — Visual weekly calendar view**
  - 7-day grid (Mon-Sun columns or rows)
  - Time slots rendered as colored blocks (green for Callback, blue for Meeting)
  - Current time indicator line
  - Mobile: vertical list per day instead of grid

### 3H — Settings: Blocked Providers

> **Currently**: Mock blocked list with unblock button. No persistence.
> **File**: `apps/web/src/app/(dashboard)/settings/blocked/page.tsx`

- [ ] **Task 3.31 — Wire blocked page to `myBlockedProviders` query**
  - Fetch with `useBlockedProviders()` hook
  - Display: SP name, industry, blocked date, reason
  - Empty state: "No blocked providers"

- [ ] **Task 3.32 — Wire unblock action**
  - "Unblock" button on each row → confirmation dialog
  - "Unblocking will allow this provider to contact you again per your privacy preferences."
  - Call `unblockServiceProvider` mutation
  - Optimistic removal from list

- [ ] **Task 3.33 — Add block confirmation dialog (shared component)**
  - Create: `apps/web/src/components/ui/block-confirm-dialog.tsx`
  - Reusable by: SP directory, SP detail page, notification detail, callback detail
  - Props: `serviceProviderName`, `onConfirm`, `onCancel`
  - Warning text explaining consequences

### 3I — Friends / People

> **Currently**: Partially wired with API stubs. Friend list + invite system partially implemented.
> **File**: `apps/web/src/app/(dashboard)/friends/page.tsx`

- [ ] **Task 3.34 — Wire friend list to real API**
  - Currently: fetches from `/api/friends` stub
  - Wire: add GraphQL query for friends (or REST endpoint in gateway)
  - Pointer: user-service tracks friend relationships
  - Show: friend name, username (`c/<username>`), online status, last active

- [ ] **Task 3.35 — Wire friend request actions**
  - Send request: search user by username → send friend request mutation
  - Accept: incoming request → accept mutation
  - Reject: incoming request → reject mutation
  - Cancel: sent request → cancel mutation
  - Tab layout: Friends | Requests (Received) | Requests (Sent)

- [ ] **Task 3.36 — Add user search**
  - Search by username: `c/<username>` format
  - Debounced search input
  - Results: user avatar, name, username, mutual friends count
  - "Add Friend" button on each result

### 3J — Profile

> **Currently**: Multi-tab profile with avatar upload hook. Partially working.
> **File**: `apps/web/src/app/(dashboard)/profile/page.tsx`

- [ ] **Task 3.37 — Wire profile save to backend**
  - On "Save" → call `updateMyProfile` mutation (first name, last name, bio)
  - Disable save button while submitting
  - Toast: "Profile updated"
  - Pointer: `user-service.UpdateProfile` RPC

- [ ] **Task 3.38 — Wire avatar upload**
  - Current: `useAvatarUpload` hook exists
  - Wire: get presigned upload URL from gateway → upload image to MinIO → save URL to profile
  - Show upload progress indicator
  - Update avatar across all components on success

- [ ] **Task 3.39 — Add profile completeness indicator**
  - Calculate: has avatar? has DND rules? has availability slots? has privacy preferences set?
  - Show progress bar: "Profile 60% complete"
  - Link to incomplete sections: "Set up your DND preferences →"
  - Display on dashboard as a card for new users

### 3K — Dashboard

> **Currently**: Stats cards, recent notifications, AI summary widget. Data partially mocked.
> **File**: `apps/web/src/app/(dashboard)/page.tsx`, `apps/web/src/features/dashboard/`

- [ ] **Task 3.40 — Wire dashboard stats to `myDashboardSummary` query**
  - Replace mock stats with `useDashboard()` hook
  - Cards: Unread Notifications, Pending Callbacks, Active Conversations, Shared Documents
  - Auto-refresh every 30 seconds (or from SSE events)
  - Pointer: `apps/web/src/features/dashboard/summary-cards.tsx`

- [ ] **Task 3.41 — Wire recent notifications widget**
  - File: `apps/web/src/features/dashboard/recent-notifications.tsx`
  - Fetch last 5 notifications from `myNotifications(limit: 5)`
  - Click → navigate to `/inbox` with notification expanded
  - Show: title, SP name, time ago, unread indicator

- [ ] **Task 3.42 — Wire pending callbacks widget**
  - File: `apps/web/src/features/dashboard/pending-callbacks.tsx`
  - Fetch pending callbacks from `myCallbackRequests(status: PENDING, limit: 5)`
  - Quick approve/reject buttons inline
  - Show: SP name, reason preview, requested time

- [ ] **Task 3.43 — Wire AI summary widget**
  - File: `apps/web/src/features/dashboard/ai-summary-widget.tsx`
  - Currently: tabs for conversation summaries and notification digest
  - Wire: call `ai-service` summarization endpoint via gateway
  - Input: last 24h of notifications + conversations
  - Output: natural language summary ("You have 3 unread from your bank, 1 pending callback from HealthCo")
  - Fallback: if AI service unavailable, show simple counts

---

## Phase 4 — Web App: Enhanced Features

> **These tasks add polish and advanced UX features to elevate the web app beyond basic CRUD.**

- [ ] **Task 4.1 — Push notification support**
  - Create: `apps/web/public/sw.js` (service worker for push notifications)
  - Add: notification permission request on first login
  - Wire: register push subscription with `notification-service` via gateway
  - Show: browser push for new notifications when tab is not active
  - Pointer: `notification-service` supports PUSH channel in delivery

- [ ] **Task 4.2 — Sidebar unread badges**
  - File: `apps/web/src/components/layout/sidebar.tsx`
  - Currently: badge support exists but not wired to data
  - Wire: use SSE event counts + dashboard summary query
  - Show badges on: Inbox (unread count), Calls (pending count), Chats (unread messages)
  - Update in real-time from SSE stream

- [ ] **Task 4.3 — Global search (Cmd+K)**
  - Create: `apps/web/src/components/ui/search-modal.tsx`
  - Trigger: Cmd+K (Mac) / Ctrl+K (Windows/Linux)
  - Search across: notifications (title/body), conversations (SP name), documents (file name), service providers (name)
  - Debounced input with grouped results
  - Navigate to item on selection
  - Pattern: follow `apps/provider/src/components/Header.tsx` search modal implementation

- [ ] **Task 4.4 — Deep linking for detail views**
  - Ensure these routes work with direct URLs:
    - `/inbox?id=<notification-id>` → opens notification detail drawer
    - `/callbacks?id=<callback-id>` → expands callback detail
    - `/service-providers/<sp-id>` → SP detail page (created in Task 3.13)
    - `/documents?id=<doc-id>` → opens document preview
  - Read `id` from URL search params on page mount

- [ ] **Task 4.5 — Activity feed**
  - Create: `apps/web/src/app/(dashboard)/activity/page.tsx`
  - Unified timeline of all interactions: notifications received, callbacks approved/rejected, messages sent, documents shared
  - Reverse chronological order
  - Filter by type (notification, callback, conversation, document)
  - Wire: query multiple sources and merge by timestamp

- [ ] **Task 4.6 — Notification sound**
  - Create: `apps/web/public/sounds/notification.mp3` (short tone)
  - Play on SSE `notification.created` event (if tab is active)
  - Add setting toggle in preferences: "Notification sounds" on/off
  - Respect browser autoplay policy (only after user interaction)

- [ ] **Task 4.7 — Mobile responsive polish**
  - Audit all new pages for mobile (\<640px):
    - Inbox: full-width notification cards, swipe actions (archive, mark read)
    - Callbacks: vertical card layout, bottom-sheet for approve/reject
    - Settings: collapsible sections instead of sidebar tabs
    - Documents: single-column grid
  - Test bottom nav (`apps/web/src/components/layout/mobile-nav.tsx`) with all new routes
  - Verify no horizontal scroll on any page

- [ ] **Task 4.8 — Dark/light theme toggle**
  - Currently: dark theme only
  - Add: theme context with `dark` / `light` / `system` options
  - Store preference in localStorage
  - Toggle in header user dropdown
  - Pointer: Tailwind `darkMode: 'class'` — toggle `dark` class on `<html>`
  - Ensure all semantic tokens work in both modes (update `tailwind.config.js` if needed)

- [ ] **Task 4.9 — New user onboarding flow**
  - Create: `apps/web/src/components/onboarding/OnboardingWizard.tsx`
  - Triggered: on first login (check `localStorage.getItem('onboarding-complete')`)
  - Steps:
    1. Welcome + overview of TrustInbox
    2. Set privacy preferences (toggle categories)
    3. Set DND rules (quick preset: "Overnight 10PM-8AM")
    4. Set availability slots (quick preset: "Weekday business hours")
    5. Complete → dashboard
  - Skip option on each step
  - Mark complete in localStorage + user profile

- [ ] **Task 4.10 — Empty state illustrations**
  - Create meaningful empty states for all list pages:
    - Inbox: "No notifications yet. Service providers you interact with will send you updates here."
    - Callbacks: "No callback requests. When a service provider wants to call you, it'll appear here."
    - Documents: "No shared documents. Documents shared by service providers will appear here."
    - Service Providers: "No service provider connections yet. Browse the directory to discover verified providers."
  - Use Lucide icons (already installed) for visual interest
  - Add CTA button where applicable ("Browse directory", "Set up preferences")

---

## Phase 5 — Provider Portal: Completion

> **Complete the remaining stubs in the provider portal to reach 100% feature coverage.**
>
> **Relevant files**: `apps/provider/src/app/settings/` sub-pages

### Task 5.1 — Settings → Profile Sub-Page

- [ ] **Build organization profile editor**
  - File: `apps/provider/src/app/settings/profile/page.tsx`
  - Form fields:
    - Organization name (text input)
    - Description (textarea)
    - Logo upload (image with crop/preview)
    - Website URL
    - Contact email
    - Contact phone
    - Address (street, city, state, zip, country)
  - Read-only display:
    - Verification status badge (Verified / Pending / Unverified)
    - SP ID and slug (`o/<slug>`)
    - Created date, verified date
  - Save → call gateway `PUT /api/v1/organization/profile` → `organization-service.UpdateServiceProvider`
  - Logo upload → presigned URL → MinIO → save URL
  - Pointer: `organization-service` has `UpdateServiceProvider` RPC
  - Pointer: follow form pattern from callbacks/new page

### Task 5.2 — Settings → Industry Sub-Page

- [ ] **Build industry profile selector and configurator**
  - File: `apps/provider/src/app/settings/industry/page.tsx`
  - Layout:
    - Current industry profile: display card with current selection
    - Browse templates: grid of available industry profiles (Banking, Healthcare, Real Estate, Hospitality, Logistics)
    - Each card shows: industry name, icon, description, default features
  - On select → preview what defaults will be applied:
    - Default reason codes for callbacks
    - Default bot prompt templates
    - Default notification categories
    - Dashboard widget presets
    - Compliance requirements
  - "Apply Template" button → call `industry-service.ApplyProfile` or update via gateway
  - Warning: "Applying a template will update your default settings. Existing custom settings will be preserved."
  - Pointer: `industry-service` has full profile data in JSONB including `reason_codes`, `bot_prompt_packs`, `dashboard_presets`

### Task 5.3 — Settings → Team Sub-Page

- [ ] **Wire team management with real data**
  - File: `apps/provider/src/app/settings/team/page.tsx`
  - Currently: `TeamManager` component exists — verify it's connected to API
  - Features:
    - List current team members: name, email, role badge, joined date, status (active/invited)
    - Invite new member: email + role selection (SP_ADMIN, AGENT, ANALYST) form
    - Change role: dropdown on each member row (SP_ADMIN only)
    - Remove member: with confirmation dialog
    - Pending invitations: list with resend/revoke actions
  - Wire: calls to `PUT /api/v1/team/members/{id}/role`, `DELETE /api/v1/team/members/{id}`, `POST /api/v1/team/members`
  - Pointer: `gateway/graphql-bff/cmd/server/team_handlers.go` has REST endpoints
  - Pointer: `organization-service` has `InviteMember`, `UpdateMemberRole`, `RemoveMember` RPCs

### Task 5.4 — Analytics Trend Charts

- [ ] **Replace "coming soon" chart placeholders with real charts**
  - File: `apps/provider/src/app/analytics/page.tsx`
  - File: `apps/provider/src/components/dashboard/DeliveryChart.tsx`
  - Currently: some charts show "Delivery rate trend chart — coming soon"
  - Add: line chart for notification delivery rate over time (7d / 30d / 90d)
  - Add: bar chart for notification volume by category per day
  - Add: area chart for callback request volume over time
  - Data source: `analytics-service` daily breakdown via `useAnalyticsOverview()` hook (already exists)
  - Library: use inline SVG charts (no new dependency) or `<canvas>` — follow existing `DeliveryChart.tsx` pattern
  - Pointer: analytics data has `date`, `count`, `category` fields for time-series rendering

### Task 5.5 — Campaign Detail Page Polish

- [ ] **Enhance campaign detail with real-time progress**
  - File: `apps/provider/src/app/campaigns/[id]/page.tsx`
  - Add: real-time target processing bar (X of Y targets sent, X delivered, X failed)
  - Add: delivery breakdown by channel (push, email, SMS, in-app) as horizontal bar chart
  - Add: target list table with individual delivery status
  - Wire: SSE updates via `useLiveNotifications()` for delivery events
  - Add: "Pause" / "Resume" / "Cancel" campaign actions
  - Pointer: `notification-service` has campaign-related RPCs; `worker-service` has `CampaignSendProcessor`

### Task 5.6 — Bot Configuration Wizard

- [ ] **Build multi-step bot configuration wizard**
  - File: `apps/provider/src/app/bots/new/page.tsx` (or `apps/provider/src/app/bots/[id]/page.tsx` for edit)
  - Steps:
    1. **Basics**: Name, description, avatar, status (draft/active)
    2. **Personality**: System prompt, tone (formal/casual), language
    3. **Tools**: Select allowed tools/actions from available list, per-tool policy check
    4. **Knowledge Sources**: Add URLs, upload documents, paste text → feeds RAG
    5. **Permissions**: User interaction permissions, escalation triggers
    6. **Test Chat**: Live chat preview with the configured bot
    7. **Deploy**: Review summary → save/activate
  - Wire each step to existing API endpoints:
    - Steps 1-2: `POST /api/bots` or `PUT /api/bots/{id}`
    - Step 3: `PUT /api/bots/{id}/permissions`
    - Step 4: `POST /api/bots/{id}/knowledge`
    - Step 5: `PUT /api/bots/{id}/permissions`
    - Step 6: `POST /api/bots/{id}/test` (calls ai-service)
  - Pointer: `bot-service` has full CRUD + knowledge + permissions RPCs

### Task 5.7 — Conversation Agent Assignment

- [ ] **Build agent assignment flow for conversations**
  - File: `apps/provider/src/components/conversations/AgentAssignDrawer.tsx` (exists — verify wiring)
  - Features:
    - Assign conversation to team member (dropdown of agents)
    - Transfer: reassign from one agent to another with optional note
    - Supervisor view: see all open conversations, filter by assigned agent
    - Unassigned queue: conversations not yet assigned to any agent
  - Wire: mutation calls to `communication-service` via gateway
  - Add: agent workload indicator (X active conversations per agent)
  - Pointer: `communication-service` tracks conversation ownership

---

## Phase 6 — Cross-App End-to-End Flows

> **Verify full round-trip flows between provider portal → gateway → services → web app.**
> Each task is a complete integration test scenario that validates the entire stack.

### Task 6.1 — Notification Delivery E2E

- [ ] **Verify: Provider sends notification → Customer receives**
  - Provider portal: navigate to `/notifications/compose` → fill form → send
  - Backend flow: gateway → `notification-service.CreateNotification` → `policy-service.EvaluateCommunication` → if ALLOW: persist + publish event → `worker-service.DeliveryProcessor` picks up → delivers
  - Web app: SSE stream receives event → inbox updates → notification appears in list
  - Verify:
    - Notification appears in web app inbox within 5 seconds
    - Category, title, body, SP name all correct
    - Mark as read in web app → status updates
    - Provider can see delivery status in their notifications list

### Task 6.2 — Callback Lifecycle E2E

- [ ] **Verify: Provider requests → Customer approves → Callback executes**
  - Provider portal: navigate to `/callbacks/new` → fill reason, preferred time → submit
  - Backend flow: gateway → `communication-service.CreateCallbackRequest` → policy check → persist → event published
  - Web app: callback appears in `/callbacks` with status "Pending"
  - Web app: user clicks "Approve" → selects availability slot → submits
  - Backend: `communication-service.ApproveCallback` → status updated → event published
  - Provider portal: callback status changes to "Approved" with scheduled time
  - Verify:
    - Callback visible in both apps with correct status at each stage
    - Reject flow: verify reason is visible to provider
    - Expiry: wait 48h (or adjust test time) → verify status changes to "Expired"

### Task 6.3 — Conversation E2E

- [ ] **Verify: Provider starts conversation → Customer replies → Messages persist**
  - Provider portal: navigate to `/conversations` → start new conversation with customer
  - Backend flow: gateway → `communication-service.CreateConversation` → event published
  - Web app: conversation appears in `/conversations` via XMPP
  - Web app: user types reply → send via XMPP
  - Backend: message persists in `communication-service`
  - Provider portal: message appears in conversation thread
  - Verify:
    - Messages appear in both apps
    - File attachments: upload in provider → visible in web app → downloadable
    - Typing indicators work in both directions
    - Conversation history persists across page refreshes

### Task 6.4 — Document Sharing E2E

- [ ] **Verify: Provider uploads → Shares with customer → Customer downloads**
  - Provider portal: navigate to `/documents` → upload file → click "Share" → select customer
  - Backend flow: gateway → `document-service.Upload` → MinIO storage → `document-service.Share` → event published
  - Web app: document appears in `/documents` with SP name and classification
  - Web app: user clicks "Download" → presigned URL generated → file downloads
  - Verify:
    - File integrity: downloaded file matches uploaded file
    - Preview works for images and PDFs
    - Document visible only to the intended customer

### Task 6.5 — Campaign E2E

- [ ] **Verify: Provider creates campaign → Targets receive notifications**
  - Provider portal: navigate to `/campaigns/new` → configure: name, audience, message template → launch
  - Backend flow: gateway → `notification-service.CreateCampaign` → `worker-service.CampaignSendProcessor` fans out → individual notifications created per target → policy evaluation per target → delivery
  - Web app: each target customer receives notification in inbox
  - Provider portal: campaign detail shows real-time progress (X sent, Y delivered, Z failed)
  - Verify:
    - Each target receives their notification
    - Policy denials (blocked SPs, DND) are tracked and shown in campaign analytics
    - Campaign analytics aggregate correctly

### Task 6.6 — Privacy Enforcement E2E

- [ ] **Verify: Customer blocks SP → SP cannot send notifications**
  - Web app: navigate to service provider → click "Block" → confirm
  - Backend flow: `user-service.BlockServiceProvider` → persists
  - Provider portal: SP tries to send notification to this customer
  - Backend flow: `policy-service.EvaluateCommunication` → checks blocked list → DENY with reason "user_blocked_sp"
  - Provider portal: notification shows "Rejected — User has blocked your organization"
  - Web app: unblock → provider can send again
  - Verify:
    - Block is immediate (no pending state)
    - Unblock restores communication per privacy preferences
    - Blocked SP cannot initiate callbacks or conversations either

### Task 6.7 — DND Enforcement E2E

- [ ] **Verify: Customer sets DND → Notifications deferred to window end**
  - Web app: settings → DND → create rule "10 PM — 8 AM Weekdays"
  - Provider portal: send notification during DND window (e.g., 11 PM)
  - Backend flow: `policy-service.EvaluateCommunication` → checks DND → DEFER (or DENY with "dnd_active")
  - Notification is held until DND window ends (8 AM) → then delivered
  - Web app: notification appears at 8 AM, not 11 PM
  - Verify:
    - DND respects time zones
    - Exception SPs can bypass DND (if configured)
    - DND indicator shows in web app header during active window

### Task 6.8 — Bot Interaction E2E

- [ ] **Verify: Provider configures bot → Customer triggers → Bot responds**
  - Provider portal: create bot via wizard (Task 5.6) → configure tools + knowledge → activate
  - Web app: customer sends message that triggers bot (e.g., in a conversation with the SP)
  - Backend flow: `bot-service` detects trigger → `ai-service.Orchestrator` processes → generates response → policy check on bot action → response delivered
  - Web app: bot response appears in conversation
  - Provider portal: bot action logged in analytics with trace
  - Verify:
    - Bot response is contextually relevant
    - Policy-denied bot actions are logged but not executed
    - Escalation to human agent works (bot says "Let me connect you with an agent")

---

## Phase 7 — Testing & Quality

> **Establish test coverage across both apps and verify cross-cutting quality.**

### Task 7.1 — Web App Unit Tests Setup

- [ ] **Set up Vitest and write unit tests for all hooks**
  - Create: `apps/web/vitest.config.ts` (follow provider app config at `apps/provider/vitest.config.ts`)
  - Add to `apps/web/package.json`: `"test": "vitest"`, `"test:watch": "vitest --watch"`, `"test:coverage": "vitest --coverage"`
  - Test files:
    - `src/hooks/__tests__/useNotifications.test.ts` — mock Apollo, verify query variables, mutation calls
    - `src/hooks/__tests__/useCallbacks.test.ts` — verify approve/reject mutations
    - `src/hooks/__tests__/usePrivacySettings.test.ts` — verify optimistic updates
    - `src/hooks/__tests__/useDNDRules.test.ts` — verify create/delete
    - `src/lib/__tests__/auth-context.test.ts` — verify token refresh, expiry detection
  - Use `@testing-library/react` for hook testing via `renderHook`
  - Mock Apollo Client with `MockedProvider` from `@apollo/client/testing`

### Task 7.2 — Web App Component Tests

- [ ] **Write component tests for key pages**
  - Test files:
    - `src/app/(dashboard)/inbox/__tests__/page.test.tsx` — renders notifications, category tabs switch, mark-as-read interaction
    - `src/app/(dashboard)/callbacks/__tests__/page.test.tsx` — renders callbacks, approve/reject flow
    - `src/app/(dashboard)/settings/privacy/__tests__/page.test.tsx` — toggles save, loading state
    - `src/app/(dashboard)/settings/dnd/__tests__/page.test.tsx` — create rule, delete rule
    - `src/components/ui/__tests__/block-confirm-dialog.test.tsx` — renders warning, calls onConfirm/onCancel
  - Pattern: wrap in `MockedProvider`, render page, assert UI elements, fire events, verify mutations

### Task 7.3 — Provider Portal Playwright E2E

- [ ] **Write E2E tests for critical provider flows**
  - File: `apps/provider/e2e/`
  - Test scenarios:
    - `auth.spec.ts` — login → dashboard loads → correct SP context → logout
    - `notifications.spec.ts` — compose notification → send → verify in list → check delivery status
    - `callbacks.spec.ts` — view callback list → filter by status → view detail
    - `team.spec.ts` — invite member → see pending invite → (simulate accept)
    - `settings.spec.ts` — update profile → verify saved → change industry template
  - Pointer: Playwright config exists at `apps/provider/playwright.config.ts`
  - Run: `npm run test:e2e` in `apps/provider/`

### Task 7.4 — Web App Playwright E2E

- [ ] **Write E2E tests for critical customer flows**
  - Create: `apps/web/playwright.config.ts` (copy from provider, change port to 3000)
  - Create: `apps/web/e2e/`
  - Test scenarios:
    - `auth.spec.ts` — login → dashboard loads → token in localStorage
    - `inbox.spec.ts` — view notifications → filter by category → mark as read → archive
    - `callbacks.spec.ts` — view pending callbacks → approve with slot → verify status change
    - `settings.spec.ts` — set privacy preferences → create DND rule → create availability slot
    - `service-providers.spec.ts` — browse directory → view SP detail → block → unblock
  - Run: `npx playwright test` in `apps/web/`

### Task 7.5 — Cross-App E2E Tests

- [ ] **Write E2E tests spanning both apps**
  - Create: `tests/e2e/` (project root level)
  - Create: `tests/e2e/playwright.config.ts` — configure base URLs for both apps
  - Test scenarios:
    - `notification-flow.spec.ts` — provider sends notification → switch to web app → verify received → mark read → switch to provider → verify delivery status
    - `callback-flow.spec.ts` — provider requests callback → switch to web app → approve → switch to provider → verify approved
    - `block-flow.spec.ts` — web app blocks SP → provider tries to send → verify rejection
  - Requirement: both apps + gateway + services must be running
  - Run: `npx playwright test` in `tests/e2e/`

### Task 7.6 — API Integration Tests

- [ ] **Test gateway resolvers for both customer and provider roles**
  - File: `tests/integration/gateway_test.go`
  - Tests:
    - Customer JWT → `myNotifications` returns only that user's notifications
    - Provider JWT → `notifications` returns SP's sent notifications
    - Customer JWT → `myCallbackRequests` returns only that user's callbacks
    - Customer JWT → `updateMyPrivacyPreferences` persists and affects subsequent policy evaluation
    - Customer cannot access provider queries (returns 403)
    - Provider cannot access customer queries (returns 403)
  - Pattern: HTTP POST to `localhost:4000/graphql` with appropriate JWT headers
  - Run: `go test ./tests/integration/...`

### Task 7.7 — Load Testing

- [ ] **Verify system handles concurrent load**
  - Create: `tests/load/` with k6 or Vegeta scripts
  - Test scenarios:
    - 100 concurrent SSE connections on web app notification stream
    - 50 concurrent notification sends from provider → verify all delivered
    - 20 concurrent callback approve/reject mutations
    - Gateway GraphQL throughput: 500 req/s sustained
  - Report: P50, P95, P99 latencies; error rates; SSE connection stability
  - Pointer: start with `make up-infra` + single instance of each service

### Task 7.8 — Accessibility Audit

- [ ] **Ensure both apps meet WCAG 2.1 AA standards**
  - Audit both apps with axe-core (install `@axe-core/playwright` for automated checks)
  - Key areas:
    - All form inputs have labels
    - All buttons have accessible names
    - Color contrast meets 4.5:1 ratio
    - Keyboard navigation works for all interactive elements
    - Focus management: modal open → focus trapped; modal close → focus returns
    - Screen reader: notification announcements, toast announcements (use `aria-live`)
    - Skip navigation link for keyboard users
  - Fix any violations found
  - Add axe check to Playwright E2E as assertion: `expect(await axeCheck(page)).toHaveNoViolations()`

---

## Dependency Graph

```
Phase 1 (Gateway Customer API)
    │
    ▼
Phase 2 (Web App Foundation)
    │
    ▼
Phase 3 (Web App Core Integration) ──────────┐
    │                                          │
    ▼                                          │
Phase 4 (Web App Enhanced Features)           │
                                               │
Phase 5 (Provider Portal Completion) ─────────┤  ← Can run in parallel with Phase 3-4
                                               │
                                               ▼
                                    Phase 6 (Cross-App E2E Flows)
                                               │
                                               ▼
                                    Phase 7 (Testing & Quality)
```

---

## Verification Checklist

After completing all phases, verify:

- [ ] `make proto && make gqlgen` — no compilation errors in gateway
- [ ] `make build` — all Go services compile
- [ ] `make test` — all Go tests pass
- [ ] `npm run build` in `apps/web/` — TypeScript compiles, no type errors
- [ ] `npm run build` in `apps/provider/` — TypeScript compiles, no type errors
- [ ] `npm test` in `apps/web/` — all unit + component tests pass
- [ ] `npm test` in `apps/provider/` — all unit + component tests pass
- [ ] `npm run test:e2e` in `apps/web/` — all Playwright tests pass
- [ ] `npm run test:e2e` in `apps/provider/` — all Playwright tests pass
- [ ] Cross-app E2E: provider sends notification → web app receives ✓
- [ ] Cross-app E2E: web app blocks SP → provider notification denied ✓
- [ ] Cross-app E2E: callback request → approve → complete lifecycle ✓
- [ ] Lighthouse audit: both apps score 90+ on Performance, Accessibility, Best Practices
- [ ] No `any` types in new TypeScript code
- [ ] No `console.log` in production code (use logger)
- [ ] All new SQL uses parameterized queries
- [ ] All new Go functions propagate context and start tracing spans

---

## Task Count Summary

| Phase | Tasks | Priority |
|-------|-------|----------|
| **Phase 1** — Gateway Customer API | 5 | 🔴 Critical (blocks Phase 2-3) |
| **Phase 2** — Web App Foundation | 7 | 🔴 Critical (blocks Phase 3) |
| **Phase 3** — Web App Core Integration | 43 | 🔴 Critical (core features) |
| **Phase 4** — Web App Enhanced Features | 10 | 🟡 Important (UX polish) |
| **Phase 5** — Provider Portal Completion | 7 | 🟡 Important (complete provider) |
| **Phase 6** — Cross-App E2E Flows | 8 | 🟠 High (integration validation) |
| **Phase 7** — Testing & Quality | 8 | 🟠 High (reliability) |
| **Total** | **88** | |

---

## Quick Start for Each Phase

```bash
# Phase 1: Gateway work
cd gateway/graphql-bff
# Edit graph/schema.graphqls → add customer types
make gqlgen
# Implement resolvers → test at http://localhost:4000/graphql

# Phase 2-4: Web app work
cd apps/web
npm install
npm run dev  # http://localhost:3000
# Edit src/lib/graphql/ → src/hooks/ → src/app/(dashboard)/ pages

# Phase 5: Provider portal work
cd apps/provider
npm run dev  # http://localhost:6060
# Edit src/app/settings/ sub-pages

# Phase 6: E2E verification
make up-infra
./scripts/dev.sh  # Start all services
# Manually test flows across both apps

# Phase 7: Testing
cd apps/web && npm test
cd apps/provider && npm test && npm run test:e2e
cd tests/e2e && npx playwright test
```
