# Task 1.15 — Drawer Component

> **Section**: 1. Foundation & Shell — Design System  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ui/Drawer.tsx`

---

## Objective

Create a right-slide panel (drawer) for viewing detail information without navigating away from the current page.

---

## Current State

No drawer component exists. Detail views require full page navigation.

---

## Requirements

### 1. Drawer Behavior
- [ ] Slides in from right edge of viewport
- [ ] Backdrop overlay: `bg-black/50 backdrop-blur-sm`
- [ ] Close on backdrop click, Escape key, or close button
- [ ] Width options: `sm` (384px), `md` (512px), `lg` (640px), `xl` (768px), `full` (100%)
- [ ] Transition: `transform translateX` 250ms ease

### 2. Drawer Layout
- [ ] Header: title + close button, sticky top with bottom border
- [ ] Body: scrollable content area
- [ ] Footer (optional): sticky bottom with top border for action buttons
- [ ] Focus trap when open (tabbing stays within drawer)

### 3. Component API
```typescript
interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

---

## Implementation Plan

```tsx
'use client';
import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const SIZES = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-xl', full: 'max-w-full' };

export function Drawer({ open, onClose, title, size = 'md', children, footer }: DrawerProps) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleEsc(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    if (open) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose} />
      {/* Panel */}
      <div ref={drawerRef}
        className={`fixed top-0 right-0 bottom-0 w-full ${SIZES[size]} bg-bg-secondary border-l border-border-primary z-50 flex flex-col transition-transform duration-250 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-primary shrink-0">
          <h2 className="text-sm font-semibold text-text-primary">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover">
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-6 py-4 border-t border-border-primary flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/ui/Drawer.tsx` | Create |

---

## Acceptance Criteria

- [ ] Drawer slides in from right with smooth animation
- [ ] Backdrop dims content and closes on click
- [ ] Escape key closes drawer
- [ ] Body scrolls independently, header/footer stay fixed
- [ ] Focus trapped inside drawer when open
- [ ] Body scroll locked when drawer is open
- [ ] All size variants render at correct widths
- [ ] Works on mobile — full width on small screens

---

## Dependencies

- **Blocked by**: Task 1.11 (color tokens)
- **Blocks**: Tasks 4.7 (customer detail), 5.4 (notification detail), 8.6 (document preview)
- **Related**: Task 1.16 (modal), Task 1.5 (mobile drawer)
