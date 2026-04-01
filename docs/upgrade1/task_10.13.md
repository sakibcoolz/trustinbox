# Task 10.13 — Knowledge Source Status Management

> **Section**: 10. Bots (AI Studio)  
> **Priority**: P1 — Knowledge management  
> **Estimated Scope**: Medium  
> **Route**: `/bots/[id]/knowledge`  
> **File**: `apps/provider/src/app/bots/[id]/knowledge/page.tsx`  
> **Status**: ✅ Complete

---

## Objective

Implement real-time status tracking for knowledge sources as they transition through `PENDING → PROCESSING → ACTIVE_SOURCE` (or `FAILED`). Add polling for processing sources and retry ("Resync") for failed sources.

---

## Current State

Status badges are hardcoded strings ("Indexed", "Syncing", "Error"). No dynamic status updates. The "Resync" button in the actions column is non-functional.

### GraphQL Schema

```graphql
enum KnowledgeSourceStatus { PENDING, PROCESSING, ACTIVE_SOURCE, FAILED }

type KnowledgeSource {
  id: ID!
  status: KnowledgeSourceStatus!
  chunkCount: Int
  # ... other fields
}
```

---

## Requirements

### 1. Status Lifecycle

```
PENDING → PROCESSING → ACTIVE_SOURCE
                     ↘ FAILED
```

### 2. Status-specific UI

| Status | Badge | Animation | Action |
|--------|-------|-----------|--------|
| `PENDING` | Gray "Pending" | — | Cancel (optional) |
| `PROCESSING` | Yellow "Processing" | Spinner / pulse | — |
| `ACTIVE_SOURCE` | Green "Indexed" | — | Resync |
| `FAILED` | Red "Failed" | — | Retry |

### 3. Polling for Active Sources

- If any source has `PROCESSING` or `PENDING` status, poll `botKnowledgeSources` every 5 seconds
- Stop polling when all sources are `ACTIVE_SOURCE` or `FAILED`
- Use Apollo `pollInterval` or `startPolling`/`stopPolling`

### 4. Retry/Resync Failed Sources

- "Retry" button on `FAILED` sources
- Calls `removeKnowledgeSource` then `addKnowledgeSource` (or a dedicated resync mutation if available)
- Alternatively: re-add the source → new entry replaces the failed one

### 5. Error Details

- Show `FAILED` source error details in a tooltip or expandable row
- Backend should provide error context via future schema field

---

## Implementation Plan

```tsx
function useKnowledgeSourcesWithPolling(botId: string, serviceProviderId: string) {
  const { data, loading, error, startPolling, stopPolling } = useQuery(GET_BOT_KNOWLEDGE_SOURCES, {
    variables: { botId, serviceProviderId },
  });

  const sources = data?.botKnowledgeSources ?? [];
  const hasProcessing = sources.some(
    (s) => s.status === 'PENDING' || s.status === 'PROCESSING'
  );

  useEffect(() => {
    if (hasProcessing) {
      startPolling(5000);
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [hasProcessing, startPolling, stopPolling]);

  return { sources, loading, error };
}

function StatusBadge({ status }: { status: KnowledgeSourceStatus }) {
  const config = {
    PENDING: { label: 'Pending', className: 'bg-text-muted/20 text-text-muted' },
    PROCESSING: { label: 'Processing', className: 'bg-status-warning/20 text-status-warning', animate: true },
    ACTIVE_SOURCE: { label: 'Indexed', className: 'bg-status-success/20 text-status-success' },
    FAILED: { label: 'Failed', className: 'bg-status-error/20 text-status-error' },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${config.className}`}>
      {config.animate && <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />}
      {config.label}
    </span>
  );
}
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/app/bots/[id]/knowledge/page.tsx` | **Modify** | Add polling + retry + status alignment |

---

## Acceptance Criteria

- [ ] Status badges map to `KnowledgeSourceStatus` enum values
- [ ] Polling enabled when any source is PENDING/PROCESSING
- [ ] Polling disabled when all sources are ACTIVE_SOURCE/FAILED
- [ ] PROCESSING sources show spinner/pulse animation
- [ ] FAILED sources show "Retry" button
- [ ] Retry re-adds the source
- [ ] Status transitions reflected in real-time (within 5s)

---

## Dependencies

- **Blocked by**: Task 10.11 (knowledge page with real data)
- **Blocks**: None
- **Related**: Task 10.12 (add source → sets PENDING), Task 10.14 (remove source)
