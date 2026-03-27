-- Migration: 003_add_username
-- Adds username column with c/ (customer) and o/ (organization) prefix pattern.
-- Customers: c/alice, c/bob
-- Organizations: o/acmebank, o/cityhospital
-- Organizations interact with customers via virtual_public_id only.

-- Add username to users table
ALTER TABLE users ADD COLUMN username VARCHAR(100) UNIQUE;

-- Add slug to organizations (used in o/ prefix)
ALTER TABLE organizations ADD COLUMN slug VARCHAR(100) UNIQUE;

-- Index for fast username lookups
CREATE UNIQUE INDEX idx_users_username ON users(username);
CREATE UNIQUE INDEX idx_organizations_slug ON organizations(slug);

-- Backfill existing users with c/ prefix usernames derived from email
UPDATE users SET username = 'c/' || split_part(email, '@', 1)
WHERE username IS NULL;

-- Backfill existing organizations with o/ slugs
UPDATE organizations SET slug = lower(replace(replace(name, ' ', ''), '.', ''))
WHERE slug IS NULL;

-- Make username NOT NULL after backfill
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
ALTER TABLE organizations ALTER COLUMN slug SET NOT NULL;
