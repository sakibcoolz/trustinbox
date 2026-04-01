# Task 1.10 — Error Boundary

> **Section**: 1. Foundation & Shell  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ErrorBoundary.tsx`

---

## Objective

Implement a React Error Boundary that catches render errors within the main content area, showing an in-place error card with retry option without breaking the sidebar/header shell.

---

## Current State

No error boundary exists. Any render error crashes the entire page to a Next.js error screen.

---

## Requirements

### 1. Global Error Boundary
- [x] Wrap `<main>` content in `LayoutShell` (task 1.2)
- [x] Catch React render errors (not async/promise errors)
- [x] Show error card in-place (sidebar + header remain functional)
- [x] Log error details to `lib/logger.ts`

### 2. Error Card UI
- [x] Red error icon (AlertTriangle or XCircle)
- [x] Title: "Something went wrong"
- [x] Description: error message (in development), generic message (in production)
- [x] "Try Again" button — resets error boundary state, re-renders children
- [x] "Go to Dashboard" link — escape hatch to navigate away
- [x] Stack trace collapsible section (development only)

### 3. Next.js Error Pages
- [x] `apps/provider/src/app/error.tsx` — route-level error boundary (Next.js convention)
- [x] `apps/provider/src/app/not-found.tsx` — 404 page with navigation back
- [x] Both pages use the same error card design pattern

### 4. Error Reporting
- [x] Call `logger.error()` with component stack and error details
- [ ] In production, potential integration with error tracking service (future)

---

## Implementation Plan

```tsx
'use client';
import React from 'react';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';
import Link from 'next/link';
import { logger } from '@/lib/logger';

interface ErrorBoundaryState { hasError: boolean; error: Error | null }

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('[ErrorBoundary] Caught render error', { error: error.message, componentStack: errorInfo.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <ErrorCard error={this.state.error} onRetry={this.handleRetry} />;
    }
    return this.props.children;
  }
}

function ErrorCard({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  const isDev = process.env.NODE_ENV === 'development';
  return (
    <div className="flex items-center justify-center min-h-[60vh] px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-status-error/10 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={28} className="text-status-error" />
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Something went wrong</h2>
        <p className="text-sm text-text-secondary mb-6">
          {isDev && error ? error.message : 'An unexpected error occurred. Please try again.'}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={onRetry}
            className="flex items-center gap-2 px-4 py-2 bg-accent-blue text-white text-sm font-medium rounded-lg hover:bg-accent-blue/90">
            <RotateCcw size={14} /> Try Again
          </button>
          <Link href="/"
            className="flex items-center gap-2 px-4 py-2 border border-border-primary text-text-secondary text-sm rounded-lg hover:bg-bg-hover">
            <Home size={14} /> Dashboard
          </Link>
        </div>
        {isDev && error?.stack && (
          <details className="mt-6 text-left">
            <summary className="text-xs text-text-muted cursor-pointer hover:text-text-secondary">Stack trace</summary>
            <pre className="mt-2 text-xs text-status-error/80 bg-bg-primary p-3 rounded-lg overflow-x-auto font-mono">
              {error.stack}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
```

### Next.js Error Page
```tsx
// apps/provider/src/app/error.tsx
'use client';
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorCard error={error} onRetry={reset} />;
}
```

### Not Found Page
```tsx
// apps/provider/src/app/not-found.tsx
import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <FileQuestion size={48} className="text-text-muted mx-auto mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Page not found</h1>
        <p className="text-sm text-text-secondary mb-6">The page you're looking for doesn't exist.</p>
        <Link href="/" className="px-4 py-2 bg-accent-blue text-white text-sm rounded-lg">Go to Dashboard</Link>
      </div>
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/components/ErrorBoundary.tsx` | Create |
| `apps/provider/src/app/error.tsx` | Create — Next.js route error page |
| `apps/provider/src/app/not-found.tsx` | Create — 404 page |
| `apps/provider/src/components/LayoutShell.tsx` | Modify — wrap main with ErrorBoundary |

---

## Acceptance Criteria

- [ ] Render error in any page component shows error card, not crash
- [ ] Sidebar and header remain functional during error
- [ ] "Try Again" re-renders the failed component
- [ ] "Go to Dashboard" navigates away from broken page
- [ ] Stack trace visible in dev, hidden in production
- [ ] 404 page renders for unknown routes
- [ ] Errors logged via `logger.error()`

---

## Dependencies

- **Blocked by**: Task 1.2 (LayoutShell integration point)
- **Blocks**: None
- **Related**: Task 17.21 (error tracking), Task 1.2 (LayoutShell wrapping)
