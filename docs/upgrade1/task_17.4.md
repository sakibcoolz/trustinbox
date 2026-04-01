# Task 17.4 — Global Error Link

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P0 — Error handling  
> **Estimated Scope**: Small (already exists — extend)  
> **File**: `apps/provider/src/lib/apollo-provider.tsx`  
> **Status**: ✅ Complete

---

## Objective

Extend the existing `errorLink` in apollo-provider.tsx to handle all error categories consistently: network errors, GraphQL errors (validation, authorization, not found), and rate limiting.

---

## Current State

Existing `errorLink` only handles `UNAUTHENTICATED` by refreshing the token and retrying. No handling for:
- Network errors (offline, timeout)
- `FORBIDDEN` (RBAC violation)
- `NOT_FOUND`
- `VALIDATION_ERROR`
- Rate limiting (429)

---

## Requirements

### Extended Error Handling

```typescript
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      switch (err.extensions?.code) {
        case 'UNAUTHENTICATED':
          // Existing: refresh token + retry
          break;
        case 'FORBIDDEN':
          toast.error('Permission denied');
          break;
        case 'NOT_FOUND':
          // Silently handle — let component handle via error state
          break;
        case 'VALIDATION_ERROR':
          // Let component handle via error state
          break;
        case 'RATE_LIMITED':
          toast.warning('Too many requests — please wait');
          break;
        default:
          console.error(`[GraphQL Error]: ${err.message}`);
      }
    }
  }

  if (networkError) {
    if ('statusCode' in networkError && networkError.statusCode === 429) {
      toast.warning('Rate limited — retrying in 5s');
      // Retry after delay
    } else {
      toast.error('Network error — check your connection');
    }
  }
});
```

### Toast Integration

- Use a toast library (e.g., `sonner` or `react-hot-toast`)
- Deduplicate: don't show same error toast repeatedly
- Auto-dismiss after 5s

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/apollo-provider.tsx` | **Modify** | Extend errorLink |
| `apps/provider/package.json` | **Modify** | Add toast library if not present |

---

## Acceptance Criteria

- [ ] FORBIDDEN → permission denied toast
- [ ] Network error → connection error toast
- [ ] Rate limiting → warning toast + retry
- [ ] UNAUTHENTICATED → existing refresh behavior preserved
- [ ] Errors logged to console with context
- [ ] No duplicate toasts

---

## Dependencies

- **Blocked by**: Task 17.1 (Apollo setup)
- **Blocks**: None
