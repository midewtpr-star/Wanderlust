-- AppName — Phase 1 Row-Level Security (D12).
-- Helpers: public.is_trip_member(trip_id), public.is_trip_admin(trip_id),
-- public.shares_trip_with(user_id). RLS is ON for EVERY table.

alter table profiles           enable row level security;
alter table trips              enable row level security;
alter table trip_members       enable row level security;
alter table trip_admins        enable row level security;
alter table invites            enable row level security;
alter table rsvps              enable row level security;
alter table travel_proofs      enable row level security;
alter table airbnb_options     enable row level security;
alter table airbnb_votes       enable row level security;
alter table money_pools        enable row level security;
alter table pool_contributions enable row level security;
alter table personal_safes     enable row level security;
alter table safe_deposits      enable row level security;
alter table member_steps       enable row level security;
alter table activities         enable row level security;
alter table activity_media     enable row level security;
alter table trip_recap         enable row level security;
alter table push_tokens        enable row level security;

-- ---------------------------------------------------------------------------
-- profiles — read your own or a co-member's; write only your own
-- ---------------------------------------------------------------------------
create policy profiles_select on profiles for select to authenticated
  using (id = auth.uid() or public.shares_trip_with(id));
create policy profiles_insert on profiles for insert to authenticated
  with check (id = auth.uid());
create policy profiles_update on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- trips — members read; creator inserts self as host; admins update; host deletes
-- (invite-based minimal read is via public.trip_preview() RPC)
-- ---------------------------------------------------------------------------
create policy trips_select on trips for select to authenticated
  using (public.is_trip_member(id));
create policy trips_insert on trips for insert to authenticated
  with check (host_id = auth.uid());
create policy trips_update on trips for update to authenticated
  using (public.is_trip_admin(id)) with check (public.is_trip_admin(id));
create policy trips_delete on trips for delete to authenticated
  using (host_id = auth.uid());

-- ---------------------------------------------------------------------------
-- trip_members — members read roster; admins manage; you may remove yourself
-- (host row is seeded by the on_trip_created trigger, which bypasses RLS)
-- ---------------------------------------------------------------------------
create policy trip_members_select on trip_members for select to authenticated
  using (public.is_trip_member(trip_id));
create policy trip_members_insert on trip_members for insert to authenticated
  with check (public.is_trip_admin(trip_id));
create policy trip_members_update on trip_members for update to authenticated
  using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));
create policy trip_members_delete on trip_members for delete to authenticated
  using (public.is_trip_admin(trip_id) or user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- trip_admins — members read; admins manage (max 3 enforced by trigger)
-- ---------------------------------------------------------------------------
create policy trip_admins_select on trip_admins for select to authenticated
  using (public.is_trip_member(trip_id));
create policy trip_admins_insert on trip_admins for insert to authenticated
  with check (public.is_trip_admin(trip_id));
create policy trip_admins_delete on trip_admins for delete to authenticated
  using (public.is_trip_admin(trip_id));

-- ---------------------------------------------------------------------------
-- invites — members read; admins create/revoke
-- ---------------------------------------------------------------------------
create policy invites_select on invites for select to authenticated
  using (public.is_trip_member(trip_id));
create policy invites_insert on invites for insert to authenticated
  with check (public.is_trip_admin(trip_id) and invited_by = auth.uid());
create policy invites_delete on invites for delete to authenticated
  using (public.is_trip_admin(trip_id));

-- ---------------------------------------------------------------------------
-- rsvps — members read; write only your own row
-- ---------------------------------------------------------------------------
create policy rsvps_select on rsvps for select to authenticated
  using (public.is_trip_member(trip_id));
create policy rsvps_insert on rsvps for insert to authenticated
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());
create policy rsvps_update on rsvps for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy rsvps_delete on rsvps for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- travel_proofs — itinerary/PII private to OWNER + ADMINS (D6). Not the whole trip.
-- Trip-wide "confirmed" is surfaced via member_steps instead.
-- ---------------------------------------------------------------------------
create policy travel_proofs_select on travel_proofs for select to authenticated
  using (user_id = auth.uid() or public.is_trip_admin(trip_id));
create policy travel_proofs_insert on travel_proofs for insert to authenticated
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());
create policy travel_proofs_update on travel_proofs for update to authenticated
  using (user_id = auth.uid() or public.is_trip_admin(trip_id))
  with check (user_id = auth.uid() or public.is_trip_admin(trip_id));
create policy travel_proofs_delete on travel_proofs for delete to authenticated
  using (user_id = auth.uid() or public.is_trip_admin(trip_id));

-- ---------------------------------------------------------------------------
-- airbnb_options (GroupPad seam) — members read/add; author or admin edits
-- ---------------------------------------------------------------------------
create policy airbnb_options_select on airbnb_options for select to authenticated
  using (public.is_trip_member(trip_id));
create policy airbnb_options_insert on airbnb_options for insert to authenticated
  with check (public.is_trip_member(trip_id) and added_by = auth.uid());
