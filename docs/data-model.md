# AppName — Data Model

> **What this governs:** a *sketch* of the Postgres/Supabase schema — tables and key columns for the ten MVP core-loop flows, plus the reserved GroupPad seam. **Sketch only — no SQL migrations yet.**
> **Authority:** subordinate to `foundation.md` (product/scope) and `decisions.md` (rationale). Cites decisions by D-number. If this doc disagrees with `foundation.md`, **`foundation.md` wins.**
> **Revised for v2.** Codename `AppName`; logo `[LOGO SLOT]` — TBD.

**Status key:** ✅ locked · 🕗 TBD · ⬜ planned.

## Conventions (apply to every table)

- Postgres via **Supabase**, **RLS on every table** (→ D12); policies sketched in "RLS & Storage," not written here.
- **PKs:** `id uuid default gen_random_uuid()` unless noted (join/child tables may use composites).
- **Timestamps:** `timestamptz`, `created_at default now()`, `updated_at` where rows mutate.
- **Money:** integer **`*_cents bigint`**, currency assumed **USD** (foundation §12). Never floats.
- **Enums:** `text` + CHECK in MVP (easy to evolve); may become Postgres enums later.
- **Naming:** `snake_case`, plural tables. Auth identity lives in `auth.users` (phone-first, D4); **`profiles` mirrors it** — app tables FK to `profiles`, never straight to `auth.users`.
- Many child tables carry a **denormalized `trip_id`** (alongside their parent FK) so RLS policies can gate on membership with one join.

---

