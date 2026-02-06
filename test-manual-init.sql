-- Manual test to initialize a user (for debugging)
-- Replace <USER_ID> with actual user ID from profiles table

DO $$
DECLARE
  v_user_id UUID := '<USER_ID>'; -- REPLACE THIS
  v_encryption_key TEXT;
  v_rules_created INTEGER;
BEGIN
  RAISE NOTICE 'Testing user initialization for user: %', v_user_id;

  -- Get encryption key
  SELECT encryption_key INTO v_encryption_key
  FROM public.user_settings
  WHERE encryption_key IS NOT NULL
  LIMIT 1;

  RAISE NOTICE 'Encryption key found: %', v_encryption_key IS NOT NULL;

  -- Create user_settings
  BEGIN
    INSERT INTO public.user_settings (
      user_id,
      llm_provider,
      llm_model,
      encryption_key,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      'realtimexai',
      'gpt-4o-mini',
      v_encryption_key,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    RAISE NOTICE '✓ user_settings created';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '✗ user_settings failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  -- Create rules
  BEGIN
    INSERT INTO public.rules (
      user_id,
      name,
      description,
      intent,
      condition,
      action,
      actions,
      instructions,
      priority,
      is_enabled,
      category,
      rule_template_id,
      is_system_managed,
      created_at
    )
    SELECT
      v_user_id,
      rt.name,
      rt.description,
      rt.intent,
      rt.condition,
      rt.actions[1],
      rt.actions,
      rt.instructions,
      rt.priority,
      rt.is_enabled_by_default,
      rt.category,
      rt.rule_id,
      true,
      NOW()
    FROM public.rule_templates rt
    ORDER BY rt.category, rt.sort_order
    ON CONFLICT (user_id, rule_template_id) DO NOTHING;

    GET DIAGNOSTICS v_rules_created = ROW_COUNT;
    RAISE NOTICE '✓ Created % rules', v_rules_created;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE '✗ rules creation failed: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
  END;

  -- Verify
  RAISE NOTICE 'Verification:';
  RAISE NOTICE '  user_settings exists: %', EXISTS(SELECT 1 FROM user_settings WHERE user_id = v_user_id);
  RAISE NOTICE '  rules count: %', (SELECT COUNT(*) FROM rules WHERE user_id = v_user_id);
END $$;
