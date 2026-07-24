-- AppName — Phase 1 schema (build-plan Phase 1).
-- Reconciled with docs/data-model.md. Column names follow the Phase-1 request;
-- types/FKs/enums added per docs conventions.
--
-- Money: docs specify integer cents; this migration uses numeric(12,2) to match the
-- requested *_amount/amount column names. numeric is EXACT (not float), satisfying the
-- docs' "never floats" rule.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type trip_status     as enum ('planning', 'locked', 'active', 'completed');
create type member_role     as enum ('host', 'admin', 'member');
create type rsvp_status     as enum ('going', 'maybe', 'not');
create type proof_type      as enum ('flight', 'driving');
create type pool_type       as enum ('airbnb', 'car');
create type step_key        as enum ('travel_proof', 'airbnb_paid', 'car_paid');
create type media_type      as enum ('photo', 'video', 'other');
create type device_platform as enum ('ios', 'android', 'web');

-- ---------------------------------------------------------------------------
-- 1. profiles — mirror of auth.users (auto-created by trigger; see migration 2)
-- ---------------------------------------------------------------------------
create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  full_name    text,                       -- stored/legal name for flight name-match (D6, later)
  phone        text,
  email        text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 2. trips — the central object / tenancy unit
-- ---------------------------------------------------------------------------
create table trips (
  id             uuid primary key default gen_random_uuid(),
  host_id        uuid not null references profiles (id) on delete cascade,
  title          text not null,
  cover_url      text,
  location_city  text,
  location_lat   numeric,
  location_lng   numeric,
  start_date     date,
  end_date       date,
  car_rental_ref text,                      -- link or confirmation number
  airbnb_pick    uuid,                      -- FK to airbnb_options added below (circular ref)
  status         trip_status not null default 'planning',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. trip_members — everyone on a trip (host/admin/member)
-- ---------------------------------------------------------------------------
create table trip_members (
  id        uuid primary key default gen_random_uuid(),
  trip_id   uuid not null references trips (id) on delete cascade,
  user_id   uuid not null references profiles (id) on delete cascade,
  role      member_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 4. trip_admins — elevated set, MAX 3 per trip (host included). Cap = trigger (migration 2).
-- ---------------------------------------------------------------------------
create table trip_admins (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references trips (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 5. invites — shareable join codes
-- ---------------------------------------------------------------------------
create table invites (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references trips (id) on delete cascade,
  code       text not null unique default substr(md5(gen_random_uuid()::text), 1, 12),
  invited_by uuid references profiles (id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. rsvps — soft commitment
-- ---------------------------------------------------------------------------
create table rsvps (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references trips (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  status       rsvp_status not null,
  responded_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 7. travel_proofs — hard confirm (flight or driving). Itinerary PII private to
--    owner + admins (D6); trip-wide "confirmed" surfaces via member_steps.
-- ---------------------------------------------------------------------------
create table travel_proofs (
  id                  uuid primary key default gen_random_uuid(),
  trip_id             uuid not null references trips (id) on delete cascade,
  user_id             uuid not null references profiles (id) on delete cascade,
  type                proof_type not null,
  passenger_name      text,
  confirmation_number text,
  arrival_airport     text,
  arrival_city        text,
  travel_dates        text,
  file_url            text,                 -- private flight-itineraries bucket (D6)
  verified            boolean not null default false,
  verified_at         timestamptz,
  verified_by         uuid references profiles (id) on delete set null,  -- admin override
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8. airbnb_options — GROUPPAD SEAM (D7). MVP: manual link + total cost. GroupPad
--    later feeds/supersedes this table and sets trips.airbnb_pick. Build nothing else here.
-- ---------------------------------------------------------------------------
create table airbnb_options (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references trips (id) on delete cascade,
  added_by   uuid references profiles (id) on delete set null,
  title      text,
  url        text,
  total_cost numeric(12,2),
  image_url  text,
  notes      text,
  created_at timestamptz not null default now()
);

-- 9. airbnb_votes — one vote per user per trip (trip_id denormalized to enforce that)
create table airbnb_votes (
  id         uuid primary key default gen_random_uuid(),
  option_id  uuid not null references airbnb_options (id) on delete cascade,
  trip_id    uuid not null references trips (id) on delete cascade,  -- denormalized for the unique + RLS
  user_id    uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (trip_id, user_id)
);

-- ---------------------------------------------------------------------------
-- 10. money_pools — ledger (airbnb always; car when trips.car_rental_ref set)
-- ---------------------------------------------------------------------------
create table money_pools (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references trips (id) on delete cascade,
  type              pool_type not null,
  total_amount      numeric(12,2),
  per_person_amount numeric(12,2),
  unlock_date       date,
  created_at        timestamptz not null default now(),
  unique (trip_id, type)
);

-- 11. pool_contributions — ledger only (no custody). trip_id denormalized for RLS.
create table pool_contributions (
  id             uuid primary key default gen_random_uuid(),
  pool_id        uuid not null references money_pools (id) on delete cascade,
  trip_id        uuid not null references trips (id) on delete cascade,
  user_id        uuid not null references profiles (id) on delete cascade,
  amount         numeric(12,2) not null,
  contributed_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 12. personal_safes — private personal savings (self-only)
-- ---------------------------------------------------------------------------
create table personal_safes (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips (id) on delete cascade,
  user_id     uuid not null references profiles (id) on delete cascade,
  goal_amount numeric(12,2),
  unlock_date date,
  created_at  timestamptz not null default now(),
  unique (trip_id, user_id)
);

-- 13. safe_deposits — ledger only. user_id denormalized so RLS stays self-only.
create table safe_deposits (
  id           uuid primary key default gen_random_uuid(),
  safe_id      uuid not null references personal_safes (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  amount       numeric(12,2) not null,
  deposited_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 14. member_steps — drives the verified badge
-- ---------------------------------------------------------------------------
create table member_steps (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references trips (id) on delete cascade,
  user_id      uuid not null references profiles (id) on delete cascade,
  step         step_key not null,
  completed    boolean not null default false,
  completed_at timestamptz,
  unique (trip_id, user_id, step)
);

-- ---------------------------------------------------------------------------
-- 15. activities
-- ---------------------------------------------------------------------------
create table activities (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references trips (id) on delete cascade,
  created_by    uuid references profiles (id) on delete set null,
  title         text not null,
  description   text,
  scheduled_for timestamptz,
  location      text,
  created_at    timestamptz not null default now()
);

-- 16. activity_media — mixed media (trip_id denormalized for RLS)
create table activity_media (
  id          uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities (id) on delete cascade,
  trip_id     uuid not null references trips (id) on delete cascade,
  uploaded_by uuid references profiles (id) on delete set null,
  media_type  media_type not null,
  url         text,
  caption     text,
  created_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 17. trip_recap — one per trip (collages + stats; montage is Phase 2)
-- ---------------------------------------------------------------------------
create table trip_recap (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null unique references trips (id) on delete cascade,
  generated_at timestamptz,
  stats        jsonb,                       -- { places_visited, miles_covered, checklist_completed }
  collage_url  text,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 18. push_tokens — self-only
-- ---------------------------------------------------------------------------
create table push_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles (id) on delete cascade,
  token      text not null,
  platform   device_platform,
  created_at timestamptz not null default now(),
  unique (user_id, token)
);

-- ---------------------------------------------------------------------------
-- Circular FK: trips.airbnb_pick -> airbnb_options (added after both exist)
-- ---------------------------------------------------------------------------
alter table trips
  add constraint trips_airbnb_pick_fkey
  foreign key (airbnb_pick) references airbnb_options (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Indexes (FKs used by RLS / lookups)
-- ---------------------------------------------------------------------------
create index idx_trip_members_user      on trip_members (user_id);
create index idx_trip_members_trip      on trip_members (trip_id);
create index idx_trip_admins_trip       on trip_admins (trip_id);
create index idx_trips_host             on trips (host_id);
create index idx_rsvps_trip             on rsvps (trip_id);
create index idx_travel_proofs_trip     on travel_proofs (trip_id);
create index idx_airbnb_options_trip    on airbnb_options (trip_id);
create index idx_airbnb_votes_trip      on airbnb_votes (trip_id);
create index idx_money_pools_trip       on money_pools (trip_id);
create index idx_pool_contribs_pool     on pool_contributions (pool_id);
create index idx_pool_contribs_trip     on pool_contributions (trip_id);
create index idx_safe_deposits_safe     on safe_deposits (safe_id);
create index idx_member_steps_trip      on member_steps (trip_id);
create index idx_activities_trip        on activities (trip_id);
create index idx_activity_media_trip    on activity_media (trip_id);
create index idx_push_tokens_user       on push_tokens (user_id);

-- ---------------------------------------------------------------------------
-- Table comments (notably the GroupPad seam)
-- ---------------------------------------------------------------------------
comment on table airbnb_options is 'GroupPad seam (D7): manual Airbnb options in MVP. GroupPad later feeds/supersedes this and sets trips.airbnb_pick. Do not build the rental engine here.';
comment on table airbnb_votes  is 'GroupPad seam (D7): one vote per user per trip; admins lock the pick via trips.airbnb_pick.';
comment on column trips.airbnb_pick is 'Locked official Airbnb pick (admins only). GroupPad seam endpoint (D7).';
