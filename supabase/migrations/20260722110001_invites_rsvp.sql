-- AppName — Phase 3: invites + RSVP.
-- Apply with: supabase db push

-- ---------------------------------------------------------------------------
-- Any trip MEMBER may create an invite (Phase 1 restricted this to admins).
-- ---------------------------------------------------------------------------
drop policy if exists invites_insert on invites;
create policy invites_insert on invites for insert to authenticated
  with check (public.is_trip_member(trip_id) and invited_by = auth.uid());

-- ---------------------------------------------------------------------------
-- Invite preview: MINIMAL trip info for someone holding a valid code, readable
-- while signed OUT. SECURITY DEFINER reads across RLS. Now includes cover +
-- who's going. (Return type changed, so drop then recreate.)
-- ---------------------------------------------------------------------------
drop function if exists public.trip_preview(text);
create function public.trip_preview(_code text)
returns table (
  trip_id uuid,
  title text,
  cover_url text,
  location_city text,
  start_date date,
  end_date date,
  going_count bigint,
  going_members jsonb
)
language sql security definer stable set search_path = public as $$
  select
    t.id,
    t.title,
    t.cover_url,
    t.location_city,
    t.start_date,
    t.end_date,
    (select count(*) from rsvps r where r.trip_id = t.id and r.status = 'going'),
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object('display_name', g.display_name, 'avatar_url', g.avatar_url)
        )
        from (
          select pr.display_name, pr.avatar_url, r.responded_at
          from rsvps r
          join profiles pr on pr.id = r.user_id
          where r.trip_id = t.id and r.status = 'going'
          order by r.responded_at
          limit 12
        ) g
      ),
      '[]'::jsonb
    )
  from invites i
  join trips t on t.id = i.trip_id
  where i.code = _code
    and (i.expires_at is null or i.expires_at > now());
$$;

-- ---------------------------------------------------------------------------
-- Join a trip via a valid invite code. SECURITY DEFINER bypasses the admin-only
-- trip_members insert policy so an invitee can add THEMSELVES as a member.
-- ---------------------------------------------------------------------------
create or replace function public.join_trip(_code text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  _trip_id uuid;
begin
  select i.trip_id into _trip_id
  from invites i
  where i.code = _code
    and (i.expires_at is null or i.expires_at > now());

  if _trip_id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  insert into trip_members (trip_id, user_id, role)
  values (_trip_id, auth.uid(), 'member')
  on conflict (trip_id, user_id) do nothing;

  return _trip_id;
end;
$$;

grant execute on function public.trip_preview(text) to anon, authenticated;
grant execute on function public.join_trip(text) to authenticated;
