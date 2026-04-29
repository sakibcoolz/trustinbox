-- 028_bot_config_ai_model.down.sql

ALTER TABLE bot_configurations
    DROP COLUMN IF EXISTS ai_model,
    DROP COLUMN IF EXISTS max_response_tokens;
