-- Trippl — Deploy hardening · SILENT BLOCKS (B4 follow-up). A block must never be
-- observable by the blocked user: no notification, no presence signal, and NO
-- distinguishable error. Apply: supabase db push
--
-- Two leaks are closed:
--   1. send_connection_request raised 'blocked' when a block existed — telling the
--      blocked user they're blocked. It now returns silently as if the request was
--      queued (nothing is actually inserted, so the blocker never sees it).
--   2. connection_state_with returned 'blocked_by_them', which the client could
--      use to distinguish a block from an ordinary private profile. It now returns
--      'none' in that case — indistinguishable from "no relationship".

-- (1) Silent send. Preserves the B4 suspension gate + rate limit; only the block
--     branch changes from raise → silent no-op.
create or replace function public.send_connection_request(_other uuid)
returns text language plpgsql security definer set search_path = public as $$
declare _me uuid := auth.uid();
begin
  if _me is null then raise exception 'not authenticated'; end if;
  if _other = _me then raise exception 'cannot connect to yourself'; end if;
  if not exists (select 1 from profiles where id = _other) then raise exception 'no such user'; end if;
  if public.is_suspended(_me) then raise exception 'account suspended'; end if;
  -- SILENT: if either party has blocked the other, behave exactly like a normal
  -- queued request — return 'outgoing' and insert nothing. The blocked user learns
  -- nothing; the blocker receives no request.
  if public.has_block_with(_other) then return 'outgoing'; end if;
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

-- (2) Hide the other party's block. 'blocked' (I blocked them) stays so the UI can
--     offer Unblock; 'blocked_by_them' collapses to 'none' so a block I'm subject
--     to looks identical to no relationship (their profile is already hidden by
--     the profiles_select policy).
create or replace function public.connection_state_with(_other uuid)
returns text language sql security definer stable set search_path = public as $$
  select case
    when _other = auth.uid() then 'self'
    when exists (select 1 from connections where status = 'blocked' and blocked_by = auth.uid()
        and ((requester_id = auth.uid() and addressee_id = _other)
          or (requester_id = _other and addressee_id = auth.uid()))) then 'blocked'
    when public.is_connected_with(_other) then 'connected'
    when exists (select 1 from connections where status = 'pending'
        and requester_id = auth.uid() and addressee_id = _other) then 'outgoing'
    when exists (select 1 from connections where status = 'pending'
        and requester_id = _other and addressee_id = auth.uid()) then 'incoming'
    else 'none'  -- includes "they blocked me" — indistinguishable from no relationship
  end;
$$;
