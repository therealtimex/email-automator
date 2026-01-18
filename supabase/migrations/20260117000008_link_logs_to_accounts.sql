-- Link processing logs to specific accounts for better attribution
ALTER TABLE processing_logs ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES email_accounts(id) ON DELETE CASCADE;

-- Add index for better performance when joining or filtering by account
CREATE INDEX IF NOT EXISTS idx_processing_logs_account_id ON processing_logs(account_id);

-- Comment for clarity
COMMENT ON COLUMN processing_logs.account_id IS 'Reference to the email account being synced in this run.';
