# 18 — Team Invitation Flow

> Service provider team management with token-based invitations, role assignment, and org membership lifecycle.

## Team Management Architecture

```mermaid
graph TB
    subgraph "Provider Portal (/settings/team)"
        InviteUI["Invite Member Form<br/>Email · Role · Permissions"]
        TeamList["Team Members List<br/>Name · Role · Status · Actions"]
        PendingList["Pending Invitations<br/>Email · Role · Sent · Expires"]
    end

    subgraph "Gateway (:4000)"
        TeamAPI["/api/v1/organizations/:id/team/*<br/>/api/v1/organizations/:id/invitations/*"]
    end

    subgraph "organization-service (:50054)"
        TeamUC["TeamUseCase<br/>Invite, accept, remove,<br/>update role, list members"]
        InvRepo["InvitationRepository<br/>invitations table"]
        SPURepo["SPUserRepository<br/>service_provider_users table"]
    end

    subgraph "Delivery"
        Email["Email Service<br/>Invitation email with token link"]
    end

    InviteUI --> TeamAPI --> TeamUC
    TeamUC --> InvRepo & SPURepo
    TeamUC --> Email
```

## Invitation Flow

```mermaid
sequenceDiagram
    participant Admin as SP_ADMIN<br/>(Provider Portal)
    participant GW as Gateway
    participant Org as organization-service
    participant DB as PostgreSQL
    participant Redis as Redis Events
    participant Email as Email Service
    participant Invitee as Invited User

    Admin->>GW: POST /api/v1/organizations/:spId/invitations<br/>{email, role, permissions[]}
    GW->>Org: gRPC InviteTeamMember()

    Org->>Org: RBAC check: caller must have<br/>team.manage permission

    Org->>DB: SELECT * FROM invitations<br/>WHERE sp_id = $1 AND email = $2<br/>AND status = 'PENDING'
    alt Already invited
        Org-->>GW: AlreadyExists "invitation pending"
        GW-->>Admin: 409 Conflict
    end

    Org->>DB: SELECT * FROM service_provider_users<br/>WHERE sp_id = $1 AND user_id IN<br/>(SELECT id FROM users WHERE email = $2)
    alt Already a member
        Org-->>GW: AlreadyExists "already a team member"
        GW-->>Admin: 409 Conflict
    end

    Org->>Org: Generate random token (32 bytes)
    Org->>Org: Hash token: SHA-256(token) for storage
    Org->>Org: Set expiry: NOW() + 7 days

    Org->>DB: INSERT INTO invitations<br/>(id, sp_id, email, role, permissions,<br/>token_hash, status='PENDING',<br/>invited_by, expires_at, created_at)

    Org->>Redis: XADD {type: team.member.invited}

    Org->>Email: Send invitation email<br/>To: invitee@example.com<br/>Link: /invite/accept?token=<raw_token>

    Org-->>GW: {invitation}
    GW-->>Admin: 201 Created

    Note over Invitee: Receives email with invitation link
```

## Invitation Acceptance Flow

```mermaid
sequenceDiagram
    participant Invitee as Invited User
    participant GW as Gateway
    participant Org as organization-service
    participant Auth as auth-service
    participant DB as PostgreSQL
    participant Redis as Redis Events

    Invitee->>GW: POST /api/v1/invitations/accept<br/>{token: "<raw_token>"}

    GW->>Org: gRPC AcceptInvitation(token)

    Org->>Org: Compute token_hash = SHA-256(token)

    Org->>DB: SELECT * FROM invitations<br/>WHERE token_hash = $1<br/>AND status = 'PENDING'

    alt Invitation not found
        Org-->>GW: NotFound "invalid invitation token"
        GW-->>Invitee: 404
    end

    alt Invitation expired
        Org->>DB: UPDATE invitations SET status = 'EXPIRED'
        Org-->>GW: InvalidInput "invitation has expired"
        GW-->>Invitee: 400
    end

    Note over Org: Check if user exists

    Org->>DB: SELECT * FROM users WHERE email = $1

    alt User exists
        Org->>Org: Use existing user account
    else User does not exist
        Org->>Auth: gRPC Register(email, tempPassword)<br/>or flag account for password setup
        Auth-->>Org: {newUser}
    end

    Org->>DB: INSERT INTO service_provider_users<br/>(sp_id, user_id, role, permissions,<br/>joined_at)

    Org->>DB: UPDATE invitations<br/>SET status = 'ACCEPTED',<br/>accepted_at = NOW(),<br/>accepted_by = user_id

    Org->>Redis: XADD {type: team.member.joined, user_id, sp_id}

    Org-->>GW: {membership: {spId, userId, role}}
    GW-->>Invitee: 200 OK (redirect to dashboard)
```

