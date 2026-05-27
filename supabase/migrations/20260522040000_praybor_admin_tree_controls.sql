alter table public.profiles
  add column if not exists role text not null default 'member';

do $$
begin
  alter table public.profiles
    drop constraint if exists profiles_role_check;

  alter table public.profiles
    add constraint profiles_role_check check (role in ('member', 'admin'));
end $$;

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
  elsif normalized_nickname = 'thswndrnr'
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

drop trigger if exists profiles_assign_role on public.profiles;
create trigger profiles_assign_role
before insert or update on public.profiles
for each row execute function public.assign_profile_role();

update public.profiles
set role = 'admin'
where lower(btrim(coalesce(nickname, ''))) = 'thswndrnr'
  or lower(btrim(coalesce(email, ''))) in ('thswndrnr', 'thswndrnr@blessie.local');

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
    role,
    created_at,
    updated_at
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name'),
    lower(new.email),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'nickname',
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
      display_name = coalesce(public.profiles.display_name, excluded.display_name),
      email = coalesce(public.profiles.email, excluded.email),
      full_name = coalesce(public.profiles.full_name, excluded.full_name),
      nickname = coalesce(public.profiles.nickname, excluded.nickname),
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

create or replace function public.current_user_is_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'admin'
  );
$$;

grant execute on function public.current_user_is_admin() to authenticated;

create or replace function public.resolve_login_email(login_identifier text)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select p.email
  from public.profiles p
  where p.email is not null
    and (
      lower(btrim(p.email)) = lower(btrim(login_identifier))
      or lower(btrim(coalesce(p.nickname, ''))) = lower(btrim(login_identifier))
    )
  limit 1;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;

create or replace function public.admin_update_tree_growth(
  target_tree_id uuid,
  next_growth_points integer
)
returns table (
  id uuid,
  owner_id uuid,
  species_id text,
  stage public.tree_growth_stage,
  growth_points integer,
  planted_at timestamptz,
  completed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  clamped_points integer := least(7, greatest(0, coalesce(next_growth_points, 0)));
  next_stage public.tree_growth_stage;
begin
  if not public.current_user_is_admin() then
    raise exception 'Only Blessie admins can update tree growth directly.'
      using errcode = '42501';
  end if;

  next_stage := case
    when clamped_points >= 7 then 'completed'::public.tree_growth_stage
    when clamped_points >= 6 then 'fruiting_tree'::public.tree_growth_stage
    when clamped_points >= 5 then 'young_tree'::public.tree_growth_stage
    when clamped_points >= 3 then 'small_plant'::public.tree_growth_stage
    when clamped_points >= 1 then 'sprout'::public.tree_growth_stage
    else 'seed'::public.tree_growth_stage
  end;

  return query
  update public.user_trees ut
  set
    growth_points = clamped_points,
    stage = next_stage,
    completed_at = case
      when clamped_points < 7 then null
      else ut.completed_at
    end
  where ut.id = target_tree_id
  returning
    ut.id,
    ut.owner_id,
    ut.species_id,
    ut.stage,
    ut.growth_points,
    ut.planted_at,
    ut.completed_at;

  if not found then
    raise exception 'Tree not found.'
      using errcode = 'P0002';
  end if;
end;
$$;

grant execute on function public.admin_update_tree_growth(uuid, integer) to authenticated;
