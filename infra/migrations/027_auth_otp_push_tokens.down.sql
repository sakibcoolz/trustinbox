-- Reverse migration 027
DROP TABLE IF EXISTS user_documents;
DROP TABLE IF EXISTS push_tokens;
DROP TABLE IF EXISTS otps;
ALTER TABLE users DROP COLUMN IF EXISTS email_verified;
