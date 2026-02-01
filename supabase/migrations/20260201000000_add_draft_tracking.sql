-- Migration: Add Draft Tracking Fields to Emails Table
-- Enables Draft Review Center functionality

-- Add draft tracking columns
ALTER TABLE emails
ADD COLUMN IF NOT EXISTS draft_id TEXT,
ADD COLUMN IF NOT EXISTS draft_content TEXT,
ADD COLUMN IF NOT EXISTS draft_status TEXT DEFAULT 'pending' CHECK (draft_status IN ('pending', 'sent', 'dismissed')),
ADD COLUMN IF NOT EXISTS draft_created_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS draft_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS draft_dismissed_at TIMESTAMPTZ;

-- Create index for efficient draft queries
CREATE INDEX IF NOT EXISTS idx_emails_draft_status 
ON emails(draft_status, draft_created_at DESC) 
WHERE draft_id IS NOT NULL;

-- Create index for pending drafts (most common query)
CREATE INDEX IF NOT EXISTS idx_emails_pending_drafts
ON emails(account_id, draft_created_at DESC)
WHERE draft_status = 'pending' AND draft_id IS NOT NULL;

-- Add comments
COMMENT ON COLUMN emails.draft_id IS 'External ID of the draft in Gmail/Outlook (used to send the draft)';
COMMENT ON COLUMN emails.draft_content IS 'Full text of the AI-generated draft reply';
COMMENT ON COLUMN emails.draft_status IS 'Status of the draft: pending (awaiting review), sent (user approved and sent), dismissed (user rejected)';
COMMENT ON COLUMN emails.draft_created_at IS 'Timestamp when the draft was created by AI';
COMMENT ON COLUMN emails.draft_sent_at IS 'Timestamp when the draft was sent';
COMMENT ON COLUMN emails.draft_dismissed_at IS 'Timestamp when the draft was dismissed';

-- Migrate existing draft data from ai_analysis to new fields
UPDATE emails
SET 
    draft_content = (ai_analysis->>'draft_response'),
    draft_created_at = created_at,
    draft_status = CASE 
        WHEN 'draft' = ANY(actions_taken) THEN 'pending'
        ELSE 'pending'
    END
WHERE ai_analysis->>'draft_response' IS NOT NULL
  AND ai_analysis->>'draft_response' != ''
  AND draft_content IS NULL;

-- Log the migration
DO $$
DECLARE
    migrated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO migrated_count
    FROM emails
    WHERE draft_content IS NOT NULL;
    
    RAISE NOTICE 'Migrated % existing drafts to new tracking fields', migrated_count;
END $$;
