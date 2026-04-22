-- Migration: 025_bot_workflow_integration
-- n8n workflow integration for bots: configurations + async suspensions

CREATE TABLE bot_workflow_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    workflow_id VARCHAR(100) NOT NULL,
    workflow_name VARCHAR(255) NOT NULL,
    webhook_path TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (bot_id, workflow_id)
);

CREATE INDEX idx_bot_workflow_configs_bot ON bot_workflow_configs(bot_id);
CREATE INDEX idx_bot_workflow_configs_active ON bot_workflow_configs(bot_id, is_active);

COMMENT ON TABLE bot_workflow_configs IS
    'Maps a bot to one or more n8n workflows by webhook path. Triggered via execute_workflow tool.';

CREATE TABLE bot_workflow_suspensions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    resume_token VARCHAR(64) NOT NULL UNIQUE,
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    conversation_id VARCHAR(255) NOT NULL DEFAULT '',
    user_id VARCHAR(255) NOT NULL DEFAULT '',
    workflow_id VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    result_json TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    resumed_at TIMESTAMPTZ
);

CREATE INDEX idx_bot_workflow_suspensions_token ON bot_workflow_suspensions(resume_token);
CREATE INDEX idx_bot_workflow_suspensions_bot ON bot_workflow_suspensions(bot_id);
CREATE INDEX idx_bot_workflow_suspensions_status ON bot_workflow_suspensions(status, expires_at);

COMMENT ON TABLE bot_workflow_suspensions IS
    'Tracks async n8n workflow executions awaiting resume callback. Tokens expire after 15 minutes.';
