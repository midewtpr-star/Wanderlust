-- Trippl — Release 2 · Safety & Moderation (B4). The trust-and-safety layer that
-- must land BEFORE discovery (Nearby / Phase 22), never after. Apply: supabase db push
--
-- Ships six locked pieces:
--   1. reports — report any user-generated surface, one taxonomy, moderator-read.
--   2. age band — store adult|minor (never the raw birthdate); a MINOR can never be
--      public or discoverable (enforced in a trigger + the read policies).
--   3. blocks — reuse the B3 connections block; strengthen invisibility onto chat.
--   4. rate limits — connection requests, reports, and messages.
--   5. moderation — is_moderator gate + moderation_actions + resolve/suspend RPCs.
--   6. suspension — a suspended user drops out of discovery and can't write.

-- ---------------------------------------------------------------------------
-- 1. profiles — safety columns. age_band gates discovery/public visibility;
--    is_moderator gates the moderation tools; suspended_at sidelines a user.
-- ---------------------------------------------------------------------------
alter table profiles add column if not exists age_band     text;
alter table profiles add column if not exists age_set_at   timestamptz;
alter table profiles add column if not exists is_moderator boolean not null default false;
alter table profiles add column if not exists suspended_at timestamptz;

do $$ begin
  alter table profiles add constraint profiles_age_band_chk
    check (age_band is null or age_band in ('adult', 'minor'));
exception when duplicate_object then null; end $$;

-- A MINOR is never public — coerce visibility to private on any write. This is a
-- backstop independent of the client, so under-18 can never be made discoverable.
create or replace function public.enforce_minor_private()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.age_band = 'minor' then new.visibility := 'private'; end if;
  return new;
end; $$;
drop trigger if exists profiles_enforce_minor_private on profiles;
create trigger profiles_enforce_minor_private before insert or update on profiles
  for each row execute function public.enforce_minor_private();

-- Set my age band from a birthdate. Stores ONLY the band (privacy-minimal) — the
-- raw birthdate is never persisted. Under-18 → 'minor' (and the trigger privatises).
create or replace function public.set_age_band(_birthdate date)
returns text language plpgsql security definer set search_path = public as $$
declare _me uuid := auth.uid(); _band text;
begin
  if _me is null then raise exception 'not authenticated'; end if;
  if _birthdate is null or _birthdate > current_date then raise exception 'invalid birthdate'; end if;
  _band := case when _birthdate <= (current_date - interval '18 years') then 'adult' else 'minor' end;
  update profiles set age_band = _band, age_set_at = now() where id = _me;
  return _band;
end; $$;

-- Safety-state helpers (SECURITY DEFINER + STABLE so policies/RPCs can call them).
create or replace function public.is_moderator()
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select is_moderator from profiles where id = auth.uid()), false);
$$;

create or replace function public.is_suspended(_uid uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from profiles where id = _uid and suspended_at is not null);
$$;

grant execute on function public.set_age_band(date) to authenticated;
grant execute on function public.is_moderator()     to authenticated;
grant execute on function public.is_suspended(uuid)  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Tighten the world reads (B3) with age + suspension. A profile is publicly
--    visible only if the owner is an ADULT and not suspended; discovery excludes
--    minors, suspended, and anyone without a set age band.
-- ---------------------------------------------------------------------------
drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select to authenticated using (
  id = auth.uid()
  or public.shares_trip_with(id)
  or (not public.has_block_with(id)
      and suspended_at is null
      and (
        (visibility = 'public' and age_band = 'adult')
        or public.is_connected_with(id)
      ))
);

create or replace function public.search_profiles(_q text)
returns table (id uuid, display_name text, handle citext, avatar_url text, home_city text)
language sql security definer stable set search_path = public as $$
  select p.id, p.display_name, p.handle, p.avatar_url, p.home_city
  from profiles p
  where p.id <> auth.uid()
    and p.visibility = 'public'
    and p.age_band = 'adult'          -- minors + not-yet-verified are never discoverable
    and p.suspended_at is null        -- suspended users drop out of search
    and not public.has_block_with(p.id)
    and (
      length(coalesce(_q, '')) >= 2
      and (p.handle ilike '%' || _q || '%' or p.display_name ilike '%' || _q || '%')
    )
  order by (p.handle ilike _q || '%') desc, p.display_name
  limit 30;
