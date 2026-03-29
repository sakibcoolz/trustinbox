-- ============================================================
-- 008: Extend user_profiles with bio, location, website, cover_idx
-- ============================================================

ALTER TABLE user_profiles
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS location VARCHAR(255),
    ADD COLUMN IF NOT EXISTS website VARCHAR(500),
    ADD COLUMN IF NOT EXISTS cover_idx SMALLINT NOT NULL DEFAULT 0;
