-- AppName — Phase 1 functions & triggers.

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger set_trips_updated_at before update on public.trips
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profiles row when a new auth user is created (Part A #1).
-- SECURITY DEFINER so it can write to public.profiles from the auth trigger.
-- display_name comes from signup metadata, else the email local-part, else a default.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name, full_name, phone, email)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data->>'display_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Traveler'
    ),
    nullif(new.raw_user_meta_data->>'full_name', ''),
    new.phone,
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- When a trip is created, seed the host as a member (role host) and as an admin.
-- SECURITY DEFINER so it bypasses RLS during creation (host isn't an admin yet).
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_trip()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
    values (new.id, new.host_id, 'host')
    on conflict (trip_id, user_id) do nothing;
  insert into public.trip_admins (trip_id, user_id)
    values (new.id, new.host_id)
    on conflict (trip_id, user_id) do nothing;
  return new;
end;
$$;

create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- ---------------------------------------------------------------------------
-- Enforce MAX 3 admins per trip (D8). Host counts toward the 3.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_max_admins()
returns trigger language plpgsql as $$
begin
  if (select count(*) from public.trip_admins where trip_id = new.trip_id) >= 3 then
    raise exception 'A trip may have at most 3 admins (D8)';
  end if;
  return new;
end;
$$;

create trigger trip_admins_max_3
  before insert on public.trip_admins
  for each row execute function public.enforce_max_admins();

-- ---------------------------------------------------------------------------
-- RLS helper functions (Part A). SECURITY DEFINER + STABLE so they read
-- membership WITHOUT re-triggering RLS (prevents infinite recursion in policies).
-- ---------------------------------------------------------------------------
create or replace function public.is_trip_member(_trip_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.trip_members m
    where m.trip_id = _trip_id and m.user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_admin(_trip_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.trip_admins a
    where a.trip_id = _trip_id and a.user_id = auth.uid()
  );
$$;

-- Do I share any trip with another user? (for profiles read policy)
create or replace function public.shares_trip_with(_other uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1
    from public.trip_members me
    join public.trip_members them on them.trip_id = me.trip_id
    where me.user_id = auth.uid() and them.user_id = _other
  );
$$;

-- Minimal trip preview for someone holding a valid, unexpired invite code
-- (RLS can't express "holds this code", so this SECURITY DEFINER RPC does — Part A).
create or replace function public.trip_preview(_code text)
returns table (trip_id uuid, title text, location_city text, start_date date, end_date date, host_name text)
language sql security definer stable set search_path = public as $$
  select t.id, t.title, t.location_city, t.start_date, t.end_date, p.display_name
  from public.invites i
  join public.trips t on t.id = i.trip_id
  join public.profiles p on p.id = t.host_id
  where i.code = _code
    and (i.expires_at is null or i.expires_at > now());
$$;

grant execute on function public.is_trip_member(uuid)  to anon, authenticated;
grant execute on function public.is_trip_admin(uuid)   to anon, authenticated;
grant execute on function public.shares_trip_with(uuid) to anon, authenticated;
grant execute on function public.trip_preview(text)     to anon, authenticated;
