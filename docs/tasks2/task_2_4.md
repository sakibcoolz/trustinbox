# Task 2.4 — Create Custom Data Hooks

> **Phase**: 2 — Web App: Foundation & Data Layer
> **Directory**: `apps/web/src/hooks/` (extend existing)
> **Reference**: GraphQL queries from Task 2.3, existing `useProfile.ts` pattern

---

## Objective

Create 9 reusable React hooks that wrap Apollo Client's `useQuery` and `useMutation` to provide domain-specific data access for every customer-facing feature. Each hook encapsulates query variables, loading/error state, pagination, and mutation helpers into a clean API that components consume.

---

## Current State

Existing hooks in `apps/web/src/hooks/`:
- `useProfile.ts` — REST-based profile fetch (`GET /api/profile`, `/api/profile/stats`, etc.) — 150+ lines
- `useCareer.ts` — REST-based work experience, education, skills management
- `useAvatarUpload.ts` — REST-based avatar upload (`POST /api/avatar/upload`)

**Gap**: No GraphQL-based hooks exist. All data fetching is via REST `fetch()` calls.

---

## Requirements

### Hook: `useNotificationsGql.ts`
- [x] Wraps `useQuery(MY_NOTIFICATIONS)` with variables: `category`, `status`, `limit`, `offset`
- [x] Wraps `useMutation(MARK_NOTIFICATION_READ)` with `refetchQueries`
- [x] Wraps `useMutation(ARCHIVE_NOTIFICATION)` with `refetchQueries`
- [x] Returns: `{ notifications, totalCount, loading, error, refetch, markRead, archive }`
- [x] Default: `limit: 20`, `offset: 0`
- [x] Note: Named `useNotificationsGql` to avoid collision with existing `useNotifications` from notification-context

### Hook: `useCallbacks.ts`
- [x] Wraps `useQuery(MY_CALLBACKS)` with variables: `status`, `limit`, `offset`
- [x] Wraps `useMutation(APPROVE_CALLBACK)` returning updated `CallbackRequest`
- [x] Wraps `useMutation(REJECT_CALLBACK)` returning updated `CallbackRequest`
- [x] Returns: `{ callbacks, totalCount, loading, error, refetch, approve, reject }`

### Hook: `useServiceProviders.ts`
- [x] Wraps `useQuery(MY_SERVICE_PROVIDERS)` for user's connected providers
- [x] Wraps `useMutation(BLOCK_SP)` with `refetchQueries`
- [x] Wraps `useMutation(UNBLOCK_SP)` with `refetchQueries`
- [x] Returns: `{ providers, loading, error, refetch, block, unblock }`

### Hook: `useDocuments.ts`
- [x] Query for user's shared documents (if schema supports a document list query)
- [x] If no query available in schema, create a placeholder hook with a TODO comment
- [x] Returns: `{ documents, loading, error, refetch }`

### Hook: `usePrivacySettings.ts`
- [x] Wraps `useQuery(MY_PRIVACY_PREFERENCES)` to fetch current privacy preference
- [x] Wraps `useMutation(UPDATE_PRIVACY)` with **optimistic update**
- [x] Returns: `{ privacy, loading, error, updatePrivacy, saving }`
- [x] Optimistic update writes to cache immediately, rolls back on error

### Hook: `useDNDRules.ts`
- [x] Wraps `useQuery(MY_DND_RULES)` to fetch current DND rules
- [x] Wraps `useMutation(CREATE_DND_RULE)` with `refetchQueries`
- [x] Wraps `useMutation(UPDATE_DND_RULE)` with `refetchQueries`
- [x] Wraps `useMutation(DELETE_DND_RULE)` with `refetchQueries`
- [x] Returns: `{ rules, loading, error, refetch, createRule, updateRule, deleteRule }`

### Hook: `useAvailabilitySlots.ts`
- [x] Wraps `useQuery(MY_AVAILABILITY_SLOTS)` to fetch current slots
- [x] Wraps `useMutation(CREATE_AVAILABILITY_SLOT)` with `refetchQueries`
- [x] Wraps `useMutation(DELETE_AVAILABILITY_SLOT)` with `refetchQueries`
- [x] Returns: `{ slots, loading, error, refetch, createSlot, deleteSlot }`

### Hook: `useBlockedProviders.ts`
- [x] Reuses `MY_SERVICE_PROVIDERS` or a dedicated blocked providers query
- [x] Wraps `useMutation(UNBLOCK_SP)` with `refetchQueries`
- [x] Returns: `{ blockedProviders, loading, error, unblock }`
- [x] Note: May need a separate query or filter on service providers — check schema

### Hook: `useDashboard.ts`
- [x] Wraps `useQuery(DASHBOARD_SUMMARY)`
- [x] Returns: `{ summary, loading, error, refetch }`
- [x] Summary shape: `{ unreadPersonal, unreadServiceProvider, unreadAdvertisements, pendingCallbackRequests, totalConversations }`

---

## Implementation Details

