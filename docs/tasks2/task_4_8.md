# Task 4.8 — Dark/Light Theme Toggle

> **Phase**: 4 — Web App: Enhanced Features
> **Task**: 4.8 — Dark/Light Theme Toggle
> **Files**: `apps/web/src/lib/theme-context.tsx` (new), `apps/web/src/components/providers.tsx`, `apps/web/src/app/layout.tsx`, `apps/web/tailwind.config.js`, `apps/web/src/components/layout/header.tsx`, `apps/web/src/app/globals.css`
> **Dependencies**: None (can be done in parallel with other Phase 4 tasks)

---

## Objective

Add dark/light/system theme toggle support to the web app. Currently the app is hardcoded to dark mode only. Create a theme context, define light mode color tokens, update Tailwind config to use CSS class-based dark mode, and add a toggle to the header profile dropdown.

---

## Current State

### Hardcoded Dark Theme
```typescript
// apps/web/src/app/layout.tsx
<html lang="en" className="dark">
  <body className="font-sans antialiased">
    <Providers>{children}</Providers>
  </body>
</html>
```
- `className="dark"` is always applied — no runtime toggle
- No theme context, no localStorage persistence, no system preference detection

### Tailwind Config — NO `darkMode` Setting
```javascript
// apps/web/tailwind.config.js
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // ALL colors are dark-mode only — hardcoded hex values
        'bg-primary': '#0b0d0f',
        'bg-secondary': '#111418',
        'bg-tertiary': '#1a1d23',
        'bg-hover': '#1e2228',
        'text-primary': '#e4e7eb',
        'text-secondary': '#8b929a',
        'text-muted': '#545b65',
        'accent-blue': '#3b82f6',
        // ... 30+ color definitions, all dark-mode hex
      },
    },
  },
  plugins: [],
};
```
- No `darkMode: 'class'` configuration
- Colors are defined as static values, NOT as CSS variables
- All components use these tokens directly: `bg-bg-primary`, `text-text-primary`, etc.

### Globals.css — Dark-Only Variables
```css
/* apps/web/src/app/globals.css */
@layer base {
  :root {
    --bg-primary: #0b0d0f;
    --bg-secondary: #111418;
    --bg-tertiary: #1a1d23;
    --accent-blue: #3b82f6;
  }
  body {
    @apply bg-bg-primary text-text-primary;
  }
}
```
- CSS variables exist but are dark-mode only
- No `:root.light` or `.dark` class-scoped variables

### No Theme Toggle UI
```
❌ No theme toggle in header, settings, or anywhere
❌ No theme context or provider
❌ No localStorage theme persistence
❌ No system preference detection (prefers-color-scheme)
```

---

## Requirements

### 4.8.1 — Update Tailwind Config for CSS Variable Approach
- [x] Add `darkMode: 'class'` to `tailwind.config.js`
- [x] Convert color definitions to use CSS custom properties:
  - [x] Keep token names the same (`bg-primary`, `text-primary`, etc.)
  - [x] Map each color to a CSS variable: `'bg-primary': 'var(--bg-primary)'`
  - [x] This allows theme switching by changing CSS variable values
- [x] Accent colors (blue, green, red, orange, purple) stay the same in both themes

### 4.8.2 — Define Light Theme Colors
- [x] Add light theme CSS variable overrides in `globals.css`:
  - [x] `:root` (default/light) → light theme colors
  - [x] `.dark` → dark theme colors (current values)
  - [x] Or: default dark, `.light` override — depending on default preference
- [x] Light theme color palette:
  - [x] Backgrounds: white/gray tones (`#ffffff`, `#f8f9fa`, `#f0f1f3`, `#e8eaed`)
  - [x] Text: dark tones (`#1a1a2e`, `#4a4a5a`, `#7a7a8a`)
  - [x] Borders: light gray (`#e0e2e6`, `#d0d2d6`)
  - [x] Cards: white with subtle shadow
  - [x] Keep accent colors unchanged (blue, green, red, etc.)

### 4.8.3 — Create Theme Context
- [x] Create `apps/web/src/lib/theme-context.tsx`:
  - [x] Type: `dark` | `light` | `system`
  - [x] `useTheme()` hook → returns `{ theme, setTheme, resolvedTheme }`
  - [x] `resolvedTheme`: actual applied theme (`dark` or `light`) — resolves `system` preference
  - [x] Persist theme choice to `localStorage` key: `trustinbox:theme`
  - [x] Default: `system` (respects `prefers-color-scheme`)
  - [x] Apply `dark` or `light` class to `<html>` element
  - [x] Listen for `prefers-color-scheme` changes when set to `system`

### 4.8.4 — Wire Theme Provider
- [x] Update `apps/web/src/components/providers.tsx`:
  - [x] Add `ThemeProvider` wrapping `AuthProvider`
- [x] Update `apps/web/src/app/layout.tsx`:
  - [x] Remove hardcoded `className="dark"` from `<html>`
  - [x] Add `suppressHydrationWarning` to `<html>` (prevents SSR mismatch warning)
  - [x] Add inline script to apply theme class before first paint (avoid flash of wrong theme)

### 4.8.5 — Add Theme Toggle to Header
- [x] Update `apps/web/src/components/layout/header.tsx`:
  - [x] Add theme toggle in profile dropdown menu (between Settings and Sign Out)
  - [x] Three options: Light, Dark, System
  - [x] Show active option with check icon
  - [x] Or: use a single toggle icon in the header bar (sun/moon icon)
  - [x] Animate icon transition between sun ↔ moon

