-- 026_bot_xmpp_integration (down)

DROP INDEX IF EXISTS idx_bots_xmpp_jid;
ALTER TABLE bots DROP COLUMN IF EXISTS xmpp_jid;

DROP INDEX IF EXISTS idx_users_account_type;
ALTER TABLE users DROP COLUMN IF EXISTS account_type;
