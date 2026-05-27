alter table public.prayer_posts
  add column if not exists location_lat double precision,
  add column if not exists location_lng double precision;

do $$
begin
  alter table public.prayer_posts
    drop constraint if exists prayer_posts_location_check;

  alter table public.prayer_posts
    add constraint prayer_posts_location_check check (
      (location_lat is null and location_lng is null)
      or (
        location_lat between -90 and 90
        and location_lng between -180 and 180
      )
    );
end $$;

create table if not exists public.prayer_reports (
  id uuid primary key default gen_random_uuid(),
  prayer_id uuid not null references public.prayer_posts (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  reported_author_id uuid references public.profiles (id) on delete set null,
  reason text not null check (
    reason in (
      'harassment',
      'hate_or_abuse',
      'sexual_content',
      'violence_or_threat',
      'self_harm',
      'spam',
      'private_information',
      'other'
    )
  ),
  details text,
  status text not null default 'submitted' check (
    status in ('submitted', 'reviewing', 'resolved', 'dismissed')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (prayer_id, reporter_id)
);

create table if not exists public.blocked_prayer_authors (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_author_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_author_id),
  constraint blocked_prayer_authors_not_self_check check (blocker_id <> blocked_author_id)
);

create table if not exists public.account_deletion_requests (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'canceled', 'completed')),
  requested_at timestamptz not null default now(),
  scheduled_for timestamptz not null default now() + interval '24 hours',
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists prayer_reports_reporter_idx
  on public.prayer_reports (reporter_id, created_at desc);

create index if not exists prayer_reports_status_idx
  on public.prayer_reports (status, created_at desc);

create index if not exists blocked_prayer_authors_blocker_idx
  on public.blocked_prayer_authors (blocker_id);

create index if not exists account_deletion_requests_pending_idx
  on public.account_deletion_requests (status, scheduled_for)
  where status = 'pending';

alter table public.prayer_reports enable row level security;
alter table public.blocked_prayer_authors enable row level security;
alter table public.account_deletion_requests enable row level security;

drop policy if exists "users can create their own prayer reports" on public.prayer_reports;
create policy "users can create their own prayer reports"
  on public.prayer_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

drop policy if exists "users can view their own prayer reports" on public.prayer_reports;
create policy "users can view their own prayer reports"
  on public.prayer_reports for select
  to authenticated
  using (reporter_id = auth.uid());

drop policy if exists "users can update their own prayer reports" on public.prayer_reports;
create policy "users can update their own prayer reports"
  on public.prayer_reports for update
  to authenticated
  using (reporter_id = auth.uid())
  with check (reporter_id = auth.uid());

drop policy if exists "users manage their blocked prayer authors" on public.blocked_prayer_authors;
create policy "users manage their blocked prayer authors"
  on public.blocked_prayer_authors for all
  to authenticated
  using (blocker_id = auth.uid())
  with check (blocker_id = auth.uid());

drop policy if exists "users manage their account deletion request" on public.account_deletion_requests;
create policy "users manage their account deletion request"
  on public.account_deletion_requests for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "visible prayer posts can be read" on public.prayer_posts;
create policy "visible prayer posts can be read"
  on public.prayer_posts for select
  to authenticated
  using (
    (
      visibility = 'public'
      or exists (
        select 1 from public.group_memberships gm
        where gm.group_id = prayer_posts.group_id
          and gm.user_id = auth.uid()
      )
    )
    and not exists (
      select 1 from public.prayer_reports pr
      where pr.prayer_id = prayer_posts.id
        and pr.reporter_id = auth.uid()
    )
    and not exists (
      select 1 from public.blocked_prayer_authors b
      where b.blocker_id = auth.uid()
        and b.blocked_author_id = prayer_posts.author_id
    )
  );

drop policy if exists "users can react as themselves" on public.prayer_reactions;
create policy "users can react as themselves"
  on public.prayer_reactions for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.prayer_posts pp
      where pp.id = prayer_reactions.prayer_id
        and (
          pp.visibility = 'public'
          or exists (
            select 1 from public.group_memberships gm
            where gm.group_id = pp.group_id
              and gm.user_id = auth.uid()
          )
        )
        and not exists (
          select 1 from public.prayer_reports pr
          where pr.prayer_id = pp.id
            and pr.reporter_id = auth.uid()
        )
        and not exists (
          select 1 from public.blocked_prayer_authors b
          where b.blocker_id = auth.uid()
            and b.blocked_author_id = pp.author_id
        )
    )
  );

drop policy if exists "users can replace their own reaction" on public.prayer_reactions;
create policy "users can replace their own reaction"
  on public.prayer_reactions for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.prayer_posts pp
      where pp.id = prayer_reactions.prayer_id
        and (
          pp.visibility = 'public'
          or exists (
            select 1 from public.group_memberships gm
            where gm.group_id = pp.group_id
              and gm.user_id = auth.uid()
          )
        )
        and not exists (
          select 1 from public.prayer_reports pr
          where pr.prayer_id = pp.id
            and pr.reporter_id = auth.uid()
        )
        and not exists (
          select 1 from public.blocked_prayer_authors b
          where b.blocker_id = auth.uid()
            and b.blocked_author_id = pp.author_id
        )
    )
  );

drop policy if exists "reactions follow visible prayers" on public.prayer_reactions;
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
            where gm.group_id = pp.group_id
              and gm.user_id = auth.uid()
          )
        )
        and not exists (
          select 1 from public.prayer_reports pr
          where pr.prayer_id = pp.id
            and pr.reporter_id = auth.uid()
        )
        and not exists (
          select 1 from public.blocked_prayer_authors b
          where b.blocker_id = auth.uid()
            and b.blocked_author_id = pp.author_id
        )
    )
  );

create or replace function public.schedule_account_deletion()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.account_deletion_requests%rowtype;
begin
  insert into public.account_deletion_requests (
    user_id,
    status,
    requested_at,
    scheduled_for,
    canceled_at,
    updated_at
  )
  values (
    auth.uid(),
    'pending',
    now(),
    now() + interval '24 hours',
    null,
    now()
  )
  on conflict (user_id) do update
    set status = 'pending',
        requested_at = excluded.requested_at,
        scheduled_for = excluded.scheduled_for,
        canceled_at = null,
        updated_at = now()
  returning * into result;

  return result;
end;
$$;

create or replace function public.cancel_account_deletion()
returns public.account_deletion_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.account_deletion_requests%rowtype;
begin
  update public.account_deletion_requests
  set status = 'canceled',
      canceled_at = now(),
      updated_at = now()
  where user_id = auth.uid()
    and status = 'pending'
  returning * into result;

  return result;
end;
$$;
