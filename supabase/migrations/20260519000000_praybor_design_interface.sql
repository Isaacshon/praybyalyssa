create extension if not exists "pgcrypto";

do $$
begin
  create type public.prayer_mood as enum (
    'joy',
    'excitement',
    'gratitude',
    'ordinary',
    'surprised',
    'uncomfortable',
    'exhausted',
    'afraid',
    'sad',
    'angry'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.prayer_visibility as enum ('public', 'group');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.prayer_identity as enum ('anonymous', 'real_name');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.prayer_reaction_type as enum ('prayer', 'amen', 'comfort', 'love');
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.prayer_fulfillment_status as enum (
    'much_better',
    'better',
    'waiting',
    'harder',
    'much_harder'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.tree_growth_stage as enum (
    'seed',
    'sprout',
    'small_plant',
    'young_tree',
    'fruiting_tree',
    'completed'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.tree_growth_event_type as enum (
    'prayer_posted',
    'reaction_given',
    'recap_completed'
  );
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.prayer_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null,
  invitation_code text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.group_memberships (
  group_id uuid not null references public.prayer_groups (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.prayer_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles (id) on delete cascade,
  group_id uuid references public.prayer_groups (id) on delete cascade,
  visibility public.prayer_visibility not null default 'public',
  identity public.prayer_identity not null default 'anonymous',
  mood public.prayer_mood not null,
  title text not null,
  body text not null,
  is_sensitive boolean not null default false,
  location_lat double precision,
  location_lng double precision,
  created_at timestamptz not null default now(),
  constraint prayer_posts_group_visibility_check check (
    (visibility = 'group' and group_id is not null)
    or (visibility = 'public' and group_id is null)
  ),
  constraint prayer_posts_location_check check (
    (location_lat is null and location_lng is null)
    or (
      location_lat between -90 and 90
      and location_lng between -180 and 180
    )
  )
);

create table if not exists public.prayer_reactions (
  prayer_id uuid not null references public.prayer_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction public.prayer_reaction_type not null,
  created_at timestamptz not null default now(),
  primary key (prayer_id, user_id)
);

create table if not exists public.prayer_reflections (
  prayer_id uuid not null references public.prayer_posts (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  status public.prayer_fulfillment_status not null,
  note text,
  created_at timestamptz not null default now(),
  primary key (prayer_id, author_id)
);

create table if not exists public.user_trees (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  species_id text not null,
  stage public.tree_growth_stage not null default 'seed',
  growth_points integer not null default 0,
  planted_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint user_trees_growth_points_check check (growth_points between 0 and 100)
);

create table if not exists public.tree_growth_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  tree_id uuid not null references public.user_trees (id) on delete cascade,
  event_type public.tree_growth_event_type not null,
  points integer not null,
  source_prayer_id uuid references public.prayer_posts (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists prayer_posts_public_location_idx
  on public.prayer_posts (visibility, created_at desc, location_lat, location_lng);

create index if not exists prayer_posts_group_idx
  on public.prayer_posts (group_id, created_at desc);

create index if not exists tree_growth_events_owner_idx
  on public.tree_growth_events (owner_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.prayer_groups enable row level security;
alter table public.group_memberships enable row level security;
alter table public.prayer_posts enable row level security;
alter table public.prayer_reactions enable row level security;
alter table public.prayer_reflections enable row level security;
alter table public.user_trees enable row level security;
alter table public.tree_growth_events enable row level security;

create policy "profiles are visible to authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "users manage their own profile"
  on public.profiles for all
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "users can view their group memberships"
  on public.group_memberships for select
  to authenticated
  using (user_id = auth.uid());

create policy "group members can view groups"
  on public.prayer_groups for select
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (
      select 1 from public.group_memberships gm
      where gm.group_id = prayer_groups.id and gm.user_id = auth.uid()
    )
  );

create policy "users can create groups"
  on public.prayer_groups for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "authors can create prayer posts"
  on public.prayer_posts for insert
  to authenticated
  with check (author_id = auth.uid());

create policy "authors can update their prayer posts"
  on public.prayer_posts for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "visible prayer posts can be read"
  on public.prayer_posts for select
  to authenticated
  using (
    visibility = 'public'
    or exists (
      select 1 from public.group_memberships gm
      where gm.group_id = prayer_posts.group_id and gm.user_id = auth.uid()
    )
  );

create policy "users can react as themselves"
  on public.prayer_reactions for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "users can replace their own reaction"
  on public.prayer_reactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reactions follow visible prayers"
  on public.prayer_reactions for select
  to authenticated
  using (
    exists (
      select 1 from public.prayer_posts pp
      where pp.id = prayer_reactions.prayer_id
        and (
          pp.visibility = 'public'
          or exists (
            select 1 from public.group_memberships gm
            where gm.group_id = pp.group_id and gm.user_id = auth.uid()
          )
        )
    )
  );

create policy "authors manage reflections"
  on public.prayer_reflections for all
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create policy "users manage their own trees"
  on public.user_trees for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "users manage their own tree events"
  on public.tree_growth_events for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
