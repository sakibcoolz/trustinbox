# Task 1.8 — Loading Skeleton Components

> **Section**: 1. Foundation & Shell  
> **Priority**: P1 — Important  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/components/Skeleton.tsx`

---

## Objective

Create reusable shimmer/skeleton loading placeholder components for cards, tables, charts, and text blocks to show during data fetching.

---

## Current State

Only a single spinner exists in `LayoutShell.tsx` for initial auth loading. No content-level skeletons.

---

## Requirements

### 1. Base Skeleton Element
- [x] `<Skeleton>` — generic block with shimmer animation
- [x] Props: `width`, `height`, `className`, `rounded` (full/lg/md)
- [x] Shimmer: gradient animation from left to right, 1.5s infinite

### 2. Preset Skeleton Variants

| Component | Skeleton Shape |
|-----------|---------------|
| `SkeletonCard` | Rounded rect 100% width, ~120px height with inner lines |
| `SkeletonKPI` | Small card with number placeholder + label placeholder |
| `SkeletonTable` | Header row + N body rows with alternating column widths |
| `SkeletonChart` | Rectangular area with faux bar/line shapes |
| `SkeletonText` | 3-4 lines of varying width text placeholders |
| `SkeletonAvatar` | Circle (32px/40px) |
| `SkeletonListItem` | Avatar + two text lines side by side |

### 3. Shimmer Animation CSS
```css
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #1a1d23 25%, #252a31 50%, #1a1d23 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

### 4. Usage Pattern
```tsx
// In any data page:
if (loading) return <SkeletonTable rows={10} cols={6} />;
// In dashboard:
if (loading) return (
  <div className="grid grid-cols-4 gap-4">
    {[...Array(4)].map((_, i) => <SkeletonKPI key={i} />)}
  </div>
);
```

---

## Implementation Plan

```tsx
// apps/provider/src/components/Skeleton.tsx
export function Skeleton({ className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`skeleton rounded-md ${className}`} {...props} />;
}

export function SkeletonKPI() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-5 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-4 py-3 border-b border-border-primary">
        {[...Array(cols)].map((_, i) => (
          <Skeleton key={i} className="h-3" style={{ width: `${60 + Math.random() * 60}px` }} />
        ))}
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-3 border-b border-border-primary last:border-0">
          {[...Array(cols)].map((_, c) => (
            <Skeleton key={c} className="h-3" style={{ width: `${40 + Math.random() * 80}px` }} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="bg-bg-card border border-border-primary rounded-xl p-6">
      <Skeleton className="h-3 w-32 mb-4" />
      <div className="flex items-end gap-2 h-48">
        {[...Array(12)].map((_, i) => (
          <Skeleton key={i} className="flex-1 rounded-t" style={{ height: `${30 + Math.random() * 70}%` }} />
        ))}
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/Skeleton.tsx` | Create — all skeleton variants |
| `apps/provider/src/app/globals.css` | Modify — add shimmer keyframe animation |

---

## Acceptance Criteria

- [ ] Base `<Skeleton>` renders with shimmer animation
- [ ] `<SkeletonKPI>` matches KPICard layout dimensions
- [ ] `<SkeletonTable rows={10} cols={6}>` matches real table layout
- [ ] `<SkeletonChart>` matches chart container dimensions
- [ ] Shimmer animation is smooth, doesn't cause layout shifts
- [ ] All skeletons use dark theme colors (no white flash)
- [ ] Accessible: `aria-hidden="true"` on skeleton elements, `aria-busy="true"` on parent

---

## Dependencies

- **Blocked by**: Task 1.11 (color palette for correct shimmer colors)
- **Blocks**: All feature pages that show loading states
- **Related**: Task 1.2 (initial auth loading), Task 3.1 (dashboard KPI loading)
