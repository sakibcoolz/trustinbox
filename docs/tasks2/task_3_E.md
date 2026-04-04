# Task 3E — Settings: Privacy Preferences (Tasks 3.19–3.22)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3E — Settings: Privacy Preferences
> **Files**: `apps/web/src/app/(dashboard)/settings/privacy/page.tsx`, `apps/web/src/lib/graphql/privacy.ts` (new), `apps/web/src/hooks/usePrivacySettings.ts` (new)
> **GraphQL**: `me { privacyPreference { ... } }`, `updatePrivacyPreference(input)`

---

## Objective

Wire the privacy settings page from mock initial state + one partial REST call to a fully GraphQL-backed experience — loading current preferences from `me` query, saving changes via `updatePrivacyPreference` mutation with debounced auto-save, and adding per-category/per-channel controls.

---

## Current State

```typescript
// apps/web/src/app/(dashboard)/settings/privacy/page.tsx — 124 lines, PARTIAL
'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';

// Custom Toggle component (inline)
function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) { ... }

interface PrivacyState {
  allowPersonalNotifications: boolean;
  allowSPNotifications: boolean;
  allowAdvertisements: boolean;
  allowCallbackRequests: boolean;
  allowChat: boolean;
  allowDocumentShares: boolean;
  requireCallApproval: boolean;
}

const toggles: { key: keyof PrivacyState; label: string; desc: string }[] = [
  { key: 'allowPersonalNotifications', label: 'Allow Personal Notifications', desc: '...' },
  { key: 'allowSPNotifications', label: 'Allow Service Provider Notifications', desc: '...' },
  { key: 'allowAdvertisements', label: 'Allow Advertisements', desc: '...' },
  { key: 'allowCallbackRequests', label: 'Allow Callback Requests', desc: '...' },
  { key: 'allowChat', label: 'Allow Chat Messages', desc: '...' },
  { key: 'allowDocumentShares', label: 'Allow Document Shares', desc: '...' },
  { key: 'requireCallApproval', label: 'Require Callback Approval', desc: '...' },
];

// Initial state is HARDCODED — not loaded from backend
const [prefs, setPrefs] = useState<PrivacyState>({
  allowPersonalNotifications: true,
  allowSPNotifications: true,
  allowAdvertisements: false,
  allowCallbackRequests: true,
  allowChat: true,
  allowDocumentShares: true,
  requireCallApproval: true,
});

// handleSave — ONE real PATCH call to REST (not GraphQL)
const handleSave = useCallback(async () => {
  setSaving(true);
  try {
    await fetch('/api/privacy/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(prefs),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  } finally {
    setSaving(false);
  }
}, [prefs]);
```

**What Works**:
- 7 toggle components with labels and descriptions
- Save button with saving/saved states
- "Always Hidden" phone number notice
- REST PATCH to `/api/privacy/preferences`

**Gaps**:
- Initial toggle state is hardcoded — not loaded from backend `me.privacyPreference`
- Uses REST PATCH instead of GraphQL `updatePrivacyPreference` mutation
- No loading state while fetching current preferences
- No error handling on save failure
- No debounced auto-save (requires manual "Save Changes" click)
- No per-category communication controls
- No per-channel (push/email/SMS/in-app) controls

### GraphQL Schema Available

```graphql
# Query (nested under me)
me: User!
type User {
  # ...
  privacyPreference: PrivacyPreference
}
type PrivacyPreference {
  allowPersonalNotifications: Boolean!
  allowSPNotifications: Boolean!
  allowAdvertisements: Boolean!
  allowCallbackRequests: Boolean!
  allowChat: Boolean!
  allowDocumentShares: Boolean!
  requireCallApproval: Boolean!
}

# Mutation
updatePrivacyPreference(input: UpdatePrivacyPreferenceInput!): PrivacyPreference!

input UpdatePrivacyPreferenceInput {
  allowPersonalNotifications: Boolean
  allowSPNotifications: Boolean
  allowAdvertisements: Boolean
  allowCallbackRequests: Boolean
  allowChat: Boolean
  allowDocumentShares: Boolean
  requireCallApproval: Boolean
}
```

