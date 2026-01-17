-- Add instructions to rules for contextual drafting
ALTER TABLE rules ADD COLUMN IF NOT EXISTS instructions TEXT;

-- Update the check constraint to ensure draft rules can have instructions (optional check)
COMMENT ON COLUMN rules.instructions IS 'Specific instructions for the AI when generating a draft reply for this rule.';
