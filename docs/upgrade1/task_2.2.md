# Task 2.2 — Registration Page

> **Section**: 2. Authentication & Authorization — Auth Flow  
> **Priority**: P0 — Must complete first  
> **Estimated Scope**: Large (already implemented, needs upgrade)  
> **Route**: `/auth/register`  
> **File**: `apps/provider/src/app/auth/register/page.tsx`

---

## Objective

Upgrade the existing 5-step registration wizard to use design system components, GraphQL mutations, and improved validation.

---

## Current State

The registration page **exists** with a full 5-step wizard:
1. **Personal Information** — fullName, email, password, confirmPassword
2. **Organization Details** — orgName, industry, legalName, website
3. **Legal Compliance** — registrationNumber, proofIdType, taxId, address, city, state, country, postalCode, phone, authorizedSignatory
4. **Identity Documents** — file upload (PDF/JPG/PNG/WebP, 10MB limit)
5. **Review & Confirm** — summary + terms acceptance

### Features Already Working
- Step navigation with progress bar
- Per-step validation (email format, password strength, required fields)
- File upload with type/size validation
- Friendly error messages (regex patterns → user-friendly text)
- REST `auth.register()` / `auth.registerWithDocuments()` calls

### Issues to Address
1. Uses REST — should migrate to GraphQL mutation
2. Inline Tailwind everywhere — should use Card, form components
3. No username field (auto-generates from email)
4. No animated step transitions
5. Form state lost on page refresh

---

## Requirements

### 1. GraphQL Migration
- [ ] Replace `auth.register()` with `REGISTER_MUTATION`
- [ ] Replace `auth.registerWithDocuments()` with `REGISTER_WITH_DOCUMENTS_MUTATION` (multipart)

```graphql
mutation Register($input: RegisterInput!) {
  register(input: $input) {
    accessToken
    refreshToken
    user { id email fullName username role }
  }
}
```

### 2. UI Improvements
- [ ] Wrap form in `<Card>` component
- [ ] Add explicit username field to Step 1 (with availability check)
- [ ] Step transitions: slide-left animation between steps
- [ ] Persist form state in `sessionStorage` — recover on page refresh
- [ ] Show filled values in step indicators (green check for completed steps)

### 3. Validation Enhancements
- [ ] Step 1: Real-time password strength meter (weak/medium/strong)
- [ ] Step 1: Username uniqueness check (debounced API call)
- [ ] Step 2: Website URL format validation
- [ ] Step 3: Phone number format validation with country code
- [ ] Step 4: Drag-and-drop file upload zone
- [ ] Step 5: Collapsible review sections

### 4. Post-Registration
- [ ] Store tokens
- [ ] Navigate to `/` (user is automatically SP_ADMIN of new org)
- [ ] Show success toast: "Organization registered successfully"

---

## Implementation Plan

### Key Changes

```tsx
// Add to Step 1
<Field label="Username" icon={User}>
  <input 
    type="text" 
    value={form.username} 
    onChange={(e) => { update('username', e.target.value.toLowerCase()); checkUsername(e.target.value); }}
    className={inputCls} 
    placeholder="janesmith" 
  />
  {usernameStatus === 'available' && <Check size={14} className="text-status-success" />}
  {usernameStatus === 'taken' && <span className="text-xs text-status-error">Username taken</span>}
</Field>

// Password strength meter
<div className="flex gap-1 mt-1">
  {[1,2,3,4].map(i => (
    <div key={i} className={`h-1 flex-1 rounded ${strength >= i ? strengthColor : 'bg-border-secondary'}`} />
  ))}
</div>
```

### Form Persistence
```tsx
useEffect(() => {
  const saved = sessionStorage.getItem('register-form');
  if (saved) setForm(JSON.parse(saved));
}, []);

useEffect(() => {
  sessionStorage.setItem('register-form', JSON.stringify(form));
}, [form]);
```

---

## Files to Create/Modify

| File | Action |
|------|--------|
| `apps/provider/src/app/auth/register/page.tsx` | Modify — GraphQL, design system, validation |
| `apps/provider/src/lib/graphql/auth.ts` | Modify — add REGISTER_MUTATION |
| `apps/provider/src/components/ui/FileUpload.tsx` | Create — drag-and-drop file upload component |
| `apps/provider/src/components/ui/PasswordStrength.tsx` | Create — password strength meter |

---

## Acceptance Criteria

- [ ] All 5 steps work with navigation and validation
- [ ] Username field with real-time availability check
- [ ] Password strength meter shows visual feedback
- [ ] File upload supports drag-and-drop + click
- [ ] Form state persists across page refresh (sessionStorage)
- [ ] GraphQL mutation used for registration
- [ ] Friendly error messages for all backend errors
- [ ] Successful registration navigates to dashboard
- [ ] Step progress indicator shows completed/current/upcoming steps
- [ ] Accessible: all form fields labeled, error messages linked to inputs

---

## Dependencies

- **Blocked by**: Task 1.7 (toast), Task 1.12 (Card), Task 2.6 (Apollo auth link)
- **Blocks**: Task 2.4 (useAuth)
- **Related**: Task 2.1 (login), Task 2.3 (invite)
