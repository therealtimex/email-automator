-- Grant usage on schema public to anon and authenticated
grant usage on schema public to anon, authenticated;

-- Grant select on init_state view to anon and authenticated
grant select on public.init_state to anon, authenticated;
