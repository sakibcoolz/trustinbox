# Task 17.20 — Client-Side Logger

> **Section**: 17. Cross-Cutting Concerns — Logging & Observability  
> **Priority**: P1 — Observability  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/logger.ts`  
> **Status**: ✅ Complete

---

## Objective

Rewrite the basic console logger with structured logging: ISO timestamps, log levels, user/org context, configurable minimum level.

---

## Requirements

- Structured JSON-like log entries with `ts`, `level`, `msg`, and context fields
- Configurable minimum log level via `NEXT_PUBLIC_LOG_LEVEL`
- `logger.error()` extracts Error name/message/stack
- `logger.action()` convenience for user action logging
- Backward-compatible `logger.log()` pass-through

---

## Files Modified

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/logger.ts` | **Rewritten** | Structured logging with levels + context |

---

## Acceptance Criteria

- [x] Structured log entries with timestamps
- [x] Configurable log level
- [x] Error stack extraction
- [x] User context support
- [x] Backward-compatible `.log()` method
