-- Add provider credentials to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS google_client_id TEXT,
ADD COLUMN IF NOT EXISTS google_client_secret TEXT,
ADD COLUMN IF NOT EXISTS microsoft_client_id TEXT,
ADD COLUMN IF NOT EXISTS microsoft_client_secret TEXT,
ADD COLUMN IF NOT EXISTS microsoft_tenant_id TEXT;
