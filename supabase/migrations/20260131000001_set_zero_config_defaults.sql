-- Migration: Set Zero-Configuration Defaults
-- Description: Configure smart defaults for new users to enable immediate use

-- =====================================================
-- 1. Set defaults for new user_settings columns
-- =====================================================

-- Set default values for zero-config onboarding fields
ALTER TABLE user_settings
ALTER COLUMN user_role SET DEFAULT NULL,
ALTER COLUMN onboarding_completed SET DEFAULT false;

-- Update existing users who have NULL values
UPDATE user_settings
SET
  onboarding_completed = COALESCE(onboarding_completed, false)
WHERE
  onboarding_completed IS NULL;

-- =====================================================
-- 2. Verify LLM defaults are set
-- =====================================================

-- These should already be set from migration 20260130000001_update_default_llm.sql
-- Just verify they exist and update any NULL values

-- Set defaults if not already set
DO $$
BEGIN
  ALTER TABLE user_settings
  ALTER COLUMN llm_provider SET DEFAULT 'realtimexai';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE user_settings
  ALTER COLUMN llm_model SET DEFAULT 'gpt-4o-mini';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Update any remaining NULL values to defaults
UPDATE user_settings
SET
  llm_provider = COALESCE(llm_provider, 'realtimexai'),
  llm_model = COALESCE(llm_model, 'gpt-4o-mini')
WHERE
  llm_provider IS NULL
  OR llm_model IS NULL;
