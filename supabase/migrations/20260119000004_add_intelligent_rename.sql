-- Migration: Add Intelligent Rename Setting
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS intelligent_rename BOOLEAN DEFAULT false;

COMMENT ON COLUMN user_settings.intelligent_rename IS 'Whether to use slugified-hyphenated-names for archived .eml files.';
