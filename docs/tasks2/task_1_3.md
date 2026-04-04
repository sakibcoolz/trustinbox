# Task 1.3 — Customer Auth Middleware

> **Phase**: 1 — Gateway: Customer Portal API Surface  
> **Priority**: P0 — Must complete before resolvers can enforce RBAC  
> **Estimated Scope**: Small–Medium  
> **Files**:  
>   - `gateway/graphql-bff/cmd/server/main.go` — middleware registration  
>   - `gateway/graphql-bff/cmd/server/rbac_middleware.go` — RBAC rules  
> **Status**: ✅ Complete

---

## Objective

Update the gateway's RBAC middleware to properly authorize **customer role** (`CUSTOMER`) access to the new `my*` GraphQL queries and mutations, while keeping provider-role access restricted to their existing routes. Ensure GraphQL resolvers can differentiate between customer and provider requests.

---

## Current State

### RBAC Middleware (`rbac_middleware.go`)

The middleware currently:

1. **Skips public routes** — `/health`, `/api/auth/*`, `/api/ws`, `/api/xmpp-ws`, `/internal/*`, `/graphql` (⚠️ GraphQL is treated as public!)
2. **Checks provider API routes** (`/api/v1/*`) — treated as `SP_ADMIN` level via API key
3. **Checks user-facing REST routes** (`/api/notifications`, `/api/callbacks`, etc.) — RBAC enforced per route
4. **Extracts JWT claims** — `user_id`, `role`, `service_provider_id`
5. **Defaults to `CUSTOMER` role** if no role in JWT (`role = string(rbac.RoleCustomer)`)
6. **Injects identity into context** — both local `rbacCtxKey` and shared `requestctx` package

### Key Issue: `/graphql` is in the Public Routes List

The GraphQL endpoint is currently listed in `isPublicRoute()`:
```go
func isPublicRoute(path string) bool {
    publicPrefixes := []string{
        "/health",
        "/api/auth/",
        "/api/ws",
        "/api/xmpp-ws",
        "/internal/",
        "/graphql",  // ⚠️ This bypasses all RBAC for GraphQL
    }
    // ...
}
```

This means GraphQL requests currently skip JWT validation and RBAC entirely. For Phase 1, we need GraphQL to:
1. Require authentication (valid JWT)
2. Extract user identity into context
3. Allow resolver-level RBAC enforcement

### Cornerstone RBAC (`packages/cornerstone/auth/rbac/rbac.go`)

The `CUSTOMER` role already has these permissions:
```go
RoleCustomer: {
    PermNotificationView,
    PermCallbackView, PermCallbackCreate,
    PermConversationView, PermConversationCreate,
    PermDocumentView,
},
```

### Request Context (`packages/cornerstone/auth/requestctx/context.go`)

Already supports:
- `WithUserID(ctx, id)` / `UserID(ctx)`
- `WithServiceProviderID(ctx, id)` / `ServiceProviderID(ctx)`
- `WithRole(ctx, role)` / `Role(ctx)`

---

## Requirements

### 1. Remove `/graphql` from Public Routes

- [x] Remove `/graphql` from `isPublicRoute()` in `rbac_middleware.go`
- [x] This forces GraphQL requests through JWT validation and context injection
- [x] **Exception**: GraphQL playground/introspection should still work in dev mode (`GET` requests or introspection queries)

### 2. Add GraphQL-Specific JWT Processing

- [x] Ensure `/graphql` POST requests go through JWT extraction:
  - Extract `Authorization: Bearer <token>` header
  - Parse JWT claims (`user_id`, `role`, `service_provider_id`)
  - Inject into request context via `requestctx`
- [x] If no JWT present on GraphQL requests, return `401 Unauthorized`
- [x] If JWT is invalid/expired, return `401 Unauthorized`

### 3. Support Both Customer and Provider Roles on GraphQL

- [x] Customer JWT carries `role: "CUSTOMER"` — no `service_provider_id`
- [x] Provider JWT carries `role: "SP_ADMIN" | "AGENT" | "ANALYST"` — has `service_provider_id`
- [x] Both roles access the same `/graphql` endpoint
- [x] Role differentiation happens at the resolver level (not middleware level)

### 4. Resolver-Level RBAC Pattern

- [x] Define a helper function or middleware for resolver-level authorization:
  ```go
  // In resolver package or a shared helper
  func requireCustomerRole(ctx context.Context) (string, error) {
      role := requestctx.Role(ctx)
      userID := requestctx.UserID(ctx)
      if role != string(rbac.RoleCustomer) {
          return "", fmt.Errorf("access denied: customer role required")
      }
      if userID == "" {
          return "", fmt.Errorf("access denied: user ID not found")
      }
      return userID, nil
  }

  func requireProviderRole(ctx context.Context) (string, string, error) {
      role := requestctx.Role(ctx)
      spID := requestctx.ServiceProviderID(ctx)
      if role == string(rbac.RoleCustomer) || spID == "" {
          return "", "", fmt.Errorf("access denied: provider role required")
      }
      return requestctx.UserID(ctx), spID, nil
  }
  ```

### 5. Shared Queries Access Control

- [x] `serviceProviderDirectory` — accessible by both customer and provider roles
- [x] `me` query — accessible by all authenticated users
- [x] `my*` queries/mutations — customer role only
- [x] Provider-specific queries (`bots`, `campaigns`, `webhooks`, `analytics`, etc.) — provider roles only

