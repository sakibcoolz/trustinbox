# Task 5.1 — Settings → Profile Sub-Page Polish

> **Phase**: 5 — Provider Portal: Completion
> **Task**: 5.1 — Settings → Profile Sub-Page
> **File**: `apps/provider/src/app/settings/profile/page.tsx` (524 lines — exists, needs polish)
> **Dependencies**: None — page is already functional
> **Data Sources**: `@/lib/api` (profile), `@/lib/graphql/settings` (org profile)

---

## Objective

Polish the existing organization profile editor to completion: add logo upload with crop/preview, wire address fields to backend (currently assembled as concatenated string), add missing validation and loading states, and ensure all read-only info is displayed.

---

## Current State

### Profile Page — Already Substantial (524 lines)
```typescript
// apps/provider/src/app/settings/profile/page.tsx
// ✅ Account Info (read-only): avatar, full name, role badge, username, email, user ID
// ✅ Edit Profile form: fullName, timezone (14 options), language (8 options) → profileApi.update()
// ✅ Change Password form: current/new/confirm with 8-char minimum
// ✅ Session Management: sessions count, 2FA status, last login
// ✅ Organization Profile (admin-only): org name, displayName, description,
//    logoUrl (text input), website, contactEmail, supportPhone,
//    address fields (line1/line2/city/state/postalCode/country)
// ✅ Branding Settings (admin-only): primary color picker, email template, notification footer + live preview
```

### Organization Profile Save — Address Concatenation Issue
```typescript
// Current address handling — concatenates fields into a single string:
async function handleSaveOrgProfile(e: React.FormEvent) {
  await updateProfile({
    name: orgForm.name,
    // ...
    address: [orgForm.addressLine1, orgForm.addressLine2, orgForm.city,
              orgForm.state, orgForm.postalCode, orgForm.country]
              .filter(Boolean).join(', '),
    logoUrl: orgForm.logoUrl,
  });
}
// ⚠️ Address is saved as single string — fields don't round-trip on reload
```

### Organization Data Load — No Address Parsing
```typescript
// Current org data loading — address fields remain empty on reload:
useEffect(() => {
  if (orgData?.serviceProvider) {
    const sp = orgData.serviceProvider;
    setOrgForm({
      // ...
      addressLine1: '',  // ❌ Always empty — address is a single string in SP entity
      addressLine2: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
      logoUrl: sp.logoUrl || '',
    });
  }
}, [orgData]);
```

### Logo Upload — Text Input Only
```typescript
// Currently: logo is a URL text input, no upload flow:
// <input ... value={orgForm.logoUrl} onChange={...} />
// ❌ No image upload, no crop/preview, no MinIO presigned URL flow
```

### Data Hooks — Already Exist
```typescript
// apps/provider/src/lib/graphql/settings.ts
export function useOrganizationProfile(spId: string) {
  return useData<OrganizationProfile>(`/api/gateway/v1/service-providers/${spId}`);
}

export function useUpdateOrganizationProfile(spId: string) {
  const { run, loading, error } = useMutationHelper<OrganizationProfile>();
  return {
    updateProfile: (input: Record<string, unknown>) =>
      run(`/api/gateway/v1/service-providers/${spId}`, 'PUT', { serviceProviderId: spId, ...input }),
    loading, error,
  };
}
```

---

## Requirements

### 5.1.1 — Fix Address Field Round-Trip
- [ ] Parse address string back into individual fields on load:
  - [ ] Attempt to split by `, ` delimiter into address components
  - [ ] Or require backend to return structured address fields (check `OrganizationProfile` type)
- [ ] If backend only stores concatenated string: parse best-effort on load
- [ ] If backend supports structured address: update `OrganizationProfile` type + hook to use structured fields
- [ ] Verify address fields persist across save → reload cycles
- [ ] Add country dropdown with common countries (not free text input)

### 5.1.2 — Add Logo Upload with Preview
- [ ] Replace text URL input with actual image upload:
  - [ ] "Upload Logo" button → file input accepting `image/png, image/jpeg, image/webp`
  - [ ] Max file size validation (2MB)
  - [ ] Upload flow: get presigned URL from gateway → upload to MinIO → save URL to org profile
  - [ ] Show upload progress indicator
- [ ] Add logo preview:
  - [ ] Current logo: circular/square thumbnail with the logo image
  - [ ] Replace/remove options
  - [ ] Fallback: organization initials on colored background
- [ ] Wire: `POST /api/documents/upload-url` → get presigned URL → `PUT` to MinIO → save returned URL

