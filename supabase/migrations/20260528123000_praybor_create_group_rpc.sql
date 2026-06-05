create or replace function public.create_prayer_group(
  group_name text,
  group_category text default 'church',
  invite_code text default null
)
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
  current_user_id uuid := auth.uid();
  normalized_name text := nullif(btrim(coalesce(group_name, '')), '');
  normalized_category text := coalesce(nullif(btrim(group_category), ''), 'church');
  normalized_code text := lower(regexp_replace(btrim(coalesce(invite_code, '')), '^#', ''));
  created_group public.prayer_groups%rowtype;
begin
  if current_user_id is null then
    raise exception 'Please sign in before creating a group.';
  end if;

  if normalized_name is null then
    normalized_name := 'New Prayer Group';
  end if;

  if normalized_category not in ('church', 'friends', 'family', 'random', 'small_group') then
    normalized_category := 'church';
  end if;

  if normalized_code = '' then
    normalized_code := substring(replace(gen_random_uuid()::text, '-', '') from 1 for 7);
  end if;

  insert into public.profiles (id, created_at, updated_at)
  values (current_user_id, now(), now())
  on conflict (id) do update
    set updated_at = public.profiles.updated_at;

  insert into public.prayer_groups (
    owner_id,
    name,
    invitation_code,
    category,
    rhythm,
    accent_color
  )
  values (
    current_user_id,
    normalized_name,
    normalized_code,
    normalized_category,
    format('Invite code #%s', normalized_code),
    case normalized_category
      when 'church' then '#FFD8D4'
      when 'friends' then '#DDEDF5'
      when 'family' then '#E7F3DD'
      when 'random' then '#F6A5C4'
      when 'small_group' then '#FFF1CC'
      else '#FFD8D4'
    end
  )
  returning * into created_group;

  insert into public.group_memberships (group_id, user_id, role)
  values (created_group.id, current_user_id, 'owner')
  on conflict (group_id, user_id) do update
    set role = 'owner';

  return query
  select
    created_group.id,
    created_group.owner_id,
    created_group.name,
    created_group.invitation_code,
    created_group.category,
    created_group.rhythm,
    created_group.accent_color,
    created_group.created_at,
    created_group.updated_at;
exception
  when unique_violation then
    raise exception 'That invite code is already taken. Please try again.';
end;
$$;

grant execute on function public.create_prayer_group(text, text, text) to authenticated;
