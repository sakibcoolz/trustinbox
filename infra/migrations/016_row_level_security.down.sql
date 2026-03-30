-- Rollback: 016_row_level_security
-- Disables RLS and drops all tenant isolation policies.

DROP POLICY IF EXISTS sp_isolation_notifications ON notifications;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_callback_requests ON callback_requests;
ALTER TABLE callback_requests DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_conversations ON conversations;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_messages ON messages;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_documents ON documents;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_document_shares ON document_shares;
ALTER TABLE document_shares DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_campaigns ON campaigns;
ALTER TABLE campaigns DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_campaign_targets ON campaign_targets;
ALTER TABLE campaign_targets DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_bots ON bots;
ALTER TABLE bots DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_bot_configurations ON bot_configurations;
ALTER TABLE bot_configurations DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_bot_permissions ON bot_permissions;
ALTER TABLE bot_permissions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_bot_action_logs ON bot_action_logs;
ALTER TABLE bot_action_logs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_bot_analytics ON bot_analytics;
ALTER TABLE bot_analytics DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_webhook_subscriptions ON webhook_subscriptions;
ALTER TABLE webhook_subscriptions DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_webhook_deliveries ON webhook_deliveries;
ALTER TABLE webhook_deliveries DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_policy_decision_logs ON policy_decision_logs;
ALTER TABLE policy_decision_logs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_spam_reports ON spam_reports;
ALTER TABLE spam_reports DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_analytics_daily ON analytics_daily;
ALTER TABLE analytics_daily DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_customer_sp_relations ON customer_sp_relations;
ALTER TABLE customer_sp_relations DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_sp_users ON service_provider_users;
ALTER TABLE service_provider_users DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sp_isolation_sp_verifications ON service_provider_verifications;
ALTER TABLE service_provider_verifications DISABLE ROW LEVEL SECURITY;

DROP FUNCTION IF EXISTS current_sp_id();
