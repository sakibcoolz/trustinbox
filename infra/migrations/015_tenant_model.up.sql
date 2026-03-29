-- Migration: 015_tenant_model
-- Multi-tenancy foundation with tenants table

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    settings JSONB NOT NULL DEFAULT '{}',
    max_service_providers INT DEFAULT 100,
    max_notifications_per_day INT DEFAULT 10000,
    features JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_status ON tenants(status);

COMMENT ON COLUMN tenants.status IS 'ACTIVE, SUSPENDED, DEACTIVATED';

-- Add tenant_id to service_providers
ALTER TABLE service_providers ADD COLUMN tenant_id UUID REFERENCES tenants(id);
CREATE INDEX idx_sp_tenant ON service_providers(tenant_id);

-- Insert a default tenant for existing data
INSERT INTO tenants (id, name, slug, status) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Default Tenant', 'default', 'ACTIVE');

-- Assign existing service providers to default tenant
UPDATE service_providers SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Analytics aggregation table for dashboards
CREATE TABLE analytics_daily (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notifications_sent INT NOT NULL DEFAULT 0,
    notifications_delivered INT NOT NULL DEFAULT 0,
    notifications_read INT NOT NULL DEFAULT 0,
    notifications_rejected INT NOT NULL DEFAULT 0,
    callbacks_requested INT NOT NULL DEFAULT 0,
    callbacks_approved INT NOT NULL DEFAULT 0,
    callbacks_rejected INT NOT NULL DEFAULT 0,
    callbacks_expired INT NOT NULL DEFAULT 0,
    messages_sent INT NOT NULL DEFAULT 0,
    messages_received INT NOT NULL DEFAULT 0,
    documents_shared INT NOT NULL DEFAULT 0,
    documents_opened INT NOT NULL DEFAULT 0,
    campaigns_launched INT NOT NULL DEFAULT 0,
    campaign_targets_sent INT NOT NULL DEFAULT 0,
    bot_actions_executed INT NOT NULL DEFAULT 0,
    bot_escalations INT NOT NULL DEFAULT 0,
    spam_reports INT NOT NULL DEFAULT 0,
    policy_evaluations INT NOT NULL DEFAULT 0,
    policy_denials INT NOT NULL DEFAULT 0,
    webhook_deliveries INT NOT NULL DEFAULT 0,
    webhook_failures INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(service_provider_id, date)
);

CREATE INDEX idx_analytics_daily_sp ON analytics_daily(service_provider_id);
CREATE INDEX idx_analytics_daily_date ON analytics_daily(date DESC);
CREATE INDEX idx_analytics_daily_sp_date ON analytics_daily(service_provider_id, date DESC);
