-- Diagnostic queries to debug user initialization trigger

-- 1. Check if trigger exists
SELECT
  t.tgname AS trigger_name,
  c.relname AS table_name,
  p.proname AS function_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE t.tgname IN ('on_auth_user_created', 'on_profile_created');

-- 2. Check if profiles table has data
SELECT id, email, created_at FROM public.profiles ORDER BY created_at DESC LIMIT 5;

-- 3. Check if user_settings is empty
SELECT COUNT(*) as user_settings_count FROM public.user_settings;

-- 4. Check if rules is empty
SELECT COUNT(*) as rules_count FROM public.rules;

-- 5. Check rule_templates count
SELECT COUNT(*) as template_count FROM public.rule_templates;

-- 6. Check user_settings table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'user_settings'
ORDER BY ordinal_position;

-- 7. Check if there are orphaned users (profiles without settings)
SELECT
  p.id,
  p.email,
  p.created_at,
  us.id IS NULL as is_orphaned
FROM public.profiles p
LEFT JOIN public.user_settings us ON us.user_id = p.id
ORDER BY p.created_at DESC;

-- 8. Get function source code
SELECT prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';
