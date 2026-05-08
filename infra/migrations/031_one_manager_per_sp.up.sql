-- Enforce: exactly one MANAGER bot per service provider.
--
-- Product Rule (#9 in copilot-instructions.md): every service provider has
-- exactly one bot with agent_type = 'MANAGER'. The Manager is the only AI
-- surface exposed to consumer apps (web, hybrid). Sub-agents are reachable
-- only via Manager-driven delegation on the backend.
--
-- This partial unique index makes the rule physically impossible to violate.

-- 1. Defensive cleanup: if any SP somehow has more than one MANAGER (shouldn't
--    happen in production but the dev DB had bots inserted directly), keep
--    the oldest one and demote duplicates so the index can be created.
WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY service_provider_id ORDER BY created_at) AS rn
      FROM bots
     WHERE agent_type = 'MANAGER'
)
UPDATE bots
   SET agent_type = 'GENERAL'
 WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- 2. Partial unique index — the canonical enforcement.
CREATE UNIQUE INDEX IF NOT EXISTS uq_bots_one_manager_per_sp
    ON bots (service_provider_id)
 WHERE agent_type = 'MANAGER';
