# Task 17.7 — Apollo Cache as Primary Store

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P1 — State management  
> **Estimated Scope**: Small  
> **File**: Documentation / pattern guidance  
> **Status**: ✅ Complete

---

## Objective

Establish Apollo Cache as the primary client-side data store for all server-fetched data. Eliminate redundant React state that duplicates cache data. This is a pattern/convention task — enforce across all pages.

---

## Requirements

### Anti-Patterns to Eliminate

```typescript
// BAD: Duplicating query data in React state
const { data } = useQuery(GET_WEBHOOKS);
const [webhooks, setWebhooks] = useState(data?.webhookSubscriptions || []);

// GOOD: Use query data directly
const { data, loading, error } = useQuery(GET_WEBHOOKS);
const webhooks = data?.webhookSubscriptions || [];
```

### Allowed Local State

| State Type | Store | Example |
|-----------|-------|---------|
| Server data | Apollo Cache | Webhooks, team members, notifications |
| UI mode | `useState` | isEditing, selectedTab, isModalOpen |
| Form input | `useState` or React Hook Form | name, email, URL fields |
| Filters/search | URL params | status=active, page=2 |
| User prefs | localStorage | theme, soundsEnabled |

### Migration Pattern

For existing pages that mirror query data in state:
1. Remove `useState` for server data
2. Read directly from `useQuery` result
3. For filtered/sorted views, derive from query data with `useMemo`

---

## Files to Modify

| File | Action | Purpose |
|------|--------|---------|
| All new page components | **Convention** | Follow pattern from the start |

---

## Acceptance Criteria

- [ ] No React state duplicating Apollo cache data in new pages
- [ ] Derived data uses useMemo
- [ ] Forms use local state
- [ ] Filters use URL params
- [ ] Convention documented

---

## Dependencies

- **Blocked by**: Task 17.1 (Apollo setup)
- **Blocks**: None (convention / guidance)
