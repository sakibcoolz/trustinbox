-- ─── Audit log SP isolation + thread tracking ────────────────────────────────
-- Adds service_provider_id and thread_id to both audit log tables so that logs
-- can be scoped to a tenant and correlated across a delegation chain.
-- delegation_depth tracks how deep in the agent-delegation tree this entry is.

-- bot_action_logs
ALTER TABLE bot_action_logs
    ADD COLUMN service_provider_id UUID,
    ADD COLUMN thread_id            VARCHAR(36);

CREATE INDEX idx_bot_action_logs_sp_id    ON bot_action_logs(service_provider_id, created_at DESC);
CREATE INDEX idx_bot_action_logs_thread   ON bot_action_logs(thread_id) WHERE thread_id IS NOT NULL;

-- agent_delegation_logs
ALTER TABLE agent_delegation_logs
    ADD COLUMN service_provider_id UUID,
    ADD COLUMN thread_id            VARCHAR(36),
    ADD COLUMN delegation_depth     INT NOT NULL DEFAULT 0;

CREATE INDEX idx_delegation_logs_sp_id  ON agent_delegation_logs(service_provider_id, created_at DESC);
CREATE INDEX idx_delegation_logs_thread ON agent_delegation_logs(thread_id) WHERE thread_id IS NOT NULL;
