-- Migration: Update handle_new_profile() to copy negative_condition from templates
-- Purpose: Ensure new users get negative conditions when rules are initialized
--
-- This completes the zero-config UX by ensuring negative_condition flows from
-- rule_templates → user rules during signup

-- Update the function to include negative_condition
CREATE OR REPLACE FUNCTION public.handle_new_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  v_encryption_key TEXT;
  v_new_encryption_key TEXT;
  v_rules_created INTEGER := 0;
BEGIN
  -- Wrap in exception handler to prevent profile creation failure
  BEGIN
    -- Get shared encryption key (sandbox mode)
    SELECT encryption_key INTO v_encryption_key
    FROM public.user_settings
    WHERE encryption_key IS NOT NULL
    LIMIT 1;

    -- Generate new encryption key if none exists (first user case)
    IF v_encryption_key IS NULL THEN
      -- Use built-in functions (no extension required) - generates 64-char hex string
      v_new_encryption_key := md5(random()::text || clock_timestamp()::text) || md5(random()::text || clock_timestamp()::text);
      RAISE NOTICE '[handle_new_profile] Generated new encryption key for first user %', NEW.id;
    ELSE
      v_new_encryption_key := v_encryption_key;
      RAISE NOTICE '[handle_new_profile] Using existing encryption key for user %', NEW.id;
    END IF;

    -- 1. Create user_settings with encryption key
    INSERT INTO public.user_settings (
      user_id,
      llm_provider,
      llm_model,
      encryption_key,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,
      'realtimexai',
      'gpt-4o-mini',
      v_new_encryption_key,
      NOW(),
      NOW()
    )
    ON CONFLICT (user_id) DO NOTHING;

    -- 2. Install rules from templates (including negative_condition)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rule_templates') THEN
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
        category,
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
        rt.negative_condition,
        0.7,
        rt.actions[1],
        rt.actions,
        rt.instructions,
        rt.is_enabled_by_default,
        rt.category,
        rt.rule_id,
        true,
        NOW()
      FROM public.rule_templates rt
      ORDER BY rt.category, rt.sort_order
      ON CONFLICT (user_id, rule_template_id) DO NOTHING;

      GET DIAGNOSTICS v_rules_created = ROW_COUNT;
      RAISE NOTICE '✓ User % initialized: settings created, % rules installed', NEW.id, v_rules_created;
    ELSE
      RAISE WARNING '⚠ rule_templates table not found for user %', NEW.id;
    END IF;

  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING '✗ handle_new_profile failed for user %: % (SQLSTATE: %)', NEW.id, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- Add comment
COMMENT ON FUNCTION public.handle_new_profile() IS 'Step 2: Initializes user_settings with encryption key and installs rules from templates (including negative_condition)';

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✓ Updated handle_new_profile() function to copy negative_condition from templates';
  RAISE NOTICE '  - New users will automatically get smart exclusion logic';
  RAISE NOTICE '  - Also copies: description, instructions, priority, encryption_key fields';
  RAISE NOTICE '  - Zero-Config UX: Complete!';
END $$;
