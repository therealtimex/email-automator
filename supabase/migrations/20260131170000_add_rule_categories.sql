-- Migration: Add rule categories
-- Adds category column and backfills existing rules

-- Step 1: Add category column to rules table if it doesn't exist
ALTER TABLE public.rules
ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- Step 2: Update existing user rules to get categories from their templates
UPDATE public.rules r
SET category = rt.category
FROM public.rule_templates rt
WHERE r.rule_template_id = rt.rule_id
  AND r.is_system_managed = true
  AND (r.category IS NULL OR r.category != rt.category);

-- Step 3: Create backfill function to install rules for existing users
CREATE OR REPLACE FUNCTION public.install_all_rules_for_user(target_user_id UUID)
RETURNS void AS $$
DECLARE
  existing_rules_count INTEGER;
BEGIN
  -- Check if user already has rules installed
  SELECT COUNT(*) INTO existing_rules_count
  FROM public.rules
  WHERE user_id = target_user_id AND is_system_managed = true;

  IF existing_rules_count > 0 THEN
    RAISE NOTICE 'User % already has % system-managed rules installed', target_user_id, existing_rules_count;
    RETURN;
  END IF;

  -- Copy ALL rules from templates with category
  INSERT INTO public.rules (
    user_id,
    name,
    intent,
    condition,
    action,
    actions,
    is_enabled,
    category,
    rule_template_id,
    is_system_managed,
    created_at
  )
  SELECT
    target_user_id,
    rt.name,
    rt.intent,
    rt.condition,
    rt.actions[1],
    rt.actions,
    rt.is_enabled_by_default,
    rt.category,
    rt.rule_id,
    true,
    NOW()
  FROM public.rule_templates rt
  ORDER BY rt.category, rt.sort_order;

  RAISE NOTICE '✓ Installed % rules for user %', (SELECT COUNT(*) FROM rule_templates), target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.install_all_rules_for_user(UUID) IS 'Backfill function to install all rules from templates for an existing user';
