-- Customer internal notes (SP-owned notes about a customer)
CREATE TABLE customer_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
    author_name VARCHAR(255) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_customer_notes_sp_user ON customer_notes(service_provider_id, user_id);
CREATE INDEX idx_customer_notes_created ON customer_notes(created_at DESC);

-- Customer tags (SP-owned labels for a customer)
CREATE TABLE customer_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    service_provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(service_provider_id, user_id, label)
);

CREATE INDEX idx_customer_tags_sp_user ON customer_tags(service_provider_id, user_id);

-- RLS
ALTER TABLE customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_notes FORCE ROW LEVEL SECURITY;
CREATE POLICY sp_isolation_customer_notes ON customer_notes
    USING (current_sp_id() IS NULL OR service_provider_id = current_sp_id());

ALTER TABLE customer_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_tags FORCE ROW LEVEL SECURITY;
CREATE POLICY sp_isolation_customer_tags ON customer_tags
    USING (current_sp_id() IS NULL OR service_provider_id = current_sp_id());
