-- Trippl — Release 2 · Travel Passport (B2). A lifetime, DERIVED-ONLY record: no
-- new user input. The counters are computed from existing data (completed trips,
-- activities, verified flight proofs, opt-in distances) matched against the curated
-- landmark reference table seeded here. Apply: supabase db push
--
-- The passport lives on a WORLD surface (B1) — it is shareable outward, never
-- carrying trip-private content (chat/money/media/journal stay inside the trip).

-- ---------------------------------------------------------------------------
-- 1. landmarks — a curated reference set. Activities are matched to these by name
--    to count "landmarks visited". Publicly readable (reference data, no PII).
-- ---------------------------------------------------------------------------
create table if not exists landmarks (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  aliases      text[] not null default '{}', -- extra names activities might use
  country_code text not null,                -- ISO-3166 alpha-2
  lat          numeric not null,
  lng          numeric not null,
  created_at   timestamptz not null default now()
);
create index if not exists idx_landmarks_name on landmarks (lower(name));

alter table landmarks enable row level security;
drop policy if exists landmarks_select on landmarks;
create policy landmarks_select on landmarks for select to authenticated, anon using (true);
grant select on landmarks to authenticated, anon;

insert into landmarks (name, aliases, country_code, lat, lng) values
  ('Hollywood Sign', '{"Hollywood"}', 'US', 34.1341, -118.3215),
  ('Griffith Observatory', '{"Griffith"}', 'US', 34.1184, -118.3004),
  ('Santa Monica Pier', '{"Santa Monica"}', 'US', 34.0094, -118.4973),
  ('Golden Gate Bridge', '{}', 'US', 37.8199, -122.4783),
  ('Statue of Liberty', '{}', 'US', 40.6892, -74.0445),
  ('Times Square', '{}', 'US', 40.7580, -73.9855),
  ('Grand Canyon', '{}', 'US', 36.1070, -112.1130),
  ('Space Needle', '{}', 'US', 47.6205, -122.3493),
  ('Walt Disney World', '{"Disney World"}', 'US', 28.3852, -81.5639),
  ('Las Vegas Strip', '{"The Strip"}', 'US', 36.1147, -115.1728),
  ('CN Tower', '{}', 'CA', 43.6426, -79.3871),
  ('Chichen Itza', '{}', 'MX', 20.6843, -88.5678),
  ('Christ the Redeemer', '{}', 'BR', -22.9519, -43.2105),
  ('Machu Picchu', '{}', 'PE', -13.1631, -72.5450),
  ('Eiffel Tower', '{"Tour Eiffel"}', 'FR', 48.8584, 2.2945),
  ('Louvre', '{"Louvre Museum"}', 'FR', 48.8606, 2.3376),
  ('Colosseum', '{"Rome Colosseum"}', 'IT', 41.8902, 12.4922),
  ('Leaning Tower of Pisa', '{"Pisa"}', 'IT', 43.7230, 10.3966),
  ('Sagrada Familia', '{}', 'ES', 41.4036, 2.1744),
  ('Big Ben', '{"Elizabeth Tower"}', 'GB', 51.5007, -0.1246),
  ('London Eye', '{}', 'GB', 51.5033, -0.1195),
  ('Brandenburg Gate', '{}', 'DE', 52.5163, 13.3777),
  ('Acropolis', '{"Parthenon"}', 'GR', 37.9715, 23.7257),
  ('Colosseum of Amsterdam', '{"Amsterdam"}', 'NL', 52.3676, 4.9041),
  ('Sydney Opera House', '{}', 'AU', -33.8568, 151.2153),
  ('Great Barrier Reef', '{}', 'AU', -18.2871, 147.6992),
  ('Burj Khalifa', '{}', 'AE', 25.1972, 55.2744),
  ('Taj Mahal', '{}', 'IN', 27.1751, 78.0421),
  ('Great Wall of China', '{"Great Wall"}', 'CN', 40.4319, 116.5704),
  ('Tokyo Tower', '{}', 'JP', 35.6586, 139.7454),
  ('Mount Fuji', '{"Fuji"}', 'JP', 35.3606, 138.7274),
  ('Marina Bay Sands', '{}', 'SG', 1.2834, 103.8607),
  ('Petronas Towers', '{}', 'MY', 3.1579, 101.7116),
  ('Table Mountain', '{}', 'ZA', -33.9628, 18.4098),
  ('Pyramids of Giza', '{"Giza"}', 'EG', 29.9792, 31.1342),
  ('Angkor Wat', '{}', 'KH', 13.4125, 103.8670),
  ('Blue Lagoon', '{}', 'IS', 63.8804, -22.4495),
  ('Niagara Falls', '{}', 'US', 43.0962, -79.0377),
  ('Bali Rice Terraces', '{"Bali"}', 'ID', -8.4095, 115.1889),
  ('Santorini', '{"Oia"}', 'GR', 36.4618, 25.3753)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. passport_stats — a MATERIALIZED snapshot of a user's lifetime counters,
--    refreshed by the client after computing them live (so deleting a trip lowers
--    the counts on the next recompute). Self-owned; the passport is shared as an
--    image, never by reading this row.
-- ---------------------------------------------------------------------------
create table if not exists passport_stats (
  user_id     uuid primary key references profiles (id) on delete cascade,
  trips       int not null default 0,
  places      int not null default 0,
  countries   int not null default 0,
  continents  int not null default 0,
  airports    int not null default 0,
  landmarks   int not null default 0,
  miles       int not null default 0,
  days        int not null default 0,
  started_on  date,
  updated_at  timestamptz not null default now()
);

alter table passport_stats enable row level security;
drop policy if exists passport_stats_self on passport_stats;
create policy passport_stats_self on passport_stats for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on passport_stats to authenticated;

comment on table landmarks is
  'Curated landmark reference set (Release 2 · Passport). Activities are name-matched to these.';
comment on table passport_stats is
  'Materialized snapshot of a user''s lifetime passport counters (derived-only). Self-owned.';
