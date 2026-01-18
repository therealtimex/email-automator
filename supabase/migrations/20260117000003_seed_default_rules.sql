-- Update rules action check constraint to support new actions
ALTER TABLE rules DROP CONSTRAINT IF EXISTS rules_action_check;
ALTER TABLE rules ADD CONSTRAINT rules_action_check 
    CHECK (action IN ('delete', 'archive', 'draft', 'star', 'read'));

-- Seed default rules for existing users
DO $$
DECLARE
    user_rec RECORD;
BEGIN
    FOR user_rec IN SELECT id FROM auth.users LOOP
        -- Archive Newsletters
        IF NOT EXISTS (SELECT 1 FROM rules WHERE user_id = user_rec.id AND name = 'Archive Newsletters') THEN
            INSERT INTO rules (user_id, name, condition, action, is_enabled)
            VALUES (user_rec.id, 'Archive Newsletters', '{"category": "newsletter"}', 'archive', true);
        END IF;

        -- Archive Receipts
        IF NOT EXISTS (SELECT 1 FROM rules WHERE user_id = user_rec.id AND name = 'Archive Receipts') THEN
            INSERT INTO rules (user_id, name, condition, action, is_enabled)
            VALUES (user_rec.id, 'Archive Receipts', '{"category": "transactional"}', 'archive', true);
        END IF;

        -- Trash Promotions (Disabled by default)
        IF NOT EXISTS (SELECT 1 FROM rules WHERE user_id = user_rec.id AND name = 'Trash Promotions') THEN
            INSERT INTO rules (user_id, name, condition, action, is_enabled)
            VALUES (user_rec.id, 'Trash Promotions', '{"category": "promotional"}', 'delete', false);
        END IF;

        -- Flag Important
        IF NOT EXISTS (SELECT 1 FROM rules WHERE user_id = user_rec.id AND name = 'Flag Important') THEN
            INSERT INTO rules (user_id, name, condition, action, is_enabled)
            VALUES (user_rec.id, 'Flag Important', '{"priority": "High"}', 'star', true);
        END IF;

        -- Auto-Trash Old Newsletters (30 days)
        IF NOT EXISTS (SELECT 1 FROM rules WHERE user_id = user_rec.id AND name = 'Auto-Trash Old Newsletters') THEN
            INSERT INTO rules (user_id, name, condition, action, is_enabled)
            VALUES (user_rec.id, 'Auto-Trash Old Newsletters', '{"category": "newsletter", "older_than_days": 30}', 'delete', true);
        END IF;
    END LOOP;
END $$;

-- Update trigger for new users to include default rules
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  profile_count int;
BEGIN
  SELECT count(id) INTO profile_count
  FROM public.profiles;

  -- Create Profile
  INSERT INTO public.profiles (id, first_name, last_name, email, is_admin)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name', 
    new.email, 
    CASE WHEN profile_count > 0 THEN false ELSE true END
  );

  -- Insert Default Rules
  INSERT INTO public.rules (user_id, name, condition, action, is_enabled)
  VALUES
    (new.id, 'Archive Newsletters', '{"category": "newsletter"}', 'archive', true),
    (new.id, 'Archive Receipts', '{"category": "transactional"}', 'archive', true),
    (new.id, 'Trash Promotions', '{"category": "promotional"}', 'delete', false),
    (new.id, 'Flag Important', '{"priority": "High"}', 'star', true),
    (new.id, 'Auto-Trash Old Newsletters', '{"category": "newsletter", "older_than_days": 30}', 'delete', true);

  RETURN new;
END;
$$;
