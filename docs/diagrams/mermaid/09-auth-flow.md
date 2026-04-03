# 09 — Authentication Flow

> Login, registration, token lifecycle, password reset, and session management.

## User Registration

```mermaid
sequenceDiagram
    participant Client as Browser
    participant GW as Gateway (:4000)
    participant Auth as auth-service (:50051)
    participant User as user-service (:50052)
    participant DB as PostgreSQL
    participant Redis as Redis Events

    Client->>GW: POST /api/auth/register<br/>{email, password, fullName, phone}

    GW->>Auth: gRPC Register(email, password, fullName, phone)

    Auth->>DB: SELECT EXISTS FROM users WHERE email = $1
    Note over Auth,DB: Check unique email

    alt Email already exists
        Auth-->>GW: ALREADY_EXISTS error
        GW-->>Client: 409 Conflict
    end

    Auth->>Auth: Hash password: bcrypt(password, cost=12)
    Auth->>Auth: Generate UUID for user
    Auth->>Auth: Generate virtual number: TI-<8 random chars>

    Auth->>DB: INSERT INTO users (id, email, password_hash,<br/>full_name, phone, virtual_number, role, status)
    Auth->>DB: INSERT INTO user_profiles (user_id, display_name)
    Auth->>DB: INSERT INTO user_privacy_preferences<br/>(user_id, defaults for all categories)

    Auth->>Auth: Generate Access Token (JWT HS256, 15min)<br/>Claims: {user_id, email, role, exp}
    Auth->>Auth: Generate Refresh Token (JWT HS256, 7d)
    Auth->>DB: INSERT INTO refresh_tokens<br/>(id, user_id, token_hash=SHA256(token), expires_at)

    Auth->>Redis: PUBLISH customer.synced<br/>{user_id, email, full_name, virtual_number}

    Auth-->>GW: {accessToken, refreshToken, user}
    GW-->>Client: 201 Created + Set Cookies (provider)<br/>or JSON body (web)
```

## User Login

```mermaid
sequenceDiagram
    participant Client as Browser
    participant GW as Gateway (:4000)
    participant Auth as auth-service (:50051)
    participant DB as PostgreSQL

    Client->>GW: POST /api/auth/login<br/>{email, password}

    GW->>Auth: gRPC Login(email, password)

    Auth->>DB: SELECT * FROM users WHERE email = $1
    Note over Auth,DB: Fetch user with password_hash

    alt User not found
        Auth-->>GW: NOT_FOUND error
        GW-->>Client: 401 Unauthorized
    end

    Auth->>Auth: bcrypt.CompareHashAndPassword(hash, password)

    alt Invalid password
        Auth-->>GW: INVALID_CREDENTIALS error
        GW-->>Client: 401 Unauthorized
    end

    Auth->>Auth: Check user status (active, suspended, etc.)

    alt User suspended
        Auth-->>GW: FORBIDDEN "account suspended"
        GW-->>Client: 403 Forbidden
    end

    Auth->>Auth: Generate Access Token (JWT HS256, 15min)
    Auth->>Auth: Generate Refresh Token (JWT HS256, 7d)
    Auth->>DB: INSERT INTO refresh_tokens<br/>(id, user_id, token_hash, expires_at)

    Auth-->>GW: {accessToken, refreshToken, user{id, email, role, fullName}}

    alt Provider Portal
        GW-->>Client: Set-Cookie: accessToken (httpOnly, secure, 15min)<br/>Set-Cookie: refreshToken (httpOnly, secure, 7d)<br/>Set-Cookie: auth-status (js-readable, 15min)<br/>JSON: {user}
    else Web App
        GW-->>Client: JSON: {accessToken, refreshToken, user}
        Client->>Client: localStorage.setItem('token', accessToken)
    end
```

## Token Refresh Flow

```mermaid
sequenceDiagram
    participant Client as Browser
    participant GW as Gateway (:4000)
    participant Auth as auth-service (:50051)
    participant DB as PostgreSQL

    Note over Client: Access token expired<br/>(or approaching expiry)

    alt Provider Portal (Cookie-based)
        Client->>GW: POST /api/auth/refresh<br/>Cookie: refreshToken=...
    else Web App (localStorage)
        Client->>GW: POST /api/auth/refresh<br/>{refreshToken: "..."}
    end

    GW->>Auth: gRPC RefreshToken(refreshToken)

    Auth->>Auth: Validate JWT signature & expiry
    Auth->>Auth: Compute token_hash = SHA256(refreshToken)
    Auth->>DB: SELECT * FROM refresh_tokens<br/>WHERE token_hash = $1 AND revoked = false

    alt Token not found or revoked
        Auth-->>GW: UNAUTHORIZED "invalid refresh token"
        GW-->>Client: 401 (force re-login)
    end

    alt Token expired
        Auth->>DB: UPDATE refresh_tokens SET revoked = true
        Auth-->>GW: UNAUTHORIZED "refresh token expired"
        GW-->>Client: 401 (force re-login)
    end

    Note over Auth: Token rotation — revoke old, issue new
    Auth->>DB: UPDATE refresh_tokens SET revoked = true<br/>WHERE id = $1
    Auth->>Auth: Generate new Access Token (15min)
    Auth->>Auth: Generate new Refresh Token (7d)
    Auth->>DB: INSERT INTO refresh_tokens (new token_hash)

    Auth-->>GW: {newAccessToken, newRefreshToken}
    GW-->>Client: Updated tokens (cookies or JSON)
```

