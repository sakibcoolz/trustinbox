-- 027 · OTP table, push tokens, user documents (customer uploads), email-verified flag
-- Used by: auth OTP flows (forgot-password, email verification),
--           push notification registration, and customer document uploads.

-- ─── Email-verified flag on users ───────────────────────────
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── OTPs (password-reset + email-verification) ─────────────
CREATE TABLE IF NOT EXISTS otps (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash    TEXT        NOT NULL,
    purpose     VARCHAR(50) NOT NULL,   -- 'password_reset' | 'email_verification'
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otps_user_id_purpose ON otps(user_id, purpose, expires_at);

-- ─── Push tokens (FCM / APNS / Web VAPID) ───────────────────
CREATE TABLE IF NOT EXISTS push_tokens (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token       TEXT        NOT NULL,
    platform    VARCHAR(20) NOT NULL DEFAULT 'fcm',  -- 'fcm' | 'apns' | 'web'
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT  uq_push_tokens_user_token UNIQUE (user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON push_tokens(user_id);

-- ─── Customer document uploads ───────────────────────────────
CREATE TABLE IF NOT EXISTS user_documents (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_name    VARCHAR(500) NOT NULL,
    content_type VARCHAR(200) NOT NULL DEFAULT 'application/octet-stream',
    s3_key       TEXT        NOT NULL,
    description  TEXT        NOT NULL DEFAULT '',
    status       VARCHAR(50) NOT NULL DEFAULT 'pending',  -- 'pending' | 'active'
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_documents_user_id_status ON user_documents(user_id, status);
