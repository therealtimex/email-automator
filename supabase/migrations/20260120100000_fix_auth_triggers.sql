-- Fix Auth triggers by setting robust search_path
-- This resolves "Database error creating new user" (unexpected_failure) during setup

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  profile_count int;
BEGIN
  SELECT count(id) INTO profile_count
  FROM public.profiles;

  INSERT INTO public.profiles (id, first_name, last_name, email, is_admin)
  VALUES (
    new.id,
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name', 
    new.email, 
    -- If it's the first user, make them admin. Otherwise, standard user.
    CASE WHEN profile_count > 0 THEN false ELSE true END
  );
  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_update_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET 
    first_name = new.raw_user_meta_data ->> 'first_name', 
    last_name = new.raw_user_meta_data ->> 'last_name', 
    email = new.email,
    updated_at = now()
  WHERE id = new.id;

  RETURN new;
END;
$$;
