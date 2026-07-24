-- Trippl — Release 2 · Profiles & Connections (B3). The outward-facing identity
-- layer + the friend graph. Apply: supabase db push
--
-- HARD RULES (enforced here, not just in the client):
--   * A profile is PRIVATE BY DEFAULT. Its world-facing fields are visible only to
--     the owner, to accepted connections, and (always, for trip function) to
--     co-trip-members. A PUBLIC profile is visible to any signed-in user.
--   * Being someone's connection NEVER grants access to their trips. Trip content
--     (chat / money / media / journal / member list) stays gated on trip_members,
--     exactly as before — connections and profile visibility do not touch it. Only
--     the passport SNAPSHOT (aggregates, no trip identifies) is shared outward, and
--     only per the same visibility rule.
--   * A block hides two users from each other on every WORLD surface, both
--     directions. (Block-inside-a-shared-trip is the stronger Phase 21 guarantee;
--     the seam is noted where it applies.)
--
-- All connection state transitions go through SECURITY DEFINER RPCs, so the table
-- itself needs only a read policy for the two parties — no direct writes.

create extension if not exists citext;

-- ---------------------------------------------------------------------------
-- 1. profiles — world-facing identity fields. handle is case-insensitively
--    unique; visibility gates who may read the row (see the updated select
--    policy below). Existing rows backfill to PRIVATE (privacy by default).
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists handle     citext;
alter table profiles add column if not exists bio        text;
alter table profiles add column if not exists home_city  text;
alter table profiles add column if not exists visibility text not null default 'private';

do $$ begin
  alter table profiles add constraint profiles_visibility_chk
    check (visibility in ('public', 'private'));
exception when duplicate_object then null; end $$;

do $$ begin
  -- lowercase letters, digits, underscore; 3–20 chars. citext keeps it unique
  -- case-insensitively; the format check keeps it canonical + link-safe.
  alter table profiles add constraint profiles_handle_format_chk
    check (handle is null or handle ~ '^[a-z0-9_]{3,20}$');
exception when duplicate_object then null; end $$;

create unique index if not exists idx_profiles_handle on profiles (handle) where handle is not null;
create index if not exists idx_profiles_visibility on profiles (visibility) where visibility = 'public';