## profiles
One row per user; mirror of `auth.users`. Holds the **stored name used to match flight passenger names** (D6).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` (FK, on delete cascade). |
| `display_name` | text | Shown across the app. |
| `full_name` | text null | Legal/stored name matched against extracted `passenger_name` (D6); admin can override a mismatch. |
| `phone` | text null | Primary contact (canonical in `auth.users.phone`, D4); denormalized for contact-invites. |
| `avatar_url` | text null | Storage path or URL. |
| `created_at` / `updated_at` | timestamptz | |

## trips
Central object + tenancy unit (foundation §5).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `host_id` | uuid FK → profiles(id) | Creator; also seeded into `trip_admins`. |
| `title` | text not null | |
| `cover_image_url` | text null | Poster/cover (Storage: `posters`). |
| `location` | text null | Destination text. |
| `destination_city` | text null | Normalized city for proximity checks. |
| `destination_lat` / `destination_lng` | numeric null | Geocoded city center — compared to a flight's arrival airport (D6). |
| `start_date` / `end_date` | date | Drive lifecycle + the money **unlock** + the countdown. |
| `car_rental_ref` | text null | Car rental as a **link or confirmation number**. Presence implies a `car` money pool exists. |
| `airbnb_pick` | uuid null FK → airbnb_options(id) | The **locked** official pick (set by an admin). **GroupPad seam** endpoint (→ seam). |
| `status` | text | CHECK in (`planning`, `locked`, `active`, `completed`). Lifecycle (foundation §5). |
| `created_at` / `updated_at` | timestamptz | |

## trip_admins  — **max 3 per trip (D8)**
The elevated set (lock pick, override name mismatch, edit trip). Host counts toward the 3.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | On delete cascade. |
| `user_id` | uuid FK → profiles(id) | |
| `granted_by` | uuid null FK → profiles(id) | |
| `created_at` | timestamptz | |
| — | UNIQUE `(trip_id, user_id)` | One admin row per user per trip. |

*Cap enforced by a **BEFORE INSERT trigger**: reject when the trip already has 3 admins (a unique constraint can't cap a count). Host is inserted here on trip creation.*

## trip_members
Membership (all participants, incl. admins & host).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | Or composite `(trip_id, user_id)`. |
| `trip_id` | uuid FK → trips(id) | On delete cascade. |
| `user_id` | uuid FK → profiles(id) | |
| `role` | text | CHECK in (`host`, `member`). Admin status lives in `trip_admins`. |
| `is_verified` | boolean | default false — the **verified badge** cache; true when all required `member_steps` are complete (foundation §5). Derived; keep in sync via trigger/app. |
| `verified_at` | timestamptz null | |
| `joined_at` | timestamptz | |
| — | UNIQUE `(trip_id, user_id)` | One membership per user per trip. |

## invites
Shareable invite link(s) (foundation §6-2). Opening a valid invite creates a `trip_members` row.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `token` | text UNIQUE | Unguessable link token; deep-links into app/web. |
| `created_by` | uuid FK → profiles(id) | |
| `role_on_accept` | text | default `member`. |
| `max_uses` | int null | null = unlimited (MVP: one per-trip token). |
| `uses` | int | default 0. |
| `expires_at` | timestamptz null | null = no expiry. |
| `created_at` | timestamptz | |

## rsvps
The **soft** commitment (foundation §6-2).

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `user_id` | uuid FK → profiles(id) | |
| `status` | text | CHECK in (`going`, `maybe`, `not`). |
| `responded_at` | timestamptz | |
| — | UNIQUE `(trip_id, user_id)` | One current RSVP per member. |

## travel_proofs  — the **hard** confirm (D6)
Both proof types in one table; flight-only columns are nullable.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `user_id` | uuid FK → profiles(id) | |
| `type` | text | CHECK in (`flight`, `driving`). |
| `verified` | boolean | default false. Driving ⇒ true on submit; flight ⇒ true after checks pass (or admin override). |
| `verified_at` | timestamptz null | Triggers the "verified" animation. |
| **Flight-only** | | |
| `file_path` | text null | Itinerary in the **private** `flight-itineraries` bucket. |
| `source` | text null | CHECK in (`camera`, `library`, `file`). |
| `extraction_status` | text null | CHECK in (`pending`, `extracted`, `failed`) — AI/vision step. |
| `passenger_name` | text null | Extracted; matched vs `profiles.full_name`. |
| `confirmation_number` | text null | Extracted. |
| `arrival_airport` | text null | Extracted (code/name). |
| `arrival_lat` / `arrival_lng` | numeric null | Geocoded airport → distance to `trips.destination_*`. |
| `proximity_ok` | boolean null | Arrival near the trip city? (threshold open, foundation §12-2). |
| `name_match` | text null | CHECK in (`match`, `mismatch`, `overridden`). |
| `overridden_by` | uuid null FK → profiles(id) | Admin who overrode a legal-name mismatch (D6/D8). |
| `extracted_dates` | jsonb null | Arrival/return dates from the itinerary. |
| `created_at` | timestamptz | |

*Driving rows carry only `type='driving'`, `verified=true`. A verified proof is the `travel_proof` step (foundation §5). AI extraction + geocoding run behind a server/edge boundary (foundation §9).*

## airbnb_options  +  votes  — **GroupPad seam (D7)**
MVP: manual options + one group vote; an admin locks `trips.airbnb_pick`.

**airbnb_options**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `added_by` | uuid FK → profiles(id) | |
| `title` | text null | |
| `url` | text | Airbnb link (MVP manual stub). |
| `total_cost_cents` | bigint null | Total-cost entry → drives the Airbnb pool total + equal split (D5). |
| `image_url` | text null | |
| `notes` | text null | |
| `created_at` | timestamptz | |

**votes**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `option_id` | uuid FK → airbnb_options(id) | On delete cascade. |
| `trip_id` | uuid FK → trips(id) | Denormalized for RLS. |
| `user_id` | uuid FK → profiles(id) | |
| `created_at` | timestamptz | |
| — | UNIQUE `(trip_id, user_id)` | One vote per member (MVP assumption; foundation §12-8). |

*This pair **is** the GroupPad seam — GroupPad later supersedes/feeds `airbnb_options` and sets `trips.airbnb_pick`. See "GroupPad seam."*

## money_pools  +  contributions  — ledger (D3, D5)
Two shared pools per trip: `airbnb` (always) and `car` (only if `trips.car_rental_ref` set).

**money_pools**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `type` | text | CHECK in (`airbnb`, `car`). |
| `total_cents` | bigint null | Known total (from Airbnb `total_cost_cents` or car cost). Drives **equal split** = `total_cents / member_count` (D5; rounding open, §12-3). |
| `unlock_date` | date null | Defaults to `trips.start_date`; total shows **locked** until then. |
| `created_at` / `updated_at` | timestamptz | |
| — | UNIQUE `(trip_id, type)` | One pool per type per trip. |

**contributions** (append-only ledger, **no custody** — D3)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `pool_id` | uuid FK → money_pools(id) | |
| `trip_id` | uuid FK → trips(id) | Denormalized for RLS. |
| `user_id` | uuid FK → profiles(id) | |
| `amount_cents` | bigint not null | Positive; correction = new (possibly negative) row. |
| `method` | text null | Free-text label only (`venmo`, `cash`…) — **not** a payment integration. |
| `note` | text null | |
| `logged_at` | timestamptz | |

*"Money in" for a pool = a member's summed contributions ≥ their equal share → satisfies the pool's `member_steps` step (foundation §5).*

## personal_safes  +  safe_deposits  — private personal savings (D3)
A member's own saved amount toward the trip; **private (self-only)**, shown locked until start.

**personal_safes**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `user_id` | uuid FK → profiles(id) | |
| `goal_cents` | bigint null | Optional personal target (independent of pool obligations — foundation §12-4). |
| `unlock_date` | date null | Defaults to `trips.start_date`. |
| `created_at` / `updated_at` | timestamptz | |
| — | UNIQUE `(trip_id, user_id)` | One safe per member per trip. |

**safe_deposits** (append-only personal ledger)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `safe_id` | uuid FK → personal_safes(id) | |
| `trip_id` / `user_id` | uuid | Denormalized. |
| `amount_cents` | bigint not null | |
| `note` | text null | |
| `logged_at` | timestamptz | |

## member_steps  — the checklist (foundation §5, §6-7)
Materializes each member's required steps for the progressive flow + verified badge.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `user_id` | uuid FK → profiles(id) | |
| `step_key` | text | CHECK in (`travel_proof`, `airbnb_money`, `car_money`). `car_money` only when the trip has a car pool. |
| `status` | text | CHECK in (`pending`, `complete`). Completing plays the checkmark animation + reveals what's left. |
| `completed_at` | timestamptz null | |
| — | UNIQUE `(trip_id, user_id, step_key)` | |

*Derivable from the underlying facts (a verified `travel_proof`, contributions ≥ share); materialized here for the checklist UI and updated by trigger/app. All required steps complete ⇒ `trip_members.is_verified = true` (the badge).*

## activities  +  activity_media  (foundation §6-8/9)
Sub-events + mixed-media documentation. Local ideas (below) can seed activities.

**activities**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `created_by` | uuid FK → profiles(id) | |
| `title` | text not null | |
| `description` | text null | |
| `location` | text null | |
| `starts_at` / `ends_at` | timestamptz null | |
| `source` | text null | CHECK in (`manual`, `local_idea`) — a saved local idea. |
| `created_at` / `updated_at` | timestamptz | |

**activity_media** (photos, text, video, other — foundation §6-9)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `activity_id` | uuid FK → activities(id) | On delete cascade. |
| `trip_id` | uuid | Denormalized for RLS. |
| `uploaded_by` | uuid FK → profiles(id) | |
| `media_type` | text | CHECK in (`photo`, `video`, `text`, `other`). |
| `file_path` | text null | Storage (`trip-media`) for photo/video/other. |
| `body` | text null | For `text`. |
| `created_at` | timestamptz | |

*Media size/type/count limits are open (foundation §12-9).*

## trip_recap  +  recap_stats  (MVP: collages + stats — D9)

**trip_recap**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | UNIQUE — one recap per trip. |
| `created_by` | uuid FK → profiles(id) | |
| `status` | text | CHECK in (`draft`, `generated`). |
| `collage_urls` | text[] null | Generated collage image paths (Storage). Video montage is Phase 2 (D9). |
| `share_url` | text null | Shareable link for social. |
| `created_at` / `updated_at` | timestamptz | |

**recap_stats** (Strava-style)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `recap_id` | uuid FK → trip_recap(id) | |
| `trip_id` | uuid | Denormalized. |
| `places_visited` | int null | |
| `miles_covered` | numeric null | From `expo-location` (source/privacy open, foundation §12-5). |
| `checklist_items_completed` | int null | From `member_steps`. |
| `computed_at` | timestamptz | |

## push_tokens  (D10)
A user's devices for push. User-scoped, not trip-scoped.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK → profiles(id) | On delete cascade. |
| `expo_push_token` | text | Expo push token. |
| `device_id` | text null | Dedupe per device. |
| `platform` | text | CHECK in (`ios`, `android`, `web`) — web best-effort (D10, foundation §12-10). |
| `created_at` / `updated_at` / `last_seen_at` | timestamptz | |
| — | UNIQUE `(user_id, expo_push_token)` | |

---

## Local ideas — *not a table* (foundation §6-8)
Nearby events + things-to-do are **fetched on demand from an external places/events API** (provider open, foundation §12-6) once the destination is set/verified — **not persisted**. A member can save an idea, which creates an `activities` row with `source='local_idea'`.

---

## RLS & Storage (sketch, → D12)

**RLS pattern:** a caller may read/write a trip-scoped row iff they have a `trip_members` row for that `trip_id`; writes are further limited (author-only edits; **admins** via `trip_admins` may edit the trip, lock `airbnb_pick`, and override a flight name-mismatch).

- **profiles:** readable by co-members of a shared trip; writable only by self.
- **trips / trip_members / rsvps / invites / airbnb_options / votes / money_pools / contributions / activities / activity_media / member_steps / trip_recap / recap_stats:** membership-gated; admin-elevated where noted.
- **trip_admins:** readable by members; writes admin-only **and** capped at 3 by trigger (D8).
- **invites (accept):** token-holders may read the invite and insert their **own** membership — a narrow exception.
- **travel_proofs:** verified *status* visible to the trip; the **itinerary file + extracted PII private to the uploader + admins** (never the whole group; never logged).
- **personal_safes / safe_deposits:** **self-only** — private even from other trip members.
- **push_tokens:** self-only.

**Storage buckets:**
- `posters` — trip-scoped read (members), write by host/admins.
- `flight-itineraries` — **private**; path namespaced `trip_id/user_id`; uploader + admins only. Never logged (D6).
- `trip-media` — trip-scoped read for activity media + recap collages.

---

## GroupPad seam (reserved — build nothing, → D7)

GroupPad (browse rentals → like → shortlist → **AI compare** → vote → **lock a winner**) is an existing **web-React** product to be **adapted into this React Native codebase as the Airbnb-selection module later, on explicit instruction.** The seam is reserved at the **Airbnb-selection point**:

- **Attach point:** `airbnb_options` + `votes` + `trips.airbnb_pick`. MVP fills these via the **manual stub** (link + total-cost + one-vote-per-member + admin lock).
- **Later:** GroupPad adds its own **`grouppad_*` tables** (e.g. `grouppad_rentals`, `grouppad_shortlists`, `grouppad_comparisons`), each FK → `trips(id)` and RLS-gated like every trip-scoped table; it feeds/supersedes `airbnb_options` and ultimately sets `trips.airbnb_pick`.
- **Navigation:** reserve one nav entry for the Airbnb-selection/GroupPad module; render the manual stub in MVP.

**Do not create `grouppad_*` tables or build any browse/shortlist/compare/vote-engine behavior until explicitly instructed.**