$$;

-- ---------------------------------------------------------------------------
-- 3. Block invisibility on chat: you never see messages from someone you've
--    blocked or who has blocked you (bidirectional), enforced per-subscriber in
--    RLS so it holds over Realtime too. (World-surface block invisibility is B3.)
-- ---------------------------------------------------------------------------
drop policy if exists messages_select on messages;
create policy messages_select on messages for select to authenticated
  using (public.is_trip_member(trip_id) and not public.has_block_with(sender_id));

-- ---------------------------------------------------------------------------
-- 4. reports — one row per report of any user-generated surface. Insert-your-own;
--    only moderators read/resolve. Reason + subject taxonomies are text+CHECK.
-- ---------------------------------------------------------------------------
create table if not exists reports (
  id              uuid primary key default gen_random_uuid(),
  reporter_id     uuid not null references profiles (id) on delete cascade,
  subject_kind    text not null check (subject_kind in
                    ('profile', 'message', 'trip', 'activity', 'journal_entry', 'outfit', 'other')),
  subject_id      uuid,                    -- the row reported (null for a whole-profile/other report)
  subject_user_id uuid references profiles (id) on delete set null, -- the user responsible (for moderation)
  reason          text not null check (reason in
                    ('spam', 'harassment', 'inappropriate', 'impersonation', 'underage', 'scam', 'safety', 'other')),
  detail          text,
  status          text not null default 'open' check (status in ('open', 'reviewing', 'actioned', 'dismissed')),
  created_at      timestamptz not null default now(),
  resolved_at     timestamptz,
  resolved_by     uuid references profiles (id) on delete set null
);
create index if not exists idx_reports_status on reports (status, created_at desc);

