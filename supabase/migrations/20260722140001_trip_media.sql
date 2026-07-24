-- AppName — Phase 8: Local ideas + Activity documentation.
-- Apply with: supabase db push
--
-- Adds the PRIVATE `trip-media` bucket (photos + videos) and a `url` column on
-- activities (so an activity created from a local idea keeps its link). The
-- activities / activity_media tables + their RLS already exist from Phase 1;
-- no policy changes are needed there.

-- ---------------------------------------------------------------------------
-- 1. PRIVATE trip-media bucket. Never publicly readable — clients read via a
--    short-lived SIGNED URL. Path layout `<trip_id>/<user_id>/<file>`, so
--    folder[1]=trip_id, folder[2]=user_id. 50 MB cap (raise here + in the
--    project's global upload limit for longer videos).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit)
values ('trip-media', 'trip-media', false, 52428800) -- 50 MB
on conflict (id) do nothing;

-- UPLOAD: a trip MEMBER may write only into their own <trip_id>/<user_id>/ folder.
drop policy if exists "trip_media_insert" on storage.objects;
create policy "trip_media_insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'trip-media'
    and (storage.foldername(name))[2] = auth.uid()::text
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );

-- READ: ANY member of that trip (media is shared trip-wide, unlike itineraries).
drop policy if exists "trip_media_select" on storage.objects;
create policy "trip_media_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'trip-media'
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );

-- UPDATE / DELETE: uploader only.
drop policy if exists "trip_media_update" on storage.objects;
create policy "trip_media_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'trip-media' and owner = auth.uid())
  with check (bucket_id = 'trip-media' and owner = auth.uid());

drop policy if exists "trip_media_delete" on storage.objects;
create policy "trip_media_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'trip-media' and owner = auth.uid());

-- ---------------------------------------------------------------------------
-- 2. activities.url — optional link (an activity made from a local idea keeps
--    the place link; manual activities may add one too).
-- ---------------------------------------------------------------------------
alter table activities add column if not exists url text;
