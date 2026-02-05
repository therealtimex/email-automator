-- Add connection type and config for IMAP/SMTP
ALTER TABLE public.email_accounts
ADD COLUMN IF NOT EXISTS connection_type text NOT NULL DEFAULT 'oauth' CHECK (connection_type IN ('oauth', 'imap')),
ADD COLUMN IF NOT EXISTS imap_config jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS smtp_config jsonb DEFAULT NULL;

-- Create an index on connection_type for faster filtering
CREATE INDEX IF NOT EXISTS idx_email_accounts_connection_type ON public.email_accounts(connection_type);

-- Comment on columns
COMMENT ON COLUMN public.email_accounts.connection_type IS 'Type of connection: "oauth" (Gmail/Outlook API) or "imap" (Standard Protocols)';
COMMENT ON COLUMN public.email_accounts.imap_config IS 'Encrypted IMAP configuration (host, port, user, pass)';
COMMENT ON COLUMN public.email_accounts.smtp_config IS 'Encrypted SMTP configuration';