---

## Task 3.19 — Wire Privacy Page to `me.privacyPreference` Query

### Requirements

- [ ] Create `apps/web/src/lib/graphql/privacy.ts` with GraphQL operations:
  - [ ] `GET_PRIVACY_PREFERENCES` query — `me { privacyPreference { ...all 7 fields } }`
  - [ ] `UPDATE_PRIVACY_PREFERENCE` mutation — accepts `UpdatePrivacyPreferenceInput`
- [ ] Create `apps/web/src/hooks/usePrivacySettings.ts` hook:
  - [ ] Use `useQuery(GET_PRIVACY_PREFERENCES)` to load current prefs
  - [ ] Return `{ preferences, loading, error, refetch }`
  - [ ] Merge query data into local state for toggle management
- [ ] Update `privacy/page.tsx`:
  - [ ] Remove hardcoded `useState<PrivacyState>({...})`
  - [ ] Use hook to load initial preferences
  - [ ] Initialize toggle state from query result
  - [ ] Add loading skeleton while preferences load
  - [ ] Add error state with retry

### Implementation Details

```typescript
// apps/web/src/lib/graphql/privacy.ts
import { gql } from '@apollo/client';

export const GET_PRIVACY_PREFERENCES = gql`
  query GetPrivacyPreferences {
    me {
      id
      privacyPreference {
        allowPersonalNotifications
        allowSPNotifications
        allowAdvertisements
        allowCallbackRequests
        allowChat
        allowDocumentShares
        requireCallApproval
      }
    }
  }
`;

export const UPDATE_PRIVACY_PREFERENCE = gql`
  mutation UpdatePrivacyPreference($input: UpdatePrivacyPreferenceInput!) {
    updatePrivacyPreference(input: $input) {
      allowPersonalNotifications
      allowSPNotifications
      allowAdvertisements
      allowCallbackRequests
      allowChat
      allowDocumentShares
      requireCallApproval
    }
  }
`;
```

```typescript
// apps/web/src/hooks/usePrivacySettings.ts
import { useQuery, useMutation } from '@apollo/client';
import { GET_PRIVACY_PREFERENCES, UPDATE_PRIVACY_PREFERENCE } from '@/lib/graphql/privacy';

export function usePrivacySettings() {
  const { data, loading, error, refetch } = useQuery(GET_PRIVACY_PREFERENCES);
  const [updatePreference, { loading: saving }] = useMutation(UPDATE_PRIVACY_PREFERENCE);

  const preferences = data?.me?.privacyPreference ?? null;

  const save = async (input: Partial<PrivacyState>) => {
    return updatePreference({
      variables: { input },
      optimisticResponse: {
        updatePrivacyPreference: {
          __typename: 'PrivacyPreference',
          ...preferences,
          ...input,
        },
      },
    });
  };

  return { preferences, loading, error, saving, save, refetch };
}
```

---

## Task 3.20 — Add Save Handler with Debounced Auto-Save

### Requirements

- [ ] Replace REST PATCH `handleSave` with GraphQL mutation:
  - [ ] Call `UPDATE_PRIVACY_PREFERENCE` mutation
  - [ ] Send only changed fields (partial input)
  - [ ] Optimistic update: immediately reflect toggle in cache
- [ ] Add debounced auto-save (500ms):
  - [ ] On any toggle change, start 500ms debounce timer
  - [ ] If another toggle changes within 500ms, reset timer and batch changes
  - [ ] After 500ms of inactivity, send mutation with all changed fields
  - [ ] Show "Saving..." indicator during mutation
  - [ ] Show "✓ Saved" checkmark on success (auto-dismiss after 2s)
  - [ ] Show error toast on failure with retry option
