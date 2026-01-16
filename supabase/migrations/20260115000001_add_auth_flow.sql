-- Create profiles table
create table public.profiles (
  id uuid references auth.users not null primary key,
  first_name text,
  last_name text,
  email text,
  is_admin boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table public.profiles enable row level security;

create policy "Users can view their own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Trigger to handle new user creation
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  profile_count int;
begin
  select count(id) into profile_count
  from public.profiles;

  insert into public.profiles (id, first_name, last_name, email, is_admin)
  values (
    new.id,
    new.raw_user_meta_data ->> 'first_name', 
    new.raw_user_meta_data ->> 'last_name', 
    new.email, 
    -- If it's the first user, make them admin. Otherwise, standard user.
    case when profile_count > 0 then false else true end
  );
  return new;
end;
$$;

-- Trigger to handle user updates
create or replace function public.handle_update_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  update public.profiles
  set 
    first_name = new.raw_user_meta_data ->> 'first_name', 
    last_name = new.raw_user_meta_data ->> 'last_name', 
    email = new.email,
    updated_at = now()
  where id = new.id;

  return new;
end;
$$;

-- Register triggers
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_update_user();

-- Create init_state view for frontend check
create or replace view init_state
  with (security_invoker=off)
  as
select count(id) as is_initialized
from public.profiles
limit 1;
