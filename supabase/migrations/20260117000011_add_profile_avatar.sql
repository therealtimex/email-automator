-- Add avatar_url to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Ensure RLS allows users to update their own avatar_url (it already does by allowing all updates to own profile)
