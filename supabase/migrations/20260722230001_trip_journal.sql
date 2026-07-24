-- Trippl — Release 2 · Phase 18: Trip Journal.
-- Long-form, mixed-media trip diary. Entries are trip-scoped and authored by a
-- member; each entry can carry many photos/videos. Apply: supabase db push
--
-- Storage: REUSES the existing private `trip-media` bucket (Phase 8) and its
-- signed-URL reads + membership RLS — no new bucket. journal_media.url is a
-- `<trip_id>/<user_id>/…` path in that bucket.

-- ---------------------------------------------------------------------------
-- 1. journal_entries — one diary entry. Text-only and media-only are BOTH valid,
--    so `body` may be empty (the app requires text OR at least one media item).
--    `day` (optional) pins the entry to a trip day; `activity_id` (optional)
--    links it to an activity — both drive the timeline filters.
-- ---------------------------------------------------------------------------
create table if not exists journal_entries (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references trips (id) on delete cascade,
  author_id   uuid not null references profiles (id) on delete cascade,
  body        text not null default '',
  day         date,                                        -- optional: a specific trip day
  activity_id uuid references activities (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_journal_entries_trip on journal_entries (trip_id, created_at desc);
create index if not exists idx_journal_entries_day on journal_entries (trip_id, day);
create index if not exists idx_journal_entries_activity on journal_entries (activity_id);

create trigger set_journal_entries_updated_at before update on public.journal_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 2. journal_media — photos/videos attached to an entry, ordered by `position`.
--    trip_id + uploaded_by are denormalized for RLS + storage-path checks. url is
--    a PRIVATE trip-media path (view via a signed URL, like activity_media).
-- ---------------------------------------------------------------------------
create table if not exists journal_media (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references journal_entries (id) on delete cascade,
  trip_id     uuid not null references trips (id) on delete cascade,
  uploaded_by uuid not null references profiles (id) on delete cascade,
  media_type  text not null check (media_type in ('photo', 'video')),
  url         text not null,                               -- private trip-media path
  position    int  not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists idx_journal_media_entry on journal_media (entry_id, position);
create index if not exists idx_journal_media_trip on journal_media (trip_id);

-- RLS ---------------------------------------------------------------------------
alter table journal_entries enable row level security;
alter table journal_media   enable row level security;

-- entries: any trip MEMBER reads; a member authors their OWN; author edits/deletes
-- only their own (no admin override — a journal is personal authorship).
drop policy if exists journal_entries_select on journal_entries;
create policy journal_entries_select on journal_entries for select to authenticated
  using (public.is_trip_member(trip_id));
drop policy if exists journal_entries_insert on journal_entries;
create policy journal_entries_insert on journal_entries for insert to authenticated
  with check (public.is_trip_member(trip_id) and author_id = auth.uid());
drop policy if exists journal_entries_update on journal_entries;
create policy journal_entries_update on journal_entries for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());
drop policy if exists journal_entries_delete on journal_entries;
create policy journal_entries_delete on journal_entries for delete to authenticated
  using (author_id = auth.uid());

-- media: any trip member reads (media is shared trip-wide, like activity_media);
-- the ENTRY'S AUTHOR attaches/removes media on their own entry (checked via a
-- subquery against journal_entries.author_id), and only for themselves.
drop policy if exists journal_media_select on journal_media;
create policy journal_media_select on journal_media for select to authenticated
  using (public.is_trip_member(trip_id));
drop policy if exists journal_media_insert on journal_media;
create policy journal_media_insert on journal_media for insert to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.is_trip_member(trip_id)
    and exists (
      select 1 from journal_entries e
      where e.id = entry_id and e.author_id = auth.uid()
    )
  );
drop policy if exists journal_media_update on journal_media;
create policy journal_media_update on journal_media for update to authenticated
  using (uploaded_by = auth.uid()) with check (uploaded_by = auth.uid());
drop policy if exists journal_media_delete on journal_media;
create policy journal_media_delete on journal_media for delete to authenticated
  using (uploaded_by = auth.uid());

-- New tables → explicit grants (Phase-1 blanket grant predates them).
grant select, insert, update, delete on journal_entries to authenticated;
grant select, insert, update, delete on journal_media   to authenticated;

comment on table journal_entries is
  'Release 2 · Trip Journal: long-form, mixed-media diary entries. Member-read; author CUD own. body may be empty when media-only.';
comment on table journal_media is
  'Photos/videos for a journal_entry (private trip-media paths, signed-URL reads). Member-read; entry author attaches/removes.';