- [ ] Keep manual "Save Changes" button as fallback:
  - [ ] Clicking immediately saves (cancels debounce timer)

### Implementation Details

```typescript
// Debounced auto-save pattern
const debounceRef = useRef<NodeJS.Timeout>();
const pendingChanges = useRef<Partial<PrivacyState>>({});

const handleToggle = useCallback((key: keyof PrivacyState) => {
  const newValue = !prefs[key];
  setPrefs((prev) => ({ ...prev, [key]: newValue }));
  pendingChanges.current = { ...pendingChanges.current, [key]: newValue };

  if (debounceRef.current) clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(async () => {
    const changes = { ...pendingChanges.current };
    pendingChanges.current = {};
    try {
      await save(changes);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // Show error toast
    }
  }, 500);
}, [prefs, save]);
```

---

## Task 3.21 — Wire Category Communication Controls

### Requirements

- [ ] Group toggles by communication category:
  - [ ] **Personal**: `allowPersonalNotifications`
  - [ ] **Service Provider**: `allowSPNotifications`, `allowCallbackRequests`, `allowChat`, `allowDocumentShares`
  - [ ] **Advertisement**: `allowAdvertisements`
- [ ] Add visual grouping with section headers:
  - [ ] "Personal Communications" section
  - [ ] "Service Provider Communications" section with sub-toggles
  - [ ] "Advertisements" section
- [ ] Add ad cap slider (future — schema extension needed):
  - [ ] "Maximum ads per day" slider (1–10)
  - [ ] Note: Currently not in schema — add TODO with placeholder disabled slider
- [ ] Cross-toggle dependencies:
  - [ ] If `allowSPNotifications` is OFF, gray out `allowCallbackRequests`, `allowChat`, `allowDocumentShares`
  - [ ] Show tooltip: "Enable SP notifications first"

---

## Task 3.22 — Wire Per-Channel Controls

### Requirements

- [ ] Add per-channel toggle matrix (future — schema extension needed):
  - [ ] Channels: Push, Email, SMS, In-App
  - [ ] Per category: Personal × channels, SP × channels, Ads × channels
  - [ ] Matrix layout: rows = categories, columns = channels
- [ ] Note: `PrivacyPreference` type does not include per-channel fields yet
  - [ ] Add TODO comments indicating schema extension needed
  - [ ] Show channel toggles in disabled state with "Coming soon" badge
  - [ ] Wire the infrastructure so it's ready when schema adds fields
- [ ] Mobile layout: stack vertically instead of matrix grid

---

## Verification Checklist

- [ ] Privacy page loads current preferences from `me.privacyPreference` (not hardcoded)
- [ ] Loading skeleton shows while preferences load
- [ ] Each toggle reflects backend state
- [ ] Toggling saves via GraphQL mutation (not REST PATCH)
- [ ] Debounced auto-save fires after 500ms of inactivity
- [ ] Multiple rapid toggles are batched into one mutation
- [ ] "Saving..." and "✓ Saved" indicators work
- [ ] Error toast shows on save failure
- [ ] Category grouping with section headers
- [ ] Cross-toggle dependencies (SP off → sub-toggles disabled)
- [ ] Per-channel matrix shows as "Coming soon" placeholder
- [ ] Manual "Save Changes" button works as fallback

---

## Dependencies

**Depends on**:
- Task 2.1 — Apollo Client configured
- Task 2.2 — ApolloProvider
- `me` query must return `privacyPreference` (already in schema)

**Blocks**:
- None directly — standalone settings page

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/settings/privacy/page.tsx` | Privacy settings page (124 lines, partial REST) |
| `apps/web/src/lib/graphql/privacy.ts` | **New** — GraphQL operations |
| `apps/web/src/hooks/usePrivacySettings.ts` | **New** — Apollo query/mutation hook |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema — `PrivacyPreference` type + mutation |
