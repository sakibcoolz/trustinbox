# Business Flow: User Registration & SP Onboarding

## Overview

TrustInbox supports two distinct registration paths: customers who want a private inbox, and service provider teams who need to communicate with customers. Both paths converge on a single user identity system with prefix-based usernames.

## Actors

- **Customer**: Registers for a personal TrustInbox account
- **SP Founder**: Registers and creates a new service provider organization
- **SP Team Member**: Accepts invitation to join an existing SP
- **Auth Service**: Handles registration, JWT issuance, and session management
- **Organization Service**: Manages SP lifecycle and team membership

---

## Flow A: Customer Registration

### Steps

1. Customer navigates to web app (`apps/web`) and clicks **Sign Up**
2. Fills in registration form:
   - Full name
   - Email
   - Mobile number (encrypted with AES-256-GCM before storage)
   - Password (bcrypt hashed)
3. Auth service validates:
   - Email uniqueness
   - Password strength (min 8 chars, mixed case, number)
   - Mobile format
4. System creates:
   - `users` record with status `ACTIVE`
   - `user_profiles` record (full name, default timezone)
   - `user_identities` record:
     - `virtual_public_id`: `TI-<first-8-chars-of-uuid>` (e.g., `TI-a1b2c3d4`)
     - `masked_phone`: last 4 digits only (e.g., `****1234`)
   - Username: `c/<email_local_part>` (e.g., `c/alice`)
   - Default privacy preferences (all categories enabled, DND off)
5. JWT issued:
   - Access token (15-minute expiry)
   - Refresh token (7-day expiry, stored as httpOnly cookie in web app)
   - Claims: `{ user_id, role: "CUSTOMER" }`
6. Customer redirected to inbox

### Username Collision Handling

- If `c/alice` already exists → try `c/alice-2`, `c/alice-3`, etc.
- Validation regex: `^(c|o)/[a-z0-9._-]{2,50}$`

---

## Flow B: Service Provider Onboarding

### Steps

1. SP founder navigates to provider portal (`apps/provider`) and clicks **Register**
2. **Step 1 — Personal Info**:
   - Full name, email, password
   - System creates user with `c/<username>` (same as customer)
3. **Step 2 — Organization Info**:
   - Organization name (e.g., "Acme Bank")
   - Industry (select from industry profiles: banking, healthcare, etc.)
   - Website URL
   - System generates slug: `acmebank` → username `o/acmebank`
4. **Step 3 — Verification Submission**:
   - Upload verification documents (business license, legal name proof)
   - Accept terms of service
5. System creates:
   - `service_providers` record with status `PENDING_VERIFICATION`
   - `service_provider_users` record linking founder as `SP_ADMIN`
   - Industry profile defaults pre-populated
6. JWT issued with:
   - Claims: `{ user_id, role: "SP_ADMIN", service_provider_id: "<uuid>" }`
7. Founder sees dashboard with "Pending Verification" banner
8. Platform admin reviews and approves/rejects verification

### Verification Flow

```
PENDING_VERIFICATION → VERIFIED (by platform admin)
                     → REJECTED (with reason)
                     → SUSPENDED (after approval, by admin)
```

- Only VERIFIED SPs can send notifications, request callbacks, or launch campaigns
- Rejected SPs can resubmit documents

---

## Flow C: Team Member Invitation

### Steps

1. SP Admin navigates to **Settings → Team**
2. Clicks **Invite Team Member**
3. Fills in:
   - Email address
   - Role: `SP_ADMIN` / `AGENT` / `ANALYST`
4. System creates:
   - `invitations` record with:
     - `token_hash`: SHA-256 hash of invitation token
     - `status`: `PENDING`
     - `expires_at`: current time + 48 hours
5. Email sent to invitee with invitation link:
   - `/auth/invite/<token>`
6. Invitee clicks link:
   - **If new user**: Registration form (name, email, password) → creates account → joins SP
   - **If existing user**: Login → auto-joins SP
7. Invitation status → `ACCEPTED`
8. `service_provider_users` record created with assigned role
9. JWT re-issued with `service_provider_id` claim

### Invitation Lifecycle

| Status | Description |
|--------|-------------|
| `PENDING` | Sent, awaiting acceptance |
| `ACCEPTED` | User accepted and joined SP |
| `EXPIRED` | 48-hour window passed |
| `REVOKED` | Cancelled by SP Admin |

### Rules

- Invitation expires after 48 hours
- SP Admin can resend expired invitations
- SP Admin can revoke pending invitations
- A user can belong to multiple SPs (multi-SP support)
- The last SP_ADMIN cannot be removed or demoted

---

## Flow D: Multi-SP User Login

### Steps

1. User logs in to provider portal
2. Auth service checks `service_provider_users` for all SP memberships
3. If user belongs to **one SP**:
   - JWT issued with that SP's `service_provider_id`
   - Direct to dashboard
4. If user belongs to **multiple SPs**:
   - SP selection screen shown (list of SPs with names and roles)
   - User selects active SP
   - JWT issued with selected `service_provider_id`
5. User can switch SP via sidebar SP switcher component
6. SP switch → re-issue JWT with new `service_provider_id`

---

## Identity Model

| Field | Type | Example | Visibility |
|-------|------|---------|------------|
| `users.id` | UUID | `550e8400-e29b-...` | Internal only |
| `users.username` | VARCHAR | `c/alice` or `o/acmebank` | Platform-wide |
| `users.email` | VARCHAR | `alice@example.com` | Internal + user |
| `user_identities.virtual_public_id` | VARCHAR | `TI-a1b2c3d4` | Exposed to SPs |
| `user_identities.masked_phone` | VARCHAR | `****1234` | Exposed to SPs |
| `users.mobile` | ENCRYPTED | AES-256-GCM | Internal only |

### Privacy Guarantees

- **Real phone number**: Never exposed to any service provider
- **Email**: Not shared with SPs unless user explicitly consents
- **Virtual Public ID**: The only identifier SPs see for customers
- **Masked phone**: Last 4 digits only, for customer verification prompts

## Events Published

| Event | Trigger |
|-------|---------|
| `user.registered` | New customer account created |
| `service_provider.created` | New SP organization created |
| `team.member.invited` | Invitation sent to team member |
| `team.member.joined` | Invitation accepted |
| `team.member.removed` | Team member deactivated |
| `service_provider.verified` | SP passes verification |
