# Task 7.6 — API Integration Tests

> **Phase**: 7 — Testing & Quality
> **Goal**: Write Go integration tests for the GraphQL gateway, verifying resolver behavior for both customer and provider roles — correct data scoping, authorization enforcement, mutation persistence, and cross-role isolation.
> **Type**: Go integration test creation targeting the gateway's GraphQL and REST endpoints.
> **Prerequisite**: Gateway + backend services running, PostgreSQL with seeded data.

---

## Objective

Create a Go integration test suite (`tests/integration/gateway_test.go`) that sends real HTTP requests to the running gateway (`localhost:4000`), using JWT tokens for both CUSTOMER and PROVIDER roles, verifying that queries return correctly scoped data, mutations persist and trigger expected side effects, and cross-role access is properly denied.

---

## Current State

### Gateway Endpoints

**GraphQL** (`POST /graphql`):
- Customer queries: `myNotifications`, `myCallbackRequests`, `myPrivacyPreferences`, `myDNDRules`, `myAvailabilitySlots`, `myBlockedProviders`, `myDocuments`, `myServiceProviders`, `myDashboardSummary`
- Customer mutations: `markNotificationRead`, `archiveNotification`, `approveCallbackRequest`, `rejectCallbackRequest`, `updateMyPrivacyPreferences`, `createDNDRule`, `deleteDNDRule`, `createAvailabilitySlot`, `deleteAvailabilitySlot`, `blockServiceProvider`, `unblockServiceProvider`
- Provider queries: `notifications`, `callbackRequests`, `campaigns`, `bots`, `conversations`, `customers`, `analytics`
- Provider mutations: `sendNotification`, `createCallbackRequest`, `createCampaign`, `launchCampaign`, `createBot`

**REST Provider API** (`/api/v1/...`):
- `POST /api/v1/notifications` — send notification
- `GET /api/v1/notifications` — list notifications
- `POST /api/callbacks` — create callback
- `POST /api/callbacks/{id}/approve` — approve callback
- `POST /api/campaigns` — create campaign
- `POST /api/bots` — create bot
- `PUT /api/v1/organization/profile` — update org profile
- `POST /api/v1/team/members` — invite team member

### Auth Headers

```
Customer JWT:   Authorization: Bearer <customer-jwt>
                x-user-id: <user-uuid>
                x-role: CUSTOMER

Provider JWT:   Authorization: Bearer <provider-jwt>
                x-user-id: <user-uuid>
                x-service-provider-id: <sp-uuid>
                x-role: SP_ADMIN (or AGENT, ANALYST)
```

### Existing Go Test Patterns (Backend Services)

```go
// Standard Go testing — no testify
func TestXxx_Success(t *testing.T) {
    // Arrange
    // Act
    result, err := ...
    // Assert
    if err != nil { t.Fatalf("unexpected error: %v", err) }
    if result.X != expected { t.Errorf("expected %v, got %v", expected, result.X) }
}
```

### Tests Directory

- `tests/` — **EMPTY**
- No existing integration tests at the root level

---

## Requirements

### Sub-task 7.6.1 — Integration Test Setup

- [x] Create directory: `tests/integration/`
- [x] Create `tests/integration/go.mod`:
  ```go
  module github.com/trustinbox/tests/integration
  go 1.24
  ```
- [x] Add to `go.work`: `tests/integration`
- [x] Create `tests/integration/helpers_test.go`:
  - `gatewayURL` constant: `http://localhost:4000`
  - `graphqlPost(t, token string, query string, variables map[string]interface{}) *http.Response` — sends POST to `/graphql`
  - `restPost(t, token, path string, body interface{}) *http.Response` — sends POST to REST endpoint
  - `restGet(t, token, path string) *http.Response` — sends GET
  - `parseGraphQLResponse(t, resp) map[string]interface{}` — parses JSON response, checks for errors
  - `generateCustomerJWT(userID string) string` — creates JWT with CUSTOMER role
  - `generateProviderJWT(userID, spID, role string) string` — creates JWT with provider role
  - `requireNoErrors(t, resp)` — asserts no GraphQL errors in response
  - `requireError(t, resp, expectedCode string)` — asserts specific error
