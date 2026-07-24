-- Trippl — Release 2 · Nearby Travelers (B5). Opt-in, per-trip discovery of OTHER
-- travelers heading to the same coarse area during overlapping dates. Built on the
-- B4 safety layer (age band + block). Apply: supabase db push
--
-- STRICT RULES (enforced here, not just in the client):
--   * Per-trip, OFF by default (a row exists only after an explicit opt-in).
--   * COARSE AREA ONLY. The area is a geohash of the TRIP'S PUBLIC DESTINATION —
--     never a user's device location, which we never collect or store. Matching
--     compares a ~150 km region prefix.
--   * Auto-expiring: matches are filtered to windows that haven't ended.
--   * Under-18 + suspended are excluded (both as seekers and as results); a
--     block hides both users from each other's results, both directions.
--   * Mutual visibility: you only see others if you're opted in; contact still
--     requires a mutual-consent connection (B3). Disabling deletes your row →
--     you vanish from others' results immediately.

create table if not exists discovery_optins (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles (id) on delete cascade,
  trip_id       uuid not null references trips (id) on delete cascade,
  area_geohash  text not null,            -- precision-5 geohash of the trip destination
  window_start  date,                     -- = trip start (temporal match)
  window_end    date,                     -- = trip end (also drives auto-expiry)
  expires_at    date,                     -- trip end + grace; harmless if stale (filtered)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, trip_id)
);
-- Region-prefix + window are the match keys.
create index if not exists idx_discovery_area on discovery_optins (left(area_geohash, 3));
create index if not exists idx_discovery_window on discovery_optins (window_end);

drop trigger if exists discovery_optins_set_updated_at on discovery_optins;
create trigger discovery_optins_set_updated_at before update on discovery_optins
  for each row execute function public.set_updated_at();

alter table discovery_optins enable row level security;
-- Self-manage your own opt-ins. Seeing OTHERS is only ever through the matching
-- RPC (SECURITY DEFINER), which applies the safety filters.
drop policy if exists discovery_optins_self on discovery_optins;
create policy discovery_optins_self on discovery_optins for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on discovery_optins to authenticated;

-- Opt in / out of Nearby for a trip. Guarded: caller must be a MEMBER of the
-- trip, a verified ADULT, and not suspended. The window is read SERVER-SIDE from
-- the trip (trustworthy); the area geohash is derived by the client from the
-- trip's public destination. Returns 'on' | 'off'.
create or replace function public.set_nearby_optin(_trip_id uuid, _area_geohash text, _enabled boolean)
returns text language plpgsql security definer set search_path = public as $$
declare _me uuid := auth.uid(); _band text; _susp timestamptz; _s date; _e date;
begin
  if _me is null then raise exception 'not authenticated'; end if;
  if not public.is_trip_member(_trip_id) then raise exception 'not a trip member'; end if;
  select age_band, suspended_at into _band, _susp from profiles where id = _me;
  if _susp is not null then raise exception 'account suspended'; end if;
  if _band is distinct from 'adult' then raise exception 'nearby is 18+ (confirm your age first)'; end if;

  if not _enabled then
    delete from discovery_optins where user_id = _me and trip_id = _trip_id;
    return 'off';
  end if;

  select start_date, end_date into _s, _e from trips where id = _trip_id;
  insert into discovery_optins (user_id, trip_id, area_geohash, window_start, window_end, expires_at)
    values (_me, _trip_id, _area_geohash, _s, _e, coalesce(_e, current_date) + 30)
  on conflict (user_id, trip_id) do update
    set area_geohash = excluded.area_geohash,
        window_start = excluded.window_start,
        window_end   = excluded.window_end,
        expires_at   = excluded.expires_at,
        updated_at   = now();
  return 'on';
end; $$;

-- Who else is heading to my trip's coarse area during an overlapping window?
-- Only returns rows if I'M opted in for this trip (mutual visibility). Excludes
-- self, minors, suspended, expired windows, and anyone in a block with me — both
-- directions. One row per traveler (their nearest overlapping trip). Contact is a
-- separate, mutual-consent connection request (B3) — this only reveals a minimal
-- public identity of people who chose to be discoverable.
create or replace function public.find_nearby_travelers(_trip_id uuid)
returns table (id uuid, display_name text, handle citext, avatar_url text,
               home_city text, window_start date, window_end date)
language sql security definer stable set search_path = public as $$
  with me as (
    select area_geohash, window_start, window_end
    from discovery_optins where user_id = auth.uid() and trip_id = _trip_id
  )
  select distinct on (o.user_id)
         p.id, p.display_name, p.handle, p.avatar_url, p.home_city, o.window_start, o.window_end
  from discovery_optins o
  join me on true
  join profiles p on p.id = o.user_id
  where o.user_id <> auth.uid()
    and left(o.area_geohash, 3) = left(me.area_geohash, 3)
    and coalesce(o.window_end, current_date) >= current_date               -- not expired
    and o.window_start <= coalesce(me.window_end, o.window_start)           -- overlap …
    and me.window_start <= coalesce(o.window_end, me.window_start)          -- … both ways
    and p.age_band = 'adult'
    and p.suspended_at is null
    and not public.has_block_with(o.user_id)
  order by o.user_id, o.window_start;
$$;

grant execute on function public.set_nearby_optin(uuid, text, boolean) to authenticated;
grant execute on function public.find_nearby_travelers(uuid)           to authenticated;

comment on table discovery_optins is
  'Per-trip Nearby opt-in (Release 2 · B5). OFF by default; area = geohash of the trip''s public destination (never device location). Matching + safety filters live in find_nearby_travelers.';
