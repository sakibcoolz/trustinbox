# Task 1.16 — Modal/Dialog Component

> **Section**: 1. Foundation & Shell — Design System  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ui/Modal.tsx`

---

## Objective

Create a centered overlay modal/dialog component with backdrop blur for confirmations, forms, and alerts.

---

## Current State

No modal component. Confirmations and forms would need to be built inline.

---

## Requirements

### 1. Modal Variants
| Variant | Size | Use Case |
|---------|------|----------|
| `sm` | 400px | Confirmations, alerts |
| `md` | 512px | Forms, details |
| `lg` | 640px | Complex forms, wizards |
| `xl` | 800px | Full editors, previews |

### 2. Modal Behavior
- [ ] Centered vertically and horizontally with some top offset
- [ ] Backdrop: `bg-black/50 backdrop-blur-sm`
- [ ] Close on Escape, close button, and optionally backdrop click
- [ ] Enter animation: scale(0.95) → scale(1) + fade-in (150ms)
- [ ] Body scroll lock when open
- [ ] Focus trap inside modal
- [ ] Render as portal to `document.body`

### 3. Component API
```typescript
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  closeOnBackdrop?: boolean; // default true
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

### 4. Confirmation Dialog Preset
```typescript
interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string; // "Delete", "Confirm", etc.
  variant?: 'danger' | 'default'; // red or blue confirm button
  loading?: boolean;
}
```

---

## Implementation Plan

```tsx
export function Modal({ open, onClose, title, description, size = 'md', closeOnBackdrop = true, children, footer }: ModalProps) {
  if (!open) return null;
  
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={closeOnBackdrop ? onClose : undefined} />
      <div className={`relative w-full ${SIZES[size]} bg-bg-elevated border border-border-primary rounded-xl shadow-2xl animate-modal-in`}>
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-0">
          <div>
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            {description && <p className="text-sm text-text-secondary mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover -mt-1">
            <X size={16} />
          </button>
        </div>
        {/* Body */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">{children}</div>
        {/* Footer */}
        {footer && <div className="px-6 pb-5 flex items-center justify-end gap-3">{footer}</div>}
      </div>
    </div>,
    document.body
  );
}

export function ConfirmDialog({ open, onConfirm, onCancel, title, description, confirmLabel = 'Confirm', variant = 'default', loading }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onCancel} title={title} description={description} size="sm" footer={
      <>
        <button onClick={onCancel} className="px-4 py-2 text-sm text-text-secondary border border-border-primary rounded-lg hover:bg-bg-hover">Cancel</button>
        <button onClick={onConfirm} disabled={loading}
          className={`px-4 py-2 text-sm font-medium text-white rounded-lg ${variant === 'danger' ? 'bg-status-error hover:bg-status-error/90' : 'bg-accent-blue hover:bg-accent-blue/90'}`}>
          {loading ? 'Processing…' : confirmLabel}
        </button>
      </>
    }>{null}</Modal>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/ui/Modal.tsx` | Create — Modal + ConfirmDialog |
| `apps/provider/src/app/globals.css` | Modify — add `animate-modal-in` keyframe |

---

## Acceptance Criteria

- [ ] Modal centers on screen with backdrop blur
- [ ] Escape closes modal
- [ ] Focus trapped inside modal
- [ ] ConfirmDialog shows title, description, Cancel + Confirm buttons
- [ ] Danger variant shows red confirm button
- [ ] Loading state disables confirm button and shows "Processing…"
- [ ] Body scroll locked when modal open
- [ ] Accessible: `role="dialog"`, `aria-modal="true"`, `aria-labelledby`

---

## Dependencies

- **Blocked by**: Task 1.11 (colors)
- **Blocks**: Tasks 5.10, 8.9, 9.8, 10.10, 12.4 (all confirmation/form modals)
- **Related**: Task 1.15 (drawer), Task 17.14 (focus trap)
