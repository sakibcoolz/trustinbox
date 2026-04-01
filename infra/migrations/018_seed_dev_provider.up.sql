-- Migration: 018_seed_dev_provider
-- Seed a development provider user with full org details for local testing.
-- Credentials: demo@trustinbox.dev / Demo1234!

-- Password: "Demo1234!" (bcrypt cost 10)

-- ============================================================
-- 1. USER
-- ============================================================
INSERT INTO users (id, email, mobile, password_hash, username, status)
VALUES (
    'dd000000-0000-0000-0000-000000000001',
    'demo@trustinbox.dev',
    '+911234567890',
    '$2a$10$xqoKFHA6sIn.AHhD52AEUuDf.iVThx12lqZYSf4TLoRCcAOs4jPjy',
    'o/demo',
    'ACTIVE'
) ON CONFLICT (email) DO NOTHING;

-- ============================================================
-- 2. USER PROFILE
-- ============================================================
INSERT INTO user_profiles (user_id, full_name, timezone, language)
VALUES (
    'dd000000-0000-0000-0000-000000000001',
    'Demo Provider',
    'Asia/Kolkata',
    'en'
) ON CONFLICT (user_id) DO NOTHING;

-- ============================================================
-- 3. SERVICE PROVIDER (organization)
-- ============================================================
INSERT INTO service_providers (id, name, legal_name, industry, description, verification_status, status, website, slug, tenant_id)
VALUES (
    'dd000000-0000-0000-0000-000000000010',
    'Demo Corp',
    'Demo Corp Pvt. Ltd.',
    'Technology',
    'Demo service provider for local development',
    'VERIFIED',
    'ACTIVE',
    'https://democorp.example.com',
    'democorp',
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- 4. SERVICE PROVIDER USER (link user → org as SP_ADMIN)
-- ============================================================
INSERT INTO service_provider_users (id, service_provider_id, user_id, role, status)
VALUES (
    'dd000000-0000-0000-0000-000000000020',
    'dd000000-0000-0000-0000-000000000010',
    'dd000000-0000-0000-0000-000000000001',
    'SP_ADMIN',
    'ACTIVE'
) ON CONFLICT (service_provider_id, user_id) DO NOTHING;
