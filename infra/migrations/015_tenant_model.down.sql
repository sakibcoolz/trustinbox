DROP TABLE IF EXISTS analytics_daily;
ALTER TABLE service_providers DROP COLUMN IF EXISTS tenant_id;
DELETE FROM tenants WHERE slug = 'default';
DROP TABLE IF EXISTS tenants;
