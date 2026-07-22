-- AppName — Phase 2: `trip-covers` Storage bucket (public read, authed write).
-- Reconciles the docs' "posters" bucket to the name requested for this phase.
-- Apply with: supabase db push

-- Public bucket so cover images are readable via their public URL by anyone.
insert into storage.buckets (id, name, public)
values ('trip-covers', 'trip-covers', true)
on conflict (id) do nothing;

-- storage.objects already has RLS enabled by Supabase; add bucket-scoped policies.
-- Anyone (incl. anon) may READ objects in this bucket.
drop policy if exists "trip_covers_read" on storage.objects;
create policy "trip_covers_read"
  on storage.objects for select
  using (bucket_id = 'trip-covers');

-- Only authenticated users may UPLOAD to this bucket.
drop policy if exists "trip_covers_insert" on storage.objects;
create policy "trip_covers_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-covers');

-- Uploaders may replace/remove only their own objects.
drop policy if exists "trip_covers_update" on storage.objects;
create policy "trip_covers_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'trip-covers' and owner = auth.uid())
  with check (bucket_id = 'trip-covers' and owner = auth.uid());

drop policy if exists "trip_covers_delete" on storage.objects;
create policy "trip_covers_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'trip-covers' and owner = auth.uid());
