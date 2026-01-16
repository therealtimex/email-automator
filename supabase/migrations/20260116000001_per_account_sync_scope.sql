-- Migration to move sync settings to email_accounts (per-account scope)

-- 1. Add columns to email_accounts
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS sync_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_max_emails_per_run INTEGER DEFAULT 50,
ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS last_sync_status TEXT DEFAULT 'idle',
ADD COLUMN IF NOT EXISTS last_sync_error TEXT;

-- 2. Clean up user_settings (optional but recommended for clarity)
ALTER TABLE user_settings
DROP COLUMN IF EXISTS sync_start_date,
DROP COLUMN IF EXISTS sync_max_emails_per_run;

-- 3. Comments
COMMENT ON COLUMN email_accounts.sync_start_date IS 'Only fetch emails received after this date for this specific account.';
COMMENT ON COLUMN email_accounts.sync_max_emails_per_run IS 'Maximum emails to process per sync run for this specific account.';
COMMENT ON COLUMN email_accounts.last_sync_status IS 'Status of the last sync: idle, syncing, success, error.';
