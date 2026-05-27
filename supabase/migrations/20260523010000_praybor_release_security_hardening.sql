create or replace function public.assign_profile_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_auth_email text;
begin
  select lower(btrim(coalesce(au.email, '')))
  into normalized_auth_email
  from auth.users au
  where au.id = new.id;

  if tg_op = 'UPDATE' and old.role = 'admin' then
    new.role := 'admin';
  elsif normalized_auth_email in ('thswndrnr80@gmail.com', 'thswndrnr@blessie.local') then
    new.role := 'admin';
  elsif tg_op = 'UPDATE' then
    new.role := old.role;
  else
    new.role := 'member';
  end if;

  return new;
end;
$$;

revoke update (role) on public.profiles from authenticated;

update public.profiles p
set role = case
  when lower(btrim(coalesce(au.email, ''))) in ('thswndrnr80@gmail.com', 'thswndrnr@blessie.local') then 'admin'
  when p.role = 'admin' then 'admin'
  else 'member'
end
from auth.users au
where au.id = p.id;

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
      when lower(btrim(coalesce(new.email, ''))) in ('thswndrnr80@gmail.com', 'thswndrnr@blessie.local')
        then 'admin'
      else 'member'
    end,
    now(),
    now()
  )
  on conflict (id) do update
    set
      role = case
        when public.profiles.role = 'admin'
          or lower(btrim(coalesce(new.email, ''))) in ('thswndrnr80@gmail.com', 'thswndrnr@blessie.local')
          then 'admin'
        else public.profiles.role
      end,
      updated_at = now();

  return new;
end;
$$;

create or replace function public.fetch_public_prayer_posts_near(
  viewer_lat double precision,
  viewer_lng double precision,
  radius_km double precision default 10,
  limit_count integer default 50
)
returns table (
  id uuid,
  author_id uuid,
  title text,
  body text,
  mood public.prayer_mood,
  visibility public.prayer_visibility,
  identity public.prayer_identity,
  is_sensitive boolean,
  created_at timestamptz,
  group_id uuid,
  author_label text,
  neighborhood text,
  paper_color text,
  pin_seed integer,
  distance_km double precision
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  current_viewer uuid := auth.uid();
  bounded_radius double precision := least(greatest(coalesce(radius_km, 10), 1), 100);
  bounded_limit integer := least(greatest(coalesce(limit_count, 50), 1), 100);
begin
  if current_viewer is null then
    return;
  end if;

  return query
  with eligible_posts as (
    select
      pp.*,
      public.prayer_distance_km(viewer_lat, viewer_lng, pp.location_lat, pp.location_lng) as actual_distance_km
    from public.prayer_posts pp
    where pp.visibility = 'public'
      and pp.group_id is null
      and pp.location_lat is not null
      and pp.location_lng is not null
      and not exists (
        select 1
        from public.prayer_reports pr
        where pr.prayer_id = pp.id
          and pr.reporter_id = current_viewer
      )
      and not exists (
        select 1
        from public.blocked_prayer_authors b
        where b.blocker_id = current_viewer
          and b.blocked_author_id = pp.author_id
      )
  )
  select
    ep.id,
    ep.author_id,
    ep.title,
    ep.body,
    ep.mood,
    ep.visibility,
    ep.identity,
    ep.is_sensitive,
    ep.created_at,
    ep.group_id,
    ep.author_label,
    ep.neighborhood,
    ep.paper_color,
    ep.pin_seed,
    null::double precision as distance_km
  from eligible_posts ep
  where ep.actual_distance_km <= bounded_radius
  order by ep.actual_distance_km asc, ep.created_at desc
  limit bounded_limit;
end;
$$;

grant execute on function public.fetch_public_prayer_posts_near(
  double precision,
  double precision,
  double precision,
  integer
) to authenticated;
