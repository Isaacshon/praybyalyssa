drop function if exists public.fetch_public_prayer_posts_near(
  double precision,
  double precision,
  double precision,
  integer
);

create function public.fetch_public_prayer_posts_near(
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
  location_lat double precision,
  location_lng double precision,
  distance_km double precision
)
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  current_viewer uuid := auth.uid();
  bounded_radius double precision := least(greatest(coalesce(radius_km, 10), 1), 101);
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
    ep.location_lat,
    ep.location_lng,
    ep.actual_distance_km
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
