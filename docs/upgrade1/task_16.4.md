# Task 16.4 — Reconnection Logic

> **Section**: 16. Real-Time & Subscriptions  
> **Priority**: P1 — Reliability  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/apollo-provider.tsx`  
> **Status**: ✅ Complete

---

## Objective

Implement exponential backoff reconnection logic for the WebSocket connection, with a max retry limit and fallback to polling when WS is unavailable.

---

## Requirements

### Reconnection Strategy

```typescript
const wsClient = createClient({
  url: WS_URL,
  retryAttempts: 10,
  retryWait: async (retries) => {
    // Exponential backoff: 1s, 2s, 4s, 8s, ... max 30s
    const delay = Math.min(1000 * Math.pow(2, retries), 30000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  },
  shouldRetry: () => true,
  keepAlive: 10000, // 10s ping interval
});
```

### Fallback to Polling

- After max retries exhausted, switch to polling mode
- Polling interval: 30s for active pages, 60s for background
- Show "Offline — updates may be delayed" toast
- Auto-attempt WS reconnection every 60s in background

### Token Refresh

- When WS connection drops due to token expiry, refresh token and reconnect
- Pass new token via `connectionParams` on reconnect

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/lib/apollo-provider.tsx` | **Modify** | Add reconnection config + fallback |

---

## Acceptance Criteria

- [ ] Exponential backoff (1s → 2s → 4s → ... → max 30s)
- [ ] Max 10 retry attempts
- [ ] Fallback to polling after max retries
- [ ] Token refresh on auth-related disconnects
- [ ] Keep-alive ping interval
- [ ] Toast notification on fallback

---

## Dependencies

- **Blocked by**: Task 16.1 (WebSocket link)
- **Blocks**: None
