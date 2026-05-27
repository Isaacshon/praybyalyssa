create table if not exists public.prayer_reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  notification_id text not null,
  scheduled_for timestamptz not null,
  native boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prayer_reminders_owner_scheduled_idx
  on public.prayer_reminders (owner_id, scheduled_for desc);

alter table public.prayer_reminders enable row level security;

drop policy if exists "users manage their own prayer reminders" on public.prayer_reminders;
create policy "users manage their own prayer reminders"
  on public.prayer_reminders for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create table if not exists public.account_deletion_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  status text not null check (status in ('started', 'completed', 'failed')),
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists account_deletion_audit_user_idx
  on public.account_deletion_audit (user_id, created_at desc);

alter table public.account_deletion_audit enable row level security;

drop policy if exists "admins can view account deletion audit" on public.account_deletion_audit;
create policy "admins can view account deletion audit"
  on public.account_deletion_audit for select
  to authenticated
  using (public.current_user_is_admin());

drop policy if exists "users manage their account deletion request" on public.account_deletion_requests;
drop policy if exists "users can view their account deletion request" on public.account_deletion_requests;
create policy "users can view their account deletion request"
  on public.account_deletion_requests for select
  to authenticated
  using (user_id = auth.uid());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile avatars are publicly readable" on storage.objects;
create policy "profile avatars are publicly readable"
  on storage.objects for select
  using (bucket_id = 'profile-avatars');

drop policy if exists "users upload their own profile avatars" on storage.objects;
create policy "users upload their own profile avatars"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users update their own profile avatars" on storage.objects;
create policy "users update their own profile avatars"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete their own profile avatars" on storage.objects;
create policy "users delete their own profile avatars"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users manage their own tree events" on public.tree_growth_events;
create policy "users view their own tree events"
  on public.tree_growth_events for select
  to authenticated
  using (owner_id = auth.uid());

drop policy if exists "users manage their own trees" on public.user_trees;
create policy "users view their own trees"
  on public.user_trees for select
  to authenticated
  using (owner_id = auth.uid());

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
  event_day date := current_date;
  next_growth_points integer;
  next_stage public.tree_growth_stage;
  verified_visibility public.prayer_visibility;
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
          array_position(species_pool, active_tree.species_id)
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
