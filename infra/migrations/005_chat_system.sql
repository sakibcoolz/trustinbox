-- Migration: 005_chat_system
-- Evolves conversations + messages for Slack-like P2P and org chat.
-- Adds conversation_participants, message_reactions, message_attachments.

-- ============================================================
-- ALTER CONVERSATIONS for P2P + ORG support
-- ============================================================

-- Add conversation type: DIRECT (user-to-user) or ORG (user-to-org)
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'ORG';

-- Make user_id nullable (DIRECT convos use participants table instead)
ALTER TABLE conversations ALTER COLUMN user_id DROP NOT NULL;

-- Make organization_id nullable (DIRECT convos have no org)
ALTER TABLE conversations ALTER COLUMN organization_id DROP NOT NULL;

-- Last message preview for conversation list
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_preview VARCHAR(500);

-- Index for listing conversations sorted by last activity
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC NULLS LAST);

-- ============================================================
-- CONVERSATION PARTICIPANTS (for both DIRECT and future GROUP)
-- ============================================================

CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'MEMBER',
    last_read_message_id UUID,
    last_read_at TIMESTAMPTZ,
    muted BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_conversation_participant UNIQUE (conversation_id, user_id)
);

CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conv_participants_conv ON conversation_participants(conversation_id);

-- ============================================================
-- ALTER MESSAGES for edit/delete/reply
-- ============================================================

ALTER TABLE messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL;

-- Make content nullable (for deleted messages)
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;

-- ============================================================
-- MESSAGE REACTIONS
-- ============================================================

CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_message_reaction UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);

-- ============================================================
-- MESSAGE ATTACHMENTS
-- ============================================================

CREATE TABLE message_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(200) NOT NULL,
    file_size BIGINT NOT NULL DEFAULT 0,
    s3_key TEXT NOT NULL,
    thumbnail_s3_key TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_attachments_message ON message_attachments(message_id);

-- ============================================================
-- USER PRESENCE (lightweight, mostly in Redis but fallback)
-- ============================================================

CREATE TABLE user_presence (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'offline',
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
