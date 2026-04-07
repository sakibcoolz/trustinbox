DROP INDEX IF EXISTS idx_service_providers_service_mode;
ALTER TABLE service_providers DROP COLUMN IF EXISTS service_mode;
