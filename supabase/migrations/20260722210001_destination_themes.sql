-- Trippl — Destination themes. Each trip's UI is themed to its destination.
-- The theme drives only the ACCENT layer inside a trip; neutrals + global chrome
-- stay Trippl. Apply with: supabase db push

-- ---------------------------------------------------------------------------
-- 1. trips.theme — the generated palette + motif, cached once per trip.
--    { primary, secondary, surface_tint, motif, source } where source is
--    'cover_image' | 'curated' | 'generated'. Set by host/admin (or lazily
--    cached on first load). NULL = no theme yet → default Trippl accent.
-- ---------------------------------------------------------------------------
alter table trips add column if not exists theme jsonb;

-- ---------------------------------------------------------------------------
-- 2. Per-member opt-out for a trip (destination theming is ON by default).
-- ---------------------------------------------------------------------------
alter table trip_members
  add column if not exists use_destination_theme boolean not null default true;

-- ---------------------------------------------------------------------------
-- 3. Global user override: "always use my own accent" (wins everywhere).
-- ---------------------------------------------------------------------------
alter table profiles
  add column if not exists force_own_accent boolean not null default false;

-- ---------------------------------------------------------------------------
-- 4. save_trip_theme — cache/set a trip's theme. Admins may set/overwrite
--    (regenerate); a plain member may only fill it when still NULL (lazy
--    first-load cache), never clobber an admin-chosen theme. SECURITY DEFINER
--    so the member lazy-cache path doesn't need the admin-only trips UPDATE.
-- ---------------------------------------------------------------------------
create or replace function public.save_trip_theme(_trip_id uuid, _theme jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if public.is_trip_admin(_trip_id) then
    update trips set theme = _theme, updated_at = now() where id = _trip_id;
  elsif public.is_trip_member(_trip_id) then
    update trips set theme = _theme, updated_at = now()
     where id = _trip_id and theme is null;
  end if;
end;
$$;

grant execute on function public.save_trip_theme(uuid, jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. set_trip_theme_pref — a member toggles ONLY their own per-trip opt-out.
--    (trip_members UPDATE is otherwise admin-only; this keeps role changes out.)
-- ---------------------------------------------------------------------------
create or replace function public.set_trip_theme_pref(_trip_id uuid, _use boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update trip_members set use_destination_theme = _use
   where trip_id = _trip_id and user_id = auth.uid();
end;
$$;

grant execute on function public.set_trip_theme_pref(uuid, boolean) to authenticated;

comment on column trips.theme is
  'Destination theme { primary, secondary, surface_tint, motif, source }. Drives the accent layer inside the trip only; neutrals stay Trippl. Cached once (save_trip_theme).';
