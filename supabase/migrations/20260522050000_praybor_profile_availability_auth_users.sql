create or replace function public.check_profile_availability(
  check_nickname text,
  check_email text
)
returns table (
  nickname_available boolean,
  email_available boolean
)
language sql
security definer
set search_path = public
as $$
  with normalized as (
    select
      lower(btrim(check_nickname)) as nickname_value,
      lower(btrim(check_email)) as email_value
  )
  select
    not exists (
      select 1
      from public.profiles p, normalized n
      where lower(btrim(p.nickname)) = n.nickname_value
    ) as nickname_available,
    not exists (
      select 1
      from public.profiles p, normalized n
      where lower(btrim(p.email)) = n.email_value
    ) as email_available;
$$;

grant execute on function public.check_profile_availability(text, text) to anon, authenticated;
