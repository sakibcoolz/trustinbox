# Task 2.7 — Extend Toast System

> **Phase**: 2 — Web App: Foundation & Data Layer
> **Files**: `apps/web/src/components/ui/toast-context.tsx` (new), `apps/web/src/components/ui/toast-container.tsx` (update)
> **Reference**: `apps/provider/src/components/Toast.tsx`

---

## Objective

Create a standalone `ToastProvider` / `useToast()` context with builder methods (`.success()`, `.error()`, `.warning()`, `.info()`), type-based auto-dismiss durations, a `MAX_TOASTS` limit, pause-on-hover, and exit animations. The current toast system is embedded inside the notification context and lacks these features.

---

## Current State

### Toast Container (`apps/web/src/components/ui/toast-container.tsx`)
- Renders toasts from `useNotifications()` context
- Has type-based **styling** (border colors per type: info, success, warning, error)
- Has SVG icons per type
- Has dismiss button
- **No standalone context** — toasts come from `NotificationProvider.addToast()`

### Notification Context (`apps/web/src/lib/notification-context.tsx`)
- Owns the toast state: `const [toasts, setToasts] = useState<Toast[]>([]);`
- `addToast()` — generates ID, adds to array, auto-dismisses after **5 seconds for all types**
- `dismissToast()` — removes by ID
- Toast interface: `{ id, type, title, body? }`
- **Limitations**: No MAX_TOASTS cap, no type-based durations, no pause-on-hover, no builder methods

### Provider App Reference (`apps/provider/src/components/Toast.tsx`)
- Full `ToastProvider` + `useToast()` context with `createPortal`
- Type-based durations: success=3000, info=4000, warning=5000, error=6000
- `MAX_TOASTS = 5` — excess toasts trimmed from start
- Pause-on-hover (clears timer on `mouseEnter`, restarts on `mouseLeave`)
- Exit animation (`exiting` state → 150ms delay before removal)
- Builder methods: `toast()`, `success()`, `error()`, `warning()`, `info()`, `dismissAll()`
- Action buttons on toasts
- Uses `lucide-react` icons (CheckCircle, XCircle, AlertTriangle, Info, X)

---

## Requirements

### New File: `toast-context.tsx`
- [ ] Create `apps/web/src/components/ui/toast-context.tsx`
- [ ] Define `Toast` interface: `{ id, type, title, description?, action?, duration? }`
- [ ] Define `ToastContextValue` interface with `toast()`, `success()`, `error()`, `warning()`, `info()`, `dismissAll()`
- [ ] Create `ToastContext` with `createContext`
- [ ] Create `useToast()` hook — throws if used outside provider
- [ ] Create `ToastProvider` component:
  - [ ] Manages toast state array
  - [ ] `MAX_TOASTS = 5` — trim oldest when exceeded
  - [ ] `addToast()` — generates unique ID, appends to array
  - [ ] `dismiss()` — removes by ID
  - [ ] `dismissAll()` — clears array
  - [ ] Renders toast container via `createPortal` into `document.body`
  - [ ] Wait for mount (`useEffect`) before rendering portal (SSR safety)

### Type-Based Durations
- [ ] `success`: 3000ms
- [ ] `info`: 4000ms
- [ ] `warning`: 5000ms
- [ ] `error`: 6000ms
- [ ] Allow override via `duration` field on individual toast

### Toast Item Component
- [ ] Extract `ToastItem` as a separate component within the file
- [ ] Pause timer on mouse enter, restart on mouse leave
- [ ] Exit animation: set `exiting` state → 150ms delay → call `onDismiss`
- [ ] Dismiss button (X icon)
- [ ] Optional action button

### Styling
- [ ] Use semantic Tailwind tokens matching existing toast-container styles:
  - `success`: `border-l-status-success text-status-success`
  - `error`: `border-l-status-error text-status-error`  
  - `warning`: `border-l-status-warning text-status-warning`
  - `info`: `border-l-status-info text-status-info`
- [ ] Background: `bg-bg-elevated`, border: `border border-border-secondary`
- [ ] Width: `w-80`, rounded: `rounded-xl`, shadow: `shadow-2xl`
- [ ] Position: `fixed top-4 right-4 z-[9999]` (match provider app)

### Icons
- [ ] Use inline SVG icons (same as current toast-container.tsx) — NOT lucide-react
- [ ] Web app doesn't have `lucide-react` as a dependency; keep current SVG approach
- [ ] Alternatively, check if `lucide-react` is already installed and use it if available

### Update Toast Container
- [ ] Update `apps/web/src/components/ui/toast-container.tsx` to import from toast-context OR
- [ ] Remove it entirely if the portal rendering in `ToastProvider` replaces it

### Update Providers
- [ ] Add `ToastProvider` to `apps/web/src/components/providers.tsx`
- [ ] Place it **inside** `ApolloProvider` but wrapping `NotificationProvider` (so notifications can use `useToast`)
- [ ] Remove `<ToastContainer />` from providers if rendering moves to `ToastProvider`

