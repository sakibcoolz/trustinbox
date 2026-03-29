-- Migration 010: Rename organizations → service_providers throughout schema

-- ============================================================
-- RENAME CORE TABLES
-- ============================================================

ALTER TABLE organizations RENAME TO service_providers;
ALTER TABLE organization_verifications RENAME TO service_provider_verifications;
ALTER TABLE organization_users RENAME TO service_provider_users;
ALTER TABLE blocked_organizations RENAME TO blocked_service_providers;
ALTER TABLE organization_subscriptions RENAME TO service_provider_subscriptions;

-- ============================================================
-- RENAME organization_id IN RENAMED TABLES
-- ============================================================

ALTER TABLE service_provider_verifications RENAME COLUMN organization_id TO service_provider_id;
ALTER TABLE service_provider_users RENAME COLUMN organization_id TO service_provider_id;
ALTER TABLE blocked_service_providers RENAME COLUMN organization_id TO service_provider_id;
ALTER TABLE service_provider_subscriptions RENAME COLUMN organization_id TO service_provider_id;

-- ============================================================
-- RENAME organization_id IN ALL OTHER TABLES
-- ============================================================

ALTER TABLE notifications         RENAME COLUMN organization_id            TO service_provider_id;
ALTER TABLE campaigns             RENAME COLUMN organization_id            TO service_provider_id;
ALTER TABLE campaigns             RENAME COLUMN created_by_org_user_id     TO created_by_sp_user_id;
ALTER TABLE callback_requests     RENAME COLUMN organization_id            TO service_provider_id;
ALTER TABLE callback_requests     RENAME COLUMN requested_by_org_user_id  TO requested_by_sp_user_id;
ALTER TABLE conversations         RENAME COLUMN organization_id            TO service_provider_id;
ALTER TABLE documents             RENAME COLUMN organization_id            TO service_provider_id;
ALTER TABLE documents             RENAME COLUMN uploaded_by_org_user_id   TO uploaded_by_sp_user_id;
ALTER TABLE document_shares       RENAME COLUMN organization_id            TO service_provider_id;
ALTER TABLE consent_records       RENAME COLUMN organization_id            TO service_provider_id;
ALTER TABLE policy_decision_logs  RENAME COLUMN organization_id            TO service_provider_id;
ALTER TABLE spam_reports          RENAME COLUMN organization_id            TO service_provider_id;
ALTER TABLE spam_scores           RENAME COLUMN organization_id            TO service_provider_id;
ALTER TABLE invoices              RENAME COLUMN organization_id            TO service_provider_id;

-- ============================================================
-- PRIVACY PREFERENCES
-- ============================================================

ALTER TABLE privacy_preferences RENAME COLUMN allow_org_notifications TO allow_sp_notifications;

-- ============================================================
-- DATA MIGRATION: Notification categories
-- ============================================================

UPDATE notifications SET category = 'SERVICE_PROVIDER' WHERE category = 'ORGANIZATIONAL';

-- ============================================================
-- RENAME INDEXES
-- ============================================================

ALTER INDEX idx_organizations_status       RENAME TO idx_service_providers_status;
ALTER INDEX idx_organizations_verification RENAME TO idx_service_providers_verification;
ALTER INDEX idx_organizations_industry     RENAME TO idx_service_providers_industry;
ALTER INDEX idx_blocked_orgs_user          RENAME TO idx_blocked_sps_user;
ALTER INDEX idx_org_users_org              RENAME TO idx_sp_users_sp;
ALTER INDEX idx_org_users_user             RENAME TO idx_sp_users_user;
ALTER INDEX idx_notifications_org          RENAME TO idx_notifications_sp;
ALTER INDEX idx_campaigns_org              RENAME TO idx_campaigns_sp;
ALTER INDEX idx_callback_requests_org      RENAME TO idx_callback_requests_sp;
ALTER INDEX idx_conversations_org          RENAME TO idx_conversations_sp;
ALTER INDEX idx_documents_org              RENAME TO idx_documents_sp;
ALTER INDEX idx_document_shares_org        RENAME TO idx_document_shares_sp;
ALTER INDEX idx_consent_records_user_org   RENAME TO idx_consent_records_user_sp;
ALTER INDEX idx_policy_decisions_org       RENAME TO idx_policy_decisions_sp;
ALTER INDEX idx_spam_reports_org           RENAME TO idx_spam_reports_sp;
ALTER INDEX idx_org_subscriptions_org      RENAME TO idx_sp_subscriptions_sp;
