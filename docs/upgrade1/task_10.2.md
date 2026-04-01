# Task 10.2 — Create Bot Button

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P1 — Navigation  
> **Estimated Scope**: Small  
> **Route**: `/bots`  
> **File**: `apps/provider/src/app/bots/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Wire the "+ Create Bot" button to navigate to `/bots/new` and enforce RBAC so only users with `bots:create` permission can see and use it.

---

## Current State

```tsx
<button className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 transition-colors">
  + Create Bot
</button>
```

**Issues**:
- No `onClick` or `Link` — button does nothing
- Uses `bg-accent-blue` instead of `bg-accent-purple` (bot accent color)
- No RBAC check — visible to all users
- Permissions: `bots:create` granted to `PLATFORM_ADMIN` and `SP_ADMIN` only

---

## Requirements

### 1. Navigation

- Button navigates to `/bots/new`
- Use `Link` from `next/link` or `router.push`

### 2. RBAC

- Only visible when user has `bots:create` permission
- `PLATFORM_ADMIN` and `SP_ADMIN` have access
- `CONTENT_MANAGER` and `AGENT` do not

### 3. Styling

- Use `bg-accent-purple` to match bot theme (consistent with wizard and detail pages)
- Icon: `Bot` from lucide-react or Plus icon

---

## Implementation Plan

```tsx
import Link from 'next/link';
import { usePermissions } from '@/hooks/usePermissions';

// Inside BotsPage:
const { hasPermission } = usePermissions();

{hasPermission('bots:create') && (
  <Link href="/bots/new"
    className="flex items-center gap-2 px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/90 transition-colors">
    + Create Bot
  </Link>
)}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/page.tsx` | **Modify** | Wire button to `/bots/new` with RBAC |

---

## Acceptance Criteria

- [ ] Button navigates to `/bots/new`
- [ ] Only visible for users with `bots:create` permission
- [ ] Uses `bg-accent-purple` styling (bot theme)
- [ ] Hidden for CONTENT_MANAGER and AGENT roles

---

## Dependencies

- **Blocked by**: Task 10.1 (bot list page)
- **Blocks**: None
- **Related**: Task 10.5 (bot creation wizard — target page)
