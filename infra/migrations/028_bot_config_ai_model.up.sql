-- 028_bot_config_ai_model.up.sql
-- Adds AI model selection and max response token controls to bot_configurations.

ALTER TABLE bot_configurations
    ADD COLUMN IF NOT EXISTS ai_model            VARCHAR(100) NOT NULL DEFAULT 'gpt-4o-mini',
    ADD COLUMN IF NOT EXISTS max_response_tokens INT          NOT NULL DEFAULT 1024;

COMMENT ON COLUMN bot_configurations.ai_model            IS 'LLM model identifier used for this bot (e.g. gpt-4o-mini, claude-3-5-haiku-20241022)';
COMMENT ON COLUMN bot_configurations.max_response_tokens IS 'Maximum tokens the LLM may produce per response turn';