---

## Implementation Details

### Theme Context (`apps/web/src/lib/theme-context.tsx`)

```typescript
// apps/web/src/lib/theme-context.tsx
'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'dark' | 'light' | 'system';
type ResolvedTheme = 'dark' | 'light';

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'dark',
  setTheme: () => {},
});

const STORAGE_KEY = 'trustinbox:theme';

function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  return (localStorage.getItem(STORAGE_KEY) as Theme) || 'system';
}

function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.remove('dark', 'light');
  root.classList.add(resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('dark');

  // Initialize from localStorage
  useEffect(() => {
    const stored = getStoredTheme();
    setThemeState(stored);
    const resolved = resolveTheme(stored);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      const resolved = e.matches ? 'dark' : 'light';
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    const resolved = resolveTheme(newTheme);
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
```

### Updated Tailwind Config

```javascript
// apps/web/tailwind.config.js
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Map to CSS custom properties
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'bg-hover': 'var(--bg-hover)',
        'bg-active': 'var(--bg-active)',
        'bg-card': 'var(--bg-card)',
        'bg-elevated': 'var(--bg-elevated)',
        'bg-input': 'var(--bg-input)',
        'border-primary': 'var(--border-primary)',
        'border-secondary': 'var(--border-secondary)',
        'border-hover': 'var(--border-hover)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        // Accents stay constant across themes
        'accent-blue': '#3b82f6',
        'accent-green': '#22c55e',
        'accent-red': '#ef4444',
        'accent-orange': '#f59e0b',
        'accent-purple': '#a855f7',
        'accent-cyan': '#06b6d4',
        // ... etc
      },
    },
  },
};
```

### Updated Globals.css — Dual Theme Variables

```css
/* apps/web/src/app/globals.css */
@layer base {
  /* Light theme (default when .light class is on <html>) */
  :root.light {
    --bg-primary: #f8f9fa;
    --bg-secondary: #ffffff;
    --bg-tertiary: #f0f1f3;
    --bg-hover: #e8eaed;
    --bg-active: #dfe1e5;
    --bg-card: #ffffff;
    --bg-elevated: #ffffff;
    --bg-input: #f4f5f7;
    --border-primary: #e0e2e6;
    --border-secondary: #d0d2d6;
    --border-hover: #c0c2c6;
    --text-primary: #1a1a2e;
    --text-secondary: #4a4a5a;
    --text-muted: #7a7a8a;
  }

  /* Dark theme (default) */
  :root,
  :root.dark {
    --bg-primary: #0b0d0f;
    --bg-secondary: #111418;
    --bg-tertiary: #1a1d23;
    --bg-hover: #1e2228;
    --bg-active: #252a31;
    --bg-card: #151820;
    --bg-elevated: #1c2028;
    --bg-input: #0d1017;
    --border-primary: #1e2228;
    --border-secondary: #2a2f38;
    --border-hover: #3a3f48;
    --text-primary: #e4e7eb;
    --text-secondary: #8b929a;
    --text-muted: #545b65;
  }
}
```

### Flash Prevention Script (in layout.tsx)

```tsx
// apps/web/src/app/layout.tsx
<html lang="en" suppressHydrationWarning>
  <head>
    <script
      dangerouslySetInnerHTML={{
        __html: `
          (function() {
            try {
              var theme = localStorage.getItem('trustinbox:theme') || 'system';
              var resolved = theme;
              if (theme === 'system') {
                resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
              }
              document.documentElement.classList.add(resolved);
            } catch(e) {
              document.documentElement.classList.add('dark');
            }
          })();
        `,
      }}
    />
  </head>
  <body className="font-sans antialiased">
    <Providers>{children}</Providers>
  </body>
</html>
```

### Theme Toggle in Header Dropdown

```tsx
// In header.tsx profile dropdown, add between Settings and Sign Out:
import { useTheme } from '@/lib/theme-context';

const { theme, setTheme } = useTheme();

// Theme options in dropdown
<div className="py-1 border-t border-border-primary">
  <p className="px-4 py-1.5 text-2xs text-text-muted font-medium uppercase tracking-wider">Theme</p>
  {(['light', 'dark', 'system'] as const).map((option) => (
    <button
      key={option}
      onClick={() => setTheme(option)}
      className="w-full flex items-center justify-between px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-tertiary transition-colors"
    >
      <span className="capitalize">{option}</span>
      {theme === option && (
        <svg className="w-4 h-4 text-accent-blue" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
    </button>
  ))}
</div>
```

---

## Verification

- [x] Default theme: `system` — respects OS preference
- [x] Switching to "Light" → all backgrounds, text, borders update to light palette
- [x] Switching to "Dark" → restores original dark theme exactly
- [x] Switching to "System" → follows `prefers-color-scheme` media query
- [x] Theme persists across page refreshes (localStorage)
- [x] No flash of wrong theme on page load (inline script applies class immediately)
- [x] All semantic color tokens work in both modes: `bg-bg-primary`, `text-text-primary`, etc.
- [x] Accent colors (blue, green, red, etc.) look good in both themes
- [x] Cards, badges, chips, buttons — all render correctly in light mode
- [x] Scrollbar styling adjusts to theme (or remains subtle in both)
- [x] Chat bubbles are legible in both themes
- [x] System theme changes (OS toggle) update the app immediately when set to "System"
- [x] Header dropdown shows currently active theme with check mark
- [x] `suppressHydrationWarning` prevents React SSR mismatch warnings
