-- Context-Aware Automation Engine
-- Adds semantic context fields to rules for AI-driven matching

-- Add new columns for context-aware rules
ALTER TABLE rules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS intent TEXT;
ALTER TABLE rules ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- Add columns to track AI rule matching on emails
ALTER TABLE emails ADD COLUMN IF NOT EXISTS matched_rule_id UUID REFERENCES rules(id) ON DELETE SET NULL;
ALTER TABLE emails ADD COLUMN IF NOT EXISTS matched_rule_confidence DECIMAL(3,2);

-- Create index for faster rule priority ordering
CREATE INDEX IF NOT EXISTS idx_rules_priority ON rules(user_id, priority DESC) WHERE is_enabled = true;

-- Create index for matched rule lookups
CREATE INDEX IF NOT EXISTS idx_emails_matched_rule ON emails(matched_rule_id) WHERE matched_rule_id IS NOT NULL;

-- Update existing rules with default descriptions based on their conditions
-- This helps with backwards compatibility
UPDATE rules 
SET description = CASE
    WHEN (condition->>'is_useless')::boolean = true THEN 'Handle emails identified as useless or low-value'
    WHEN condition->>'category' = 'spam' THEN 'Handle spam emails'
    WHEN condition->>'category' = 'newsletter' THEN 'Handle newsletter emails'
    WHEN condition->>'category' = 'promotional' THEN 'Handle promotional/marketing emails'
    ELSE 'Custom automation rule: ' || name
END,
intent = CASE
    WHEN actions @> ARRAY['delete'] THEN 'Delete matching emails permanently'
    WHEN actions @> ARRAY['archive'] THEN 'Archive matching emails to clean inbox'
    WHEN actions @> ARRAY['draft'] THEN 'Draft a response to matching emails'
    WHEN action = 'delete' THEN 'Delete matching emails permanently'
    WHEN action = 'archive' THEN 'Archive matching emails to clean inbox'
    WHEN action = 'draft' THEN 'Draft a response to matching emails'
    ELSE 'Process matching emails automatically'
END
WHERE description IS NULL;

COMMENT ON COLUMN rules.description IS 'Human-readable description of what this rule does, used as context for AI matching';
COMMENT ON COLUMN rules.intent IS 'The intent behind the rule actions (e.g., "Politely decline sales pitches")';
COMMENT ON COLUMN rules.priority IS 'Rule priority - higher values are evaluated first by the AI';
COMMENT ON COLUMN emails.matched_rule_id IS 'The rule that was matched by the AI for this email';
COMMENT ON COLUMN emails.matched_rule_confidence IS 'AI confidence score (0-1) for the rule match';
