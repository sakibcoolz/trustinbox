-- Migration: 017_invitations
-- Team member invitation system for service providers.

CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    service_provider_id UUID NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'AGENT',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    invited_by UUID NOT NULL REFERENCES users(id),
    expires_at TIMESTAMPTZ NOT NULL,
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_invitations_token ON invitations(token_hash);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_sp ON invitations(service_provider_id);
CREATE INDEX idx_invitations_status ON invitations(status);
CREATE UNIQUE INDEX idx_invitations_pending_email_sp ON invitations(email, service_provider_id)
    WHERE status = 'PENDING';

COMMENT ON COLUMN invitations.status IS 'PENDING, ACCEPTED, EXPIRED, REVOKED';
COMMENT ON COLUMN invitations.role IS 'SP_ADMIN, AGENT, ANALYST';

-- Enable RLS on invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations FORCE ROW LEVEL SECURITY;

CREATE POLICY sp_isolation_invitations ON invitations
    USING (
        current_sp_id() IS NULL
        OR service_provider_id = current_sp_id()
    );
