DROP POLICY IF EXISTS sp_isolation_invitations ON invitations;
ALTER TABLE invitations DISABLE ROW LEVEL SECURITY;
DROP TABLE IF EXISTS invitations;
