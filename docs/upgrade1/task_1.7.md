# Task 1.7 — Toast/Notification System

> **Section**: 1. Foundation & Shell  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/components/Toast.tsx`

---

## Objective

Build a stacked toast notification system for showing success, error, warning, and info feedback across the entire app.

---

## Current State

No toast system exists. Feedback is only provided via inline elements in individual forms.

---

## Requirements

### 1. Toast Types
| Type | Icon | Border Color | Use Case |
|------|------|-------------|----------|
| `success` | CheckCircle | `border-status-success` | Operation completed (notification sent, campaign launched) |
| `error` | XCircle | `border-status-error` | API failure, validation error, policy block |
| `warning` | AlertTriangle | `border-status-warning` | Rate limit approaching, expiry warning |
| `info` | Info | `border-status-info` | Real-time event (new callback, message received) |

### 2. Toast Behavior
- [x] Stack vertically from top-right corner
- [x] Max 5 visible toasts at once (oldest dismissed when exceeded)
- [x] Auto-dismiss: success (3s), info (4s), warning (5s), error (6s)
- [x] Manual dismiss via close (X) button
- [x] Hover pauses auto-dismiss timer
- [x] Enter animation: slide-in from right + fade-in (200ms)
- [x] Exit animation: slide-out right + fade-out (150ms)

### 3. Toast Content
- [x] Title (bold, required)
- [x] Description (optional, secondary text)
- [x] Action button (optional, e.g., "View", "Retry", "Undo")
- [x] Close button (always present)

### 4. Toast Context API
```typescript
interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  duration?: number; // ms, override default
}

interface ToastContext {
  toast: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
  dismiss: (id: string) => void;
  dismissAll: () => void;
}
```

### 5. Integration
- [x] `<ToastProvider>` wraps the app in root layout
- [x] `useToast()` hook available from any component
- [x] Toast container renders as portal to `document.body` (above all z-indexes)

---

## Implementation Plan

```tsx
'use client';
import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const COLORS = {
  success: 'border-l-status-success text-status-success',
  error: 'border-l-status-error text-status-error',
  warning: 'border-l-status-warning text-status-warning',
  info: 'border-l-status-info text-status-info',
};

const DURATIONS = { success: 3000, info: 4000, warning: 5000, error: 6000 };

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const Icon = ICONS[toast.type];
  return (
    <div className={`flex items-start gap-3 px-4 py-3 bg-bg-elevated border border-border-primary ${COLORS[toast.type]} border-l-4 rounded-lg shadow-xl max-w-sm animate-slide-in-right`}>
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-text-primary">{toast.title}</p>
        {toast.description && <p className="text-xs text-text-secondary mt-0.5">{toast.description}</p>}
        {toast.action && (
          <button onClick={toast.action.onClick} className="text-xs text-accent-blue hover:underline mt-1">
            {toast.action.label}
          </button>
        )}
      </div>
      <button onClick={onDismiss} className="text-text-muted hover:text-text-primary shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/Toast.tsx` | Create — Toast component + Provider |
| `apps/provider/src/hooks/useToast.ts` | Create — `useToast()` hook |
| `apps/provider/src/app/layout.tsx` | Modify — wrap with `<ToastProvider>` |
| `apps/provider/src/app/globals.css` | Modify — add slide-in-right animation keyframe |

---

## Acceptance Criteria

- [x] `useToast().success('Saved!')` shows green toast top-right
- [x] `useToast().error('Failed', 'Could not send notification')` shows red toast with description
- [x] Toasts stack vertically, newest on top
- [x] Auto-dismiss works per type, hover pauses timer
- [x] Close button dismisses immediately
- [x] Action button fires callback
- [x] Max 5 visible at once
- [x] Animations are smooth (no layout shift)
- [x] Accessible: `role="alert"` and `aria-live="polite"` on toast container

---

## Dependencies

- **Blocked by**: Task 1.1 (root layout for provider wrapping)
- **Blocks**: All feature tasks that show feedback (5.13, 7.11, 9.17, etc.)
- **Related**: Task 1.1 (layout provider integration), Task 16.2 (real-time event toasts)
