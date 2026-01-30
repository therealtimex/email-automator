-- Migration: Remove legacy LLM fields and add llm_provider
-- Description: Transition to RealTimeX SDK 1.2.4 unified provider logic

ALTER TABLE user_settings
DROP COLUMN IF EXISTS llm_model,
DROP COLUMN IF EXISTS llm_base_url,
DROP COLUMN IF EXISTS llm_api_key;

-- Add new llm_provider field
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS llm_provider TEXT DEFAULT 'realtimexai';

-- Add llm_model back (optional, but good to keep it for user preference if they want to override the SDK default)
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS llm_model TEXT DEFAULT 'gpt-4o-mini';

COMMENT ON COLUMN user_settings.llm_provider IS 'LLM provider ID, defaults to realtimexai via SDK';
COMMENT ON COLUMN user_settings.llm_model IS 'LLM model ID, defaults to gpt-4o-mini via SDK but can be overridden';