-- ---------------------------------------------------------------------------
-- 2. connections — the friend graph. One row per unordered pair (the functional
--    unique index prevents both (A,B) and (B,A) existing). requester_id records
--    who initiated the CURRENT row; blocked_by records who set a block.
-- ---------------------------------------------------------------------------
create table if not exists connections (
  id           uuid primary key default gen_random_uuid(),
  requester_id uuid not null references profiles (id) on delete cascade,
  addressee_id uuid not null references profiles (id) on delete cascade,
  status       text not null default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  blocked_by   uuid references profiles (id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint connections_not_self check (requester_id <> addressee_id),
  -- blocked_by is set iff (and consistent with) status = 'blocked'
  constraint connections_block_consistent check ((status = 'blocked') = (blocked_by is not null))
);
-- exactly one row per unordered pair, regardless of who initiated
create unique index if not exists idx_connections_pair
  on connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists idx_connections_requester on connections (requester_id);
create index if not exists idx_connections_addressee on connections (addressee_id);

drop trigger if exists connections_set_updated_at on connections;
create trigger connections_set_updated_at before update on connections
  for each row execute function public.set_updated_at();

alter table connections enable row level security;
-- Parties may READ their own edges. All writes go through the RPCs below (which
-- run as SECURITY DEFINER and validate the transition) — no direct write policy.
drop policy if exists connections_select on connections;
create policy connections_select on connections for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
grant select on connections to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Relationship helper functions (SECURITY DEFINER + STABLE so RLS policies
--    can call them without recursing through connections' own RLS).
-- ---------------------------------------------------------------------------
create or replace function public.is_connected_with(_other uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from connections
    where status = 'accepted'
      and ((requester_id = auth.uid() and addressee_id = _other)
        or (requester_id = _other and addressee_id = auth.uid()))
  );
$$;

create or replace function public.has_block_with(_other uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from connections
    where status = 'blocked'
      and ((requester_id = auth.uid() and addressee_id = _other)
        or (requester_id = _other and addressee_id = auth.uid()))
  );
$$;

-- 'self' | 'connected' | 'outgoing' | 'incoming' | 'blocked' (I blocked them)
-- | 'blocked_by_them' | 'none'. Drives the profile action button.
create or replace function public.connection_state_with(_other uuid)
returns text language sql security definer stable set search_path = public as $$
  select case
    when _other = auth.uid() then 'self'
    when exists (select 1 from connections where status = 'blocked' and blocked_by = auth.uid()
        and ((requester_id = auth.uid() and addressee_id = _other)
          or (requester_id = _other and addressee_id = auth.uid()))) then 'blocked'
    when exists (select 1 from connections where status = 'blocked'
        and ((requester_id = auth.uid() and addressee_id = _other)
          or (requester_id = _other and addressee_id = auth.uid()))) then 'blocked_by_them'
    when public.is_connected_with(_other) then 'connected'
    when exists (select 1 from connections where status = 'pending'
        and requester_id = auth.uid() and addressee_id = _other) then 'outgoing'
    when exists (select 1 from connections where status = 'pending'
        and requester_id = _other and addressee_id = auth.uid()) then 'incoming'
    else 'none'
  end;
$$;

grant execute on function public.is_connected_with(uuid)   to authenticated;
grant execute on function public.has_block_with(uuid)      to authenticated;
grant execute on function public.connection_state_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Visibility-enforcing reads.
--    profiles: self OR co-trip-member (trip function, unconditional) OR — when
--    not blocked either way — a public profile or an accepted connection.
--    passport_stats: same rule (the snapshot is the outward-shareable artifact).
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated using (
  id = auth.uid()
  or public.shares_trip_with(id)
  or (not public.has_block_with(id)
      and (visibility = 'public' or public.is_connected_with(id)))
);

-- passport_stats was self-only (B2). Widen READ to the same visibility rule so a
-- viewable profile can show its owner's lifetime counters; writes stay self-only.
drop policy if exists passport_stats_self on passport_stats;
drop policy if exists passport_stats_read on passport_stats;
drop policy if exists passport_stats_write on passport_stats;
create policy passport_stats_read on passport_stats for select to authenticated using (
  user_id = auth.uid()
  or (not public.has_block_with(user_id)
      and exists (select 1 from profiles p where p.id = passport_stats.user_id
                  and (p.visibility = 'public' or public.is_connected_with(passport_stats.user_id))))
);
create policy passport_stats_insert on passport_stats for insert to authenticated
  with check (user_id = auth.uid());
create policy passport_stats_update on passport_stats for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy passport_stats_delete on passport_stats for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Connection state-transition RPCs. Each validates the caller + the current
--    state, then performs exactly one legal transition. SECURITY DEFINER so they
--    can write connections (which has no direct write policy).
-- ---------------------------------------------------------------------------

-- Send (or re-send) a pending request. No-op if already connected/pending; hard
-- error if either party has blocked the other.
create or replace function public.send_connection_request(_other uuid)
returns text language plpgsql security definer set search_path = public as $$
declare _me uuid := auth.uid();
begin
  if _me is null then raise exception 'not authenticated'; end if;
  if _other = _me then raise exception 'cannot connect to yourself'; end if;
  if not exists (select 1 from profiles where id = _other) then raise exception 'no such user'; end if;
  if public.has_block_with(_other) then raise exception 'blocked'; end if;

  -- accept-on-cross-request: if they already asked me, accept it instead
  if exists (select 1 from connections where status = 'pending'
      and requester_id = _other and addressee_id = _me) then
    update connections set status = 'accepted'
      where status = 'pending' and requester_id = _other and addressee_id = _me;
    return 'connected';
  end if;

  if public.is_connected_with(_other) then return 'connected'; end if;
  if exists (select 1 from connections where status = 'pending'
      and requester_id = _me and addressee_id = _other) then return 'outgoing'; end if;

  insert into connections (requester_id, addressee_id, status) values (_me, _other, 'pending');
  return 'outgoing';
end; $$;

-- Addressee responds to a pending request: accept it, or decline (delete it).
create or replace function public.respond_connection_request(_other uuid, _accept boolean)
returns text language plpgsql security definer set search_path = public as $$
declare _me uuid := auth.uid();
begin
  if _me is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from connections where status = 'pending'
      and requester_id = _other and addressee_id = _me) then
    raise exception 'no pending request';
  end if;
  if _accept then
    update connections set status = 'accepted'
      where status = 'pending' and requester_id = _other and addressee_id = _me;
    return 'connected';
  else
    delete from connections
      where status = 'pending' and requester_id = _other and addressee_id = _me;
    return 'none';
  end if;
end; $$;

-- Remove a connection or cancel an outgoing request (unfriend). Does not touch
-- blocks — use set_connection_block(..., false) to unblock.
create or replace function public.remove_connection(_other uuid)
returns text language plpgsql security definer set search_path = public as $$
declare _me uuid := auth.uid();
begin
  if _me is null then raise exception 'not authenticated'; end if;
  delete from connections
    where status in ('pending', 'accepted')
      and (least(requester_id, addressee_id) = least(_me, _other))
      and (greatest(requester_id, addressee_id) = greatest(_me, _other));
  return 'none';
end; $$;

-- Block or unblock. Block collapses any existing edge into a single blocked row
-- owned by the blocker; unblock (only by the blocker) removes it.
create or replace function public.set_connection_block(_other uuid, _blocked boolean)
returns text language plpgsql security definer set search_path = public as $$
declare _me uuid := auth.uid();
begin
  if _me is null then raise exception 'not authenticated'; end if;
  if _other = _me then raise exception 'cannot block yourself'; end if;

  if _blocked then
    delete from connections
      where least(requester_id, addressee_id) = least(_me, _other)
        and greatest(requester_id, addressee_id) = greatest(_me, _other);
    insert into connections (requester_id, addressee_id, status, blocked_by)
      values (_me, _other, 'blocked', _me);
    return 'blocked';
  else
    -- only the blocker can lift their block
    delete from connections
      where status = 'blocked' and blocked_by = _me
        and least(requester_id, addressee_id) = least(_me, _other)
        and greatest(requester_id, addressee_id) = greatest(_me, _other);
    return 'none';
  end if;
end; $$;

grant execute on function public.send_connection_request(uuid)          to authenticated;
grant execute on function public.respond_connection_request(uuid, boolean) to authenticated;
grant execute on function public.remove_connection(uuid)                to authenticated;
grant execute on function public.set_connection_block(uuid, boolean)    to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Discovery + read RPCs.
-- ---------------------------------------------------------------------------

-- Discovery search: PUBLIC profiles only (private ones are never discoverable),
-- excluding self + anyone blocked either way. Matches handle or display_name.
create or replace function public.search_profiles(_q text)
returns table (id uuid, display_name text, handle citext, avatar_url text, home_city text)
language sql security definer stable set search_path = public as $$
  select p.id, p.display_name, p.handle, p.avatar_url, p.home_city
  from profiles p
  where p.id <> auth.uid()
    and p.visibility = 'public'
    and not public.has_block_with(p.id)
    and (
      length(coalesce(_q, '')) >= 2
      and (p.handle ilike '%' || _q || '%' or p.display_name ilike '%' || _q || '%')
    )
  order by (p.handle ilike _q || '%') desc, p.display_name
  limit 30;
$$;

-- Shared-trip provenance for a profile I'm viewing. Only ever returns trips the
-- VIEWER is also a member of, so it can never leak a trip's existence. This is
-- "how we're connected", not trip content.
create or replace function public.get_profile_provenance(_other uuid)
returns table (trip_id uuid, title text, start_date date, end_date date)
language sql security definer stable set search_path = public as $$
  select t.id, t.title, t.start_date, t.end_date
  from trips t
  join trip_members m1 on m1.trip_id = t.id and m1.user_id = auth.uid()
  join trip_members m2 on m2.trip_id = t.id and m2.user_id = _other
  order by t.start_date desc nulls last
  limit 50;
$$;

-- Count of accepted connections two people have in common (number only — never
-- the list, to avoid leaking a private person's graph).
create or replace function public.mutual_connection_count(_other uuid)
returns integer language sql security definer stable set search_path = public as $$
  with mine as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as uid
    from connections where status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid())
  ), theirs as (
    select case when requester_id = _other then addressee_id else requester_id end as uid
    from connections where status = 'accepted' and (requester_id = _other or addressee_id = _other)
  )
  select count(*)::int from mine join theirs using (uid) where uid <> auth.uid() and uid <> _other;
