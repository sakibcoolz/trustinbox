-- Migration: 004_friend_requests_and_notifications
-- Adds friend_requests table for connection flow and notifications table for real-time alerts.

-- Friend requests: tracks connection requests between users
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED')),
    message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_friend_request UNIQUE (sender_id, receiver_id),
    CONSTRAINT chk_no_self_request CHECK (sender_id != receiver_id)
);

-- Friendships: bidirectional after acceptance (materialized for fast lookups)
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_friendship UNIQUE (user_id, friend_id),
    CONSTRAINT chk_no_self_friend CHECK (user_id != friend_id)
);

-- Notifications: in-app notification system
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_friend_requests_sender ON friend_requests(sender_id, status);
CREATE INDEX idx_friend_requests_receiver ON friend_requests(receiver_id, status);
CREATE INDEX idx_friendships_user ON friendships(user_id);
CREATE INDEX idx_friendships_friend ON friendships(friend_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
