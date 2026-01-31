-- Migration: Backfill user_settings for existing users
-- Creates user_settings records for users who signed up before auto-initialization

-- Backfill user_settings for existing users who don't have it
INSERT INTO public.user_settings (
  user_id,
  llm_provider,
  llm_model,
  user_role,
  onboarding_completed,
  created_at,
  updated_at
)
SELECT
  p.id,
  'realtimexai',
  'gpt-4o-mini',
  NULL,
  FALSE,
  NOW(),
  NOW()
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_settings us
  WHERE us.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Log the result
DO $$
DECLARE
  inserted_count INTEGER;
BEGIN
  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RAISE NOTICE 'Created user_settings for % existing users', inserted_count;
END $$;
