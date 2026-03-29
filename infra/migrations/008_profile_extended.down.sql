ALTER TABLE user_profiles
    DROP COLUMN IF EXISTS bio,
    DROP COLUMN IF EXISTS location,
    DROP COLUMN IF EXISTS website,
    DROP COLUMN IF EXISTS cover_idx;
