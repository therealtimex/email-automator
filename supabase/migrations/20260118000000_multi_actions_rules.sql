-- Enable multiple actions per rule
-- Add actions array column (replaces single action column)
ALTER TABLE rules ADD COLUMN IF NOT EXISTS actions TEXT[] DEFAULT '{}';

-- Migrate existing data: copy action to actions array
UPDATE rules
SET actions = ARRAY[action]
WHERE action IS NOT NULL AND (actions IS NULL OR actions = '{}');

-- We keep the legacy 'action' column for backward compatibility
-- but the application will now use the 'actions' array

-- Update check constraint to include new action types
ALTER TABLE rules DROP CONSTRAINT IF EXISTS rules_action_check;

-- Add index for faster lookups on actions array
CREATE INDEX IF NOT EXISTS idx_rules_actions ON rules USING GIN (actions);