$$;

-- My accepted connections, with the other party's basic identity + provenance
-- counts. (SECURITY DEFINER so a private connection's identity is still returned
-- to me — being connected already grants me that.)
create or replace function public.list_connections()
returns table (id uuid, display_name text, handle citext, avatar_url text, home_city text,
               visibility text, since timestamptz)
language sql security definer stable set search_path = public as $$
  select p.id, p.display_name, p.handle, p.avatar_url, p.home_city, p.visibility, c.updated_at
  from connections c
  join profiles p on p.id = case when c.requester_id = auth.uid() then c.addressee_id else c.requester_id end
  where c.status = 'accepted' and (c.requester_id = auth.uid() or c.addressee_id = auth.uid())
  order by c.updated_at desc;
$$;

-- Pending requests to/from me, with the other party's basic identity. A request
-- inherently reveals minimal identity ("this person asked to connect"), so this
-- returns it even for a private requester — but nothing beyond name/handle/avatar.
create or replace function public.list_connection_requests()
returns table (id uuid, display_name text, handle citext, avatar_url text,
               direction text, requested_at timestamptz)
language sql security definer stable set search_path = public as $$
  select p.id, p.display_name, p.handle, p.avatar_url,
         case when c.requester_id = auth.uid() then 'outgoing' else 'incoming' end as direction,
         c.created_at
  from connections c
  join profiles p on p.id = case when c.requester_id = auth.uid() then c.addressee_id else c.requester_id end
  where c.status = 'pending' and (c.requester_id = auth.uid() or c.addressee_id = auth.uid())
  order by c.created_at desc;
$$;

grant execute on function public.search_profiles(text)          to authenticated;
grant execute on function public.get_profile_provenance(uuid)   to authenticated;
grant execute on function public.mutual_connection_count(uuid)  to authenticated;
grant execute on function public.list_connections()             to authenticated;
grant execute on function public.list_connection_requests()     to authenticated;

comment on table connections is
  'The friend graph (Release 2 · B3). One row per unordered pair. All transitions via SECURITY DEFINER RPCs; a block hides both users on world surfaces. Connections never grant trip access.';
comment on column profiles.visibility is
  'private (default) | public. Gates who may read the row; trip co-members always can (trip function). Being a connection does not expose trips.';
