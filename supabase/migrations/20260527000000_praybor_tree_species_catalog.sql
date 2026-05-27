create or replace function public.record_tree_growth_action(
  growth_event_type public.tree_growth_event_type,
  growth_visibility public.prayer_visibility,
  source_prayer_id uuid default null,
  growth_occurred_on date default current_date
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
  current_owner uuid := auth.uid();
  active_tree public.user_trees%rowtype;
  event_day date := coalesce(growth_occurred_on, current_date);
  next_growth_points integer;
  next_stage public.tree_growth_stage;
  verified_visibility public.prayer_visibility;
  species_pool text[] := array[
    'plum',
    'cherry',
    'olive',
    'orange',
    'palm',
    'avocado',
    'almond',
    'pomegranate',
    'apricot',
    'apple',
    'loquat',
    'peach',
    'pear',
    'chestnut',
    'mango',
    'guava',
    'persimmon'
  ];
  next_species text;
begin
  if current_owner is null then
    raise exception 'Please sign in to grow your tree.'
      using errcode = '42501';
  end if;

  if growth_event_type = 'recap_completed' then
    select *
    into active_tree
    from public.user_trees ut
    where ut.owner_id = current_owner
      and ut.completed_at is null
    order by ut.planted_at desc
    limit 1;

    if not found then
      insert into public.user_trees (owner_id, species_id, stage, growth_points)
      values (current_owner, species_pool[1], 'seed', 0)
      returning * into active_tree;
    end if;

    return query
    select
      active_tree.id,
      active_tree.owner_id,
      active_tree.species_id,
      active_tree.stage,
      active_tree.growth_points,
      active_tree.planted_at,
      active_tree.completed_at;
    return;
  end if;

  if source_prayer_id is null then
    raise exception 'A prayer source is required for tree growth.'
      using errcode = '23502';
  end if;

  if growth_event_type = 'prayer_posted' then
    select pp.visibility
    into verified_visibility
    from public.prayer_posts pp
    where pp.id = source_prayer_id
      and pp.author_id = current_owner;
  elsif growth_event_type = 'reaction_given' then
    select pp.visibility
    into verified_visibility
    from public.prayer_posts pp
    where pp.id = source_prayer_id
      and exists (
        select 1
        from public.prayer_reactions pr
        where pr.prayer_id = pp.id
          and pr.user_id = current_owner
      );
  else
    raise exception 'Unsupported tree growth event type.'
      using errcode = '22023';
  end if;

  if verified_visibility is null then
    raise exception 'This prayer action cannot grow your tree.'
      using errcode = '42501';
  end if;

  if verified_visibility <> growth_visibility then
    raise exception 'Prayer visibility does not match this growth action.'
      using errcode = '22023';
  end if;

  select *
  into active_tree
  from public.user_trees ut
  where ut.owner_id = current_owner
    and ut.completed_at is null
  order by ut.planted_at desc
  limit 1
  for update;

  if not found then
    insert into public.user_trees (owner_id, species_id, stage, growth_points)
    values (current_owner, species_pool[1], 'seed', 0)
    returning * into active_tree;
  end if;

  if exists (
    select 1
    from public.tree_growth_events tge
    where tge.owner_id = current_owner
      and tge.occurred_on = event_day
      and tge.event_type in ('prayer_posted', 'reaction_given')
  ) then
    return query
    select
      active_tree.id,
      active_tree.owner_id,
      active_tree.species_id,
      active_tree.stage,
      active_tree.growth_points,
      active_tree.planted_at,
      active_tree.completed_at;
    return;
  end if;

  insert into public.tree_growth_events (
    owner_id,
    tree_id,
    event_type,
    visibility,
    occurred_on,
    points,
    source_prayer_id,
    metadata
  )
  values (
    current_owner,
    active_tree.id,
    growth_event_type,
    growth_visibility,
    event_day,
    1,
    source_prayer_id,
    jsonb_build_object('recorded_by', 'record_tree_growth_action')
  );

  next_growth_points := least(7, active_tree.growth_points + 1);
  next_stage := case
    when next_growth_points >= 7 then 'completed'::public.tree_growth_stage
    when next_growth_points >= 6 then 'fruiting_tree'::public.tree_growth_stage
    when next_growth_points >= 5 then 'young_tree'::public.tree_growth_stage
    when next_growth_points >= 3 then 'small_plant'::public.tree_growth_stage
    when next_growth_points >= 1 then 'sprout'::public.tree_growth_stage
    else 'seed'::public.tree_growth_stage
  end;

  if next_growth_points >= 7 then
    update public.user_trees ut
    set
      growth_points = next_growth_points,
      stage = 'completed',
      completed_at = coalesce(ut.completed_at, now())
    where ut.id = active_tree.id;

    next_species := species_pool[1 + floor(random() * array_length(species_pool, 1))::integer];

    if array_length(species_pool, 1) > 1 and next_species = active_tree.species_id then
      next_species := species_pool[
        1 + (
          coalesce(array_position(species_pool, active_tree.species_id), 1)
          % array_length(species_pool, 1)
        )
      ];
    end if;

    insert into public.user_trees (owner_id, species_id, stage, growth_points)
    values (current_owner, next_species, 'seed', 0)
    returning * into active_tree;
  else
    update public.user_trees ut
    set
      growth_points = next_growth_points,
      stage = next_stage
    where ut.id = active_tree.id
    returning * into active_tree;
  end if;

  return query
  select
    active_tree.id,
    active_tree.owner_id,
    active_tree.species_id,
    active_tree.stage,
    active_tree.growth_points,
    active_tree.planted_at,
    active_tree.completed_at;
end;
$$;

grant execute on function public.record_tree_growth_action(
  public.tree_growth_event_type,
  public.prayer_visibility,
  uuid,
  date
) to authenticated;

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
  target_tree public.user_trees%rowtype;
  active_tree public.user_trees%rowtype;
  next_stage public.tree_growth_stage;
  species_pool text[] := array[
    'plum',
    'cherry',
    'olive',
    'orange',
    'palm',
    'avocado',
    'almond',
    'pomegranate',
    'apricot',
    'apple',
    'loquat',
    'peach',
    'pear',
    'chestnut',
    'mango',
    'guava',
    'persimmon'
  ];
  species_position integer;
  next_species text;
begin
  if not public.current_user_is_admin() then
    raise exception 'Only Blessie admins can update tree growth directly.'
      using errcode = '42501';
  end if;

  select *
  into target_tree
  from public.user_trees ut
  where ut.id = target_tree_id
  for update;

  if not found then
    raise exception 'Tree not found.'
      using errcode = 'P0002';
  end if;

  next_stage := case
    when clamped_points >= 7 then 'completed'::public.tree_growth_stage
    when clamped_points >= 6 then 'fruiting_tree'::public.tree_growth_stage
    when clamped_points >= 5 then 'young_tree'::public.tree_growth_stage
    when clamped_points >= 3 then 'small_plant'::public.tree_growth_stage
    when clamped_points >= 1 then 'sprout'::public.tree_growth_stage
    else 'seed'::public.tree_growth_stage
  end;

  if clamped_points < 7 then
    return query
    update public.user_trees ut
    set
      growth_points = clamped_points,
      stage = next_stage,
      completed_at = null
    where ut.id = target_tree.id
    returning
      ut.id,
      ut.owner_id,
      ut.species_id,
      ut.stage,
      ut.growth_points,
      ut.planted_at,
      ut.completed_at;
    return;
  end if;

  update public.user_trees ut
  set
    growth_points = 7,
    stage = 'completed',
    completed_at = coalesce(ut.completed_at, now())
  where ut.id = target_tree.id;

  select *
  into active_tree
  from public.user_trees ut
  where ut.owner_id = target_tree.owner_id
    and ut.id <> target_tree.id
    and ut.completed_at is null
  order by ut.planted_at desc
  limit 1;

  if found then
    return query
    select
      active_tree.id,
      active_tree.owner_id,
      active_tree.species_id,
      active_tree.stage,
      active_tree.growth_points,
      active_tree.planted_at,
      active_tree.completed_at;
    return;
  end if;

  species_position := array_position(species_pool, target_tree.species_id);
  next_species := species_pool[
    1 + (coalesce(species_position, 1) % array_length(species_pool, 1))
  ];

  return query
  insert into public.user_trees as ut (owner_id, species_id, stage, growth_points)
  values (target_tree.owner_id, next_species, 'seed', 0)
  returning
    ut.id,
    ut.owner_id,
    ut.species_id,
    ut.stage,
    ut.growth_points,
    ut.planted_at,
    ut.completed_at;
end;
$$;

grant execute on function public.admin_update_tree_growth(uuid, integer) to authenticated;
