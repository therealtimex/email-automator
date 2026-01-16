-- Grant permissions for init_state view
grant select on public.init_state to anon, authenticated;

-- Grant permissions for profiles table (needed for some flows although view is security defined)
-- Good practice to ensure basic read capability if needed later
grant select on public.profiles to anon, authenticated;

-- Ensure triggers can run (usually default, but good to ensure)
grant usage on schema public to anon, authenticated;
