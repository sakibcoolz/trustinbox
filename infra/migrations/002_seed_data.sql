-- Seed data for local development

-- ============================================================
-- USERS
-- ============================================================

-- Password: "password123" (bcrypt hash)
INSERT INTO users (id, email, mobile, password_hash, username, status) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'alice@example.com', '+919876543210', '$2a$10$q373EZDRQx6HFoqwDheKcuzdYoSHg86K.Qz5j.Wle8r544CU5R1z.', 'c/alice', 'ACTIVE'),
    ('a0000000-0000-0000-0000-000000000002', 'bob@example.com', '+919876543211', '$2a$10$q373EZDRQx6HFoqwDheKcuzdYoSHg86K.Qz5j.Wle8r544CU5R1z.', 'c/bob', 'ACTIVE'),
    ('a0000000-0000-0000-0000-000000000003', 'admin@trustinbox.com', '+919876543299', '$2a$10$q373EZDRQx6HFoqwDheKcuzdYoSHg86K.Qz5j.Wle8r544CU5R1z.', 'c/admin', 'ACTIVE'),
    ('a0000000-0000-0000-0000-000000000004', 'orgadmin@acmebank.com', '+919876543212', '$2a$10$q373EZDRQx6HFoqwDheKcuzdYoSHg86K.Qz5j.Wle8r544CU5R1z.', 'c/orgadmin', 'ACTIVE'),
    ('a0000000-0000-0000-0000-000000000005', 'agent1@acmebank.com', '+919876543213', '$2a$10$q373EZDRQx6HFoqwDheKcuzdYoSHg86K.Qz5j.Wle8r544CU5R1z.', 'c/agent1', 'ACTIVE');

INSERT INTO user_profiles (user_id, full_name, timezone, language) VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Alice Customer', 'Asia/Kolkata', 'en'),
    ('a0000000-0000-0000-0000-000000000002', 'Bob Customer', 'Asia/Kolkata', 'en'),
    ('a0000000-0000-0000-0000-000000000003', 'Platform Admin', 'Asia/Kolkata', 'en'),
    ('a0000000-0000-0000-0000-000000000004', 'Acme Bank Admin', 'Asia/Kolkata', 'en'),
    ('a0000000-0000-0000-0000-000000000005', 'Agent One', 'Asia/Kolkata', 'en');

INSERT INTO user_identities (id, user_id, virtual_public_id, masked_phone, is_active) VALUES
    ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'TI-ALICE-001', '+91****3210', TRUE),
    ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'TI-BOB-002', '+91****3211', TRUE);

-- ============================================================
-- PRIVACY PREFERENCES
-- ============================================================

INSERT INTO privacy_preferences (user_id, allow_personal_notifications, allow_org_notifications, allow_advertisements, allow_callback_requests, allow_chat, allow_document_shares, require_call_approval) VALUES
    ('a0000000-0000-0000-0000-000000000001', TRUE, TRUE, FALSE, TRUE, TRUE, TRUE, TRUE),
    ('a0000000-0000-0000-0000-000000000002', TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE);

-- ============================================================
-- DND RULES
-- ============================================================

INSERT INTO dnd_rules (id, user_id, scope_type, start_time, end_time, days_of_week, is_active) VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'GLOBAL', '22:00', '07:00', '{0,1,2,3,4,5,6}', TRUE),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'CATEGORY', '09:00', '17:00', '{1,2,3,4,5}', TRUE);

-- ============================================================
-- AVAILABILITY SLOTS
-- ============================================================

