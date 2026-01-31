-- Migration: Fix action column constraint for new action types
-- Ensures action column can accept any text value (not just delete/archive/draft)

-- Drop the old CHECK constraint if it still exists
ALTER TABLE rules DROP CONSTRAINT IF EXISTS rules_action_check;

-- Make action column nullable (since we use actions array now)
ALTER TABLE rules ALTER COLUMN action DROP NOT NULL;

-- Add comment
COMMENT ON COLUMN rules.action IS 'Legacy single action field - kept for backwards compatibility. Use actions array instead. Can be: delete, archive, draft, read, star, trash, label:*, folder:*, or any custom action.';
