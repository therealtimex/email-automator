-- Enable multiple actions per email
ALTER TABLE emails ADD COLUMN IF NOT EXISTS suggested_actions TEXT[] DEFAULT '{}';
ALTER TABLE emails ADD COLUMN IF NOT EXISTS actions_taken TEXT[] DEFAULT '{}';

-- Migrate existing data (preserve history)
UPDATE emails 
SET suggested_actions = ARRAY[suggested_action] 
WHERE suggested_action IS NOT NULL AND suggested_action != 'none';

UPDATE emails 
SET actions_taken = ARRAY[action_taken] 
WHERE action_taken IS NOT NULL AND action_taken != 'none';

-- We will keep the old columns for now to avoid breaking legacy code immediately,
-- but the application logic will switch to using the array columns.
