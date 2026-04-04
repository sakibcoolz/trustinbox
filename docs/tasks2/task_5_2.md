# Task 5.2 — Settings → Industry Sub-Page Polish

> **Phase**: 5 — Provider Portal: Completion
> **Task**: 5.2 — Settings → Industry Profile Selector & Configurator
> **File**: `apps/provider/src/app/settings/industry/page.tsx` (353 lines — exists, needs wiring)
> **Dependencies**: `industry-service` backend (fully implemented)
> **Data Sources**: `@/lib/graphql/settings` (`useIndustryProfiles`, `useIndustryProfile`, `safeParseJson`)

---

## Objective

Wire the existing industry profile selector to actually persist profile changes via the gateway API — currently `handleApply()` and `handleSave()` are local-only mock operations. Add industry template preview cards, wire communication overrides to backend, and ensure profile switch persists to the organization record.

---

## Current State

### Industry Page — UI Complete, Logic Mock (353 lines)
```typescript
// apps/provider/src/app/settings/industry/page.tsx
// ✅ Industry selector dropdown from useIndustryProfiles()
// ✅ Active profile description display
// ✅ Switch warning banner (when changing industry)
// ✅ Default Categories: read-only chips from profile.defaultCategories
// ✅ Communication Defaults (editable): maxDailyNotifications, channels, quiet hours, callback windows
// ✅ Compliance Hints: read-only from JSONB complianceHintsJson
// ✅ Required Document Types: read-only from JSONB documentTypesJson
// ✅ Bot Prompt Templates: read-only from JSONB botPromptPackJson
// ✅ Preview Panel (sidebar): summary + "Apply Profile" button
```

### Apply / Save — Mock Only
```typescript
// Current handleApply — no API call:
function handleApply() {
  setSaving(true);
  setCurrentKey(selectedKey);
  toast.success(`Industry profile "${activeProfile?.displayName}" applied`);
  setTimeout(() => setSaving(false), 500);
}

// Current handleSave — no API call:
function handleSave() {
  toast.success('Communication overrides saved');
}

// ❌ Neither function calls gateway API
// ❌ Profile switch is client-side only — lost on page reload
// ❌ Communication overrides not persisted
```

### Data Hooks — Exist for Reading, No Apply Mutation
```typescript
// apps/provider/src/lib/graphql/settings.ts
export function useIndustryProfile(key: string) {
  return useData<IndustryProfile>(`/api/gateway/v1/industry-profiles/${key}`);
}

export function useIndustryProfiles(activeOnly = true) {
  return useData<{ nodes: IndustryProfile[]; totalCount: number }>(
    `/api/gateway/v1/industry-profiles?activeOnly=${activeOnly}`
  );
}

// ❌ No useApplyIndustryProfile() hook
// ❌ No useSaveCommunicationOverrides() hook
```

### Organization Profile — Has Industry Field
```typescript
// OrganizationProfile type:
export interface OrganizationProfile {
  id: string;
  name: string;
  industry: string;          // ← current industry key
  verificationStatus: string;
  // ...
}
```

---

## Requirements

### 5.2.1 — Wire "Apply Profile" to Backend
- [x] Create `useApplyIndustryProfile()` hook in `@/lib/graphql/settings.ts`:
  - [x] Call gateway endpoint to update org's industry key
  - [x] Possible routes: `PUT /api/gateway/v1/service-providers/:id` with `{ industry: key }` or dedicated `POST /api/gateway/v1/industry-profiles/apply`
  - [x] Check if `industry-service.ApplyProfile` RPC exists via gateway
- [x] Wire `handleApply()` to call the new hook:
  - [x] Show loading spinner on "Apply Profile" button
  - [x] On success: update `currentKey`, toast success, refetch org profile
  - [x] On error: toast error, don't update `currentKey`
- [x] Load current industry key from org profile on mount:
  - [x] Use `useOrganizationProfile(spId)` → `sp.industry` → set as `currentKey` and `selectedKey`
  - [x] Auto-load profile details for current industry

### 5.2.2 — Wire Communication Overrides Save
- [x] Create `useSaveCommunicationOverrides()` hook or extend org profile update:
  - [x] Persist: `maxDailyNotifications`, `preferredChannels`, `quietHoursStart/End`, `callbackWindowStart/End`
  - [x] Route: likely `PUT /api/gateway/v1/service-providers/:id` with overrides in metadata/settings
  - [x] Or: dedicated endpoint if backend supports per-SP communication config
- [x] Wire `handleSave()` to call the mutation:
  - [x] Show loading state on "Save Overrides" button
  - [x] Toast success/error
- [x] Load saved overrides on mount (not just defaults):
  - [x] Fetch from org profile or sp settings endpoint
  - [x] Fall back to `DEFAULT_COMM` if no overrides set

