-- Migration: 016_row_level_security
-- Enables PostgreSQL Row-Level Security for tenant isolation.
-- All tables scoped to a service_provider_id are protected.
-- The current tenant is communicated via the session variable
--   SET LOCAL app.current_sp_id = '<uuid>';
-- which must be issued by the application at the start of each transaction.

-- ============================================================
-- Helper: current_sp_id() returns the app-level session variable.
-- ============================================================

CREATE OR REPLACE FUNCTION current_sp_id() RETURNS UUID AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_sp_id', true), '')::UUID;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_notifications ON notifications
    USING (
        service_provider_id IS NULL
        OR current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- CALLBACK REQUESTS
-- ============================================================

ALTER TABLE callback_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE callback_requests FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_callback_requests ON callback_requests
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- CONVERSATIONS
-- ============================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_conversations ON conversations
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- MESSAGES (via conversation join)
-- ============================================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_messages ON messages
    USING (
        current_sp_id() IS NULL
        OR conversation_id IN (
            SELECT id FROM conversations
            WHERE service_provider_id = current_sp_id()
        )
    );

-- ============================================================
-- DOCUMENTS
-- ============================================================

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_documents ON documents
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- DOCUMENT SHARES
-- ============================================================

ALTER TABLE document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_shares FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_document_shares ON document_shares
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- CAMPAIGNS
-- ============================================================

ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_campaigns ON campaigns
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- CAMPAIGN TARGETS
-- ============================================================

ALTER TABLE campaign_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_targets FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_campaign_targets ON campaign_targets
    USING (
        current_sp_id() IS NULL
        OR campaign_id IN (
            SELECT id FROM campaigns
            WHERE service_provider_id = current_sp_id()
        )
    );

-- ============================================================
-- BOTS
-- ============================================================

ALTER TABLE bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE bots FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_bots ON bots
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- BOT CONFIGURATIONS
-- ============================================================

ALTER TABLE bot_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_configurations FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_bot_configurations ON bot_configurations
    USING (
        current_sp_id() IS NULL
        OR bot_id IN (
            SELECT id FROM bots
            WHERE service_provider_id = current_sp_id()
        )
    );

-- ============================================================
-- BOT PERMISSIONS
-- ============================================================

ALTER TABLE bot_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_permissions FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_bot_permissions ON bot_permissions
    USING (
        current_sp_id() IS NULL
        OR bot_id IN (
            SELECT id FROM bots
            WHERE service_provider_id = current_sp_id()
        )
    );

-- ============================================================
-- BOT ACTION LOGS
-- ============================================================

ALTER TABLE bot_action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_action_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_bot_action_logs ON bot_action_logs
    USING (
        current_sp_id() IS NULL
        OR bot_id IN (
            SELECT id FROM bots
            WHERE service_provider_id = current_sp_id()
        )
    );

-- ============================================================
-- BOT ANALYTICS
-- ============================================================

ALTER TABLE bot_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_analytics FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_bot_analytics ON bot_analytics
    USING (
        current_sp_id() IS NULL
        OR bot_id IN (
            SELECT id FROM bots
            WHERE service_provider_id = current_sp_id()
        )
    );

-- ============================================================
-- WEBHOOK SUBSCRIPTIONS
-- ============================================================

ALTER TABLE webhook_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_subscriptions FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_webhook_subscriptions ON webhook_subscriptions
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- WEBHOOK DELIVERIES
-- ============================================================

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_webhook_deliveries ON webhook_deliveries
    USING (
        current_sp_id() IS NULL
        OR subscription_id IN (
            SELECT id FROM webhook_subscriptions
            WHERE service_provider_id = current_sp_id()
        )
    );

-- ============================================================
-- POLICY DECISION LOGS
-- ============================================================

ALTER TABLE policy_decision_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_decision_logs FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_policy_decision_logs ON policy_decision_logs
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- SPAM REPORTS
-- ============================================================

ALTER TABLE spam_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE spam_reports FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_spam_reports ON spam_reports
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- ANALYTICS DAILY
-- ============================================================

ALTER TABLE analytics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_analytics_daily ON analytics_daily
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- CUSTOMER SP RELATIONS
-- ============================================================

ALTER TABLE customer_sp_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_sp_relations FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_customer_sp_relations ON customer_sp_relations
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- SERVICE PROVIDER USERS
-- ============================================================

ALTER TABLE service_provider_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_provider_users FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_sp_users ON service_provider_users
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );

-- ============================================================
-- SERVICE PROVIDER VERIFICATIONS
-- ============================================================

ALTER TABLE service_provider_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_provider_verifications FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_sp_verifications ON service_provider_verifications
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );
