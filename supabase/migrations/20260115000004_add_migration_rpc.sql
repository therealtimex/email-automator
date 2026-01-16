-- Function to get the latest migration timestamp
-- Used by the frontend to check if the app is out of sync with the database
create or replace function public.get_latest_migration_timestamp()
returns text
language sql
security definer
set search_path = ''
as $$
  select max(version) from supabase_migrations.schema_migrations;
$$;

-- Grant execute permission to anon and authenticated users
grant execute on function public.get_latest_migration_timestamp() to anon, authenticated;
