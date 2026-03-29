-- Migration 010 (DOWN): Revert service_providers → organizations

-- ============================================================
-- RESTORE INDEXES
-- ============================================================

ALTER INDEX idx_service_providers_status       RENAME TO idx_organizations_status;
ALTER INDEX idx_service_providers_verification RENAME TO idx_organizations_verification;
ALTER INDEX idx_service_providers_industry     RENAME TO idx_organizations_industry;
ALTER INDEX idx_blocked_sps_user               RENAME TO idx_blocked_orgs_user;
ALTER INDEX idx_sp_users_sp                    RENAME TO idx_org_users_org;
ALTER INDEX idx_sp_users_user                  RENAME TO idx_org_users_user;
ALTER INDEX idx_notifications_sp               RENAME TO idx_notifications_org;
ALTER INDEX idx_campaigns_sp                   RENAME TO idx_campaigns_org;
ALTER INDEX idx_callback_requests_sp           RENAME TO idx_callback_requests_org;
ALTER INDEX idx_conversations_sp               RENAME TO idx_conversations_org;
ALTER INDEX idx_documents_sp                   RENAME TO idx_documents_org;
ALTER INDEX idx_document_shares_sp             RENAME TO idx_document_shares_org;
ALTER INDEX idx_consent_records_user_sp        RENAME TO idx_consent_records_user_org;
ALTER INDEX idx_policy_decisions_sp            RENAME TO idx_policy_decisions_org;
ALTER INDEX idx_spam_reports_sp                RENAME TO idx_spam_reports_org;
ALTER INDEX idx_sp_subscriptions_sp            RENAME TO idx_org_subscriptions_org;

-- ============================================================
-- RESTORE DATA: Notification categories
-- ============================================================

UPDATE notifications SET category = 'ORGANIZATIONAL' WHERE category = 'SERVICE_PROVIDER';

-- ============================================================
-- RESTORE PRIVACY PREFERENCES
-- ============================================================

ALTER TABLE privacy_preferences RENAME COLUMN allow_sp_notifications TO allow_org_notifications;

-- ============================================================
-- RESTORE organization_id COLUMNS IN SECONDARY TABLES
-- ============================================================

ALTER TABLE invoices              RENAME COLUMN service_provider_id TO organization_id;
ALTER TABLE spam_scores           RENAME COLUMN service_provider_id TO organization_id;
ALTER TABLE spam_reports          RENAME COLUMN service_provider_id TO organization_id;
ALTER TABLE policy_decision_logs  RENAME COLUMN service_provider_id TO organization_id;
ALTER TABLE consent_records       RENAME COLUMN service_provider_id TO organization_id;
ALTER TABLE document_shares       RENAME COLUMN service_provider_id TO organization_id;
ALTER TABLE documents             RENAME COLUMN uploaded_by_sp_user_id   TO uploaded_by_org_user_id;
ALTER TABLE documents             RENAME COLUMN service_provider_id      TO organization_id;
ALTER TABLE conversations         RENAME COLUMN service_provider_id TO organization_id;
ALTER TABLE callback_requests     RENAME COLUMN requested_by_sp_user_id TO requested_by_org_user_id;
ALTER TABLE callback_requests     RENAME COLUMN service_provider_id     TO organization_id;
ALTER TABLE campaigns             RENAME COLUMN created_by_sp_user_id   TO created_by_org_user_id;
ALTER TABLE campaigns             RENAME COLUMN service_provider_id     TO organization_id;
ALTER TABLE notifications         RENAME COLUMN service_provider_id TO organization_id;

-- ============================================================
-- RESTORE organization_id COLUMNS IN RENAMED TABLES
-- ============================================================

ALTER TABLE service_provider_subscriptions RENAME COLUMN service_provider_id TO organization_id;
ALTER TABLE blocked_service_providers      RENAME COLUMN service_provider_id TO organization_id;
ALTER TABLE service_provider_users         RENAME COLUMN service_provider_id TO organization_id;
ALTER TABLE service_provider_verifications RENAME COLUMN service_provider_id TO organization_id;

-- ============================================================
-- RESTORE CORE TABLE NAMES
-- ============================================================

ALTER TABLE service_provider_subscriptions RENAME TO organization_subscriptions;
ALTER TABLE blocked_service_providers      RENAME TO blocked_organizations;
ALTER TABLE service_provider_users         RENAME TO organization_users;
ALTER TABLE service_provider_verifications RENAME TO organization_verifications;
ALTER TABLE service_providers              RENAME TO organizations;
