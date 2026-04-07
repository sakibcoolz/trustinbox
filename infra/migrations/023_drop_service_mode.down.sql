ALTER TABLE service_providers ADD COLUMN service_mode VARCHAR(20) NOT NULL DEFAULT 'NEARBY';
CREATE INDEX idx_service_providers_service_mode ON service_providers(service_mode);
