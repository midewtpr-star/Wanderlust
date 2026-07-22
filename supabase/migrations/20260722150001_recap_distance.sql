-- AppName — Phase 9: Post-trip recap (collages + stats) + opt-in miles.
-- Apply with: supabase db push
--
-- Adds opt-in per-user distance tracking and loosens trip_recap writes to any
-- member (the built policy was admin-only; the recap is member-generated).

-- ---------------------------------------------------------------------------
-- 1. trip_distances — opt-in distance per user per trip. Location is sensitive
--    (foundation §12-5), so rows are SELF-ONLY; the group total is exposed only
--    as an aggregate via get_trip_distance_summary (never per-user values).
-- ---------------------------------------------------------------------------
create table if not exists trip_distances (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references trips (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  opted_in   boolean not null default false,
  meters     numeric not null default 0,
  updated_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

create index if not exists idx_trip_distances_trip on trip_distances (trip_id);

alter table trip_distances enable row level security;

drop policy if exists trip_distances_select on trip_distances;
create policy trip_distances_select on trip_distances for select to authenticated
  using (user_id = auth.uid());

drop policy if exists trip_distances_insert on trip_distances;
create policy trip_distances_insert on trip_distances for insert to authenticated
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));

drop policy if exists trip_distances_update on trip_distances;
create policy trip_distances_update on trip_distances for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update, delete on trip_distances to authenticated;

-- Aggregate only (no per-user distances leak). Gated to trip members.
create or replace function public.get_trip_distance_summary(_trip_id uuid)
returns table (total_meters numeric, tracked_count int, member_count int)
language plpgsql security definer stable set search_path = public as $$
begin
  if not public.is_trip_member(_trip_id) then
    return; -- no rows → caller treats as zero
  end if;
  return query
    select
      coalesce(sum(d.meters) filter (where d.opted_in and d.meters > 0), 0)::numeric,
      count(*) filter (where d.opted_in)::int,
      (select count(*)::int from trip_members m where m.trip_id = _trip_id)
    from trip_distances d
    where d.trip_id = _trip_id;
end;
$$;

grant execute on function public.get_trip_distance_summary(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. trip_recap — any MEMBER may generate/update the recap (was admin-only).
-- ---------------------------------------------------------------------------
drop policy if exists trip_recap_insert on trip_recap;
create policy trip_recap_insert on trip_recap for insert to authenticated
  with check (public.is_trip_member(trip_id));

drop policy if exists trip_recap_update on trip_recap;
create policy trip_recap_update on trip_recap for update to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