- [x] Create build tag: `//go:build integration`
- [x] Add Makefile target:
  ```makefile
  test-integration:
  	cd tests/integration && go test -tags=integration -v ./...
  ```

### Sub-task 7.6.2 — Customer Query Tests

- [x] Create `tests/integration/customer_queries_test.go`:
  - **`myNotifications` query**:
    - Send with customer JWT → verify returns only that user's notifications
    - Verify response shape: `nodes []Notification`, `totalCount`
    - Verify each notification has: id, title, body, category, createdAt
    - Filter by category: `PERSONAL` → verify only PERSONAL notifications returned
    - Pagination: limit 5, offset 0 → verify correct count
  - **`myCallbackRequests` query**:
    - Send with customer JWT → verify returns only that user's callbacks
    - Verify response shape: nodes with id, spName, reason, status, createdAt
    - Filter by status: `PENDING` → verify only PENDING returned
  - **`myPrivacyPreferences` query**:
    - Send with customer JWT → verify returns preferences object
    - Verify all 7 fields present with boolean values
  - **`myDNDRules` query**:
    - Send with customer JWT → verify returns list of DND rules
    - Verify each rule: id, scopeType, startTime, endTime, daysOfWeek
  - **`myBlockedProviders` query**:
    - Send with customer JWT → verify returns blocked SP list
    - Verify each entry: spId, spName, blockedAt
  - **`myDocuments` query**:
    - Send with customer JWT → verify returns shared documents
    - Verify each document: id, name, type, size, spName, sharedAt
  - **`myServiceProviders` query**:
    - Send with customer JWT → verify returns SPs the user has interacted with
  - **`myDashboardSummary` query**:
    - Send with customer JWT → verify returns summary with counts

### Sub-task 7.6.3 — Customer Mutation Tests

- [x] Create `tests/integration/customer_mutations_test.go`:
  - **`markNotificationRead` mutation**:
    - Get an unread notification ID
    - Call mutation with `{id}` → verify success
    - Re-query `myNotifications` → verify notification now has `readAt` set
  - **`updateMyPrivacyPreferences` mutation**:
    - Call with `{allowAdvertisements: false}` → verify success
    - Re-query `myPrivacyPreferences` → verify `allowAdvertisements` is false
    - **Policy impact**: After disabling, verify that a provider sending an ADVERTISEMENT notification to this user gets denied by policy
  - **`createDNDRule` mutation**:
    - Call with `{scopeType: "GLOBAL", startTime: "22:00", endTime: "07:00", daysOfWeek: [1,2,3,4,5]}`
    - Verify success + returned rule ID
    - Re-query `myDNDRules` → verify rule exists
  - **`deleteDNDRule` mutation**:
    - Delete the just-created rule by ID
    - Re-query → verify rule removed
  - **`blockServiceProvider` mutation**:
    - Call with SP ID → verify success
    - Re-query `myBlockedProviders` → verify SP in list
  - **`unblockServiceProvider` mutation**:
    - Call with same SP ID → verify success
    - Re-query → verify SP removed from list
  - **`approveCallbackRequest` mutation** (if testable with existing data):
    - Approve pending callback with slot times
    - Verify status change to APPROVED

### Sub-task 7.6.4 — Provider Query and Mutation Tests