## Invitation State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: Admin sends invitation
    PENDING --> ACCEPTED: Invitee accepts (valid token)
    PENDING --> EXPIRED: 7 days pass without action
    PENDING --> REVOKED: Admin cancels invitation
    ACCEPTED --> [*]
    EXPIRED --> PENDING: Admin re-invites
    REVOKED --> PENDING: Admin re-invites
```

## Team Role Management

```mermaid
sequenceDiagram
    participant Admin as SP_ADMIN
    participant GW as Gateway
    participant Org as organization-service
    participant DB as PostgreSQL

    Note over Admin: Update member role

    Admin->>GW: PATCH /api/v1/organizations/:spId/team/:userId<br/>{role: "AGENT", permissions: ["notification.create", ...]}

    GW->>Org: gRPC UpdateTeamMember()

    Org->>Org: RBAC check: team.manage permission
    Org->>Org: Prevent: cannot demote yourself
    Org->>Org: Prevent: cannot have 0 SP_ADMINs

    Org->>DB: UPDATE service_provider_users<br/>SET role = $1, permissions = $2,<br/>updated_at = NOW()<br/>WHERE sp_id = $3 AND user_id = $4

    Org-->>GW: {member: updated}
    GW-->>Admin: 200 OK

    Note over Admin: Remove team member

    Admin->>GW: DELETE /api/v1/organizations/:spId/team/:userId
    GW->>Org: gRPC RemoveTeamMember()

    Org->>Org: RBAC check
    Org->>Org: Prevent: cannot remove yourself
    Org->>Org: Prevent: must have at least 1 SP_ADMIN

    Org->>DB: DELETE FROM service_provider_users<br/>WHERE sp_id = $1 AND user_id = $2

    Org->>DB: XADD {type: team.member.removed}

    Org-->>GW: 204 No Content
    GW-->>Admin: 204
```

## Token Security Model

```mermaid
graph TB
    subgraph "Token Generation"
        Gen["crypto/rand.Read(32 bytes)<br/>Base64 URL encoding<br/>→ Raw token for email link"]
    end

    subgraph "Token Storage"
        Hash["SHA-256(raw_token)<br/>→ token_hash stored in DB<br/>Raw token NEVER stored"]
    end

    subgraph "Token Validation"
        Recv["Receive raw token from URL"]
        Comp["SHA-256(received_token)"]
        Match["Compare hash against DB"]
    end

    subgraph "Security Properties"
        S1["✅ Token not recoverable from DB"]
        S2["✅ 7-day automatic expiration"]
        S3["✅ Single-use (marked ACCEPTED)"]
        S4["✅ Revocable by admin"]
        S5["✅ Unique per email+SP pair"]
    end

    Gen --> Hash
    Recv --> Comp --> Match
```

## Organization Membership Model

```mermaid
graph TB
    subgraph "Organization (organizations)"
        Org["Service Provider<br/>id · name · is_verified<br/>status · industry · settings"]
    end

    subgraph "Membership (service_provider_users)"
        M1["SP_ADMIN<br/>Full control, team management,<br/>settings, billing"]
        M2["AGENT<br/>Send notifications, handle callbacks,<br/>conversations, customers"]
        M3["ANALYST<br/>View analytics, compliance,<br/>read-only access"]
    end

    subgraph "User can belong to multiple SPs"
        User["User<br/>Selects active SP via activeSpId cookie"]
        SP1["Company A — as SP_ADMIN"]
        SP2["Company B — as AGENT"]
        SP3["Company C — as ANALYST"]
    end

    Org --> M1 & M2 & M3
    User --> SP1 & SP2 & SP3
```
