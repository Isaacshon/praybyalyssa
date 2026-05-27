alter table public.profiles
  add column if not exists status_text text,
  add column if not exists avatar_mood public.prayer_mood,
  add column if not exists avatar_tree_species_id text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.prayer_groups
  add column if not exists category text not null default 'church',
  add column if not exists rhythm text,
  add column if not exists accent_color text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.group_memberships
  add column if not exists role text not null default 'member';

alter table public.prayer_reactions
  add column if not exists updated_at timestamptz not null default now();

alter table public.tree_growth_events
  add column if not exists visibility public.prayer_visibility,
  add column if not exists occurred_on date,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

update public.tree_growth_events
set visibility = 'public'
where visibility is null;

update public.tree_growth_events
set occurred_on = created_at::date
where occurred_on is null;

alter table public.tree_growth_events
  alter column visibility set not null,
  alter column occurred_on set not null;

do $$
begin
  alter table public.user_trees
    drop constraint if exists user_trees_growth_points_check;

  alter table public.user_trees
    add constraint user_trees_growth_points_check check (growth_points between 0 and 7);
end $$;

create unique index if not exists user_trees_one_active_tree_idx
  on public.user_trees (owner_id)
  where completed_at is null;

create unique index if not exists tree_growth_events_one_public_day_idx
  on public.tree_growth_events (owner_id, occurred_on)
  where visibility = 'public'
    and event_type in ('prayer_posted', 'reaction_given');

create index if not exists group_memberships_group_idx
  on public.group_memberships (group_id);

drop policy if exists "authors can create prayer posts" on public.prayer_posts;
create policy "authors can create prayer posts"
  on public.prayer_posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and (
      (visibility = 'public' and group_id is null)
      or (
        visibility = 'group'
        and group_id is not null
        and exists (
          select 1 from public.group_memberships gm
          where gm.group_id = prayer_posts.group_id
            and gm.user_id = auth.uid()
        )
      )
    )
  );

drop policy if exists "users can view their group memberships" on public.group_memberships;
drop policy if exists "group members can view memberships" on public.group_memberships;
create policy "group members can view memberships"
  on public.group_memberships for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "users can join groups as themselves" on public.group_memberships;
drop policy if exists "group membership inserts use invite flow" on public.group_memberships;
create policy "group membership inserts use invite flow"
  on public.group_memberships for insert
  to authenticated
  with check (false);

create or replace function public.create_owner_group_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_memberships (group_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (group_id, user_id) do update
    set role = excluded.role;

  return new;
end;
$$;

drop trigger if exists prayer_groups_owner_membership on public.prayer_groups;
create trigger prayer_groups_owner_membership
after insert on public.prayer_groups
for each row execute function public.create_owner_group_membership();

create or replace function public.join_prayer_group(invite_code text)
returns table (
  id uuid,
  owner_id uuid,
  name text,
  invitation_code text,
  category text,
  rhythm text,
  accent_color text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_code text := lower(regexp_replace(trim(invite_code), '^#', ''));
  target_group public.prayer_groups%rowtype;
begin
  select *
  into target_group
  from public.prayer_groups pg
  where lower(pg.invitation_code) = normalized_code
  limit 1;

  if target_group.id is null then
    return;
  end if;

  insert into public.group_memberships (group_id, user_id, role)
  values (target_group.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return query
  select
    pg.id,
    pg.owner_id,
    pg.name,
    pg.invitation_code,
    pg.category,
    pg.rhythm,
    pg.accent_color,
    pg.created_at,
    pg.updated_at
  from public.prayer_groups pg
  where pg.id = target_group.id;
end;
$$;
