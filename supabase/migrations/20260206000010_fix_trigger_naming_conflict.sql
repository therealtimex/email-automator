-- Migration: Fix Trigger Function Naming Conflict
-- Creates separate functions for auth.users and profiles triggers
-- Ensures fresh deployments initialize users correctly

-- Drop conflicting triggers and functions
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_profile_created ON public.profiles CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_auth_user() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_profile() CASCADE;
DROP FUNCTION IF EXISTS public.initialize_new_user_data() CASCADE;

-- ============================================================================
-- FUNCTION 1: Create profile when user signs up in auth.users
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public'
AS $$
DECLARE
  profile_count INT;
BEGIN
  -- Count existing profiles to determine admin status
  SELECT COUNT(id) INTO profile_count FROM public.profiles;

  -- Create profile in public.profiles
  INSERT INTO public.profiles (id, first_name, last_name, email, is_admin)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name',
    NEW.email,
    CASE WHEN profile_count > 0 THEN false ELSE true END  -- First user is admin
  );

  RETURN NEW;
END;
$$;

-- ============================================================================
-- FUNCTION 2: Initialize user_settings and rules when profile is created
-- ============================================================================
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
      -- Use built-in gen_random_uuid() (no extension required) - convert to 64-char hex
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

    -- 2. Install rules from templates
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'rule_templates') THEN
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
        NEW.id,
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

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger 1: When user signs up in auth.users → create profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_auth_user();

-- Trigger 2: When profile is created → initialize user_settings + rules
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_profile();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_profile() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_profile() TO service_role;

-- ============================================================================
-- FIX RLS POLICIES TO ALLOW TRIGGER INSERTS
-- ============================================================================
-- Drop the overly restrictive "FOR ALL" policy
DROP POLICY IF EXISTS "Users can only access their own settings" ON user_settings;

-- Create granular policies that allow trigger inserts (when auth.uid() IS NULL)
CREATE POLICY "Users can view their own settings" ON user_settings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" ON user_settings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings" ON user_settings
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users and triggers can insert settings" ON user_settings
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- Fix RLS for rules table (same issue - triggers need to insert)
DROP POLICY IF EXISTS "Users can only access their own rules" ON rules;

CREATE POLICY "Users can view their own rules" ON rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules" ON rules
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules" ON rules
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users and triggers can insert rules" ON rules
    FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

-- ============================================================================
-- COMMENTS
-- ============================================================================
COMMENT ON FUNCTION public.handle_new_auth_user() IS
'Step 1: Creates profile in public.profiles when user signs up. First user becomes admin.';

COMMENT ON FUNCTION public.handle_new_profile() IS
'Step 2: Initializes user_settings and installs 23 default rules when profile is created.';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  auth_trigger_count INT;
  profile_trigger_count INT;
  template_count INT;
BEGIN
  -- Check auth.users trigger
  SELECT COUNT(*) INTO auth_trigger_count
  FROM pg_trigger
  WHERE tgname = 'on_auth_user_created';

  -- Check profiles trigger
  SELECT COUNT(*) INTO profile_trigger_count
  FROM pg_trigger
  WHERE tgname = 'on_profile_created';

  -- Check rule templates
  SELECT COUNT(*) INTO template_count
  FROM public.rule_templates;

  -- Report status
  IF auth_trigger_count = 0 THEN
    RAISE WARNING '⚠ Trigger on_auth_user_created NOT found!';
  ELSE
    RAISE NOTICE '✓ Trigger on_auth_user_created is active';
  END IF;

  IF profile_trigger_count = 0 THEN
    RAISE WARNING '⚠ Trigger on_profile_created NOT found!';
  ELSE
    RAISE NOTICE '✓ Trigger on_profile_created is active';
  END IF;

  IF template_count = 0 THEN
    RAISE WARNING '⚠ No rule templates found!';
  ELSE
    RAISE NOTICE '✓ Found % rule templates', template_count;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'User initialization flow:';
  RAISE NOTICE '1. User signs up → auth.users';
  RAISE NOTICE '2. on_auth_user_created → creates profile';
  RAISE NOTICE '3. on_profile_created → creates settings + % rules', template_count;
  RAISE NOTICE '========================================';
END $$;
