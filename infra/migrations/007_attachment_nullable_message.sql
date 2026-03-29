-- Migration 007: make message_attachments.message_id nullable
--
-- The upload endpoint stores files before a message is created (pre-upload flow).
-- The message_id is populated when the message row is inserted via the send-message path.
-- Drop the NOT NULL constraint and update the index to be a partial one (only indexed rows
-- that actually have a message_id) for efficiency.

ALTER TABLE message_attachments
    ALTER COLUMN message_id DROP NOT NULL;

-- Keep the FK intact (NULL is allowed; non-null values are still validated)
-- Partial index: only index rows that are attached to a message (skip orphaned pre-uploads)
DROP INDEX IF EXISTS idx_message_attachments_message;
CREATE INDEX idx_message_attachments_message
    ON message_attachments(message_id)
    WHERE message_id IS NOT NULL;
