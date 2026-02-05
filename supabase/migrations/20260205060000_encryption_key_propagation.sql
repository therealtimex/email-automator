-- Encryption Key Propagation for New Users
-- Ensures new users automatically get the encryption key from existing users
-- In sandbox mode, all users share the same encryption key

-- Drop and recreate the trigger function to include encryption_key
CREATE OR REPLACE FUNCTION public.initialize_new_user_data()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_existing_encryption_key TEXT;
BEGIN
  -- Wrap everything in exception handler to prevent user creation failure
  BEGIN
    -- Get encryption key from any existing user (all users share same key in sandbox)
    SELECT encryption_key INTO v_existing_encryption_key
    FROM public.user_settings
    WHERE encryption_key IS NOT NULL
    LIMIT 1;

    -- 1. Create user_settings record with defaults + encryption key
    INSERT INTO public.user_settings (
      user_id,
      llm_provider,
      llm_model,
      user_role,
      onboarding_completed,
      encryption_key,  -- Propagate encryption key
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'realtimexai',
      'gpt-4o-mini',
      NULL,
      FALSE,
      v_existing_encryption_key,  -- Will be NULL if no users exist yet (set by server)
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
      ON CONFLICT (user_id, rule_template_id) DO NOTHING;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'initialize_new_user_data failed: %', SQLERRM;
  END;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.initialize_new_user_data() IS
'Automatically initializes user_settings and rules for new users. Propagates encryption key from existing users in sandbox mode.';
