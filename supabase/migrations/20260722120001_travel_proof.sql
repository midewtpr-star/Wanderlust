-- AppName — Phase 4: Travel Proof (driving + AI-scanned flight).
-- Apply with: supabase db push
--
-- Adds:
--   • PRIVATE `flight-itineraries` storage bucket (itineraries are sensitive PII, D6)
--     with RLS restricting reads to the uploader + that trip's admins.
--   • `airports` reference table (seed via scripts/seed-airports.mjs).
--   • travel_proofs.note + a unique (trip_id, user_id) index for upsert semantics.
--   • get_travel_status()          — non-PII per-member status for the status wall.
--   • admin_override_travel_proof() — admin manual verify (fail-path fallback).

-- ---------------------------------------------------------------------------
-- 1. PRIVATE flight-itineraries bucket
--    public = false → never readable via a public URL. Clients reach their own
--    file through a short-lived SIGNED URL (see lib/storage.ts). The verify-flight
--    edge function downloads with the service role (bypasses RLS).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('flight-itineraries', 'flight-itineraries', false, 15728640) -- 15 MB
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by Supabase; add bucket-scoped policies.
-- Object path layout: `<trip_id>/<user_id>/<timestamp>.<ext>` so folder[1]=trip_id,
-- folder[2]=user_id. The INSERT policy guarantees that layout, so downstream
-- policies can trust it.

-- UPLOAD: a trip MEMBER may write only into their own <trip_id>/<user_id>/ folder.
drop policy if exists "flight_itineraries_insert" on storage.objects;
create policy "flight_itineraries_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'flight-itineraries'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );

-- READ: the uploader OR one of that trip's admins (D6 — sensitive personal docs).
drop policy if exists "flight_itineraries_select" on storage.objects;
create policy "flight_itineraries_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'flight-itineraries'
    and (
      owner = auth.uid()
      or public.is_trip_admin(((storage.foldername(name))[1])::uuid)
    )
  );

-- UPDATE / DELETE: uploader only.
drop policy if exists "flight_itineraries_update" on storage.objects;
create policy "flight_itineraries_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'flight-itineraries' and owner = auth.uid())
  with check (bucket_id = 'flight-itineraries' and owner = auth.uid());

drop policy if exists "flight_itineraries_delete" on storage.objects;
create policy "flight_itineraries_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'flight-itineraries' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. airports — IATA → city + coordinates (seeded from OurAirports).
--    Read-only reference data. The verify-flight function resolves IATA with the
--    service role; authenticated read is allowed too (public airport info).
-- ---------------------------------------------------------------------------
create table if not exists airports (
  iata    text primary key,
  name    text,
  city    text,
  country text,
  lat     numeric not null,
  lng     numeric not null
);

alter table airports enable row level security;

drop policy if exists airports_select on airports;
create policy airports_select on airports for select to authenticated using (true);

grant select on airports to authenticated;

-- ---------------------------------------------------------------------------
-- 3. travel_proofs — add the optional driving `note` and a unique (trip_id,
--    user_id) index so one proof per member per trip can be upserted (re-uploads
--    replace, driving↔flight switches replace).
-- ---------------------------------------------------------------------------
alter table travel_proofs add column if not exists note text;

create unique index if not exists travel_proofs_trip_user_uidx
  on travel_proofs (trip_id, user_id);

-- ---------------------------------------------------------------------------
-- 4. get_travel_status(_trip_id) — SECURITY DEFINER so any trip MEMBER can see
--    every member's travel status WITHOUT exposing itinerary PII (D6). Returns
--    only user_id / type / verified — never passenger name, confirmation #, file.
-- ---------------------------------------------------------------------------
create or replace function public.get_travel_status(_trip_id uuid)
returns table (user_id uuid, type proof_type, verified boolean)
language sql security definer stable set search_path = public as $$
  select tp.user_id, tp.type, tp.verified
  from travel_proofs tp
  where tp.trip_id = _trip_id
    and public.is_trip_member(_trip_id);
$$;

grant execute on function public.get_travel_status(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. admin_override_travel_proof(_trip_id, _user_id) — SECURITY DEFINER admin
--    manual verify. Needed because marking ANOTHER member's member_steps row is
--    blocked by the self-only member_steps policy. Used on the flight FAIL path
--    (a proof row already exists; this flips it to verified) or to hand-verify a
--    member with no attempt yet (upserts a verified flight row).
-- ---------------------------------------------------------------------------
create or replace function public.admin_override_travel_proof(_trip_id uuid, _user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_trip_admin(_trip_id) then
    raise exception 'Only trip admins can override travel proof';
  end if;

  insert into travel_proofs (trip_id, user_id, type, verified, verified_at, verified_by)
  values (_trip_id, _user_id, 'flight', true, now(), auth.uid())
  on conflict (trip_id, user_id) do update
    set verified    = true,
        verified_at = now(),
        verified_by = auth.uid();

  insert into member_steps (trip_id, user_id, step, completed, completed_at)
  values (_trip_id, _user_id, 'travel_proof', true, now())
  on conflict (trip_id, user_id, step) do update
    set completed = true, completed_at = now();
end;
$$;

grant execute on function public.admin_override_travel_proof(uuid, uuid) to authenticated;