## Service Provider Login & SP Selection

```mermaid
sequenceDiagram
    participant Client as Provider Portal
    participant GW as Gateway
    participant Auth as auth-service
    participant Org as org-service
    participant DB as PostgreSQL

    Note over Client: After successful login,<br/>SP_ADMIN or AGENT may have multiple SPs

    Client->>GW: GET /api/v1/organizations/my<br/>Cookie: accessToken
    GW->>Org: gRPC ListUserOrganizations(user_id)
    Org->>DB: SELECT o.* FROM organizations o<br/>JOIN service_provider_users spu ON o.id = spu.sp_id<br/>WHERE spu.user_id = $1
    Org-->>GW: [{id, name, logo, role}, ...]
    GW-->>Client: Organization list

    Client->>Client: User selects active SP
    Client->>GW: POST /api/auth/select-sp {spId}
    GW-->>Client: Set-Cookie: activeSpId=<spId>

    Note over Client,DB: All subsequent requests include<br/>activeSpId cookie → x-service-provider-id header<br/>→ PostgreSQL RLS tenant isolation
```

## Auto-Refresh Timelines

```mermaid
gantt
    title Token Lifecycle (Not to Scale)
    dateFormat HH:mm
    axisFormat %H:%M

    section Access Token
    Active (15 min)           :active, at, 00:00, 15m
    Expired                  :crit, ate, after at, 5m

    section Provider Auto-Refresh
    Timer fires at 12min     :milestone, m1, 00:12, 0m
    New token issued         :done, rt, 00:12, 1m
    New active period        :active, at2, 00:12, 15m

    section Refresh Token
    Valid (7 days)           :active, rft, 00:00, 168h
```

## Logout Flow

```mermaid
sequenceDiagram
    participant Client as Browser
    participant GW as Gateway
    participant Auth as auth-service
    participant DB as PostgreSQL

    Client->>GW: POST /api/auth/logout<br/>Cookie/Header: refreshToken

    GW->>Auth: gRPC Logout(refreshToken)
    Auth->>Auth: Compute token_hash = SHA256(refreshToken)
    Auth->>DB: UPDATE refresh_tokens SET revoked = true<br/>WHERE token_hash = $1

    Auth-->>GW: OK

    alt Provider Portal
        GW-->>Client: Clear cookies:<br/>accessToken, refreshToken,<br/>auth-status, activeSpId
        Client->>Client: Redirect → /auth/login
    else Web App
        GW-->>Client: 200 OK
        Client->>Client: localStorage.clear()
        Client->>Client: Redirect → /login
    end
```

## JWT Token Structure

```mermaid
graph TB
    subgraph "Access Token (15 min)"
        ATH["Header<br/>{alg: HS256, typ: JWT}"]
        ATP["Payload<br/>{<br/>  sub: user_id (UUID),<br/>  email: user@example.com,<br/>  role: SP_ADMIN,<br/>  iat: issued_at,<br/>  exp: issued_at + 15min<br/>}"]
        ATS["Signature<br/>HMACSHA256(header.payload, JWT_SECRET)"]
    end

    subgraph "Refresh Token (7 days)"
        RTH["Header<br/>{alg: HS256, typ: JWT}"]
        RTP["Payload<br/>{<br/>  sub: user_id (UUID),<br/>  type: refresh,<br/>  iat: issued_at,<br/>  exp: issued_at + 7d<br/>}"]
        RTS["Signature<br/>HMACSHA256(header.payload, JWT_SECRET)"]
    end

    subgraph "Storage in DB"
        RTStore["refresh_tokens table<br/>id · user_id · token_hash (SHA-256)<br/>revoked · expires_at · created_at"]
    end

    ATS -.->|"Never stored in DB"| ATH
    RTS -->|"SHA-256 hash stored"| RTStore
```
