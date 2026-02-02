-- Cleanup Script: Remove invalid draft status from emails without content
-- Run this in your Supabase SQL Editor

-- 1. Find emails with draft_status but no content
SELECT
    id,
    subject,
    sender,
    draft_status,
    draft_content IS NOT NULL as has_draft_content,
    ai_analysis IS NOT NULL as has_ai_analysis,
    draft_created_at
FROM emails
WHERE draft_status IN ('pending', 'sent', 'dismissed')
  AND draft_content IS NULL
  AND (
    ai_analysis IS NULL
    OR NOT (
      ai_analysis ? 'draft_response'
      OR ai_analysis ? 'draft_content'
    )
  )
ORDER BY draft_created_at DESC;

-- 2. Clear invalid draft status (run this after reviewing results above)
UPDATE emails
SET
    draft_status = NULL,
    draft_created_at = NULL,
    draft_sent_at = NULL,
    draft_dismissed_at = NULL
WHERE draft_status IN ('pending', 'sent', 'dismissed')
  AND draft_content IS NULL
  AND (
    ai_analysis IS NULL
    OR NOT (
      ai_analysis ? 'draft_response'
      OR ai_analysis ? 'draft_content'
    )
  );

-- This will return the number of rows cleaned up
