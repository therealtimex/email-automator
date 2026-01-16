-- Migration to add LLM API Key to user settings
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS llm_api_key TEXT;

-- Update comment
COMMENT ON COLUMN user_settings.llm_api_key IS 'API Key for the configured LLM provider (encrypted or plain text depending on security policy)';
