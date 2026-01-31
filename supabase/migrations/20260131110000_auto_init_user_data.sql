-- Migration: Auto-initialize user data on signup
-- Creates user_settings record and installs Universal Pack automatically

-- Function to initialize user settings and install Universal Pack
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
      created_at
    )
    SELECT
      NEW.id,
      rt.name,
      rt.intent,
      rt.condition,
      rt.actions[1], -- First action as primary (for backwards compat)
      rt.actions,    -- All actions array
      rt.is_enabled_by_default, -- Some enabled, others disabled
      rt.pack_id, -- Keep for backwards compat
      rt.rule_id,
      true, -- is_system_managed
      NOW()
    FROM public.rule_templates rt
    ORDER BY rt.pack_id, rt.sort_order;

  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call the function when a new profile is created
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;

-- Comment
COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user_settings and installs Universal Pack when a new user signs up';
