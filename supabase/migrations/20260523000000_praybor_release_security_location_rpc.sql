create or replace function public.prayer_distance_km(
  lat_a double precision,
  lng_a double precision,
  lat_b double precision,
  lng_b double precision
)
returns double precision
language sql
immutable
as $$
  select 6371.0 * 2.0 * asin(
    least(
      1.0,
      sqrt(
        power(sin(radians((lat_b - lat_a) / 2.0)), 2)
        + cos(radians(lat_a))
          * cos(radians(lat_b))
          * power(sin(radians((lng_b - lng_a) / 2.0)), 2)
      )
    )
  );
$$;

drop policy if exists "profiles are visible to authenticated users" on public.profiles;
drop policy if exists "users and admins can view profiles" on public.profiles;
create policy "users and admins can view profiles"
  on public.profiles for select
  to authenticated
  using (
    id = auth.uid()
    or public.current_user_is_admin()
  );

drop policy if exists "visible prayer posts can be read" on public.prayer_posts;
drop policy if exists "group and own prayer posts can be read" on public.prayer_posts;
create policy "group and own prayer posts can be read"
  on public.prayer_posts for select
  to authenticated
  using (
    author_id = auth.uid()
    or (
      visibility = 'group'
      and exists (
        select 1
        from public.group_memberships gm
        where gm.group_id = prayer_posts.group_id
          and gm.user_id = auth.uid()
      )
    )
  );

revoke select on public.prayer_posts from anon, authenticated;
grant select (
  id,
  author_id,
  group_id,
  visibility,
  identity,
  mood,
  title,
  body,
  is_sensitive,
  created_at,
  author_label,
  neighborhood,
  paper_color,
  pin_seed
) on public.prayer_posts to authenticated;

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
  bounded_radius double precision := least(greatest(coalesce(radius_km, 10), 0), 100);
  bounded_limit integer := least(greatest(coalesce(limit_count, 50), 1), 100);
begin
  if current_viewer is null then
    return;
  end if;

  return query
  select
    pp.id,
    pp.author_id,
    pp.title,
    pp.body,
    pp.mood,
    pp.visibility,
    pp.identity,
    pp.is_sensitive,
    pp.created_at,
    pp.group_id,
    pp.author_label,
    pp.neighborhood,
    pp.paper_color,
    pp.pin_seed,
    public.prayer_distance_km(viewer_lat, viewer_lng, pp.location_lat, pp.location_lng) as distance_km
  from public.prayer_posts pp
  where pp.visibility = 'public'
    and pp.group_id is null
    and pp.location_lat is not null
    and pp.location_lng is not null
    and public.prayer_distance_km(viewer_lat, viewer_lng, pp.location_lat, pp.location_lng) <= bounded_radius
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
  order by distance_km asc, pp.created_at desc
  limit bounded_limit;
end;
$$;

grant execute on function public.fetch_public_prayer_posts_near(
  double precision,
  double precision,
  double precision,
  integer
) to authenticated;

create or replace function public.get_prayer_group_metrics(group_ids uuid[])
returns table (
  group_id uuid,
  member_count bigint,
  post_count bigint
)
language sql
security definer
set search_path = public
stable
as $$
  with requested_groups as (
    select distinct unnest(coalesce(group_ids, array[]::uuid[])) as id
  ),
  visible_groups as (
    select rg.id
    from requested_groups rg
    where exists (
      select 1
      from public.group_memberships gm
      where gm.group_id = rg.id
        and gm.user_id = auth.uid()
    )
    or exists (
      select 1
      from public.prayer_groups pg
      where pg.id = rg.id
        and pg.owner_id = auth.uid()
    )
  )
  select
    vg.id as group_id,
    count(distinct gm.user_id) as member_count,
    count(distinct pp.id) as post_count
  from visible_groups vg
  left join public.group_memberships gm
    on gm.group_id = vg.id
  left join public.prayer_posts pp
    on pp.group_id = vg.id
    and pp.visibility = 'group'
  group by vg.id;
$$;

grant execute on function public.get_prayer_group_metrics(uuid[]) to authenticated;

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
      p.policy_accepted_at is not null
      or p.role = 'admin'
    )
    and (
      lower(btrim(p.email)) = lower(btrim(login_identifier))
      or lower(btrim(coalesce(p.nickname, ''))) = lower(btrim(login_identifier))
    )
  limit 1;
$$;

grant execute on function public.resolve_login_email(text) to anon, authenticated;
