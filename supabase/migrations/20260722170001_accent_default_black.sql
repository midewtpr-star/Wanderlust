-- Trippl — Phase 10 (rebrand): default accent is Black (monochrome out of the box).
-- Apply with: supabase db push
--
-- Changes the column default for NEW profiles only; existing users keep their
-- chosen accent. (theme_mode + accent_color were added in 20260722160001.)

alter table profiles alter column accent_color set default '#000000';
