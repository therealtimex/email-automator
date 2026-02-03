-- Add embedding provider settings to user_settings
-- Follows realtimex-alchemy pattern for embedding configuration

ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS embedding_provider TEXT,
ADD COLUMN IF NOT EXISTS embedding_model TEXT;

COMMENT ON COLUMN user_settings.embedding_provider IS 'RealTimeX embedding provider (e.g., realtimexai, openai, gemini)';
COMMENT ON COLUMN user_settings.embedding_model IS 'Embedding model name (e.g., text-embedding-3-small)';

-- If no embedding provider is set, will use SDK discovery at runtime
