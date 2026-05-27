drop index if exists tree_growth_events_one_public_day_idx;

create unique index if not exists tree_growth_events_one_growth_day_idx
  on public.tree_growth_events (owner_id, occurred_on)
  where event_type in ('prayer_posted', 'reaction_given');
