-- Migration: Update handle_new_user() to copy negative_condition from templates
-- Purpose: Ensure new users get negative conditions when rules are initialized
--
-- This completes the zero-config UX by ensuring negative_condition flows from
-- rule_templates → user rules during signup

-- Update the function to include negative_condition
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  pack_install_id UUID;
  user_exists BOOLEAN;
BEGIN
  -- Check if user exists in auth.users to avoid foreign key violation
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = NEW.id
  ) INTO user_exists;

  IF NOT user_exists THEN
    RAISE NOTICE 'User % does not exist in auth.users yet, skipping initialization', NEW.id;
    RETURN NEW;
  END IF;

  -- 1. Create user_settings record with defaults (with conflict handling)
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

  -- 2. Install ALL rules from templates
  -- First, check if rule_templates table exists (for backwards compatibility)
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rule_templates') THEN

    -- Copy ALL rules from templates (some enabled by default, others disabled)
    -- Now includes negative_condition, min_confidence, description, instructions, and priority
    INSERT INTO public.rules (
      user_id,
      name,
      description,
      intent,
      priority,
      condition,
      negative_condition,
      min_confidence,
      action,
      actions,
      instructions,
      is_enabled,
      pack,
      rule_template_id,
      is_system_managed,
      created_at
    )
    SELECT
      NEW.id,
      rt.name,
      rt.description,
      rt.intent,
      rt.priority,
      rt.condition,
      rt.negative_condition,  -- ✅ NEW: Copy negative conditions
      0.7,                     -- Default min_confidence (can be overridden by template if column added)
      rt.actions[1],           -- First action as primary (for backwards compat)
      rt.actions,              -- All actions array
      rt.instructions,         -- Draft generation instructions
      rt.is_enabled_by_default, -- Some enabled, others disabled
      rt.pack_id,              -- Keep for backwards compat
      rt.rule_id,
      true,                    -- is_system_managed
      NOW()
    FROM public.rule_templates rt
    ORDER BY rt.pack_id, rt.sort_order;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user_settings and installs rules from templates (including negative_condition) when a new user signs up';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✓ Updated handle_new_user() function to copy negative_condition from templates';
  RAISE NOTICE '  - New users will automatically get smart exclusion logic';
  RAISE NOTICE '  - Also copies: description, instructions, priority fields';
  RAISE NOTICE '  - Zero-Config UX: Complete!';
END $$;
