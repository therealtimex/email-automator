-- Backfill profiles for any auth.users that don't have a profile entry
-- This handles cases where:
-- 1. Users were created before the trigger was added
-- 2. The trigger didn't fire (e.g., admin API in some Supabase configs)

-- Insert profiles for users who don't have one
insert into public.profiles (id, email, is_admin, created_at, updated_at)
select
    u.id,
    u.email,
    -- First user (oldest) becomes admin if no admin exists
    case when not exists (select 1 from public.profiles where is_admin = true)
         and u.created_at = (select min(created_at) from auth.users)
    then true
    else false
    end,
    u.created_at,
    now()
from auth.users u
where not exists (
    select 1 from public.profiles p where p.id = u.id
);
