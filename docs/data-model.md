# AppName — Data Model

> **What this governs:** a *sketch* of the Postgres/Supabase schema — tables and key columns for the seven MVP flows, plus the reserved GroupPad seam. **Sketch only — no SQL migrations yet.**
> **Authority:** subordinate to `foundation.md` (product/scope) and `decisions.md` (rationale). Cites decisions by D-number. If this doc disagrees with `foundation.md`, **`foundation.md` wins.**
> Codename `AppName`; logo `[LOGO SLOT]` — TBD.

**Status key:** ✅ locked · 🕗 TBD · ⬜ planned.

## Conventions (apply to every table)

- Postgres via **Supabase**. **Row-Level Security on every table** (→ decisions.md D8); policies sketched in "RLS & Storage" below, not written here.
- **PKs:** `id uuid default gen_random_uuid()` unless noted (join tables may use composite keys).
- **Timestamps:** `timestamptz`, `created_at default now()`, `updated_at` where rows mutate.
- **Money:** integer **`*_cents bigint`**, currency assumed **USD** (foundation §12-7). Never floats.
- **Enums:** shown as `text` + a **CHECK** constraint in MVP (simple to evolve); may become Postgres enums later.
- **Naming:** `snake_case`, singular column names, plural table names.
- Auth identity lives in Supabase's `auth.users`; **`profiles` mirrors it** (never FK app tables straight to `auth.users` for app data — go through `profiles`).

---

