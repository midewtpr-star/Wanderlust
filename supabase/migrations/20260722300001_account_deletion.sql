-- Trippl — Deploy · ACCOUNT DELETION support. Apple requires in-app account
-- deletion. Deleting the auth user cascades their profile and most owned rows,
-- but two things must NOT be destroyed because other members depend on them:
--   1. Shared-pool contributions — keep the amount (so the group's money-in total
--      stays correct), just drop the personal link. Done by switching the FK from
--      ON DELETE CASCADE to ON DELETE SET NULL.
--   2. Trips the user HOSTS — hand the trip off to another admin/member so the
--      group keeps its trip. Done by reassign_hosted_trips(), called by the
--      delete-account edge function before it deletes the user.
-- Apply: supabase db push

-- (1) Anonymise shared contributions instead of deleting them.
alter table pool_contributions alter column user_id drop not null;
alter table pool_contributions drop constraint if exists pool_contributions_user_id_fkey;
alter table pool_contributions
  add constraint pool_contributions_user_id_fkey
  foreign key (user_id) references profiles (id) on delete set null;

comment on column pool_contributions.user_id is
  'The contributor. NULL after that member deletes their account — the amount is retained (pool money-in stays correct) but the personal link is dropped.';

-- (2) Hand off hosted trips to a survivor before the host is deleted. For every
--     trip the user hosts that still has ANOTHER member, move host to another
--     admin (preferred) or member. Solo trips are left alone → they cascade-delete
--     with the user, affecting no one else. SECURITY DEFINER + service_role-only.
create or replace function public.reassign_hosted_trips(_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare _n integer;
begin
  update trips t
  set host_id = coalesce(
    (select ta.user_id from trip_admins ta
       where ta.trip_id = t.id and ta.user_id <> _user order by ta.created_at limit 1),
    (select tm.user_id from trip_members tm
       where tm.trip_id = t.id and tm.user_id <> _user order by tm.joined_at limit 1)
  )
  where t.host_id = _user
    and exists (select 1 from trip_members tm where tm.trip_id = t.id and tm.user_id <> _user);
  get diagnostics _n = row_count;
  return _n;
end; $$;

revoke all on function public.reassign_hosted_trips(uuid) from public, anon, authenticated;
grant execute on function public.reassign_hosted_trips(uuid) to service_role;
