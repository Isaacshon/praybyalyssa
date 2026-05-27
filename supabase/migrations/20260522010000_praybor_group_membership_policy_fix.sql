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
