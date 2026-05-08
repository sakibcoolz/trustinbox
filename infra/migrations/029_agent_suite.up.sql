-- ─── Agent Suite: Manager + specialized sub-agents per service provider ──────

-- Add agent_type and manager reference to bots table
ALTER TABLE bots
    ADD COLUMN agent_type    VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    ADD COLUMN manager_bot_id UUID REFERENCES bots(id) ON DELETE SET NULL;

CREATE INDEX idx_bots_agent_type      ON bots(agent_type);
CREATE INDEX idx_bots_manager_bot_id  ON bots(manager_bot_id);
CREATE INDEX idx_bots_sp_agent_type   ON bots(service_provider_id, agent_type);

-- One suite per service provider — tracks the provisioned Manager + sub-agents
CREATE TABLE sp_agent_suites (
    id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_provider_id UUID        NOT NULL UNIQUE REFERENCES service_providers(id) ON DELETE CASCADE,
    manager_bot_id      UUID        NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    status              VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    provisioned_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sp_agent_suites_sp_id ON sp_agent_suites(service_provider_id);

-- Audit trail for every delegation from the Manager Agent to a sub-agent
CREATE TABLE agent_delegation_logs (
    id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
    manager_bot_id   UUID           NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    target_bot_id    UUID           NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    user_id          UUID           NOT NULL,
    conversation_id  UUID,
    intent_detected  VARCHAR(100)   NOT NULL DEFAULT '',
    confidence_score NUMERIC(5, 4)  NOT NULL DEFAULT 0,
    input_summary    TEXT           NOT NULL DEFAULT '',
    output_summary   TEXT           NOT NULL DEFAULT '',
    duration_ms      INT            NOT NULL DEFAULT 0,
    success          BOOLEAN        NOT NULL DEFAULT TRUE,
    error_message    TEXT           NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_delegation_logs_manager_bot_id ON agent_delegation_logs(manager_bot_id);
CREATE INDEX idx_delegation_logs_user_id        ON agent_delegation_logs(user_id);
CREATE INDEX idx_delegation_logs_created_at     ON agent_delegation_logs(created_at DESC);
