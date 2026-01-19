-- Migration: Async ETL & Local Storage Support
-- Adds support for storing raw emails on disk and processing them asynchronously

-- 1. Add columns to emails table
ALTER TABLE emails 
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS processing_error TEXT,
ADD COLUMN IF NOT EXISTS retry_count INTEGER DEFAULT 0;

-- 2. Add storage_path to user_settings
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 3. Update existing emails to 'completed' status
UPDATE emails SET processing_status = 'completed' WHERE ai_analysis IS NOT NULL;

-- 4. Create an index for faster queue polling
CREATE INDEX IF NOT EXISTS idx_emails_processing_status ON emails(processing_status) WHERE processing_status = 'pending';

-- 5. Add comment explaining columns
COMMENT ON COLUMN emails.file_path IS 'Absolute path to the raw .eml file on the local file system.';
COMMENT ON COLUMN emails.processing_status IS 'State of the AI analysis pipeline.';
COMMENT ON COLUMN user_settings.storage_path IS 'User-defined local directory for storing raw .eml files.';
