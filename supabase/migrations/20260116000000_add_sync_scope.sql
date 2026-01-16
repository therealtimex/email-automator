-- Migration to add sync scope and checkpointing columns

-- 1. Add columns to user_settings
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS sync_start_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS sync_max_emails_per_run INTEGER DEFAULT 50;

-- 2. Add column to email_accounts
ALTER TABLE email_accounts
ADD COLUMN IF NOT EXISTS last_sync_checkpoint TEXT;

-- 3. Comment on new columns
COMMENT ON COLUMN user_settings.sync_start_date IS 'Starting date for synchronization. Emails before this date will be ignored.';
COMMENT ON COLUMN user_settings.sync_max_emails_per_run IS 'Maximum number of emails to process in a single synchronization run.';
COMMENT ON COLUMN email_accounts.last_sync_checkpoint IS 'Stores the last processed timestamp (internalDate for Gmail, receivedDateTime for Outlook) for incremental sync.';
