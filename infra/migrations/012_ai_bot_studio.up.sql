-- Migration: 012_ai_bot_studio
-- AI Bot Studio tables for service provider bot management

CREATE TABLE bots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    purpose TEXT NOT NULL,
    department VARCHAR(100),
    industry_profile_id UUID REFERENCES industry_profiles(id),
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_by_sp_user_id UUID REFERENCES service_provider_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bots_sp ON bots(service_provider_id);
CREATE INDEX idx_bots_status ON bots(status);
CREATE INDEX idx_bots_industry ON bots(industry_profile_id);

CREATE TABLE bot_configurations (
    bot_id UUID PRIMARY KEY REFERENCES bots(id) ON DELETE CASCADE,
    tone VARCHAR(100) NOT NULL DEFAULT 'professional',
    writing_style VARCHAR(100) NOT NULL DEFAULT 'concise',
    supported_languages TEXT[] NOT NULL DEFAULT '{en}',
    working_hours_start TIME,
    working_hours_end TIME,
    working_days INT[] DEFAULT '{1,2,3,4,5}',
    max_turns_before_escalation INT DEFAULT 10,
    escalation_rules JSONB NOT NULL DEFAULT '[]',
    human_handoff_policy JSONB NOT NULL DEFAULT '{}',
    approval_policy JSONB NOT NULL DEFAULT '{}',
    fallback_actions JSONB NOT NULL DEFAULT '[]',
    compliance_restrictions JSONB NOT NULL DEFAULT '{}',
    custom_system_prompt TEXT,
    temperature NUMERIC(3,2) DEFAULT 0.7,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE bot_permissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    tool_name VARCHAR(100) NOT NULL,
    is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    constraints JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(bot_id, tool_name)
);

CREATE INDEX idx_bot_permissions_bot ON bot_permissions(bot_id);

-- Allowed bot tools (seed default permission set)
COMMENT ON TABLE bot_permissions IS 'Allowed tools: get_customer_profile, get_customer_consent, get_customer_availability, evaluate_policy, send_notification, send_message, request_callback, share_document, get_conversation_summary, escalate_to_human';

CREATE TABLE bot_knowledge_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    content TEXT,
    s3_key TEXT,
    file_type VARCHAR(100),
    file_size BIGINT,
    chunk_count INT DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_knowledge_bot ON bot_knowledge_sources(bot_id);
CREATE INDEX idx_bot_knowledge_status ON bot_knowledge_sources(status);

COMMENT ON COLUMN bot_knowledge_sources.source_type IS 'DOCUMENT, URL, TEXT, FAQ, API';

CREATE TABLE bot_action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    bot_id UUID NOT NULL REFERENCES bots(id) ON DELETE CASCADE,
    conversation_id UUID,
    user_id UUID,
    action_type VARCHAR(100) NOT NULL,
    tool_used VARCHAR(100),
    input_summary TEXT,
    output_summary TEXT,
    policy_decision VARCHAR(50),
    policy_reason TEXT,
    duration_ms INT,
    success BOOLEAN NOT NULL DEFAULT TRUE,
    error_message TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bot_action_logs_bot ON bot_action_logs(bot_id);
CREATE INDEX idx_bot_action_logs_conversation ON bot_action_logs(conversation_id);
CREATE INDEX idx_bot_action_logs_created ON bot_action_logs(created_at DESC);
CREATE INDEX idx_bot_action_logs_tool ON bot_action_logs(tool_used);

CREATE TABLE bot_analytics (
    bot_id UUID PRIMARY KEY REFERENCES bots(id) ON DELETE CASCADE,
    total_conversations INT NOT NULL DEFAULT 0,
    total_messages_sent INT NOT NULL DEFAULT 0,
    total_messages_received INT NOT NULL DEFAULT 0,
    total_actions_executed INT NOT NULL DEFAULT 0,
    total_escalations INT NOT NULL DEFAULT 0,
    avg_response_time_ms INT NOT NULL DEFAULT 0,
    avg_turns_per_conversation NUMERIC(5,2) DEFAULT 0,
    escalation_rate NUMERIC(5,4) DEFAULT 0,
    resolution_rate NUMERIC(5,4) DEFAULT 0,
    satisfaction_score NUMERIC(3,2) DEFAULT 0,
    last_active_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