## profiles
Mirror of `auth.users`, holding app-level identity. One row per user.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` (FK, on delete cascade). Not auto-generated. |
| `display_name` | text | Shown across the app. |
| `avatar_url` | text null | Supabase Storage path or external URL. |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

*Email/phone live in `auth.users`.* Populated on signup (trigger or client). Readable by co-members of any shared trip.

## trips
The central object and tenancy unit (foundation §5).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `host_id` | uuid FK → profiles(id) | Creator / host. |
| `title` | text not null | |
| `destination` | text null | Free text (domestic). |
| `start_date` | date null | Drives the savings *locked→unlocked* UI state (derived, not stored). |
| `end_date` | date null | Drives lifecycle → *completed* (foundation §5). |
| `cover_image_url` | text null | Supabase Storage path (cover-images bucket). |
| `description` | text null | |
| `savings_goal_cents` | bigint null | Per-trip savings target (ledger goal, → D3). |
| `grouppad_locked_rental_id` | uuid null | **Reserved GroupPad seam** — nullable pointer to a future `grouppad_rentals` row. Unused/unenforced in MVP (→ "GroupPad seam"). |
| `created_at` / `updated_at` | timestamptz | |

*No stored `status` — lifecycle is derived from dates. Add one only if a manual override is needed (🕗).*

## trip_members
Membership + role + RSVP + confirmation. The join between profiles and trips.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Or composite PK `(trip_id, user_id)`. |
| `trip_id` | uuid FK → trips(id) | On delete cascade. |
| `user_id` | uuid FK → profiles(id) | |
| `role` | text | CHECK in (`host`, `member`). Host mirrors `trips.host_id`. |
| `rsvp_status` | text null | CHECK in (`going`, `maybe`, `not`); null = invited, not yet responded. |
| `confirmed_at` | timestamptz null | Set when the member's flight ticket is accepted → **Confirmed** (→ D6). Source of truth = existence of a `flight_confirmations` row; this is a convenience cache. |
| `joined_at` | timestamptz | |
| — | UNIQUE `(trip_id, user_id)` | One membership per user per trip. |

*Confirmation is derivable from `flight_confirmations`; `confirmed_at` is a denormalized convenience — keep them in sync (trigger or app write).*

## invites
Shareable invite link(s) for a trip (foundation §6-2). Opening a valid invite creates a `trip_members` row.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `token` | text UNIQUE | The unguessable link token (or use `id`). Deep-links into app/web. |
| `created_by` | uuid FK → profiles(id) | Usually the host. |
| `role_on_accept` | text | CHECK in (`member`); default `member`. |
| `max_uses` | int null | null = unlimited (MVP assumption: one per-trip token). |
| `uses` | int | default 0. |
| `expires_at` | timestamptz null | null = no expiry. |
| `created_at` | timestamptz | |

*Expiry/max-uses/revocation are reserved columns; exact policy is open (foundation §12-5). Accept needs a policy allowing token-holders to read the invite + insert their own membership.*

## flight_confirmations
The commitment artifact — a member's uploaded/photographed flight ticket (→ D6). Files are **private**.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `user_id` | uuid FK → profiles(id) | Uploader. |
| `file_path` | text not null | Path in the **private** flight-tickets Storage bucket. |
| `file_type` | text null | e.g. `image/jpeg`, `application/pdf`. |
| `original_filename` | text null | |
| `source` | text null | CHECK in (`camera`, `library`, `file`) — how it was captured (expo-camera / picker / web file). |
| `status` | text | CHECK in (`uploaded`, `verified`, `rejected`); default `uploaded`. MVP: `uploaded` ⇒ Confirmed (foundation §12-1). |
| `note` | text null | |
| `uploaded_at` | timestamptz | |

*Presence of a row (status ≠ `rejected`) sets `trip_members.confirmed_at`. Verification (`verified`/`rejected`) reserved for a later host-review refinement.*

## savings_contributions
Append-only **ledger** of contributions toward the trip goal (→ D3). **No custody.**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `user_id` | uuid FK → profiles(id) | Contributor. |
| `amount_cents` | bigint not null | Positive = contribution; a correction is a new (possibly negative) row (append-only, foundation §12-3). |
| `currency` | text | default `usd`. |
| `method` | text null | Free-text label only (`venmo`, `cash`, …) — **not** a payment integration. |
| `note` | text null | |
| `logged_at` | timestamptz | |

*Pooled total = `SUM(amount_cents)` per trip (summed on read, foundation §10). "Locked" until `trips.start_date`, then "unlocked" — a UI state over this sum, no real lock (→ D3).*

## notes
Shared idea board: ideas, activity links, Airbnb/**rental links**, with light discussion (foundation §6-5).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `author_id` | uuid FK → profiles(id) | |
| `body` | text null | The idea / comment text. |
| `link_url` | text null | Activity link or Airbnb/rental link. |
| `kind` | text null | CHECK in (`idea`, `link`, `rental_link`, `discussion`). `rental_link` flags a **future GroupPad candidate** (→ seam). |
| `parent_id` | uuid null FK → notes(id) | One level of replies = light discussion (foundation §10). |
| `created_at` / `updated_at` | timestamptz | |

*`kind = 'rental_link'` is the soft link to GroupPad's future domain — see "GroupPad seam."*

## activities
Sub-events within a trip — soccer, basketball, beach day (foundation §6-6). Any member can create.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `created_by` | uuid FK → profiles(id) | |
| `title` | text not null | e.g. "Beach day". |
| `description` | text null | |
| `location` | text null | |
| `starts_at` | timestamptz null | Within the trip window. |
| `ends_at` | timestamptz null | |
| `created_at` / `updated_at` | timestamptz | |

## activity_rsvps
Per-member RSVP to an activity (independent of trip RSVP).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Or composite `(activity_id, user_id)`. |
| `activity_id` | uuid FK → activities(id) | On delete cascade. |
| `user_id` | uuid FK → profiles(id) | |
| `status` | text | CHECK in (`going`, `maybe`, `not`). |
| `responded_at` | timestamptz | |
| — | UNIQUE `(activity_id, user_id)` | One response per user per activity. |

## push_tokens
A user's registered devices for push delivery (→ D5, expo-notifications). User-scoped, not trip-scoped.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles(id) | On delete cascade. |
| `expo_push_token` | text | The Expo push token. |
| `device_id` | text null | To dedupe per physical device. |
| `platform` | text | CHECK in (`ios`, `android`, `web`) — web is best-effort (→ D5, foundation §12-4). |
| `created_at` / `updated_at` / `last_seen_at` | timestamptz | |
| — | UNIQUE `(user_id, expo_push_token)` | Avoid duplicate registrations. |

*Send path (edge function + triggers vs external worker) is a build-time decision (foundation §12-6, build-plan Phase 7). Fan-out = loop over a member's tokens via Expo Push API (foundation §10).*

---

## RLS & Storage (sketch, → D8)

**RLS pattern:** a caller may read/write a trip-scoped row iff they have a `trip_members` row for that `trip_id`. Writes are further limited (author-only edits; `host` role may edit the trip and manage members). Policies are per-table/per-operation — sketched here, written at build time (Phase 1).

- **profiles:** readable by co-members of a shared trip; writable only by self.
- **trips / trip_members / invites / notes / activities / activity_rsvps / savings_contributions:** membership-gated; `host` elevated on `trips` + `trip_members`.
- **invites (accept):** token-holders can read the invite and insert their **own** membership — a deliberately narrow exception.
- **flight_confirmations:** **private** — readable by the uploader and the trip `host` only; not by the whole group.
- **push_tokens:** self-only (a user sees/writes only their own tokens).

**Storage buckets:**
- `cover-images` — trip-scoped read (members), write by host. Public-ish within a trip.
- `flight-tickets` — **private**; object path namespaced by `trip_id/user_id`; access restricted to uploader + host. Never logged (→ D6).

---

## GroupPad seam (reserved — build nothing, → D4)

GroupPad (browse rentals → like → shortlist → AI compare → vote → lock a winner) is a **separate existing web-React product** to be **adapted into this React Native codebase later, on explicit instruction.** The data model reserves its attachment points now so integration is clean:

- **Attaches at the trip level.** GroupPad will add its own **`grouppad_*` table namespace** (e.g. `grouppad_rentals`, `grouppad_shortlists`, `grouppad_votes`), each **FK → `trips(id)`** and RLS-gated by `trip_members` like every other trip-scoped table.
- **Reserved pointer:** `trips.grouppad_locked_rental_id uuid null` — the eventual "locked winner," pointing at a future `grouppad_rentals` row. **Present but unused/unenforced in MVP** (no FK constraint until the table exists).
- **Soft link today:** rental links currently live as `notes` rows with `kind = 'rental_link'`; GroupPad will later own that decision flow and can migrate/reference them.
- **Navigation:** reserve one nav entry for GroupPad (foundation §9); render nothing in MVP.

**Do not create `grouppad_*` tables, add the FK constraint, or build any rental/voting behavior until explicitly instructed.**
