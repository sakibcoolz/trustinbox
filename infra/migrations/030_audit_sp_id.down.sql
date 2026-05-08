-- Revert 030_audit_sp_id

DROP INDEX IF EXISTS idx_delegation_logs_thread;
DROP INDEX IF EXISTS idx_delegation_logs_sp_id;
ALTER TABLE agent_delegation_logs
    DROP COLUMN IF EXISTS delegation_depth,
    DROP COLUMN IF EXISTS thread_id,
    DROP COLUMN IF EXISTS service_provider_id;

DROP INDEX IF EXISTS idx_bot_action_logs_thread;
DROP INDEX IF EXISTS idx_bot_action_logs_sp_id;
ALTER TABLE bot_action_logs
    DROP COLUMN IF EXISTS thread_id,
    DROP COLUMN IF EXISTS service_provider_id;
