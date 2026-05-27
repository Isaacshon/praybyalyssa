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
    'apple',
    'pear',
    'grape_vine',
    'cedar',
    'baobab',
    'walnut',
    'cherry_blossom',
    'ginkgo'
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
