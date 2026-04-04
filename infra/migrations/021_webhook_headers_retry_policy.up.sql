-- Add headers and retry_policy columns to webhook_subscriptions
ALTER TABLE webhook_subscriptions ADD COLUMN headers JSONB NOT NULL DEFAULT '{}';
ALTER TABLE webhook_subscriptions ADD COLUMN retry_policy TEXT NOT NULL DEFAULT '';