alter table reports enable row level security;
-- Insert your own report; reads/updates are moderator-only (no self-read — a
-- reporter doesn't get a queue view). All actual writes go through the RPCs.
drop policy if exists reports_insert on reports;
create policy reports_insert on reports for insert to authenticated
  with check (reporter_id = auth.uid());
drop policy if exists reports_select on reports;
create policy reports_select on reports for select to authenticated
  using (public.is_moderator());
drop policy if exists reports_update on reports;
create policy reports_update on reports for update to authenticated
  using (public.is_moderator()) with check (public.is_moderator());
grant select, insert, update on reports to authenticated;

-- Submit a report (rate-limited: max 20/hour per reporter).
create or replace function public.submit_report(
  _subject_kind text, _subject_id uuid, _subject_user_id uuid, _reason text, _detail text)
returns uuid language plpgsql security definer set search_path = public as $$
declare _me uuid := auth.uid(); _id uuid;
begin
  if _me is null then raise exception 'not authenticated'; end if;
  if (select count(*) from reports where reporter_id = _me
      and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'rate limited: too many reports, try later';
  end if;
  insert into reports (reporter_id, subject_kind, subject_id, subject_user_id, reason, detail)
    values (_me, _subject_kind, _subject_id, _subject_user_id, _reason, nullif(btrim(coalesce(_detail, '')), ''))
    returning id into _id;
  return _id;
end; $$;
grant execute on function public.submit_report(text, uuid, uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Rate limits on the two write paths that can be abused.
--    (a) connection requests — fold a cap + suspension check into the B3 RPC.
--    (b) messages — a BEFORE INSERT trigger (also blocks suspended senders).
-- ---------------------------------------------------------------------------
create or replace function public.send_connection_request(_other uuid)
returns text language plpgsql security definer set search_path = public as $$
declare _me uuid := auth.uid();
begin
  if _me is null then raise exception 'not authenticated'; end if;
  if _other = _me then raise exception 'cannot connect to yourself'; end if;
  if not exists (select 1 from profiles where id = _other) then raise exception 'no such user'; end if;
  if public.is_suspended(_me) then raise exception 'account suspended'; end if;
  if public.has_block_with(_other) then raise exception 'blocked'; end if;
  if (select count(*) from connections where requester_id = _me
      and created_at > now() - interval '1 hour') >= 30 then
    raise exception 'rate limited: too many requests, try later';
  end if;

  if exists (select 1 from connections where status = 'pending'
      and requester_id = _other and addressee_id = _me) then
    update connections set status = 'accepted'
      where status = 'pending' and requester_id = _other and addressee_id = _me;
    return 'connected';
  end if;
  if public.is_connected_with(_other) then return 'connected'; end if;
  if exists (select 1 from connections where status = 'pending'
      and requester_id = _me and addressee_id = _other) then return 'outgoing'; end if;

  insert into connections (requester_id, addressee_id, status) values (_me, _other, 'pending');
  return 'outgoing';
end; $$;

-- Message rate limit + suspension gate (max 20 messages / 60s per sender).
create or replace function public.enforce_message_limits()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_suspended(new.sender_id) then raise exception 'account suspended'; end if;
  if (select count(*) from messages where sender_id = new.sender_id
      and created_at > now() - interval '60 seconds') >= 20 then
    raise exception 'rate limited: slow down';
  end if;
  return new;
end; $$;
drop trigger if exists messages_enforce_limits on messages;
create trigger messages_enforce_limits before insert on messages
  for each row execute function public.enforce_message_limits();

-- ---------------------------------------------------------------------------
-- 6. moderation_actions — an audit trail of what a moderator did, + the resolve
--    RPC that applies the effect. Moderator-only.
-- ---------------------------------------------------------------------------
create table if not exists moderation_actions (
  id           uuid primary key default gen_random_uuid(),
  moderator_id uuid not null references profiles (id) on delete cascade,
  report_id    uuid references reports (id) on delete set null,
  target_user_id uuid references profiles (id) on delete set null,
  action       text not null check (action in
                 ('dismiss', 'remove_content', 'suspend_user', 'unsuspend_user')),
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_moderation_actions_created on moderation_actions (created_at desc);

alter table moderation_actions enable row level security;
drop policy if exists moderation_actions_select on moderation_actions;
create policy moderation_actions_select on moderation_actions for select to authenticated
  using (public.is_moderator());
grant select on moderation_actions to authenticated;

-- A moderator resolves a report: records the action, sets report status, and
-- applies the effect (suspend/unsuspend toggles profiles.suspended_at).
create or replace function public.moderate_resolve_report(_report_id uuid, _action text, _note text)
returns void language plpgsql security definer set search_path = public as $$
declare _me uuid := auth.uid(); _target uuid;
begin
  if not public.is_moderator() then raise exception 'not a moderator'; end if;
  select subject_user_id into _target from reports where id = _report_id;

  insert into moderation_actions (moderator_id, report_id, target_user_id, action, note)
    values (_me, _report_id, _target, _action, nullif(btrim(coalesce(_note, '')), ''));

  if _action = 'suspend_user' and _target is not null then
    update profiles set suspended_at = now() where id = _target;
  elsif _action = 'unsuspend_user' and _target is not null then
    update profiles set suspended_at = null where id = _target;
  end if;

  update reports
    set status = case when _action = 'dismiss' then 'dismissed' else 'actioned' end,
        resolved_at = now(), resolved_by = _me
    where id = _report_id;
end; $$;

-- The moderation queue (moderator-only): open reports, newest first.
create or replace function public.list_open_reports()
returns table (id uuid, subject_kind text, subject_id uuid, subject_user_id uuid,
               reason text, detail text, status text, created_at timestamptz,
               reporter_name text, subject_user_name text)
language sql security definer stable set search_path = public as $$
  select r.id, r.subject_kind, r.subject_id, r.subject_user_id, r.reason, r.detail,
         r.status, r.created_at, rp.display_name, sp.display_name
  from reports r
  left join profiles rp on rp.id = r.reporter_id
  left join profiles sp on sp.id = r.subject_user_id
  where public.is_moderator() and r.status in ('open', 'reviewing')
  order by r.created_at desc
  limit 200;
$$;

grant execute on function public.moderate_resolve_report(uuid, text, text) to authenticated;
grant execute on function public.list_open_reports() to authenticated;

comment on table reports is
  'User reports of any user-generated surface (Release 2 · B4). Insert-your-own; moderator-read. Rate-limited via submit_report.';
comment on table moderation_actions is
  'Audit trail of moderator decisions (Release 2 · B4). Moderator-read only.';
comment on column profiles.age_band is
  'adult | minor, derived once from a birthdate (raw DOB never stored). A minor is forced private and excluded from discovery.';
