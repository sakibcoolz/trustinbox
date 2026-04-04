# Task 3J — Profile (Tasks 3.37–3.39)

> **Phase**: 3 — Web App: Core Feature Integration
> **Section**: 3J — Profile
> **Files**: `apps/web/src/app/(dashboard)/profile/page.tsx`, `apps/web/src/hooks/useProfile.ts`, `apps/web/src/hooks/useAvatarUpload.ts`
> **Current**: FULLY CONNECTED via REST — tasks focus on GraphQL migration and completeness indicator

---

## Objective

The profile page (1047 lines) is already **fully wired** to real REST APIs via `useProfile`, `useCareer`, and `useAvatarUpload` hooks. These tasks focus on preparing the GraphQL migration for profile save, ensuring avatar upload is robust, and adding a profile completeness indicator.

---

## Current State

```typescript
// apps/web/src/app/(dashboard)/profile/page.tsx — 1047 lines, FULLY CONNECTED
'use client';

// Uses hooks from apps/web/src/hooks/:
// useProfile()     — GET/PATCH /api/profile — profile data, stats, activity, SPs
// useCareer()      — GET/POST/PUT/DELETE /api/career — work experience, education, skills
// useAvatarUpload() — POST /api/avatar — upload with progress, FormData

// 5 tabs: Overview | Activity | Career | Privacy & ID | Security
// Profile editing: inline edit mode with save/cancel
// Avatar: upload, preview, remove
// Career: work history CRUD, education CRUD, skills management
// Activity: timeline of recent actions
// Privacy & ID: virtual public ID display, QR code
```

```typescript
// apps/web/src/hooks/useProfile.ts — 95+ lines
// Fetches from: GET /api/profile
// Updates via: PATCH /api/profile
// Returns: { profile, loading, error, updateProfile, refreshProfile }

// apps/web/src/hooks/useCareer.ts — 71+ lines
// CRUD operations for work experience, education, skills
// All via REST endpoints

// apps/web/src/hooks/useAvatarUpload.ts — 34+ lines
// Upload via: POST /api/avatar (FormData with file)
// Returns: { status, error, uploading, upload, remove, reset }
```

**What Already Works**:
- Profile data fetch and display (name, email, username, avatar, timezone, language)
- Profile editing with inline save
- Avatar upload with preview
- Career management (CRUD)
- Activity timeline
- Virtual Public ID display