### 5.2.3 — Add Industry Template Grid View
- [x] Replace dropdown-only selection with visual card grid:
  - [x] Show all industry profiles as selectable cards
  - [x] Each card: industry icon (mapped), display name, description, feature count
  - [x] Selected card: highlighted border (accent-blue)
  - [x] Keep dropdown as an alternative for accessibility
- [x] Add industry icon mapping:
  ```typescript
  const INDUSTRY_ICONS: Record<string, LucideIcon> = {
    banking: Landmark,
    healthcare: Heart,
    real_estate: Home,
    hospitality: Hotel,
    logistics: Truck,
  };
  ```

### 5.2.4 — Add Template Preview Before Applying
- [x] On selecting a new industry (different from current), show a preview diff:
  - [x] What will change: categories, compliance requirements, document types
  - [x] What will be preserved: existing custom settings, team, data
- [x] Enhance "Apply Profile" confirmation:
  - [x] Modal/dialog instead of immediate apply
  - [x] Summary: "Switching from [current] to [new] will update:"
  - [x] Checklist of changes (categories, bot templates, compliance)
  - [x] "Apply" and "Cancel" buttons

### 5.2.5 — Add Callback Workflows Section
- [x] Display callback workflow templates from `callbackWorkflowsJson`:
  - [x] Currently: the `callbackWorkflows` useMemo exists but may not be rendered
  - [x] Add a section showing workflow name + description
  - [x] Read-only display like compliance hints
- [x] Add Dashboard Presets section (if `dashboardPresetsJson` has data):
  - [x] Show what dashboard widgets are recommended for the industry

### 5.2.6 — Polish Loading & Error States
- [x] Add skeleton cards for industry grid while loading
- [x] Add error state with retry button for failed profile load
- [x] Add empty state: "No industry profiles available" if API returns empty
- [x] Disable "Apply Profile" when no changes made (selectedKey === currentKey)
- [x] Disable "Save Overrides" when overrides haven't changed (compare to saved state)

---

## Implementation Details

### Apply Industry Profile Hook

```typescript
// apps/provider/src/lib/graphql/settings.ts — add:
export function useApplyIndustryProfile(spId: string) {
  const { run, loading, error } = useMutationHelper();
  return {
    applyProfile: (industryKey: string) =>
      run(`/api/gateway/v1/service-providers/${spId}`, 'PUT', {
        serviceProviderId: spId,
        industry: industryKey,
      }),
    loading,
    error,
  };
}
```

### Load Current Industry on Mount

```typescript
// In IndustrySettingsPage — add org profile fetch:
const { data: orgData } = useOrganizationProfile(spId);

useEffect(() => {
  if (orgData?.serviceProvider?.industry) {
    const key = orgData.serviceProvider.industry;
    setCurrentKey(key);
    setSelectedKey(key);
  }
}, [orgData]);
```

### Apply Confirmation Dialog

```tsx
function ApplyConfirmDialog({ open, onClose, onConfirm, fromIndustry, toIndustry, loading }: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromIndustry: string;
  toIndustry: string;
  loading: boolean;
}) {
  return (
    <div className={`fixed inset-0 z-50 ${open ? '' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-bg-card border border-border-primary rounded-xl p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold">Switch Industry Profile?</h3>
        <p className="text-sm text-text-secondary">
          Switching from <strong>{fromIndustry}</strong> to <strong>{toIndustry}</strong> will
          update your default categories, compliance requirements, and bot templates.
        </p>
        <div className="flex items-center gap-3 p-3 bg-status-warning/10 border border-status-warning/20 rounded-lg">
          <AlertTriangle size={16} className="text-status-warning shrink-0" />
          <p className="text-xs text-status-warning">Existing custom settings will be preserved.</p>
        </div>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">Cancel</button>
          <button onClick={onConfirm} disabled={loading}
            className="px-4 py-2 bg-accent-blue text-white rounded-lg text-sm font-medium hover:bg-accent-blue/90 disabled:opacity-50">
            {loading ? 'Applying…' : 'Apply Profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Verification

- [x] Current industry loads from org profile on mount (dropdown pre-selected)
- [x] Selecting a different industry shows the warning banner
- [x] "Apply Profile" calls gateway API and persists industry change
- [x] Page reload → industry still shows the applied selection
- [x] Communication overrides save → reload → values persist
- [x] Categories, compliance, document types display from selected profile JSONB
- [x] Bot prompt templates display from selected profile JSONB
- [x] Callback workflows display if available
- [x] Apply confirmation dialog shows before switching (if already has an industry)
- [x] Error states: retry button on failed loads
- [x] Empty state: "No industry profiles available" if none returned
- [x] "Save Overrides" disabled when no changes
- [x] "Apply Profile" disabled when selected === current
