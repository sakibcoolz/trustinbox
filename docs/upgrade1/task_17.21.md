# Task 17.21 — Error Tracking

> **Section**: 17. Cross-Cutting Concerns — Logging & Observability  
> **Priority**: P1 — Reliability  
> **Estimated Scope**: Medium  
> **File**: `apps/provider/src/lib/error-tracking.tsx`  
> **Status**: ✅ Complete

---

## Objective

Capture and report unhandled exceptions (window error + unhandled promise rejections) and React component errors via an error boundary with optional remote reporting.

---

## Requirements

- `installGlobalErrorHandlers()` — window error + unhandledrejection listeners
- `ErrorBoundaryReporter` — React class component error boundary with reporting
- Remote reporting via `NEXT_PUBLIC_ERROR_REPORT_URL` (optional)
- Reports include: message, stack, componentStack, URL, timestamp, userAgent
- Fallback UI with "Try Again" button

---

## Files Created

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/error-tracking.tsx` | **Created** | Error reporter + ErrorBoundaryReporter component + global handlers |

---

## Acceptance Criteria

- [x] Global error + promise rejection handlers installed
- [x] React error boundary with automatic reporting
- [x] Remote endpoint support (env-configurable)
- [x] Structured error reports
- [x] Fallback UI with retry
