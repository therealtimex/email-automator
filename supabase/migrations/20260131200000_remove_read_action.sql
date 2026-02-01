-- Migration: Remove 'read' action from all rules
-- The 'read' action is being deprecated as it's not useful when archiving emails

-- Remove 'read' from actions array in rules table
UPDATE rules
SET actions = array_remove(actions, 'read')
WHERE actions IS NOT NULL
  AND 'read' = ANY(actions);

-- Remove 'read' from actions array in rule_templates table
UPDATE rule_templates
SET actions = array_remove(actions, 'read')
WHERE actions IS NOT NULL
  AND 'read' = ANY(actions);

-- Set action to NULL if it was 'read' (legacy single action column - only exists in rules table)
UPDATE rules
SET action = NULL
WHERE action = 'read';
