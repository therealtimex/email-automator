-- Migration: Add error handling to user initialization trigger
-- Prevents user creation from failing if trigger has issues

-- Recreate function with exception handling
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

    -- 2. Install ALL rules from templates
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

COMMENT ON FUNCTION public.handle_new_user() IS 'Automatically creates user_settings and installs rules when a new user signs up (with error handling to prevent user creation failure)';
