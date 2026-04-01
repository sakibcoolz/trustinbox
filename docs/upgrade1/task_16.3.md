# Task 16.3 — Connection State Indicator

> **Section**: 16. Real-Time & Subscriptions  
> **Priority**: P1 — UX  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/components/ConnectionStatus.tsx`  
> **Status**: ✅ Complete

---

## Objective

Add a connection state indicator in the header showing WebSocket connection status: green dot (connected), yellow (reconnecting), red (disconnected).

---

## Requirements

### States

| State | Color | Label | Icon |
|-------|-------|-------|------|
| Connected | Green | "Live" | Filled circle |
| Reconnecting | Yellow | "Reconnecting…" | Pulsing circle |
| Disconnected | Red | "Offline" | Hollow circle |

### Display

- Small dot/badge in the header bar, near the notification bell
- Tooltip with full status: "WebSocket connected" / "Reconnecting (attempt 3/5)" / "Disconnected — using polling fallback"
- Only visible when WebSocket is configured

### Implementation

```typescript
// Track connection state from graphql-ws client
const wsClient = createClient({
  url: WS_URL,
  on: {
    connected: () => setConnectionState('connected'),
    connecting: () => setConnectionState('reconnecting'),
    closed: () => setConnectionState('disconnected'),
    error: () => setConnectionState('disconnected'),
  },
});
```

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/components/ConnectionStatus.tsx` | **Create** | Connection state indicator component |
| `apps/provider/src/components/Header.tsx` or layout | **Modify** | Add ConnectionStatus to header |

---

## Acceptance Criteria

- [ ] Green dot when connected
- [ ] Yellow pulsing dot when reconnecting
- [ ] Red dot when disconnected
- [ ] Tooltip with details
- [ ] Placed in header bar

---

## Dependencies

- **Blocked by**: Task 16.1 (WebSocket link)
- **Blocks**: None