### 6. GraphQL Playground/Introspection (Dev Only)

- [x] Allow introspection queries in development mode without auth
- [x] Option A: Check for introspection query in request body and skip auth
- [x] Option B: Allow `GET` requests to `/graphql` without auth (playground rendering)
- [x] Option C: Use environment variable `ALLOW_GRAPHQL_INTROSPECTION=true` (recommended)

---

## Implementation Details

### Approach: Middleware Extracts, Resolvers Enforce

The recommended approach is:

1. **Middleware** (rbac_middleware.go):  
   - Extracts JWT and injects identity into context
   - Does NOT enforce query-level permissions (resolvers handle this)
   - Returns `401` only if no valid JWT is present

2. **Resolvers** (graph/resolver/):  
   - Each resolver checks the role from context
   - Customer resolvers call `requireCustomerRole(ctx)` → gets `userID`
   - Provider resolvers call `requireProviderRole(ctx)` → gets `userID`, `spID`
   - This is cleaner than trying to parse GraphQL operation names in middleware

### Changes to `rbac_middleware.go`

```go
// In isPublicRoute(), remove "/graphql" from public prefixes.
// Add a new check for GraphQL introspection in dev mode.

func isPublicRoute(path string) bool {
    publicPrefixes := []string{
        "/health",
        "/api/auth/",
        "/api/ws",
        "/api/xmpp-ws",
        "/internal/",
        // "/graphql" removed — now requires auth
    }
    // ...
}
```

### Changes to `main.go`

```go
// The middleware chain already applies to all routes:
// CORS → RBAC → handler
// No changes needed in main.go — just ensure /graphql handler
// is behind the RBAC middleware (it already is).
```

### New Helper File (Optional)

```go
// gateway/graphql-bff/graph/resolver/auth_helpers.go
package resolver

import (
    "context"
    "fmt"
    
    "github.com/trustinbox/cornerstone/auth/rbac"
    "github.com/trustinbox/cornerstone/auth/requestctx"
)

func requireCustomerRole(ctx context.Context) (userID string, err error) {
    role := requestctx.Role(ctx)
    userID = requestctx.UserID(ctx)
    if userID == "" {
        return "", fmt.Errorf("authentication required")
    }
    if role != string(rbac.RoleCustomer) {
        return "", fmt.Errorf("customer role required, got: %s", role)
    }
    return userID, nil
}

func requireAnyAuthenticatedRole(ctx context.Context) (userID string, err error) {
    userID = requestctx.UserID(ctx)
    if userID == "" {
        return "", fmt.Errorf("authentication required")
    }
    return userID, nil
}

func requireProviderRole(ctx context.Context) (userID, spID string, err error) {
    role := requestctx.Role(ctx)
    userID = requestctx.UserID(ctx)
    spID = requestctx.ServiceProviderID(ctx)
    if userID == "" {
        return "", "", fmt.Errorf("authentication required")
    }
    if role == string(rbac.RoleCustomer) || spID == "" {
        return "", "", fmt.Errorf("provider role required")
    }
    return userID, spID, nil
}
```

---

## Verification

- [x] GraphQL requests without JWT → `401 Unauthorized`
- [x] GraphQL requests with valid customer JWT → identity injected into context
- [x] GraphQL requests with valid provider JWT → identity (including `service_provider_id`) injected into context
- [x] GraphQL requests with expired JWT → `401 Unauthorized`
- [x] Existing REST API routes (`/api/*`) continue to work as before
- [x] Auth routes (`/api/auth/*`) continue to be public
- [x] WebSocket routes (`/api/ws`) continue to work
- [x] GraphQL introspection works in dev mode
- [x] `requestctx.UserID(ctx)` returns correct user ID in resolvers
- [x] `requestctx.Role(ctx)` returns correct role in resolvers
- [x] `requestctx.ServiceProviderID(ctx)` returns SP ID for provider JWTs, empty for customer JWTs

---

## Dependencies

- **Blocks**: Task 1.4 (resolvers need auth context to work)
- **Depends on**: Nothing — can be done in parallel with Task 1.1 and 1.2
- **Impacts**: Any existing GraphQL consumers (currently none — resolvers not yet implemented)

---

## Relevant Files

| File | Purpose |
|------|---------|
| `gateway/graphql-bff/cmd/server/rbac_middleware.go` | **Edit** — Remove `/graphql` from public routes, ensure JWT processing for GraphQL |
| `gateway/graphql-bff/cmd/server/main.go` | **Review** — Verify middleware chain applies to `/graphql` route |
| `packages/cornerstone/auth/rbac/rbac.go` | **Reference** — `RoleCustomer` permissions list |
| `packages/cornerstone/auth/requestctx/context.go` | **Reference** — Context injection API |
| `gateway/graphql-bff/graph/resolver/auth_helpers.go` | **Create** — Resolver-level auth helper functions |

---

## Security Considerations

- **IDOR Prevention**: Customer mutations always use `user_id` from JWT context — never accept it as input
- **Role Escalation**: Validate that `CUSTOMER` role cannot access provider-only queries (bots, campaigns, webhooks, analytics, team management)
- **Token Validation**: Ensure JWT signature verification uses `HS256` with `JWT_SECRET` env var
- **Context Propagation**: Identity must flow through to gRPC calls via `requestctx` — backend services enforce their own authorization