- [x] Create `tests/integration/provider_queries_test.go`:
  - **`notifications` query (provider)**:
    - Send with provider JWT → verify returns SP's sent notifications
    - Verify scoped to `x-service-provider-id` (only this SP's notifications)
  - **`callbackRequests` query (provider)**:
    - Verify returns callbacks involving this SP
  - **REST: `POST /api/v1/notifications`**:
    - Send notification with valid payload
    - Verify 201 response with notification ID
    - Verify notification appears in provider's notification list
  - **REST: `POST /api/callbacks`**:
    - Create callback request
    - Verify 201 response
  - **REST: `POST /api/campaigns`**:
    - Create campaign with targets
    - Verify 201 response with campaign ID
  - **REST: `GET /api/v1/notifications`**:
    - List notifications → verify paginated response
    - Filter by status → verify filtering works

### Sub-task 7.6.5 — Cross-Role Authorization Tests

- [x] Create `tests/integration/authorization_test.go`:
  - **Customer cannot access provider queries**:
    - Customer JWT → query `notifications` (provider query) → verify 403 or FORBIDDEN error
    - Customer JWT → query `campaigns` → verify denied
    - Customer JWT → query `bots` → verify denied
    - Customer JWT → query `customers` → verify denied
  - **Provider cannot access customer queries**:
    - Provider JWT → query `myNotifications` → verify denied
    - Provider JWT → query `myPrivacyPreferences` → verify denied
    - Provider JWT → mutation `updateMyPrivacyPreferences` → verify denied
  - **No JWT (unauthenticated)**:
    - No Authorization header → any query → verify 401 UNAUTHENTICATED
  - **Invalid JWT**:
    - Malformed token → verify 401
    - Expired token → verify 401
  - **Wrong SP context**:
    - Provider JWT with SP-A → attempt to access SP-B data → verify denied or empty
  - **Role-based access within provider**:
    - ANALYST role → attempt `sendNotification` mutation → verify denied (if restricted)
    - AGENT role → attempt team management → verify denied

### Sub-task 7.6.6 — Data Isolation Tests

- [x] Create `tests/integration/isolation_test.go`:
  - **Customer data isolation**:
    - Customer-A JWT → `myNotifications` → get notification IDs
    - Customer-B JWT → `myNotifications` → get notification IDs
    - Verify: no overlap between ID sets
    - Customer-A cannot read Customer-B's notification by ID
  - **Provider data isolation**:
    - Provider SP-A JWT → `notifications` → get IDs
    - Provider SP-B JWT → `notifications` → get IDs
    - Verify: no overlap
  - **Mutation isolation**:
    - Customer-A marks Customer-B's notification as read → verify denied or no-op
    - Customer-A approves Customer-B's callback → verify denied
  - **Block isolation**:
    - Customer-A blocks SP-X → verify SP-X can still reach Customer-B
    - Only Customer-A's policy evaluation is affected

### Sub-task 7.6.7 — Run and Validate Integration Tests

- [x] Prerequisite: `make up-infra` + `./scripts/dev.sh` running
- [x] Seed test data if needed:
  ```bash
  make seed  # ensure test users, SPs, and sample data exist
  ```
- [x] Run: `cd tests/integration && go test -tags=integration -v ./...`
  - All tests pass
  - No test pollution (tests clean up after themselves)
- [x] Verify test output:
  - Each test case produces clear pass/fail output
  - Failed assertions show expected vs. actual values
- [x] Run with race detector: `go test -tags=integration -race ./...`
  - No race conditions detected

---

## Verification Checklist

- [x] `tests/integration/` created with `go.mod` and added to `go.work`
- [x] Helper utilities: JWT generation, GraphQL/REST request helpers, response parsing
- [x] Customer queries: all 8 queries tested with correct scoping
- [x] Customer mutations: markRead, privacy update, DND CRUD, block/unblock, callback approve
- [x] Provider queries: notifications, callbacks scoped to SP
- [x] Provider REST: POST notifications, callbacks, campaigns return correct responses
- [x] Authorization: customer ✗ provider queries, provider ✗ customer queries, no-auth ✗ all
- [x] Data isolation: customer-A cannot access customer-B's data, SP-A isolated from SP-B
- [x] Privacy → policy impact: disabling category preference blocks subsequent notifications
- [x] All tests pass with `go test -tags=integration -v ./...`
- [x] Race detector clean: `go test -tags=integration -race ./...`
