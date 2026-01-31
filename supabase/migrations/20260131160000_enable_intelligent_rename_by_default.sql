-- Migration: Enable intelligent_rename by default
-- Sets intelligent_rename to true for all users and changes column default

-- Update existing users to have intelligent_rename enabled
UPDATE public.user_settings
SET intelligent_rename = true
WHERE intelligent_rename = false OR intelligent_rename IS NULL;

-- Change column default to true for new users
ALTER TABLE public.user_settings
ALTER COLUMN intelligent_rename SET DEFAULT true;

-- Update comment
COMMENT ON COLUMN public.user_settings.intelligent_rename IS 'Whether to use slugified-hyphenated-names for archived .eml files. Enabled by default.';
