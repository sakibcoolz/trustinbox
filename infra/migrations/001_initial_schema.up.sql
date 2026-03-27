-- TrustInbox Database Schema
-- Migration: 001_initial_schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE,
    mobile VARCHAR(20),
    password_hash TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    timezone VARCHAR(100) NOT NULL DEFAULT 'Asia/Kolkata',
    language VARCHAR(20) DEFAULT 'en',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    virtual_public_id VARCHAR(100) UNIQUE NOT NULL,
    masked_phone VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_identities_user_id ON user_identities(user_id);
CREATE INDEX idx_user_identities_virtual_id ON user_identities(virtual_public_id);

-- ============================================================
-- PRIVACY & DND
-- ============================================================

CREATE TABLE privacy_preferences (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    allow_personal_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    allow_org_notifications BOOLEAN NOT NULL DEFAULT TRUE,
    allow_advertisements BOOLEAN NOT NULL DEFAULT FALSE,
    allow_callback_requests BOOLEAN NOT NULL DEFAULT TRUE,
    allow_chat BOOLEAN NOT NULL DEFAULT TRUE,
    allow_document_shares BOOLEAN NOT NULL DEFAULT TRUE,
    require_call_approval BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE dnd_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope_type VARCHAR(50) NOT NULL, -- GLOBAL, CATEGORY, ORGANIZATION
    scope_ref_id UUID,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    days_of_week INT[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dnd_rules_user_id ON dnd_rules(user_id);
CREATE INDEX idx_dnd_rules_active ON dnd_rules(user_id, is_active);

CREATE TABLE availability_slots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_availability_slots_user_id ON availability_slots(user_id);

CREATE TABLE user_category_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, category)
);

CREATE TABLE blocked_organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, organization_id)
);

CREATE INDEX idx_blocked_orgs_user ON blocked_organizations(user_id);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    legal_name VARCHAR(255),
    industry VARCHAR(100) NOT NULL,
    description TEXT,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    website TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_verification ON organizations(verification_status);
CREATE INDEX idx_organizations_industry ON organizations(industry);

CREATE TABLE organization_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_s3_key TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL, -- ORG_ADMIN, AGENT, ANALYST
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_users_org ON organization_users(organization_id);
CREATE INDEX idx_org_users_user ON organization_users(user_id);

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    category VARCHAR(50) NOT NULL, -- PERSONAL, ORGANIZATIONAL, ADVERTISEMENT
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    priority VARCHAR(50) NOT NULL DEFAULT 'NORMAL',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_user_category ON notifications(user_id, category);
CREATE INDEX idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX idx_notifications_org ON notifications(organization_id);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

CREATE TABLE notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    delivery_channel VARCHAR(50) NOT NULL,
    delivery_status VARCHAR(50) NOT NULL,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ,
    failure_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_deliveries_notif ON notification_deliveries(notification_id);

-- ============================================================
-- CAMPAIGNS
-- ============================================================

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    created_by_org_user_id UUID REFERENCES organization_users(id),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    scheduled_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_campaigns_org ON campaigns(organization_id);

-- ============================================================
-- CALLBACK REQUESTS
-- ============================================================

CREATE TABLE callback_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    requested_by_org_user_id UUID REFERENCES organization_users(id),
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    approved_slot_start TIMESTAMPTZ,
    approved_slot_end TIMESTAMPTZ
);

CREATE INDEX idx_callback_requests_user ON callback_requests(user_id);
CREATE INDEX idx_callback_requests_user_status ON callback_requests(user_id, status);
CREATE INDEX idx_callback_requests_org ON callback_requests(organization_id);

-- ============================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id),
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_user ON conversations(user_id);
CREATE INDEX idx_conversations_org ON conversations(organization_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_type VARCHAR(50) NOT NULL, -- USER, ORG_AGENT, SYSTEM, AI
    sender_ref_id UUID,
    message_type VARCHAR(50) NOT NULL DEFAULT 'TEXT',
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(conversation_id, created_at);

-- ============================================================
-- DOCUMENTS
-- ============================================================

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    uploaded_by_org_user_id UUID REFERENCES organization_users(id),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    s3_key TEXT NOT NULL,
    file_size BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_org ON documents(organization_id);

CREATE TABLE document_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    share_context VARCHAR(50) NOT NULL, -- NOTIFICATION, CHAT, CALLBACK, DIRECT
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    opened_at TIMESTAMPTZ
);

CREATE INDEX idx_document_shares_user ON document_shares(user_id);
CREATE INDEX idx_document_shares_org ON document_shares(organization_id);

-- ============================================================
-- CONSENT & COMPLIANCE
-- ============================================================

CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id),
    category VARCHAR(50) NOT NULL,
    consent_type VARCHAR(50) NOT NULL, -- OPT_IN, OPT_OUT, CHANNEL_ALLOW, CHANNEL_BLOCK
    value VARCHAR(100) NOT NULL,
    source VARCHAR(50) NOT NULL, -- USER_ACTION, SYSTEM, ADMIN
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_records_user ON consent_records(user_id);
CREATE INDEX idx_consent_records_user_org ON consent_records(user_id, organization_id);

CREATE TABLE policy_decision_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    organization_id UUID,
    category VARCHAR(50),
    channel VARCHAR(50),
    communication_type VARCHAR(50),
    decision_code VARCHAR(100) NOT NULL,
    reason TEXT,
    applied_rules TEXT[],
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_policy_decisions_user ON policy_decision_logs(user_id);
CREATE INDEX idx_policy_decisions_org ON policy_decision_logs(organization_id);
CREATE INDEX idx_policy_decisions_created ON policy_decision_logs(created_at DESC);

-- ============================================================
-- SPAM & MODERATION
-- ============================================================

CREATE TABLE spam_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    notification_id UUID,
    callback_request_id UUID,
    reason VARCHAR(255) NOT NULL,
    details TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'OPEN',
    reviewed_by UUID,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spam_reports_org ON spam_reports(organization_id);
CREATE INDEX idx_spam_reports_status ON spam_reports(status);

CREATE TABLE spam_scores (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id),
    score NUMERIC(5,2) NOT NULL DEFAULT 0,
    total_reports INT NOT NULL DEFAULT 0,
    total_rejections INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- AUDIT
-- ============================================================

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_type VARCHAR(50) NOT NULL, -- USER, ORG_ADMIN, AGENT, PLATFORM_ADMIN, SYSTEM
    actor_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_type, actor_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

-- ============================================================
-- BILLING
-- ============================================================

CREATE TABLE subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price_cents BIGINT NOT NULL,
    billing_period VARCHAR(50) NOT NULL, -- MONTHLY, YEARLY
    max_notifications_per_month INT,
    max_campaigns_per_month INT,
    max_agents INT,
    features JSONB,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE organization_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    plan_id UUID NOT NULL REFERENCES subscription_plans(id),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_subscriptions_org ON organization_subscriptions(organization_id);

CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id),
    subscription_id UUID REFERENCES organization_subscriptions(id),
    amount_cents BIGINT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    due_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invoices_org ON invoices(organization_id);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================

CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);
