-- Migration: 014_customer_relations_campaign_targets
-- Customer-SP relationships and campaign target tracking

CREATE TABLE customer_sp_relations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    service_provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    relationship_type VARCHAR(50) NOT NULL DEFAULT 'CUSTOMER',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    metadata JSONB,
    trust_score NUMERIC(3,2) DEFAULT 0,
    total_notifications_sent INT NOT NULL DEFAULT 0,
    total_notifications_read INT NOT NULL DEFAULT 0,
    total_callbacks INT NOT NULL DEFAULT 0,
    total_conversations INT NOT NULL DEFAULT 0,
    first_contact_at TIMESTAMPTZ,
    last_contact_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, service_provider_id)
);

CREATE INDEX idx_customer_sp_user ON customer_sp_relations(user_id);
CREATE INDEX idx_customer_sp_sp ON customer_sp_relations(service_provider_id);
CREATE INDEX idx_customer_sp_type ON customer_sp_relations(relationship_type);
CREATE INDEX idx_customer_sp_status ON customer_sp_relations(status);

COMMENT ON COLUMN customer_sp_relations.relationship_type IS 'CUSTOMER, SUBSCRIBER, LEAD, PROSPECT';
COMMENT ON COLUMN customer_sp_relations.status IS 'ACTIVE, INACTIVE, CHURNED, BLOCKED';

CREATE TABLE campaign_targets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    policy_decision VARCHAR(50),
    policy_reason TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failed_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaign_targets_campaign ON campaign_targets(campaign_id);
CREATE INDEX idx_campaign_targets_user ON campaign_targets(user_id);
CREATE INDEX idx_campaign_targets_status ON campaign_targets(status);

COMMENT ON COLUMN campaign_targets.status IS 'PENDING, POLICY_CHECKING, SENT, DELIVERED, READ, FAILED, SKIPPED';
