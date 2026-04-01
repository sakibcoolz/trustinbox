# Task 1.11 — Color Palette & Design Tokens

> **Section**: 1. Foundation & Shell — Design System  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Small  
> **File**: `apps/provider/tailwind.config.js`, `apps/provider/src/app/globals.css`
> **Status**: ✅ Complete

---

## Objective

Ensure the full VS Code dark-inspired color palette is applied as Tailwind design tokens, providing consistent colors for backgrounds, text, borders, accents, and status indicators.

---

## Current State

Tailwind config already defines the palette:
```javascript
colors: {
  'bg-primary': '#0b0d0f',     // deepest background
  'bg-secondary': '#111418',   // sidebar, header
  'bg-tertiary': '#1a1d23',    // hover areas
  'bg-hover': '#1e2228',       // hover state
  'bg-active': '#252a31',      // active/pressed
  'bg-card': '#151820',        // card surfaces
  'bg-elevated': '#1c2028',    // modals, dropdowns
  'bg-input': '#0d1017',       // form input fields
  'border-primary': '#1e2228', // default borders
  'border-secondary': '#2a2f38', // stronger borders
  'border-active': '#3b82f6',  // focused/active borders
  'text-primary': '#e4e7eb',   // primary text
  'text-secondary': '#8b929a', // secondary text
  'text-muted': '#545b65',     // muted text, placeholders
  'accent-blue': '#3b82f6',    // primary accent
  'accent-green': '#22c55e',
  'accent-orange': '#f59e0b',
  'accent-red': '#ef4444',
  'accent-purple': '#a855f7',
  'accent-cyan': '#06b6d4',
  'status-success': '#22c55e',
  'status-warning': '#f59e0b',
  'status-error': '#ef4444',
  'status-info': '#3b82f6',
}
```

---

## Requirements

### 1. Missing Tokens to Add
- [x] `bg-surface`: `#10141a` — between primary and secondary, for page content areas
- [x] `bg-overlay`: `rgba(0,0,0,0.5)` — backdrop for modals/drawers
- [x] `border-focus`: `#3b82f6` (alias for accent-blue, semantic meaning)
- [x] `text-inverse`: `#0b0d0f` — for text on light/accent backgrounds
- [x] `text-link`: `#3b82f6` — explicit link color
- [x] `accent-teal`: `#14b8a6` — additional accent for variety

### 2. CSS Custom Properties
- [x] Export all colors as CSS `--color-*` variables in `:root` for non-Tailwind usage
- [x] Ensure no hardcoded hex values in components — all reference Tailwind classes or CSS vars

### 3. Semantic Color Aliases
- [x] `ring-focus`: maps to `accent-blue` for focus ring styles
- [x] Add Tailwind `ringColor` and `outlineColor` defaults

### 4. Global Base Styles (in globals.css)
- [x] Body: `bg-bg-primary text-text-primary` (done)
- [x] Default border color: `border-border-primary` (done)
- [x] Custom scrollbar styling (done)
- [x] Selection color: `::selection { background: rgba(59, 130, 246, 0.3); }`
- [x] Focus-visible ring: `focus-visible:ring-2 focus-visible:ring-accent-blue focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary`
- [x] Placeholder text: `placeholder:text-text-muted`

---

## Implementation Plan

### Tailwind Config Additions
```javascript
// Add to extend.colors:
'bg-surface': '#10141a',
'bg-overlay': 'rgba(0,0,0,0.5)',
'border-focus': '#3b82f6',
'text-inverse': '#0b0d0f',
'text-link': '#3b82f6',
'accent-teal': '#14b8a6',
```

### Global CSS Additions
```css
@layer base {
  ::selection {
    background: rgba(59, 130, 246, 0.3);
    color: #e4e7eb;
  }
  
  input, textarea, select {
    @apply placeholder:text-text-muted;
  }
  
  *:focus-visible {
    @apply outline-none ring-2 ring-accent-blue ring-offset-2 ring-offset-bg-primary;
  }
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/tailwind.config.js` | Modify — add missing color tokens |
| `apps/provider/src/app/globals.css` | Modify — add selection, focus, placeholder styles |

---

## Acceptance Criteria

- [x] All defined colors are usable as Tailwind utility classes
- [x] No hardcoded hex colors in any component (audit)
- [x] Selection highlighting uses blue tint
- [x] Focus-visible ring appears on keyboard navigation
- [x] Form inputs show muted placeholder text
- [x] Dark scrollbar styling works in Chrome, Firefox, Safari

---

## Dependencies

- **Blocked by**: None (foundational)
- **Blocks**: Tasks 1.12–1.19 (all design system components)
- **Related**: Task 1.1 (root layout CSS)