create policy airbnb_options_update on airbnb_options for update to authenticated
  using (added_by = auth.uid() or public.is_trip_admin(trip_id))
  with check (added_by = auth.uid() or public.is_trip_admin(trip_id));
create policy airbnb_options_delete on airbnb_options for delete to authenticated
  using (added_by = auth.uid() or public.is_trip_admin(trip_id));

-- ---------------------------------------------------------------------------
-- airbnb_votes — members read; vote as yourself (one per trip via unique);
-- locking the official pick is a trips update (admin-only), handled above.
-- ---------------------------------------------------------------------------
create policy airbnb_votes_select on airbnb_votes for select to authenticated
  using (public.is_trip_member(trip_id));
create policy airbnb_votes_insert on airbnb_votes for insert to authenticated
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());
create policy airbnb_votes_update on airbnb_votes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy airbnb_votes_delete on airbnb_votes for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- money_pools — members read; admins manage (pools/totals are admin-set)
-- ---------------------------------------------------------------------------
create policy money_pools_select on money_pools for select to authenticated
  using (public.is_trip_member(trip_id));
create policy money_pools_insert on money_pools for insert to authenticated
  with check (public.is_trip_admin(trip_id));
create policy money_pools_update on money_pools for update to authenticated
  using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));
create policy money_pools_delete on money_pools for delete to authenticated
  using (public.is_trip_admin(trip_id));

-- ---------------------------------------------------------------------------
-- pool_contributions — members read (group progress); write only your own (ledger)
-- ---------------------------------------------------------------------------
create policy pool_contributions_select on pool_contributions for select to authenticated
  using (public.is_trip_member(trip_id));
create policy pool_contributions_insert on pool_contributions for insert to authenticated
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());
create policy pool_contributions_update on pool_contributions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy pool_contributions_delete on pool_contributions for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- personal_safes / safe_deposits — SELF-ONLY, private even from co-members (D3/D12)
-- ---------------------------------------------------------------------------
create policy personal_safes_select on personal_safes for select to authenticated
  using (user_id = auth.uid());
create policy personal_safes_insert on personal_safes for insert to authenticated
  with check (user_id = auth.uid() and public.is_trip_member(trip_id));
create policy personal_safes_update on personal_safes for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy personal_safes_delete on personal_safes for delete to authenticated
  using (user_id = auth.uid());

create policy safe_deposits_select on safe_deposits for select to authenticated
  using (user_id = auth.uid());
create policy safe_deposits_insert on safe_deposits for insert to authenticated
  with check (user_id = auth.uid());
create policy safe_deposits_update on safe_deposits for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy safe_deposits_delete on safe_deposits for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- member_steps — members read (badge visibility); write only your own
-- ---------------------------------------------------------------------------
create policy member_steps_select on member_steps for select to authenticated
  using (public.is_trip_member(trip_id));
create policy member_steps_insert on member_steps for insert to authenticated
  with check (public.is_trip_member(trip_id) and user_id = auth.uid());
create policy member_steps_update on member_steps for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- activities — members read/create; author or admin edits
-- ---------------------------------------------------------------------------
create policy activities_select on activities for select to authenticated
  using (public.is_trip_member(trip_id));
create policy activities_insert on activities for insert to authenticated
  with check (public.is_trip_member(trip_id) and created_by = auth.uid());
create policy activities_update on activities for update to authenticated
  using (created_by = auth.uid() or public.is_trip_admin(trip_id))
  with check (created_by = auth.uid() or public.is_trip_admin(trip_id));
create policy activities_delete on activities for delete to authenticated
  using (created_by = auth.uid() or public.is_trip_admin(trip_id));

-- ---------------------------------------------------------------------------
-- activity_media — members read; write only your own; author or admin removes
-- ---------------------------------------------------------------------------
create policy activity_media_select on activity_media for select to authenticated
  using (public.is_trip_member(trip_id));
create policy activity_media_insert on activity_media for insert to authenticated
  with check (public.is_trip_member(trip_id) and uploaded_by = auth.uid());
create policy activity_media_delete on activity_media for delete to authenticated
  using (uploaded_by = auth.uid() or public.is_trip_admin(trip_id));

-- ---------------------------------------------------------------------------
-- trip_recap — members read; admins generate/update
-- ---------------------------------------------------------------------------
create policy trip_recap_select on trip_recap for select to authenticated
  using (public.is_trip_member(trip_id));
create policy trip_recap_insert on trip_recap for insert to authenticated
  with check (public.is_trip_admin(trip_id));
create policy trip_recap_update on trip_recap for update to authenticated
  using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));

-- ---------------------------------------------------------------------------
-- push_tokens — self-only
-- ---------------------------------------------------------------------------
create policy push_tokens_all on push_tokens for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants: the API `authenticated` role needs table privileges (RLS then restricts).
-- ---------------------------------------------------------------------------
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
