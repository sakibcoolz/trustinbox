# Task 2.17 — GraphQL MyServiceProviders Query

> **Section**: 2. Authentication & Authorization — Connected Backend  
> **Priority**: P1 — Important  
> **Estimated Scope**: Small  
> **File**: `apps/provider/src/lib/graphql/auth.ts`

---

## Objective

Define the `myServiceProviders` GraphQL query for the organization switcher dropdown (used in sidebar and login flow).

---

## Current State

SP list is fetched via REST `profileApi.serviceProviders()` and cached in localStorage as JSON. The sidebar reads `localStorage.getItem('userSPs')`.

---

## Requirements

### 1. Query

```typescript
export const MY_SERVICE_PROVIDERS_QUERY = gql`
  query MyServiceProviders {
    myServiceProviders {
      id
      name
      industry
      role
      logoUrl
      plan
      status
      memberCount
    }
  }
`;
```

### 2. Usage
This query is used in two places:
1. **Post-login** (task 2.1): to determine if SP picker needed
2. **Sidebar SP switcher**: to show dropdown of orgs user belongs to

### 3. Organization Switcher Component
- [ ] Extract org switcher into `<ServiceProviderSwitcher>` component
- [ ] Current SP shown with logo/initial, name, industry
- [ ] Click opens dropdown with all SPs
- [ ] Selecting a different SP calls `switchServiceProvider()` from AuthContext
- [ ] Active SP marked with checkmark

```typescript
interface ServiceProviderSwitcherProps {
  current: ServiceProviderMembership | null;
  providers: ServiceProviderMembership[];
  onSwitch: (spId: string) => void;
}
```

---

## Implementation Plan

```tsx
export function ServiceProviderSwitcher({ current, providers, onSwitch }: ServiceProviderSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  if (providers.length <= 1) {
    return (
      <div className="px-4 py-3">
        <p className="text-sm font-medium text-text-primary truncate">{current?.name ?? 'No Organization'}</p>
        <p className="text-xs text-text-muted">{current?.industry}</p>
      </div>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-bg-hover transition-colors">
        <div className="min-w-0">
          <p className="text-sm font-medium text-text-primary truncate">{current?.name}</p>
          <p className="text-xs text-text-muted">{current?.industry}</p>
        </div>
        <ChevronDown size={14} className={`text-text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-0 bg-bg-elevated border border-border-secondary rounded-lg shadow-xl mt-1 z-50 py-1">
          {providers.map(sp => (
            <button key={sp.id} onClick={() => { onSwitch(sp.id); setOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-bg-hover text-left">
              <div className="w-8 h-8 rounded-full bg-accent-blue/20 flex items-center justify-center text-accent-blue text-xs font-semibold">
                {sp.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text-primary truncate">{sp.name}</p>
                <p className="text-[10px] text-text-muted">{sp.industry}</p>
              </div>
              {sp.id === current?.id && <Check size={14} className="text-accent-blue" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/lib/graphql/auth.ts` | Modify — add MY_SERVICE_PROVIDERS_QUERY |
| `apps/provider/src/components/ServiceProviderSwitcher.tsx` | Create — org switcher component |
| `apps/provider/src/components/sidebar.tsx` | Modify — use ServiceProviderSwitcher |

---

## Acceptance Criteria

- [ ] MY_SERVICE_PROVIDERS_QUERY returns all SPs for current user
- [ ] ServiceProviderSwitcher shows current SP in sidebar
- [ ] Multi-SP users see dropdown with all organizations
- [ ] Switching SP updates AuthContext and triggers data refetch
- [ ] Single-SP users see static org display (no dropdown)
- [ ] Current org marked with checkmark in dropdown

---

## Dependencies

- **Blocked by**: Task 2.4 (AuthContext with switchServiceProvider), Task 2.6 (Apollo Client)
- **Blocks**: None (used in sidebar)
- **Related**: Task 2.1 (post-login SP picker), Task 1.3 (sidebar component)
