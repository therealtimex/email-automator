-- Update rules action check constraint to support new actions
ALTER TABLE rules DROP CONSTRAINT IF EXISTS rules_action_check;
ALTER TABLE rules ADD CONSTRAINT rules_action_check 
    CHECK (action IN ('delete', 'archive', 'draft', 'star', 'read', 'label', 'forward'));
