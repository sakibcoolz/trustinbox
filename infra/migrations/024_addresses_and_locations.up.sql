-- Migration 024: User addresses (multiple) and service provider location fields
-- Users can store multiple addresses with one marked as current
-- Service providers expose their business location (address + coordinates)

-- ─── User Addresses ────────────────────────────────────────────────────────

CREATE TABLE user_addresses (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label       VARCHAR(100) NOT NULL DEFAULT 'Home',       -- Home, Work, Other
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city        VARCHAR(100) NOT NULL,
    state       VARCHAR(100),
    postal_code VARCHAR(20),
    country     VARCHAR(100) NOT NULL,
    latitude    NUMERIC(10,7),
    longitude   NUMERIC(10,7),
    is_current  BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_addresses_user_id ON user_addresses(user_id);
CREATE INDEX idx_user_addresses_current ON user_addresses(user_id, is_current) WHERE is_current = TRUE;
CREATE INDEX idx_user_addresses_location ON user_addresses(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ─── Service Provider Location ─────────────────────────────────────────────

ALTER TABLE service_providers
    ADD COLUMN address       TEXT,
    ADD COLUMN city          VARCHAR(100),
    ADD COLUMN state         VARCHAR(100),
    ADD COLUMN country       VARCHAR(100),
    ADD COLUMN postal_code   VARCHAR(20),
    ADD COLUMN latitude      NUMERIC(10,7),
    ADD COLUMN longitude     NUMERIC(10,7);

CREATE INDEX idx_service_providers_location ON service_providers(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
CREATE INDEX idx_service_providers_city ON service_providers(city) WHERE city IS NOT NULL;
CREATE INDEX idx_service_providers_country ON service_providers(country) WHERE country IS NOT NULL;