### 5.1.3 — Add Read-Only Organization Info Display
- [ ] Verification status badge at top of org section:
  - [ ] ✓ Verified (green badge)
  - [ ] ⏳ Pending (yellow badge)
  - [ ] ✕ Unverified (red badge)
- [ ] Display read-only fields:
  - [ ] SP ID: copyable (click to copy with toast)
  - [ ] Slug: `o/<slug>` format with copyable link
  - [ ] Created date: formatted relative + absolute
  - [ ] Industry: current selection (read-only — editable on Industry page)
- [ ] Wire verification status from `orgData.serviceProvider.verificationStatus`

### 5.1.4 — Add Form Validation
- [ ] Organization name: required, min 2 chars, max 255 chars
- [ ] Contact email: valid email format
- [ ] Support phone: valid phone format (or skip complex validation, just non-empty)
- [ ] Website URL: valid URL with protocol (prepend `https://` if missing)
- [ ] Logo URL: valid URL format if manually entered
- [ ] Primary color: valid hex color (#RRGGBB)
- [ ] Show inline field-level error messages
- [ ] Disable Save button while form is invalid or unchanged

### 5.1.5 — Polish UX
- [ ] Add unsaved changes warning:
  - [ ] Track dirty state across all form sections
  - [ ] Show "You have unsaved changes" banner when navigating away
- [ ] Add loading skeleton for organization section (already exists for profile section)
- [ ] Add error boundary for failed org data load with retry button
- [ ] Make primary color preview more prominent (show branded notification preview with selected color)
- [ ] Add tooltip on "Branding Settings" explaining where primary color / notification footer appear

---

## Implementation Details

### Logo Upload Component

```tsx
// Inline in profile page or extract to component
function LogoUpload({ currentUrl, onUploaded }: { currentUrl: string; onUploaded: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be under 2MB');
      return;
    }
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      // 1. Get presigned upload URL
      const { uploadUrl, fileUrl } = await fetch('/api/documents/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type, category: 'logo' }),
      }).then(r => r.json());

      // 2. Upload to MinIO
      await fetch(uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } });

      // 3. Return URL
      onUploaded(fileUrl);
    } catch {
      toast.error('Failed to upload logo');
      setPreview(null);
    } finally {
      setUploading(false);
    }
  }

  const displayUrl = preview || currentUrl;

  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-xl bg-bg-tertiary border border-border-secondary flex items-center justify-center overflow-hidden">
        {displayUrl ? (
          <img src={displayUrl} alt="Logo" className="w-full h-full object-cover" />
        ) : (
          <Building2 size={24} className="text-text-muted" />
        )}
      </div>
      <div>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-sm text-accent-blue hover:underline"
        >
          {uploading ? 'Uploading…' : currentUrl ? 'Change logo' : 'Upload logo'}
        </button>
        {currentUrl && (
          <button onClick={() => onUploaded('')} className="text-xs text-text-muted hover:text-status-error ml-3">
            Remove
          </button>
        )}
        <p className="text-xs text-text-muted mt-0.5">PNG, JPG, or WebP. Max 2MB.</p>
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFileSelect} />
    </div>
  );
}
```

### Verification Status Badge

```tsx
function VerificationBadge({ status }: { status: string }) {
  const config = {
    VERIFIED: { label: 'Verified', icon: '✓', className: 'bg-status-success/10 text-status-success' },
    PENDING: { label: 'Pending Verification', icon: '⏳', className: 'bg-status-warning/10 text-status-warning' },
    UNVERIFIED: { label: 'Not Verified', icon: '✕', className: 'bg-status-error/10 text-status-error' },
  }[status] || { label: status, icon: '•', className: 'bg-border-secondary text-text-muted' };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${config.className}`}>
      {config.icon} {config.label}
    </span>
  );
}
```

---

## Verification

- [ ] Organization profile loads with all fields populated (including address)
- [ ] Save org profile → reload → all fields still populated (round-trip works)
- [ ] Logo upload: select file → shows preview → uploads to MinIO → URL saved
- [ ] Logo upload: validation blocks files > 2MB
- [ ] Logo remove: clears URL, shows fallback
- [ ] Verification badge displays correct status (Verified/Pending/Unverified)
- [ ] SP ID and slug are copy-to-clipboard on click
- [ ] Form validation: required fields show inline errors
- [ ] Save button disabled when form is unchanged
- [ ] Country dropdown shows list of countries (not free text)
- [ ] Branding live preview updates when primary color changes
- [ ] Admin-only sections hidden for AGENT and ANALYST roles
- [ ] Error state: retry button loads org data
