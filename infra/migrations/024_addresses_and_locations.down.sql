-- Rollback migration 024

DROP INDEX IF EXISTS idx_service_providers_country;
DROP INDEX IF EXISTS idx_service_providers_city;
DROP INDEX IF EXISTS idx_service_providers_location;

ALTER TABLE service_providers
    DROP COLUMN IF EXISTS address,
    DROP COLUMN IF EXISTS city,
    DROP COLUMN IF EXISTS state,
    DROP COLUMN IF EXISTS country,
    DROP COLUMN IF EXISTS postal_code,
    DROP COLUMN IF EXISTS latitude,
    DROP COLUMN IF EXISTS longitude;

DROP INDEX IF EXISTS idx_user_addresses_location;
DROP INDEX IF EXISTS idx_user_addresses_current;
DROP INDEX IF EXISTS idx_user_addresses_user_id;
DROP TABLE IF EXISTS user_addresses;
