-- Trippl — Trip group chat (promoted from the Phase 2 backlog on explicit request).
-- Real-time text messaging scoped to a trip. Apply with: supabase db push
--
-- Adds: the `messages` table (+ RLS: member-read, own-insert, own-delete), a
-- `trip_members.last_read_at` column for unread tracking, the `mark_chat_read()`
-- and `trip_unread_counts()` helpers, and registers `messages` with Supabase
-- Realtime so new messages stream to every member live.

-- ---------------------------------------------------------------------------
-- 1. messages — one row per chat message, trip-scoped. `attachment_url` /
--    `attachment_type` are RESERVED for a later image-attachment phase
--    (schema-ready only — no upload path is built now).
-- ---------------------------------------------------------------------------
create table if not exists messages (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references trips (id) on delete cascade,
  sender_id       uuid not null references profiles (id) on delete cascade,
  body            text not null,
  attachment_url  text,                     -- reserved (image attachments, later)
  attachment_type text,                     -- 'image' | null (reserved)
  created_at      timestamptz not null default now()
);

-- Trip-scoped, newest-first reads + keyset pagination (created_at within a trip).
create index if not exists idx_messages_trip_created
  on messages (trip_id, created_at desc);

alter table messages enable row level security;

-- READ: any member of the trip (D12).
drop policy if exists messages_select on messages;
create policy messages_select on messages for select to authenticated
  using (public.is_trip_member(trip_id));

-- INSERT: a member may post, and only as themselves.
drop policy if exists messages_insert on messages;
create policy messages_insert on messages for insert to authenticated
  with check (public.is_trip_member(trip_id) and sender_id = auth.uid());

-- DELETE: a member may delete only their OWN message.
drop policy if exists messages_delete on messages;
create policy messages_delete on messages for delete to authenticated
  using (sender_id = auth.uid());

-- No UPDATE policy → messages are immutable (editing is out of scope).

-- New table → needs its own grants (the Phase-1 blanket grant predates it).
grant select, insert, delete on messages to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Unread tracking — one last_read_at per (trip, member). Deliberately simple:
--    the chat marks itself read on open, and "unread" = messages newer than that
--    watermark from someone other than you.
-- ---------------------------------------------------------------------------
alter table trip_members add column if not exists last_read_at timestamptz;

-- Mark the caller's chat for a trip as read (now). SECURITY DEFINER so it updates
-- the caller's own trip_members row without opening a broad UPDATE policy on the
-- roster. Only ever touches the caller's row (user_id = auth.uid()).
create or replace function public.mark_chat_read(_trip_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
begin
  update trip_members
     set last_read_at = now()
   where trip_id = _trip_id
     and user_id = auth.uid();
end;
$$;

grant execute on function public.mark_chat_read(uuid) to authenticated;

-- Unread counts across all the caller's trips (only trips with ≥1 unread), for
-- the chat entry badges. Counts messages newer than the caller's last_read_at,
-- excluding the caller's own messages.
create or replace function public.trip_unread_counts()
returns table (trip_id uuid, unread bigint)
language plpgsql security definer stable set search_path = public as $$
begin
  return query
    select m.trip_id, count(*)::bigint as unread
      from messages m
      join trip_members tm
        on tm.trip_id = m.trip_id
       and tm.user_id = auth.uid()
     where m.sender_id <> auth.uid()
       and m.created_at > coalesce(tm.last_read_at, '-infinity'::timestamptz)
     group by m.trip_id;
end;
$$;

grant execute on function public.trip_unread_counts() to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Realtime — stream INSERT/DELETE on messages to subscribed clients. RLS is
--    still enforced per-subscriber (the messages_select policy above), so a
--    member only ever receives rows for trips they belong to. `replica identity
--    full` makes DELETE payloads carry trip_id so clients can filter them.
-- ---------------------------------------------------------------------------
alter table messages replica identity full;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end $$;

comment on table messages is
  'Trip group chat (promoted backlog item). Member-read, own-insert/delete; '
  'streamed via Supabase Realtime. attachment_* reserved for a later image phase.';
