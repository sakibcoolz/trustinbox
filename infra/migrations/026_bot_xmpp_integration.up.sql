-- 026_bot_xmpp_integration
--
-- Bots become first-class chat participants:
--   * Each bot gets a "shadow" row in the users table so it can be referenced
--     from conversation_participants (FK constraint) and validated by the
--     ejabberd hooks (`is_user`, `check_password`).
--   * The bot's UUID is reused as the user UUID — keeps everything traceable
--     and avoids a separate mapping table.
--   * `account_type` distinguishes bots from humans so the friendship
--     requirement can be skipped for bot conversations and the chat UI can
--     render a bot badge.
--   * `xmpp_jid` stores the bot's ejabberd address (mirrors the column on
--     `users` from migration 006).

ALTER TABLE users
    ADD COLUMN IF NOT EXISTS account_type VARCHAR(20) NOT NULL DEFAULT 'HUMAN'
        CHECK (account_type IN ('HUMAN', 'BOT'));

CREATE INDEX IF NOT EXISTS idx_users_account_type
    ON users(account_type)
    WHERE account_type <> 'HUMAN';

ALTER TABLE bots
    ADD COLUMN IF NOT EXISTS xmpp_jid VARCHAR(255);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bots_xmpp_jid
    ON bots(xmpp_jid)
    WHERE xmpp_jid IS NOT NULL;
