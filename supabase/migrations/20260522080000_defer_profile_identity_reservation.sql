drop index if exists public.profiles_nickname_unique_lower_idx;
drop index if exists public.profiles_email_unique_lower_idx;

create unique index if not exists profiles_nickname_unique_lower_idx
  on public.profiles (lower(btrim(nickname)))
  where nickname is not null
    and btrim(nickname) <> ''
    and policy_accepted_at is not null;

create unique index if not exists profiles_email_unique_lower_idx
  on public.profiles (lower(btrim(email)))
  where email is not null
    and btrim(email) <> ''
    and policy_accepted_at is not null;

create or replace function public.assign_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_nickname text := lower(btrim(coalesce(new.nickname, '')));
  normalized_email text := lower(btrim(coalesce(new.email, '')));
begin
  if tg_op = 'UPDATE' and old.role = 'admin' then
    new.role := 'admin';
  elsif new.role = 'admin'
    or normalized_nickname = 'thswndrnr'
    or normalized_email = 'thswndrnr'
    or normalized_email = 'thswndrnr@blessie.local' then
    new.role := 'admin';
  elsif tg_op = 'UPDATE' then
    new.role := old.role;
  else
    new.role := 'member';
  end if;

  return new;
end;
$$;

create or replace function public.create_profile_for_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    role,
    created_at,
    updated_at
  )
  values (
    new.id,
    case
      when lower(coalesce(new.raw_user_meta_data->>'nickname', '')) = 'thswndrnr'
        or lower(coalesce(new.email, '')) in ('thswndrnr', 'thswndrnr@blessie.local')
        then 'admin'
      else 'member'
    end,
    now(),
    now()
  )
  on conflict (id) do update
    set
      role = case
        when public.profiles.role = 'admin' or excluded.role = 'admin' then 'admin'
        else public.profiles.role
      end,
      updated_at = now();

  return new;
end;
$$;

drop trigger if exists auth_users_create_profile on auth.users;
create trigger auth_users_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_auth_user();

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
  with normalized as (
    select
      lower(btrim(coalesce(check_nickname, ''))) as nickname_value,
      lower(btrim(coalesce(check_email, ''))) as email_value
  )
  select
    case
      when n.nickname_value = '' then true
      else not exists (
        select 1
        from public.profiles p
        where p.policy_accepted_at is not null
          and lower(btrim(coalesce(p.nickname, ''))) = n.nickname_value
      )
    end as nickname_available,
    case
      when n.email_value = '' then true
      else not exists (
        select 1
        from public.profiles p
        where p.policy_accepted_at is not null
          and lower(btrim(coalesce(p.email, ''))) = n.email_value
      )
    end as email_available
  from normalized n;
$$;

grant execute on function public.check_profile_availability(text, text) to anon, authenticated;
