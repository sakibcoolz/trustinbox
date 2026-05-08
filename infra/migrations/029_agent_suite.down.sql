-- Undo migration 029_agent_suite

DROP TABLE IF EXISTS agent_delegation_logs;
DROP TABLE IF EXISTS sp_agent_suites;

ALTER TABLE bots
    DROP COLUMN IF EXISTS manager_bot_id,
    DROP COLUMN IF EXISTS agent_type;
