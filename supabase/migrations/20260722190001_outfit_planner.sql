-- Trippl — Outfit planner (Pinterest-powered), promoted from the backlog on request.
-- Link/pin-based outfit boards. Apply with: supabase db push
--
-- Uploaded item images REUSE the existing PRIVATE `trip-media` bucket
-- (`<trip_id>/<user_id>/…`, member-read via signed URLs) — no new bucket needed.
-- Pinterest/link items store a remote preview image URL (public CDN) directly.

-- ---------------------------------------------------------------------------
-- 1. outfits — one member's look for a trip, optionally tied to a day/activity.
-- ---------------------------------------------------------------------------
create table if not exists outfits (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips (id) on delete cascade,
  owner_id    uuid not null references profiles (id) on delete cascade,
  title       text not null,
  day         date,                                              -- optional trip day
  activity_id uuid references activities (id) on delete set null, -- optional link
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_outfits_trip on outfits (trip_id);

-- ---------------------------------------------------------------------------
-- 2. outfit_items — the moodboard cards. owner_id + trip_id denormalized for RLS.
--    image_url is a remote URL (pinterest/link) OR a private trip-media PATH
--    when provider='upload' (sign to view).
-- ---------------------------------------------------------------------------
create table if not exists outfit_items (
  id         uuid primary key default gen_random_uuid(),
  outfit_id  uuid not null references outfits (id) on delete cascade,
  trip_id    uuid not null references trips (id) on delete cascade,
  owner_id   uuid not null references profiles (id) on delete cascade,
  source_url text,                                    -- original pin/site link (null for uploads)
  image_url  text,                                    -- remote preview URL, or trip-media path (upload)
  title      text,
  provider   text not null default 'link',            -- 'pinterest' | 'link' | 'upload'
  position   int  not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_outfit_items_outfit on outfit_items (outfit_id, position);

-- ---------------------------------------------------------------------------
-- 3. outfit_reactions — lightweight "love" (one per member per outfit).
-- ---------------------------------------------------------------------------
create table if not exists outfit_reactions (
  id         uuid primary key default gen_random_uuid(),
  outfit_id  uuid not null references outfits (id) on delete cascade,
  trip_id    uuid not null references trips (id) on delete cascade,
  user_id    uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (outfit_id, user_id)
);
create index if not exists idx_outfit_reactions_outfit on outfit_reactions (outfit_id);

-- ---------------------------------------------------------------------------
-- 4. link_previews — server-side cache of fetched pin/link previews. Written by
--    the `link-preview` edge function (service role); clients read-only.
-- ---------------------------------------------------------------------------
create table if not exists link_previews (
  url        text primary key,
  title      text,
  image_url  text,
  author     text,
  provider   text,
  fetched_at timestamptz not null default now()
);

-- RLS ---------------------------------------------------------------------------
alter table outfits          enable row level security;
alter table outfit_items     enable row level security;
alter table outfit_reactions enable row level security;
alter table link_previews    enable row level security;

-- outfits: any member reads; you create/edit/delete only your OWN.
drop policy if exists outfits_select on outfits;
create policy outfits_select on outfits for select to authenticated
  using (public.is_trip_member(trip_id));
drop policy if exists outfits_insert on outfits;
create policy outfits_insert on outfits for insert to authenticated
  with check (public.is_trip_member(trip_id) and owner_id = auth.uid());
drop policy if exists outfits_update on outfits;
create policy outfits_update on outfits for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists outfits_delete on outfits;
create policy outfits_delete on outfits for delete to authenticated
  using (owner_id = auth.uid());

-- outfit_items: any member reads; you may add items only to YOUR OWN outfit.
drop policy if exists outfit_items_select on outfit_items;
create policy outfit_items_select on outfit_items for select to authenticated
  using (public.is_trip_member(trip_id));
drop policy if exists outfit_items_insert on outfit_items;
create policy outfit_items_insert on outfit_items for insert to authenticated
  with check (
    owner_id = auth.uid()
    and public.is_trip_member(trip_id)
    and exists (
      select 1 from outfits o
       where o.id = outfit_id
         and o.owner_id = auth.uid()
         and o.trip_id = outfit_items.trip_id
    )
  );
drop policy if exists outfit_items_update on outfit_items;
create policy outfit_items_update on outfit_items for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
drop policy if exists outfit_items_delete on outfit_items;
create policy outfit_items_delete on outfit_items for delete to authenticated
  using (owner_id = auth.uid());

-- outfit_reactions: any member reads (hearts count); you toggle only your own.
drop policy if exists outfit_reactions_select on outfit_reactions;
create policy outfit_reactions_select on outfit_reactions for select to authenticated
  using (public.is_trip_member(trip_id));
drop policy if exists outfit_reactions_insert on outfit_reactions;
create policy outfit_reactions_insert on outfit_reactions for insert to authenticated
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());
drop policy if exists outfit_reactions_delete on outfit_reactions;
create policy outfit_reactions_delete on outfit_reactions for delete to authenticated
  using (user_id = auth.uid());

-- link_previews: readable by any signed-in user (public preview metadata);
-- writes happen only via the edge function's service role (no client write policy).
drop policy if exists link_previews_select on link_previews;
create policy link_previews_select on link_previews for select to authenticated
  using (true);

-- New tables → explicit grants (Phase-1 blanket grant predates them).
grant select, insert, update, delete on outfits to authenticated;
grant select, insert, update, delete on outfit_items to authenticated;
grant select, insert, delete on outfit_reactions to authenticated;
grant select on link_previews to authenticated;
-- The link-preview edge function (service role) populates the cache.
grant select, insert, update on link_previews to service_role;

comment on table outfits is
  'Outfit planner (promoted backlog item): per-member outfit boards, optionally tied to a trip day/activity.';
comment on column outfit_items.image_url is
  'Remote preview image URL (pinterest/link) OR a private trip-media storage PATH when provider=upload (sign to view).';
comment on table link_previews is
  'Server-side cache of pin/link previews, written by the link-preview edge function (service role).';
