-- Migration: Fix rule categories - ensure all user rules get categories from templates
-- Updates existing rules and fixes the installation functions

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

-- Step 3: Update the backfill function to include category
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
    pack,
    rule_template_id,
    is_system_managed,
    category,
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
    rt.pack_id,
    rt.rule_id,
    true,
    rt.category,
    NOW()
  FROM public.rule_templates rt
  ORDER BY rt.pack_id, rt.sort_order;

  RAISE NOTICE 'All rules installed for user %', target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Update the trigger function to include category
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Wrap everything in exception handler to prevent user creation failure
  BEGIN
    -- 1. Create user_settings record with defaults
    INSERT INTO public.user_settings (
      user_id,
      llm_provider,
      llm_model,
      user_role,
      onboarding_completed,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'realtimexai',
      'gpt-4o-mini',
      NULL,
      FALSE,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- 2. Install ALL rules from templates with category
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rule_templates') THEN
      INSERT INTO public.rules (
        user_id,
        name,
        intent,
        condition,
        action,
        actions,
        is_enabled,
        pack,
        rule_template_id,
        is_system_managed,
        category,
        created_at
      )
      SELECT
        NEW.id,
        rt.name,
        rt.intent,
        rt.condition,
        rt.actions[1],
        rt.actions,
        rt.is_enabled_by_default,
        rt.pack_id,
        rt.rule_id,
        true,
        rt.category,
        NOW()
      FROM public.rule_templates rt
      ORDER BY rt.pack_id, rt.sort_order;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      -- Log error but don't fail user creation
      RAISE WARNING 'Failed to initialize user data for %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Add index for category lookups on rules table
CREATE INDEX IF NOT EXISTS idx_rules_category ON public.rules(category);

-- Comments
COMMENT ON COLUMN public.rules.category IS 'Rule category for UI grouping: email_organization, priority_alerts, development, sales_business, operations';
