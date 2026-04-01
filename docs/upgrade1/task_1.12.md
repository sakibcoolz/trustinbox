# Task 1.12 — Card Component

> **Section**: 1. Foundation & Shell — Design System  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ui/Card.tsx`

---

## Objective

Create a reusable Card component with consistent dark-theme styling, hover elevation, and optional header/footer slots.

---

## Current State

Cards are implemented inline with raw Tailwind classes: `bg-bg-card border border-border-primary rounded-xl p-6`. No shared component.

---

## Requirements

### 1. Card Variants

| Variant | Styles | Use Case |
|---------|--------|----------|
| `default` | `bg-bg-card border-border-primary` | General content cards |
| `elevated` | `bg-bg-elevated border-border-secondary shadow-lg` | Modals, dropdowns, popovers |
| `interactive` | Default + `hover:border-border-secondary hover:shadow-md cursor-pointer` | Clickable cards (bot cards, campaign cards) |
| `outlined` | `bg-transparent border-border-primary` | Form sections, minimal containment |

### 2. Component API
```typescript
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'interactive' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg'; // p-0, p-4, p-5, p-6
  noBorder?: boolean;
}

interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string;
  description?: string;
  action?: React.ReactNode; // right-aligned action button/link
}
```

### 3. Sub-Components
- [x] `<Card>` — main wrapper
- [x] `<CardHeader>` — title + optional description + action, with bottom border
- [x] `<CardContent>` — padded content area
- [x] `<CardFooter>` — bottom area with top border, typically for actions

---

## Implementation Plan

```tsx
import { cn } from '@/lib/utils';

const VARIANTS = {
  default: 'bg-bg-card border border-border-primary',
  elevated: 'bg-bg-elevated border border-border-secondary shadow-lg',
  interactive: 'bg-bg-card border border-border-primary hover:border-border-secondary hover:shadow-md cursor-pointer transition-all',
  outlined: 'bg-transparent border border-border-primary',
};

const PADDING = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

export function Card({ variant = 'default', padding = 'none', noBorder, className, children, ...props }: CardProps) {
  return (
    <div className={cn('rounded-xl', VARIANTS[variant], noBorder && 'border-0', PADDING[padding], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ title, description, action, className, ...props }: CardHeaderProps) {
  return (
    <div className={cn('flex items-center justify-between px-6 py-4 border-b border-border-primary', className)} {...props}>
      <div>
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        {description && <p className="text-xs text-text-secondary mt-0.5">{description}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-6 py-4', className)} {...props}>{children}</div>;
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex items-center justify-end gap-3 px-6 py-4 border-t border-border-primary', className)} {...props}>{children}</div>;
}
```

### cn utility
```typescript
// apps/provider/src/lib/utils.ts
export function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(' ');
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/ui/Card.tsx` | Create |
| `apps/provider/src/lib/utils.ts` | Create — `cn()` class utility |

---

## Acceptance Criteria

- [x] `<Card variant="default" padding="lg">` renders dark card with rounded corners
- [x] `<Card variant="interactive">` shows hover elevation effect
- [x] `<CardHeader title="..." action={<button>}/>` renders title + right action
- [x] All existing inline card styles can be replaced with Card component
- [x] Consistent border radius (rounded-xl) across all variants

---

## Dependencies

- **Blocked by**: Task 1.11 (color tokens)
- **Blocks**: All feature pages using cards (3.1, 4.7, 10.1, etc.)
- **Related**: Task 1.8 (skeleton card variant)
