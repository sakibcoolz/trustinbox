-- Remove headers and retry_policy columns from webhook_subscriptions
ALTER TABLE webhook_subscriptions DROP COLUMN headers;
ALTER TABLE webhook_subscriptions DROP COLUMN retry_policy;
