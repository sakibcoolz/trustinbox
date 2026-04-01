-- Down migration: remove dev provider seed data
DELETE FROM service_provider_users WHERE id = 'dd000000-0000-0000-0000-000000000020';
DELETE FROM service_providers WHERE id = 'dd000000-0000-0000-0000-000000000010';
DELETE FROM user_profiles WHERE user_id = 'dd000000-0000-0000-0000-000000000001';
DELETE FROM users WHERE id = 'dd000000-0000-0000-0000-000000000001';
