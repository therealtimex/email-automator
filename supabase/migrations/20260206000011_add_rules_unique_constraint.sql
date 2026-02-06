-- Migration: Add Missing Unique Constraint on Rules Table
-- Fixes trigger failure: "no unique or exclusion constraint matching the ON CONFLICT specification"
--
-- The handle_new_profile() trigger uses ON CONFLICT (user_id, rule_template_id)
-- but this constraint was missing, causing silent failures during user initialization

-- Add unique constraint to prevent duplicate rules per user
ALTER TABLE public.rules
ADD CONSTRAINT rules_user_template_unique
UNIQUE (user_id, rule_template_id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_rules_user_template
ON public.rules(user_id, rule_template_id);

-- Comment
COMMENT ON CONSTRAINT rules_user_template_unique ON public.rules IS
'Ensures each user gets only one copy of each rule template. Required for ON CONFLICT clause in handle_new_profile() trigger.';

-- Verification
DO $$
DECLARE
  constraint_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'rules_user_template_unique'
  ) INTO constraint_exists;

  IF constraint_exists THEN
    RAISE NOTICE '✓ Unique constraint rules_user_template_unique created successfully';
  ELSE
    RAISE WARNING '⚠ Failed to create unique constraint';
  END IF;
END $$;