INSERT INTO availability_slots (id, user_id, day_of_week, start_time, end_time, slot_type, is_active) VALUES
    ('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, '18:00', '20:00', 'CALLBACK', TRUE),
    ('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 3, '18:00', '20:00', 'CALLBACK', TRUE),
    ('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 5, '10:00', '12:00', 'GENERAL', TRUE);

-- ============================================================
-- ORGANIZATIONS
-- ============================================================

INSERT INTO organizations (id, name, legal_name, industry, description, verification_status, status, website, slug) VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Acme Bank', 'Acme Bank Ltd.', 'Banking', 'Leading digital bank', 'VERIFIED', 'ACTIVE', 'https://acmebank.example.com', 'acmebank'),
    ('e0000000-0000-0000-0000-000000000002', 'City Hospital', 'City Hospital Pvt. Ltd.', 'Healthcare', 'Multi-specialty hospital', 'VERIFIED', 'ACTIVE', 'https://cityhospital.example.com', 'cityhospital'),
    ('e0000000-0000-0000-0000-000000000003', 'Quick Realty', 'Quick Realty Corp.', 'Real Estate', 'Real estate agency', 'PENDING', 'ACTIVE', 'https://quickrealty.example.com', 'quickrealty');

INSERT INTO organization_users (id, organization_id, user_id, role, status) VALUES
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'ORG_ADMIN', 'ACTIVE'),
    ('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000005', 'AGENT', 'ACTIVE');

-- ============================================================
-- SAMPLE NOTIFICATIONS
-- ============================================================

INSERT INTO notifications (id, user_id, organization_id, category, title, body, priority, status, metadata) VALUES
    ('10000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'PERSONAL', 'Salary Credited', 'Your salary of ₹85,000 has been credited to your account ending 4521.', 'HIGH', 'DELIVERED', '{"amount": 85000, "account_last4": "4521"}'),
    ('10000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'PERSONAL', 'Appointment Reminder', 'Your appointment with Dr. Sharma is scheduled for tomorrow at 10:00 AM.', 'NORMAL', 'DELIVERED', '{"doctor": "Dr. Sharma", "time": "10:00 AM"}'),
    ('10000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'ORGANIZATIONAL', 'New Credit Card Offer', 'You are pre-approved for our Platinum Credit Card with 5% cashback.', 'LOW', 'DELIVERED', '{"offer_type": "credit_card"}');

INSERT INTO notification_deliveries (id, notification_id, delivery_channel, delivery_status, delivered_at) VALUES
    ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'INBOX', 'DELIVERED', NOW()),
    ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'INBOX', 'DELIVERED', NOW()),
    ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'INBOX', 'DELIVERED', NOW());

-- ============================================================
-- SAMPLE CALLBACK REQUEST
-- ============================================================

INSERT INTO callback_requests (id, user_id, organization_id, requested_by_org_user_id, reason, details, status) VALUES
    ('30000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000002', 'Credit card activation', 'We need to verify your identity for credit card activation.', 'PENDING');

-- ============================================================
-- SPAM SCORES
-- ============================================================

INSERT INTO spam_scores (organization_id, score, total_reports, total_rejections) VALUES
    ('e0000000-0000-0000-0000-000000000001', 0.5, 0, 0),
    ('e0000000-0000-0000-0000-000000000002', 0.0, 0, 0),
    ('e0000000-0000-0000-0000-000000000003', 2.5, 1, 3);

-- ============================================================
-- SUBSCRIPTION PLANS
-- ============================================================

INSERT INTO subscription_plans (id, name, description, price_cents, billing_period, max_notifications_per_month, max_campaigns_per_month, max_agents, features) VALUES
    ('40000000-0000-0000-0000-000000000001', 'Starter', 'For small businesses', 99900, 'MONTHLY', 1000, 5, 3, '{"chat": true, "documents": true, "analytics": false}'),
    ('40000000-0000-0000-0000-000000000002', 'Professional', 'For growing businesses', 299900, 'MONTHLY', 10000, 50, 20, '{"chat": true, "documents": true, "analytics": true, "campaigns": true}'),
    ('40000000-0000-0000-0000-000000000003', 'Enterprise', 'For large organizations', 999900, 'MONTHLY', 100000, 500, 200, '{"chat": true, "documents": true, "analytics": true, "campaigns": true, "api_access": true, "priority_support": true}');