### Standard Hook Pattern
```typescript
'use client';

import { useQuery, useMutation } from '@apollo/client';
import { MY_NOTIFICATIONS, MARK_NOTIFICATION_READ, ARCHIVE_NOTIFICATION } from '@/lib/graphql/notifications';

interface UseNotificationsOptions {
  category?: string;
  status?: string;
  limit?: number;
  offset?: number;
}

export function useNotificationsGql(options?: UseNotificationsOptions) {
  const { data, loading, error, refetch } = useQuery(MY_NOTIFICATIONS, {
    variables: {
      category: options?.category,
      status: options?.status,
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    },
  });

  const [markReadMutation] = useMutation(MARK_NOTIFICATION_READ, {
    refetchQueries: [{ query: MY_NOTIFICATIONS }],
  });

  const [archiveMutation] = useMutation(ARCHIVE_NOTIFICATION, {
    refetchQueries: [{ query: MY_NOTIFICATIONS }],
  });

  return {
    notifications: data?.notifications?.nodes ?? [],
    totalCount: data?.notifications?.totalCount ?? 0,
    loading,
    error: error?.message ?? null,
    refetch,
    markRead: (id: string) => markReadMutation({ variables: { id } }),
    archive: (id: string) => archiveMutation({ variables: { id } }),
  };
}
```

### Callback Hook Pattern (with input objects)
```typescript
export function useCallbacks(options?: { status?: string; limit?: number; offset?: number }) {
  const { data, loading, error, refetch } = useQuery(MY_CALLBACKS, {
    variables: {
      status: options?.status,
      limit: options?.limit ?? 20,
      offset: options?.offset ?? 0,
    },
  });

  const [approveMutation] = useMutation(APPROVE_CALLBACK, {
    refetchQueries: [{ query: MY_CALLBACKS }],
  });

  const [rejectMutation] = useMutation(REJECT_CALLBACK, {
    refetchQueries: [{ query: MY_CALLBACKS }],
  });

  return {
    callbacks: data?.callbackRequests?.nodes ?? [],
    totalCount: data?.callbackRequests?.totalCount ?? 0,
    loading,
    error: error?.message ?? null,
    refetch,
    approve: (input: { callbackRequestId: string; approvedSlotStart: string; approvedSlotEnd: string }) =>
      approveMutation({ variables: { input } }),
    reject: (input: { callbackRequestId: string; reason?: string }) =>
      rejectMutation({ variables: { input } }),
  };
}
```

### Privacy Settings with Optimistic Update
```typescript
export function usePrivacySettings() {
  const { data, loading, error } = useQuery(MY_PRIVACY_PREFERENCES);

  const [updateMutation, { loading: saving }] = useMutation(UPDATE_PRIVACY, {
    optimisticResponse: (vars) => ({
      updatePrivacyPreference: {
        __typename: 'PrivacyPreference',
        ...data?.me?.privacyPreference,
        ...vars.input,
      },
    }),
    update: (cache, { data: mutationData }) => {
      if (!mutationData) return;
      cache.modify({
        id: cache.identify({ __typename: 'User', id: data?.me?.id }),
        fields: {
          privacyPreference: () => mutationData.updatePrivacyPreference,
        },
      });
    },
  });

  return {
    privacy: data?.me?.privacyPreference ?? null,
    loading,
    error: error?.message ?? null,
    updatePrivacy: (input: Record<string, boolean>) => updateMutation({ variables: { input } }),
    saving,
  };
}
```

---

## Naming Convention

| Hook File | Export Name | Why |
|-----------|------------|-----|
| `useNotificationsGql.ts` | `useNotificationsGql` | Avoids collision with `useNotifications` (SSE-based, notification-context) |
| `useCallbacks.ts` | `useCallbacks` | No collision |
| `useServiceProviders.ts` | `useServiceProviders` | No collision |
| `useDocuments.ts` | `useDocuments` | No collision |
| `usePrivacySettings.ts` | `usePrivacySettings` | No collision |
| `useDNDRules.ts` | `useDNDRules` | No collision |
| `useAvailabilitySlots.ts` | `useAvailabilitySlots` | No collision |
| `useBlockedProviders.ts` | `useBlockedProviders` | No collision |
| `useDashboard.ts` | `useDashboard` | No collision |

---

## Verification Checklist

- [x] All 9 hook files created in `apps/web/src/hooks/`
- [x] Each hook has `'use client'` directive
- [x] Each hook imports from `@/lib/graphql/*` (Task 2.3 queries)
- [x] Each hook returns `loading`, `error`, and domain-specific data
- [x] Mutations include `refetchQueries` to keep lists in sync
- [x] `usePrivacySettings` includes optimistic update
- [x] No TypeScript compilation errors
- [x] Each hook uses named export (not `export default`)
- [x] Each mutation helper accepts typed input parameters
- [x] Null-safe data access with `?? []` or `?? null` defaults

---

## Dependencies

- **Depends on**: Task 2.2 (ApolloProvider in tree), Task 2.3 (query definitions)
- **Blocks**: Phase 3 pages (components will import these hooks)

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/hooks/*.ts` | **Target files** — 9 new hooks |
| `apps/web/src/lib/graphql/*.ts` | Query/mutation definitions (Task 2.3) |
| `apps/web/src/hooks/useProfile.ts` | Existing REST-based hook — reference for return shape style |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema — verify field names and types |
