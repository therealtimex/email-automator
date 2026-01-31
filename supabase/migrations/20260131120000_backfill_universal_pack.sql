-- Migration: Backfill All Rules for existing users
-- Installs all rules for users who signed up before auto-installation was added

-- Function to install all rules for a specific user
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

  -- Copy ALL rules from templates
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
    target_user_id,
    rt.name,
    rt.intent,
    rt.condition,
    rt.actions[1],
    rt.actions,
    rt.is_enabled_by_default, -- Some enabled, others disabled
    rt.pack_id, -- Keep for backwards compat
    rt.rule_id,
    true, -- is_system_managed
    NOW()
  FROM public.rule_templates rt
  ORDER BY rt.category, rt.sort_order;

  RAISE NOTICE 'All rules installed for user %', target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill for all existing users who don't have rules
DO $$
DECLARE
  user_record RECORD;
  total_users INTEGER := 0;
  installed_count INTEGER := 0;
BEGIN
  -- Count total users
  SELECT COUNT(*) INTO total_users FROM public.profiles;
  RAISE NOTICE 'Found % total users', total_users;

  -- Install all rules for each user who doesn't have system-managed rules
  FOR user_record IN
    SELECT p.id
    FROM public.profiles p
    WHERE NOT EXISTS (
      SELECT 1 FROM public.rules r
      WHERE r.user_id = p.id AND r.is_system_managed = true
    )
  LOOP
    PERFORM public.install_all_rules_for_user(user_record.id);
    installed_count := installed_count + 1;
  END LOOP;

  RAISE NOTICE 'Backfill complete: % users received all rules', installed_count;
END $$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.install_all_rules_for_user(UUID) TO authenticated;

-- Comment
COMMENT ON FUNCTION public.install_all_rules_for_user IS 'Installs all rule templates for a specific user (used for backfills and manual installation)';
