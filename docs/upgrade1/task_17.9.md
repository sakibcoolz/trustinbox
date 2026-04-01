# Task 17.9 — localStorage Preferences

> **Section**: 17. Cross-Cutting Concerns  
> **Priority**: P3 — Polish  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/hooks/useLocalStorage.ts`  
> **Status**: ✅ Complete

---

## Objective

Create a `useLocalStorage` hook for persisting user preferences: notification sounds, sidebar collapse state, table density, and timezone display.

---

## Requirements

### Hook API

```typescript
function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void];
```

### Preference Keys

| Key | Default | Used By |
|-----|---------|---------|
| `notificationSoundsEnabled` | `false` | Task 16.5 (sounds) |
| `sidebarCollapsed` | `false` | Sidebar layout |
| `tableDensity` | `'comfortable'` | Table components |
| `pushNotificationsEnabled` | `false` | Task 16.6 (push) |

### Implementation

```typescript
export function useLocalStorage<T>(key: string, defaultValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  const setValue = useCallback((value: T | ((prev: T) => T)) => {
    setState((prev) => {
      const next = value instanceof Function ? value(prev) : value;
      localStorage.setItem(key, JSON.stringify(next));
      return next;
    });
  }, [key]);

  return [state, setValue];
}
```

---

## Files to Create

| File | Action | Purpose |
|------|--------|---------|
| `apps/provider/src/hooks/useLocalStorage.ts` | **Create** | localStorage persistence hook |

---

## Acceptance Criteria

- [ ] Type-safe hook with generics
- [ ] SSR-safe (no window access during SSR)
- [ ] JSON serialization for complex values
- [ ] Survives page refresh
- [ ] Graceful fallback on storage errors

---

## Dependencies

- **Blocked by**: None
- **Blocks**: Task 16.5 (sounds), Task 16.6 (push)
