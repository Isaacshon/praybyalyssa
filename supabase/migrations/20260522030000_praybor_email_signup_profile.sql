create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists full_name text,
  add column if not exists nickname text,
  add column if not exists email text,
  add column if not exists notification_opt_in boolean not null default false,
  add column if not exists policy_accepted_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists profiles_nickname_unique_lower_idx
  on public.profiles (lower(nickname))
  where nickname is not null and btrim(nickname) <> '';

create unique index if not exists profiles_email_unique_lower_idx
  on public.profiles (lower(email))
  where email is not null and btrim(email) <> '';

alter table public.profiles enable row level security;

drop policy if exists "profiles are visible to authenticated users" on public.profiles;
create policy "profiles are visible to authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

drop policy if exists "users manage their own profile" on public.profiles;
create policy "users manage their own profile"
  on public.profiles for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create or replace function public.check_profile_availability(
  check_nickname text,
  check_email text
)
returns table (
  nickname_available boolean,
  email_available boolean
)
language sql
security definer
set search_path = public
as $$
  select
    not exists (
      select 1
      from public.profiles p
      where lower(p.nickname) = lower(btrim(check_nickname))
    ) as nickname_available,
    not exists (
      select 1
      from public.profiles p
      where lower(p.email) = lower(btrim(check_email))
    ) as email_available;
$$;

grant execute on function public.check_profile_availability(text, text) to anon, authenticated;

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    display_name,
    email,
    full_name,
    nickname,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    lower(new.email),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'nickname',
    now(),
    now()
  )
  on conflict (id) do update
    set
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      email = coalesce(public.profiles.email, excluded.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      nickname = coalesce(public.profiles.nickname, excluded.nickname),
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists auth_users_create_profile on auth.users;
create trigger auth_users_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();
