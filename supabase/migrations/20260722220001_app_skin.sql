-- Trippl — App skins. A per-user visual "skin" (Editorial / Collage / Poster)
-- applied globally to that user's app, independent of light/dark + destination
-- theme. A skin changes only the LOOK (tokens, type, ornament, component styling)
-- — never the information architecture, navigation, or behavior. Apply: supabase db push

alter table profiles
  add column if not exists app_skin text not null default 'editorial';

comment on column profiles.app_skin is
  'Per-user visual skin: editorial (default) | collage | poster. Look-only — never changes IA/nav/behavior. Persisted here + AsyncStorage.';
