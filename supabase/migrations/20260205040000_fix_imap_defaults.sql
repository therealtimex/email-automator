-- Fix JSONB defaults for imap_config and smtp_config to be NULL instead of '{}'
-- This ensures truthiness checks work correctly in the application code.

ALTER TABLE public.email_accounts
    ALTER COLUMN imap_config SET DEFAULT NULL,
    ALTER COLUMN smtp_config SET DEFAULT NULL;

-- Migrate existing empty objects to NULL
UPDATE public.email_accounts
SET imap_config = NULL
WHERE imap_config::text = '{}';

UPDATE public.email_accounts
SET smtp_config = NULL
WHERE smtp_config::text = '{}';

-- Add Security Threat Model Warning
COMMENT ON COLUMN public.user_settings.encryption_key IS 
'SECURITY WARNING: This key is stored in plaintext to support BYOK portability. 
Threat Model: This key is accessible to anyone with access to the database (postgres/service_role). 
It protects against casual leakage of the email_accounts table but is NOT a secure vault. 
If the database is compromised, this key allows decryption of all stored credentials.';