**Gaps/Improvements**:
- Uses REST `fetch()` — no GraphQL `updateMyProfile` mutation (doesn't exist in schema)
- Avatar upload uses REST FormData — works but no presigned URL pattern
- No profile completeness indicator
- No progress indicator for profile sections
- No GraphQL migration path documented

### GraphQL Schema Status

```graphql
# me query returns user data:
me: User!
type User {
  id: ID!; username: String!; fullName: String!; email: String
  virtualPublicId: String!; avatarUrl: String
  timezone: String!; language: String!
  privacyPreference: PrivacyPreference
  availabilitySlots: [AvailabilitySlot!]!
  dndRules: [DNDRule!]!
}

# NOTE: No updateMyProfile mutation exists in the schema
# NOTE: No career-related types or mutations in schema
# NOTE: No avatar upload mutation in schema
```

---

## Task 3.37 — Wire Profile Save to Backend (Document Migration Path)

### Requirements

- [ ] Document the current REST save flow:
  - [ ] `PATCH /api/profile` with `{ fullName, email, timezone, language }`
  - [ ] Response: updated `User` object
  - [ ] Error handling: 400 validation, 401 auth, 500 server
- [ ] Create GraphQL migration plan:
  - [ ] Create `apps/web/src/lib/graphql/profile.ts` with planned operations:
    - [ ] `GET_MY_PROFILE` query using existing `me` query
    - [ ] `UPDATE_MY_PROFILE` mutation (placeholder — not in schema)
  - [ ] Document schema changes needed:
    - [ ] `updateProfile(input: UpdateProfileInput!): User!`
    - [ ] `input UpdateProfileInput { fullName: String, email: String, timezone: String, language: String }`
- [ ] Verify existing REST save is robust:
  - [ ] Confirm `useProfile().updateProfile()` handles errors correctly
  - [ ] Add optimistic UI if not already present (instant field updates, revert on error)
  - [ ] Confirm success/error toasts appear
- [ ] Wire `me` query for read path:
  - [ ] Add `useQuery(GET_MY_PROFILE)` alongside REST for read (dual source)
  - [ ] Or fully migrate read to GraphQL since `me` query already returns all needed fields
  - [ ] Keep REST for write until mutation is added

### Implementation Details

```typescript
// apps/web/src/lib/graphql/profile.ts
import { gql } from '@apollo/client';

export const GET_MY_PROFILE = gql`
  query GetMyProfile {
    me {
      id username fullName email
      virtualPublicId avatarUrl
      timezone language
      privacyPreference {
        allowPersonalNotifications allowSPNotifications
        allowAdvertisements allowCallbackRequests
        allowChat allowDocumentShares requireCallApproval
      }
    }
  }
`;

// TODO: Add when schema includes updateProfile mutation
// export const UPDATE_MY_PROFILE = gql`
//   mutation UpdateMyProfile($input: UpdateProfileInput!) {
//     updateProfile(input: $input) {
//       id fullName email timezone language avatarUrl
//     }
//   }
// `;
```

---

## Task 3.38 — Wire Avatar Upload (Verify and Harden)

### Requirements

- [ ] Verify existing `useAvatarUpload` hook works reliably:
  - [ ] Upload: FormData with file → `POST /api/avatar` → returns `{ avatarUrl }`
  - [ ] Remove: `DELETE /api/avatar` → clears avatar
  - [ ] Progress: track upload progress via XMLHttpRequest or fetch stream
- [ ] Harden the upload flow:
  - [ ] Validate file type before upload (jpeg, png, gif, webp only)
  - [ ] Validate file size (max 5MB)
  - [ ] Show image preview before upload confirmation
  - [ ] Add crop/resize before upload (optional enhancement)
  - [ ] Show upload progress bar
  - [ ] Handle upload failure with retry option
- [ ] Sync avatar across the app:
  - [ ] After upload: update auth context `user.avatarUrl`
  - [ ] Sidebar avatar should refresh without page reload
  - [ ] If using Apollo, update `me` cache with new `avatarUrl`
- [ ] Consider presigned URL pattern (future):
  - [ ] Document alternative: get presigned URL from MinIO → upload directly → save URL
  - [ ] Current REST upload works — defer presigned URL to future optimization

---

## Task 3.39 — Add Profile Completeness Indicator

### Requirements

- [ ] Create profile completeness calculation:
  - [ ] **Basic Info** (30%): fullName (10%), email (10%), timezone (5%), language (5%)
  - [ ] **Avatar** (15%): has avatarUrl
  - [ ] **Privacy** (20%): has privacyPreference configured (any non-default toggle)
  - [ ] **Availability** (15%): has at least 1 availability slot
  - [ ] **Career** (20%): has at least 1 work experience or education entry
- [ ] Display completeness:
  - [ ] Circular progress ring on profile page header
  - [ ] Percentage text: "75% complete"
  - [ ] Section breakdown: list of completed/incomplete sections
  - [ ] Links to incomplete sections for easy navigation
- [ ] Dashboard card (optional):
  - [ ] Small card on dashboard: "Complete your profile — 75%"
  - [ ] Click → navigates to `/profile`
  - [ ] Hide when 100% complete
- [ ] Persist completeness check:
  - [ ] Compute from current user data (me query + REST profile)
  - [ ] No separate API needed — client-side calculation

### Implementation Details

```typescript
// Profile completeness calculator
interface CompletenessSection {
  label: string;
  weight: number;
  complete: boolean;
  href: string;
}

function calculateCompleteness(user: User, career: Career, slots: AvailabilitySlot[]): {
  percentage: number;
  sections: CompletenessSection[];
} {
  const sections: CompletenessSection[] = [
    { label: 'Full Name', weight: 10, complete: !!user.fullName, href: '/profile' },
    { label: 'Email', weight: 10, complete: !!user.email, href: '/profile' },
    { label: 'Timezone', weight: 5, complete: !!user.timezone, href: '/profile' },
    { label: 'Language', weight: 5, complete: !!user.language, href: '/profile' },
    { label: 'Avatar', weight: 15, complete: !!user.avatarUrl, href: '/profile' },
    { label: 'Privacy Settings', weight: 20, complete: !!user.privacyPreference, href: '/settings/privacy' },
    { label: 'Availability', weight: 15, complete: slots.length > 0, href: '/settings/availability' },
    { label: 'Career', weight: 20, complete: (career.experience?.length ?? 0) > 0, href: '/profile?tab=career' },
  ];

  const completed = sections.filter(s => s.complete).reduce((sum, s) => sum + s.weight, 0);
  return { percentage: completed, sections };
}
```

---

## Verification Checklist

- [ ] Profile page still works with real REST API (no regressions)
- [ ] Profile read can optionally use `me` GraphQL query
- [ ] GraphQL migration plan documented in `lib/graphql/profile.ts`
- [ ] Avatar upload works: select → preview → upload → visible in sidebar
- [ ] Avatar upload validates file type and size
- [ ] Avatar upload shows progress indicator
- [ ] Avatar remove works
- [ ] Completeness indicator shows percentage on profile header
- [ ] Completeness sections list incomplete items with links
- [ ] Dashboard card shows completeness (hides at 100%)
- [ ] Completeness calculation is accurate

---

## Dependencies

**Depends on**:
- `me` GraphQL query (already in schema)
- REST `/api/profile`, `/api/avatar`, `/api/career` endpoints (already working)
- Task 3E — Privacy preferences data (for completeness calculation)
- Task 3G — Availability slots data (for completeness calculation)

**Blocks**:
- None directly — enhancements to already-working page

---

## Relevant Files

| File | Purpose |
|------|---------|
| `apps/web/src/app/(dashboard)/profile/page.tsx` | Profile page (1047 lines, FULLY CONNECTED REST) |
| `apps/web/src/hooks/useProfile.ts` | Profile data hook (REST) |
| `apps/web/src/hooks/useCareer.ts` | Career CRUD hook (REST) |
| `apps/web/src/hooks/useAvatarUpload.ts` | Avatar upload hook (REST) |
| `apps/web/src/lib/graphql/profile.ts` | **New** — Planned GraphQL operations |
| `gateway/graphql-bff/graph/schema.graphqls` | Schema — `me` query, no `updateProfile` mutation |
