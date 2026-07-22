-- Calor — Phase 10: per-user theme preferences on the profile.
-- Apply with: supabase db push
--
-- Mode + accent are also cached in AsyncStorage (instant/offline); the profile is
-- the cross-device source of truth. Self-write is already covered by the Phase-1
-- profiles_update policy (id = auth.uid()) — no RLS change needed.

alter table profiles
  add column if not exists theme_mode text not null default 'system';

alter table profiles
  add column if not exists accent_color text not null default '#FF3B30';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_theme_mode_check'
  ) then
    alter table profiles
      add constraint profiles_theme_mode_check
      check (theme_mode in ('light', 'dark', 'system'));
  end if;
end $$;
