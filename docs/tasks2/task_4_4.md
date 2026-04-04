# Task 4.4 — Deep Linking for Detail Views

> **Phase**: 4 — Web App: Enhanced Features
> **Task**: 4.4 — Deep Linking for Detail Views
> **Files**: `apps/web/src/app/(dashboard)/inbox/page.tsx`, `apps/web/src/app/(dashboard)/callbacks/page.tsx`, `apps/web/src/app/(dashboard)/documents/page.tsx`, `apps/web/src/app/(dashboard)/service-providers/[id]/page.tsx` (Phase 3)
> **Dependencies**: Phase 3A (Inbox detail drawer), Phase 3B (Callback detail), Phase 3C (SP detail page), Phase 3D (Document preview)

---

## Objective

Ensure all detail views support direct URL deep linking so users can bookmark, share, or navigate directly to a specific notification, callback, document, or service provider. URL search params should be read on page mount to auto-open the correct detail view.

---

## Current State

### Inbox Page — No URL Param Handling
```typescript
// apps/web/src/app/(dashboard)/inbox/page.tsx — 196 lines
// Uses useNotifications() from SSE context
// Has dual-panel layout: list | detail
// selectedNotification tracked via local useState
// ❌ No URL search param reading
// ❌ Clicking notification does not update URL
// ❌ Direct link /inbox?id=<id> does not auto-select notification
```

### Callbacks Page — No URL Param Handling
```typescript
// apps/web/src/app/(dashboard)/callbacks/page.tsx — 329 lines (mock)
// Mock data with local state management
// ❌ No URL search param reading
// ❌ No detail expansion from URL
```

### Documents Page — No URL Param Handling
```typescript
// apps/web/src/app/(dashboard)/documents/page.tsx — 329 lines (mock)
// Mock data with local state management
// ❌ No URL search param reading
// ❌ No preview from URL
```

### Service Provider Detail — Page Created in Phase 3
```
// Phase 3 Task 3.13 creates: apps/web/src/app/(dashboard)/service-providers/[id]/page.tsx
// ✅ This is already a dynamic route — deep linking is automatic via file-based routing
// Just verify it works with direct URLs
```

### Next.js URL Search Params Pattern
```typescript
// Standard pattern for reading URL params in Next.js 14 client components:
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const searchParams = useSearchParams();
const id = searchParams.get('id');
```

---

## Requirements

### 4.4.1 — Inbox Deep Linking
- [x] Update `apps/web/src/app/(dashboard)/inbox/page.tsx`:
  - [x] Read `id` from URL search params on mount: `useSearchParams().get('id')`
  - [x] If `id` is present → auto-select that notification (open detail drawer/panel)
  - [x] If notification with that ID is not in SSE buffer → fetch via `notification(id)` GraphQL query
  - [x] On notification selection change → update URL: `router.replace(/inbox?id=${n.id})`
  - [x] On detail close → clear URL param: `router.replace('/inbox')`
- [x] Wrap in `<Suspense>` boundary (Next.js requirement for `useSearchParams()`)
- [x] Handle case where notification ID doesn't exist (show "Notification not found")

### 4.4.2 — Callbacks Deep Linking
- [x] Update `apps/web/src/app/(dashboard)/callbacks/page.tsx`:
  - [x] Read `id` from URL search params on mount
  - [x] If `id` is present → auto-expand that callback's detail view
  - [x] If callback not in current list → fetch via `callbackRequest(id)` GraphQL query
  - [x] On callback selection → update URL: `router.replace(/callbacks?id=${cb.id})`
  - [x] On detail close → clear URL param
- [x] Handle invalid callback ID gracefully

### 4.4.3 — Documents Deep Linking
- [x] Update `apps/web/src/app/(dashboard)/documents/page.tsx`:
  - [x] Read `id` from URL search params on mount
  - [x] If `id` is present → auto-open document preview modal
  - [x] Fetch document metadata if not in current list
  - [x] On document preview open → update URL
  - [x] On preview close → clear URL param
- [x] Handle invalid document ID gracefully

### 4.4.4 — Service Provider Deep Linking
- [x] Verify `apps/web/src/app/(dashboard)/service-providers/[id]/page.tsx` works:
  - [x] Direct navigation to `/service-providers/<sp-id>` loads SP detail page
  - [x] Page fetches SP data by ID from GraphQL: `serviceProvider(id)`
  - [x] Back button returns to service providers list
  - [x] Invalid SP ID shows "Service provider not found" page

