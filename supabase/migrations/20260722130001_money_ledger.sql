-- AppName — Phase 5: Money ledger (pools + personal safe). Apply with: supabase db push
--
-- LEDGER MODE — no real payment processing. Nothing here holds or moves funds;
-- rows are honor-system records. Real custody (Stripe Connect + KYC) is the gated
-- later phase that flips on via config, not a rebuild (decisions.md D3).
--
-- Reconciliation: Phase 1 built the money columns as numeric(12,2) to match the
-- requested *_amount names. This phase is their first consumer, and both the
-- foundation (§5, §10: "total_cents") and data-model.md specify INTEGER CENTS.
-- The tables are empty, so we retype to bigint cents and adopt the `_cents` names
-- now — code, docs, and schema all agree on integer cents (never floats). D3/D5.

-- ---------------------------------------------------------------------------
-- money_pools — cents. per_person is computed on READ (foundation §10), so the
-- stored per_person column is dropped to avoid a stale second source of truth.
-- ---------------------------------------------------------------------------
alter table money_pools
  alter column total_amount type bigint using (round(total_amount * 100)::bigint);
alter table money_pools rename column total_amount to total_cents;
alter table money_pools drop column if exists per_person_amount;

-- ---------------------------------------------------------------------------
-- pool_contributions — cents (append-only ledger). +method/+note (free-text
-- labels only; `method` is NOT a payment integration — e.g. "venmo", "cash").
-- ---------------------------------------------------------------------------
alter table pool_contributions
  alter column amount type bigint using (round(amount * 100)::bigint);
alter table pool_contributions rename column amount to amount_cents;
alter table pool_contributions add column if not exists method text;
alter table pool_contributions add column if not exists note text;

-- ---------------------------------------------------------------------------
-- personal_safes — cents (private, self-only per Phase 1 RLS).
-- ---------------------------------------------------------------------------
alter table personal_safes
  alter column goal_amount type bigint using (round(goal_amount * 100)::bigint);
alter table personal_safes rename column goal_amount to goal_cents;

-- ---------------------------------------------------------------------------
-- safe_deposits — cents (append-only personal ledger). +note.
-- ---------------------------------------------------------------------------
alter table safe_deposits
  alter column amount type bigint using (round(amount * 100)::bigint);
alter table safe_deposits rename column amount to amount_cents;
alter table safe_deposits add column if not exists note text;

-- ---------------------------------------------------------------------------
-- Notes on what this phase does NOT need (already in place from Phase 1 RLS):
--   • money_pools:        members read, admins write (pool config).
--   • pool_contributions: members read (group progress), write only your own row.
--   • personal_safes/safe_deposits: SELF-ONLY (private even from co-members).
--   • member_steps:       members read, write only your own (airbnb_paid/car_paid
--                         are marked client-side when contributions ≥ share).
-- No new policies required — the ledger runs entirely under the existing RLS.
-- ---------------------------------------------------------------------------

comment on table money_pools is 'Ledger only (D3) — no custody. total_cents drives an equal per-person split computed on read (foundation §10); "locked until unlock_date" is a derived UI state, not escrow.';
comment on table pool_contributions is 'Append-only ledger (D3) — no funds move. A correction is a new (possibly negative) row.';
comment on table personal_safes is 'Private personal savings target (self-only RLS). Ledger only; sealed until unlock_date is a UI state.';
