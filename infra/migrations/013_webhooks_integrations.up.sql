-- Migration: 013_webhooks_integrations
-- Webhook subscriptions, deliveries, API keys, and service accounts

CREATE TABLE webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    description TEXT,
    events TEXT[] NOT NULL,
    secret_hash TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    failure_count INT NOT NULL DEFAULT 0,
    max_retries INT NOT NULL DEFAULT 5,
    last_delivery_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_webhook_subs_sp ON webhook_subscriptions(service_provider_id);
CREATE INDEX idx_webhook_subs_status ON webhook_subscriptions(status);
CREATE INDEX idx_webhook_subs_events ON webhook_subscriptions USING GIN(events);

CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(100),
    payload JSONB NOT NULL,
    response_status INT,
    response_body TEXT,
    response_headers JSONB,
    attempt_count INT NOT NULL DEFAULT 1,
    next_retry_at TIMESTAMPTZ,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    duration_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX idx_webhook_deliveries_sub ON webhook_deliveries(subscription_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'PENDING';
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(created_at DESC);

COMMENT ON COLUMN webhook_deliveries.status IS 'PENDING, DELIVERING, DELIVERED, FAILED, EXPIRED';

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(12) NOT NULL,
    key_hash TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    rate_limit_per_minute INT NOT NULL DEFAULT 100,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by_sp_user_id UUID REFERENCES service_provider_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_api_keys_sp ON api_keys(service_provider_id);
CREATE INDEX idx_api_keys_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_status ON api_keys(status);

COMMENT ON COLUMN api_keys.key_prefix IS 'First 8-12 chars of key for identification (e.g., ti_live_abc)';

CREATE TABLE service_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    client_id VARCHAR(100) UNIQUE NOT NULL,
    client_secret_hash TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    last_used_at TIMESTAMPTZ,
    created_by_sp_user_id UUID REFERENCES service_provider_users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_service_accounts_sp ON service_accounts(service_provider_id);
CREATE INDEX idx_service_accounts_client ON service_accounts(client_id);
CREATE INDEX idx_service_accounts_status ON service_accounts(status);
