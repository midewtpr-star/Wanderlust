-- Trippl — Shared bring list (group packing/supplies), promoted on request.
-- A claimable per-trip checklist of what the group needs. Apply: supabase db push

-- priority: essentials stand out from nice-to-haves.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'bring_priority') then
    create type bring_priority as enum ('needed', 'optional');
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. bring_items — things the group needs; any member may add.
-- ---------------------------------------------------------------------------
create table if not exists bring_items (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references trips (id) on delete cascade,
  created_by uuid not null references profiles (id) on delete cascade,
  name       text not null,
  category   text,                                  -- gear | food | docs | misc (free text)
  priority   bring_priority not null default 'optional',
  quantity   int,                                   -- optional target count
  notes      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_bring_items_trip on bring_items (trip_id);

-- ---------------------------------------------------------------------------
-- 2. bring_claims — who's bringing what. MULTIPLE claimers per item allowed
--    (two people can each bring a speaker); one row per (item, user) — a
--    re-claim updates the quantity. trip_id denormalized for RLS.
-- ---------------------------------------------------------------------------
create table if not exists bring_claims (
  id         uuid primary key default gen_random_uuid(),
  item_id    uuid not null references bring_items (id) on delete cascade,
  trip_id    uuid not null references trips (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  quantity   int,
  claimed_at timestamptz not null default now(),
  unique (item_id, user_id)
);
create index if not exists idx_bring_claims_item on bring_claims (item_id);
create index if not exists idx_bring_claims_trip on bring_claims (trip_id);

-- RLS ---------------------------------------------------------------------------
alter table bring_items  enable row level security;
alter table bring_claims enable row level security;

-- items: members read; members add; creator OR admin edits/deletes.
drop policy if exists bring_items_select on bring_items;
create policy bring_items_select on bring_items for select to authenticated
  using (public.is_trip_member(trip_id));
drop policy if exists bring_items_insert on bring_items;
create policy bring_items_insert on bring_items for insert to authenticated
  with check (public.is_trip_member(trip_id) and created_by = auth.uid());
drop policy if exists bring_items_update on bring_items;
create policy bring_items_update on bring_items for update to authenticated
  using (created_by = auth.uid() or public.is_trip_admin(trip_id))
  with check (created_by = auth.uid() or public.is_trip_admin(trip_id));
drop policy if exists bring_items_delete on bring_items;
create policy bring_items_delete on bring_items for delete to authenticated
  using (created_by = auth.uid() or public.is_trip_admin(trip_id));

-- claims: members read; you claim/unclaim only for YOURSELF.
drop policy if exists bring_claims_select on bring_claims;
create policy bring_claims_select on bring_claims for select to authenticated
  using (public.is_trip_member(trip_id));
drop policy if exists bring_claims_insert on bring_claims;
create policy bring_claims_insert on bring_claims for insert to authenticated
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());
drop policy if exists bring_claims_update on bring_claims;
create policy bring_claims_update on bring_claims for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists bring_claims_delete on bring_claims;
create policy bring_claims_delete on bring_claims for delete to authenticated
  using (user_id = auth.uid());

-- New tables → explicit grants (Phase-1 blanket grant predates them).
grant select, insert, update, delete on bring_items to authenticated;
grant select, insert, update, delete on bring_claims to authenticated;

comment on table bring_items is
  'Shared bring list (promoted feature): claimable per-trip packing/supplies. Members add; creator/admin edit/delete.';
comment on table bring_claims is
  'Who is bringing a bring_item; multiple claimers allowed, one row per (item,user).';
