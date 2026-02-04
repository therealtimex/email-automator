DO $$
BEGIN
  -- Ensure triggers can run (usually default, but good to ensure)
  GRANT USAGE ON SCHEMA public TO anon, authenticated;

  -- Grant permissions for init_state view (if present)
  IF to_regclass('public.init_state') IS NOT NULL THEN
    GRANT SELECT ON public.init_state TO anon, authenticated;
  ELSE
    RAISE NOTICE 'init_state view missing; skipping grant';
  END IF;

  -- Grant permissions for profiles table (if present)
  IF to_regclass('public.profiles') IS NOT NULL THEN
    GRANT SELECT ON public.profiles TO anon, authenticated;
  ELSE
    RAISE NOTICE 'profiles table missing; skipping grant';
  END IF;
END $$;
