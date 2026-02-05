-- Add encryption_key to user_settings for BYOK persistence
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS encryption_key TEXT;

COMMENT ON COLUMN public.user_settings.encryption_key IS '32-byte hex string used for server-side encryption of credentials';