### Migrate NotificationProvider
- [ ] Update `notification-context.tsx` to use `useToast()` instead of internal toast state
- [ ] OR keep both systems temporarily and migrate in a later task
- [ ] If migrating: remove `toasts` state, `addToast`, `dismissToast` from notification context
- [ ] If migrating: notification SSE handler calls `useToast().info()` / `useToast().success()` instead

---

## Implementation Details

### Toast Context
```typescript
'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// ─── Types ──────────────────────────────────────────────

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration?: number;
}

interface ToastContextValue {
  toast: (t: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismissAll: () => void;
}

// ─── Constants ──────────────────────────────────────────

const DURATIONS: Record<Toast['type'], number> = {
  success: 3000,
  info: 4000,
  warning: 5000,
  error: 6000,
};

const MAX_TOASTS = 5;

// ─── Context ────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>');
  return ctx;
}
```

### Toast Item with Pause-on-Hover
```typescript
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [exiting, setExiting] = useState(false);

  const startTimer = useCallback(() => {
    const duration = toast.duration ?? DURATIONS[toast.type];
    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(onDismiss, 150);
    }, duration);
  }, [toast, onDismiss]);

  const pauseTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  useEffect(() => { startTimer(); return pauseTimer; }, []);

  return (
    <div
      onMouseEnter={pauseTimer}
      onMouseLeave={startTimer}
      className={cn(
        'flex items-start gap-3 w-80 p-4 bg-bg-elevated border border-border-secondary rounded-xl shadow-2xl border-l-4',
        COLORS[toast.type],
        exiting ? 'animate-toast-out' : 'animate-toast-in',
      )}
    >
      {/* icon, content, dismiss button */}
    </div>
  );
}
```

### Provider with Portal
```typescript
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const addToast = useCallback((t: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => {
      const next = [...prev, { ...t, id }];
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next;
    });
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => setToasts([]), []);

  const value: ToastContextValue = {
    toast: addToast,
    success: (title, description) => addToast({ type: 'success', title, description }),
    error: (title, description) => addToast({ type: 'error', title, description }),
    warning: (title, description) => addToast({ type: 'warning', title, description }),
    info: (title, description) => addToast({ type: 'info', title, description }),
    dismissAll,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted && createPortal(
        <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
```

### Updated Providers Order
```typescript
// apps/web/src/components/providers.tsx
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ApolloProvider client={apolloClient}>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            {children}
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </ApolloProvider>
  );
}
```

---

## Animation Classes

Add to `apps/web/src/app/globals.css` or Tailwind config:

```css
@keyframes toast-in {
  from { opacity: 0; transform: translateX(100%); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes toast-out {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(100%); }
}
```

Check if `animate-slide-in-right` already exists in the web app's `globals.css` — if so, reuse it instead of creating new animation classes.

---

## Migration Strategy

### Option A: Full Migration (recommended)
1. Create `ToastProvider` + `useToast()`
2. Update `notification-context.tsx` to call `useToast()` for SSE toast display
3. Remove toast state from `NotificationContext`
4. Remove `<ToastContainer />` component usage (portal in ToastProvider replaces it)

### Option B: Gradual Migration
1. Create `ToastProvider` + `useToast()` alongside existing system
2. New components use `useToast()`
3. SSE notifications continue using internal `addToast()` in notification-context
4. Merge in a separate task

---

## Verification Checklist

- [ ] `useToast()` hook is accessible from any component in the tree
- [ ] `toast.success('Title')` shows a green success toast
- [ ] `toast.error('Title', 'Description')` shows a red error toast
- [ ] `toast.warning('Title')` shows a yellow warning toast
- [ ] `toast.info('Title')` shows a blue info toast
- [ ] Success toast auto-dismisses after 3 seconds
- [ ] Error toast auto-dismisses after 6 seconds
- [ ] Hovering a toast pauses the dismiss timer
- [ ] Moving mouse away restarts the timer
- [ ] Maximum 5 toasts visible at once (oldest removed first)
- [ ] `dismissAll()` clears all toasts
- [ ] Toast portal renders at `document.body` level (not affected by parent overflow)
- [ ] No SSR hydration errors (mount guard in place)
- [ ] Existing SSE notification toasts still work after migration
- [ ] Animation: toasts slide in from right, slide out on dismiss

---

## Dependencies

- **Depends on**: Nothing (independent, but should be wired into providers after Task 2.2)
- **Blocks**: Phase 3 components that show toast feedback on mutations

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/components/ui/toast-context.tsx` | **New file** — ToastProvider + useToast |
| `apps/web/src/components/ui/toast-container.tsx` | **Update/remove** — current toast rendering |
| `apps/web/src/lib/notification-context.tsx` | **Update** — migrate toast display to useToast |
| `apps/web/src/components/providers.tsx` | **Update** — add ToastProvider to tree |
| `apps/provider/src/components/Toast.tsx` | Reference implementation |
| `apps/web/src/app/globals.css` | May need animation keyframes |
| `apps/web/tailwind.config.js` | Check existing animation utilities |
