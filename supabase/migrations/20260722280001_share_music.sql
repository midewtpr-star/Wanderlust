-- Trippl — Release 2 · Music on Shares (B6). Persists the CLEARED track a trip
-- chose for its share, with the trim + retained rights metadata. Apply: supabase db push
--
-- The catalogue itself is a swappable, operator-configured provider (cleared /
-- licensed only — never Spotify/Apple/commercial uploads); this table only stores
-- the CHOICE + rights, so the future video-recap export can bake it in. One music
-- choice per trip's recap; any member may set it (like the recap).

create table if not exists share_audio (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null unique references trips (id) on delete cascade,
  chosen_by     uuid references profiles (id) on delete set null,
  provider_id   text not null,          -- which catalogue provider it came from
  track_id      text not null,
  title         text not null,
  artist        text,
  license       text,                   -- retained rights metadata (kept with the export)
  trim_start_ms int not null default 0,
  trim_end_ms   int not null default 15000,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint share_audio_trim_ck check (trim_end_ms > trim_start_ms and trim_start_ms >= 0)
);

drop trigger if exists share_audio_set_updated_at on share_audio;
create trigger share_audio_set_updated_at before update on share_audio
  for each row execute function public.set_updated_at();

alter table share_audio enable row level security;
-- Any trip member reads; any member sets/changes/removes the trip's share music.
drop policy if exists share_audio_select on share_audio;
create policy share_audio_select on share_audio for select to authenticated
  using (public.is_trip_member(trip_id));
drop policy if exists share_audio_insert on share_audio;
create policy share_audio_insert on share_audio for insert to authenticated
  with check (public.is_trip_member(trip_id) and chosen_by = auth.uid());
drop policy if exists share_audio_update on share_audio;
create policy share_audio_update on share_audio for update to authenticated
  using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
drop policy if exists share_audio_delete on share_audio;
create policy share_audio_delete on share_audio for delete to authenticated
  using (public.is_trip_member(trip_id));
grant select, insert, update, delete on share_audio to authenticated;

comment on table share_audio is
  'The cleared track + trim + rights a trip chose for its share (Release 2 · B6). Catalogue is a swappable operator-configured provider; this stores only the choice, for the future video-recap export.';
