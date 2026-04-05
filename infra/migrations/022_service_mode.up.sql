-- Add service_mode column to service_providers
-- Values: 'NEARBY' (physical/local services) or 'ONLINE' (digital/remote services)
ALTER TABLE service_providers
    ADD COLUMN service_mode VARCHAR(20) NOT NULL DEFAULT 'NEARBY';

CREATE INDEX idx_service_providers_service_mode ON service_providers(service_mode);
