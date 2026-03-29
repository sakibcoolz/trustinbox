-- Migration: 006_xmpp_token
-- Adds an XMPP token hash to users so ejabberd can delegate authentication
-- to the GraphQL gateway without exposing the primary password.
--
-- Flow:
--   1. User logs in via REST → gateway generates a random 32-byte token.
--   2. Gateway stores sha-256(token) here and returns the plain token to client.
--   3. Client connects to ejabberd WebSocket with username=<user_uuid>
--      and password=<plain_token>.
--   4. ejabberd calls GET /internal/ejabberd/check_password → gateway validates
--      sha-256(supplied_password) against this column.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS xmpp_token_hash VARCHAR(64),
  ADD COLUMN IF NOT EXISTS xmpp_jid        VARCHAR(255);

-- Partial index: only rows that have been issued a token need fast lookup.
CREATE INDEX IF NOT EXISTS idx_users_xmpp_token_hash
  ON users (xmpp_token_hash)
  WHERE xmpp_token_hash IS NOT NULL;