### 4.4.5 — Create Shared URL Param Hook
- [x] Create `apps/web/src/hooks/useDetailParam.ts`:
  - [x] Encapsulates `useSearchParams` + `useRouter` + `usePathname`
  - [x] Returns `{ selectedId, setSelectedId, clearSelectedId }`
  - [x] `setSelectedId(id)` → updates URL with `?id=<id>` using `router.replace()`
  - [x] `clearSelectedId()` → removes `?id` param from URL
  - [x] Uses `router.replace()` (not `push()`) to avoid back-button history pollution

---

## Implementation Details

### Shared Hook (`apps/web/src/hooks/useDetailParam.ts`)

```typescript
// apps/web/src/hooks/useDetailParam.ts
'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useCallback } from 'react';

export function useDetailParam(paramName: string = 'id') {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const selectedId = searchParams.get(paramName);

  const setSelectedId = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramName, id);
    router.replace(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname, paramName]);

  const clearSelectedId = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(paramName);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [searchParams, router, pathname, paramName]);

  return { selectedId, setSelectedId, clearSelectedId };
}
```

### Inbox Page Integration

```typescript
// apps/web/src/app/(dashboard)/inbox/page.tsx — key changes
import { Suspense } from 'react';
import { useDetailParam } from '@/hooks/useDetailParam';

function InboxContent() {
  const { selectedId, setSelectedId, clearSelectedId } = useDetailParam();
  const { notifications } = useNotifications();

  // Auto-select from URL param
  const selectedNotification = useMemo(() => {
    if (!selectedId) return null;
    return notifications.find((n) => n.id === selectedId) || null;
  }, [selectedId, notifications]);

  // If ID in URL but not in SSE buffer, fetch from API
  useEffect(() => {
    if (selectedId && !selectedNotification) {
      // Fetch notification by ID via GraphQL
    }
  }, [selectedId, selectedNotification]);

  const handleSelect = (notification: Notification) => {
    setSelectedId(notification.id);
  };

  const handleClose = () => {
    clearSelectedId();
  };

  // ... render with selectedNotification
}

// Wrap in Suspense (required for useSearchParams in Next.js 14)
export default function InboxPage() {
  return (
    <Suspense fallback={<InboxSkeleton />}>
      <InboxContent />
    </Suspense>
  );
}
```

### Callbacks Page Integration (same pattern)

```typescript
// apps/web/src/app/(dashboard)/callbacks/page.tsx — key changes
import { Suspense } from 'react';
import { useDetailParam } from '@/hooks/useDetailParam';

function CallbacksContent() {
  const { selectedId, setSelectedId, clearSelectedId } = useDetailParam();

  // Auto-expand callback detail from URL
  // On approve/reject → clearSelectedId()
  // On click callback → setSelectedId(cb.id)
}

export default function CallbacksPage() {
  return (
    <Suspense fallback={<CallbacksSkeleton />}>
      <CallbacksContent />
    </Suspense>
  );
}
```

### Deep Link URL Patterns

| Route | URL Pattern | Behavior |
|-------|-------------|----------|
| Inbox | `/inbox?id=<notification-id>` | Opens notification detail drawer |
| Callbacks | `/callbacks?id=<callback-id>` | Expands callback detail section |
| Documents | `/documents?id=<doc-id>` | Opens document preview modal |
| Service Providers | `/service-providers/<sp-id>` | Navigates to SP detail page (file-based route) |

---

## Verification

- [x] `/inbox?id=<valid-id>` → page loads with notification detail auto-opened
- [x] `/inbox?id=<invalid-id>` → shows "Notification not found" message
- [x] Clicking notification in inbox list → URL updates to `?id=<id>` without page reload
- [x] Closing notification detail → URL clears `?id` param
- [x] `/callbacks?id=<valid-id>` → callback detail auto-expanded
- [x] `/documents?id=<valid-id>` → document preview auto-opened
- [x] `/service-providers/<sp-id>` → SP detail page loads directly
- [x] Browser back button works correctly (doesn't create history pollution)
- [x] `router.replace()` is used (not `push()`) for param updates
- [x] Copy URL → paste in new tab → same detail view opens
- [x] Push notification click → navigates to `/inbox?id=<id>` → detail opens (integration with Task 4.1)
- [x] Search result selection → navigates with `?id` param → detail opens (integration with Task 4.3)
- [x] All pages use `<Suspense>` boundary around components using `useSearchParams()`
