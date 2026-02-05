-- Fix provider check constraint to allow 'imap'
ALTER TABLE public.email_accounts DROP CONSTRAINT IF EXISTS email_accounts_provider_check;
ALTER TABLE public.email_accounts ADD CONSTRAINT email_accounts_provider_check CHECK (provider IN ('gmail', 'outlook', 'imap'));
