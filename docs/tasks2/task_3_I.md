# Task 3I — Friends / People (Tasks 3.34–3.36)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3I — Friends / People
> **Files**: `apps/web/src/app/(dashboard)/friends/page.tsx`, `apps/web/src/lib/graphql/friends.ts` (new, optional)
> **Current**: FULLY CONNECTED via REST — tasks focus on hardening and GraphQL migration path

---

## Objective

The friends page (603 lines) is already **fully wired** to real REST APIs with SSE real-time updates. These tasks focus on hardening the existing implementation, documenting the GraphQL migration path, improving the user search UX, and ensuring the friend request flow is robust.

---

## Current State

```typescript
// apps/web/src/app/(dashboard)/friends/page.tsx — 603 lines, FULLY CONNECTED
'use client';

// REAL API integrations already working:
// GET  /api/friends                    → fetch friend list
// POST /api/friends/request            → send friend request
// GET  /api/friends/requests/incoming   → fetch incoming requests
// GET  /api/friends/requests/outgoing   → fetch outgoing requests
// POST /api/friends/requests/{id}/accept  → accept request
// POST /api/friends/requests/{id}/reject  → reject request
// DELETE /api/friends/{id}              → remove friend
// GET  /api/users/search?q=...          → search users

// SSE real-time via useNotifications().onFriendEvent():
// FRIEND_REQUEST_RECEIVED → add to incoming requests
// FRIEND_REQUEST_ACCEPTED → move to friends list
// FRIEND_REMOVED → remove from friends list

// 3 tabs: Friends | Requests | Find People
// Full CRUD: add, accept, reject, cancel, remove
// Online/offline status indicators
// Search with debounce
```

**What Already Works**:
- Friend list with real data from REST
- Incoming/outgoing request lists
- Accept/reject/cancel request actions
- Remove friend action
- User search by username pattern (`c/<username>`)
- SSE real-time updates for friend events
- Online status indicators via SSE presence
- Tab layout: Friends / Requests / Find People

**Gaps/Improvements**:
- Uses REST `fetch()` — no GraphQL queries (Apollo not leveraged)
- No loading skeletons (uses simple "Loading..." text)
- No error boundaries
- Search requires `c/` prefix (not user-friendly)
- No pagination for large friend lists
- No optimistic updates — waits for API response
- No empty state illustrations

### GraphQL Schema Status

```graphql
# NOTE: No friend-specific queries or mutations in the current GraphQL schema.
# The friends feature runs entirely through REST API routes.
# GraphQL migration would require adding:
#   - Query: myFriends, myFriendRequests
#   - Mutation: sendFriendRequest, acceptFriendRequest, rejectFriendRequest, removeFriend
#   - Subscription: friendEvent
```

---

## Task 3.34 — Harden Friend List with Loading/Error States

### Requirements

- [x] Add proper loading skeletons:
  - [x] Replace "Loading..." text with card-shaped skeleton placeholders
  - [x] Friend card skeleton: circular avatar + two text lines + status dot
  - [x] Show 5 skeleton cards during initial load
- [x] Add error handling:
  - [x] Wrap each `fetch()` call with proper try/catch
  - [x] Show error card with retry button on fetch failure
  - [x] Handle 401 errors: redirect to login
  - [x] Handle network errors: show "offline" indicator
- [x] Add optimistic updates:
  - [x] Accept request → immediately move to friends list
  - [x] Reject request → immediately remove from requests list
  - [x] Remove friend → immediately remove from list
  - [x] Revert on API error
- [x] Add empty states with illustrations:
  - [x] Friends tab: "No friends yet — search for people to connect with"
  - [x] Requests tab: "No pending requests"
  - [x] Search tab: "Search for people by username"
- [x] Add pagination or infinite scroll for large friend lists:
  - [x] Show first 50 friends, "Load More" button
  - [x] Track `hasMore` from API response

---

## Task 3.35 — Document and Prepare GraphQL Migration Path

### Requirements

- [x] Create `apps/web/src/lib/graphql/friends.ts` with planned operations:
  - [x] `GET_MY_FRIENDS` query (placeholder — not in schema yet)
  - [x] `GET_FRIEND_REQUESTS` query (placeholder)
  - [x] `SEND_FRIEND_REQUEST` mutation (placeholder)
  - [x] `ACCEPT_FRIEND_REQUEST` mutation (placeholder)
  - [x] `REJECT_FRIEND_REQUEST` mutation (placeholder)
  - [x] `REMOVE_FRIEND` mutation (placeholder)
  - [x] Each with `// TODO: Uncomment when schema adds friend operations` comment
- [x] Document the migration strategy:
  - [x] Current: REST `fetch()` in component → direct
  - [x] Target: Apollo `useQuery`/`useMutation` → Apollo cache
  - [x] Migration steps: 1) Add schema types, 2) Add gateway resolvers, 3) Create hooks, 4) Replace fetch calls
- [x] Ensure REST handlers have consistent error response format:
  - [x] Verify all `/api/friends/*` routes return `{ error: string }` on failure
  - [x] Verify status codes: 200 OK, 400 Bad Request, 401 Unauthorized, 404 Not Found, 409 Conflict
- [x] Add TypeScript interfaces for friend API responses:
  - [x] `Friend`, `FriendRequest`, `UserSearchResult` types in `lib/types.ts`
  - [x] Type the currently untyped `fetch` responses

---

## Task 3.36 — Improve User Search UX

### Requirements

- [x] Remove the `c/` prefix requirement:
  - [x] Current: user must type `c/username` to search
  - [x] Target: type just the username, auto-prepend `c/` internally
  - [x] Or: search by name/email if API supports it
- [x] Improve search debounce:
  - [x] Current debounce: verify timing (should be 300ms)
  - [x] Minimum query length: 2 characters before triggering search
  - [x] Show "Type at least 2 characters" hint
- [x] Search results improvements:
  - [x] Show avatar, full name, username, online status
  - [x] Show mutual friends count (if API supports)
  - [x] Show "Already friends" badge for existing friends
  - [x] Show "Request sent" badge for pending outgoing requests
  - [x] Show "Request pending" badge for pending incoming requests
  - [x] Disable "Add Friend" button for already-connected users
- [x] Recent searches:
  - [x] Store last 5 searches in localStorage
  - [x] Show as chips below search input
  - [x] Click chip → prefill search

---

## Verification Checklist

- [x] Friends page still works with real REST API (no regressions)
- [x] Loading skeletons show during initial fetch
- [x] Error states show with retry buttons
- [x] Optimistic updates work for accept/reject/remove
- [x] Empty states show appropriate messages
- [x] User search works without `c/` prefix
- [x] Search results show connection status badges
- [x] GraphQL migration file created with planned operations
- [x] TypeScript interfaces added for friend API responses
- [x] SSE real-time updates still work (friend events)
- [x] Pagination/load-more works for large friend lists

---

## Dependencies

**Depends on**:
- REST API routes at `/api/friends/*` (already working)
- SSE notification context (already working)

**Blocks**:
- Future GraphQL migration (Phase 4+)

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/friends/page.tsx` | Friends page (603 lines, FULLY CONNECTED REST) |
| `apps/web/src/lib/graphql/friends.ts` | **New** — Planned GraphQL operations (placeholder) |
| `apps/web/src/lib/notification-context.tsx` | SSE context — `onFriendEvent()` handler |
| `apps/web/src/lib/types.ts` | Add friend-related TypeScript interfaces |
