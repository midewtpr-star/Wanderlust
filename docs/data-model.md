# Trippl — Data Model

> **What this governs:** a *sketch* of the Postgres/Supabase schema — tables and key columns for the ten MVP core-loop flows, plus the reserved GroupPad seam. **Sketch only — no SQL migrations yet.**
> **Authority:** subordinate to `foundation.md` (product/scope) and `decisions.md` (rationale). Cites decisions by D-number. If this doc disagrees with `foundation.md`, **`foundation.md` wins.**
> **Revised for v2.** Codename `Trippl`; logo `[LOGO SLOT]` — TBD.

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
Shareable invite link(s) (foundation §6-2). *(Built Phase 3; column names below match the shipped schema.)*

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | |
| `code` | text UNIQUE | Unguessable code (DB default). Deep-links: `trippl://join/<code>` / `<web>/join/<code>`. |
| `invited_by` | uuid FK → profiles(id) | Any **member** may create an invite (Phase 3 loosened this from admin-only). |
| `expires_at` | timestamptz null | null = no expiry. |
| `created_at` | timestamptz | |

*Read/join via SECURITY DEFINER RPCs: `trip_preview(code)` returns minimal info (cover, title, dates, going-count/list) to a signed-out invitee; `join_trip(code)` inserts the caller's `trip_members` row (role `member`), bypassing the admin-only insert policy.*

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

> **As built (Phase 4 — source of truth is the migrations).** The shipped `travel_proofs` keeps a leaner column set than this sketch: `file_url` (not `file_path`), `arrival_city` + `travel_dates` (text), `verified_by` (admin override), and `note` (driving). The finer-grained sketch columns (`source`, `extraction_status`, `arrival_lat/lng`, `proximity_ok`, `name_match`, `overridden_by`, `extracted_dates`) were **not** materialized — proximity/name/date results are computed transiently in the **`verify-flight` edge function** and only the verdict is persisted (`verified` + extracted fields). A **unique `(trip_id, user_id)`** index makes one proof per member per trip upsertable. Two SECURITY DEFINER RPCs back this phase: **`get_travel_status(trip_id)`** exposes non-PII per-member status (`user_id, type, verified`) to any trip member for the status wall (D6 keeps the itinerary PII owner+admin only), and **`admin_override_travel_proof(trip_id, user_id)`** lets an admin manually verify (also marks `member_steps`, which is otherwise self-write-only). Airport lookup uses an **`airports`** reference table (iata PK → city/coords, seeded from OurAirports); the trip destination is geocoded on demand (Nominatim). The AI provider is **Anthropic** (a vision model via the Messages API), key held only in the edge function's secrets.*

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

> **As built (Phase 6).** The votes table shipped as **`airbnb_votes`** (not `votes`) with `option_id` / `trip_id` / `user_id` + unique `(trip_id, user_id)`; changing a vote upserts (moves) it. `airbnb_options.total_cost` is **numeric dollars** (from Phase 2), converted to cents when it seeds the Airbnb pool on lock. Voting **informs**; an admin locks the official pick (`trips.airbnb_pick` + `status='locked'`), which also populates the Airbnb pool total if unset. Admin promote/demote writes `trip_admins` + `trip_members.role`; the max-3 cap (D8) is the DB trigger.

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

> **As built (Phase 7).** `trip_members` has **no `is_verified` column** — the aggregate badge is **derived on read** from `member_steps` (`useMemberVerification`): `verified = travel_proof AND airbnb_paid AND (car_paid only when the trip has a car pool)`. No trigger materializes it; the client computes it from the member-readable `member_steps` rows and shows the badge everywhere members are listed (partial "n/3 steps" otherwise). The first time the current user crosses into verified, a one-time celebration plays (AsyncStorage-flagged).

> **As built (Phase 5 — source of truth is the migrations).** The ledger amount columns match this sketch's **integer cents** (`money_pools.total_cents`, `pool_contributions.amount_cents`, `personal_safes.goal_cents`, `safe_deposits.amount_cents`) after the Phase-5 reconciliation (Phase 1 had used `numeric`). Differences from this sketch that stand as-built: **`money_pools` has no stored `per_person`** — the equal share is computed on read (`ceil(total_cents / going-count)`, §10); **timestamps are `contributed_at` / `deposited_at`** (not `logged_at`); **`safe_deposits` has no `trip_id`** (self-only RLS keys off `user_id` + its `safe_id`). **`member_steps`** shipped as `step` (enum **`travel_proof` / `airbnb_paid` / `car_paid`**) + a `completed` boolean + `completed_at` — not the `step_key` / `airbnb_money` / `status` names sketched above; a member marks their own money steps client-side when contributions ≥ share. The split denominator (going members) lives behind a single `SPLIT_DENOMINATOR` constant (D5). Everything is **ledger only** — no custody (D3).*

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

> **As built (Phase 8).** `activity_media` shipped with `media_type` enum **photo|video|other** (no `text`), a **`url`** column (the private `trip-media` storage path — not `file_path`), and **`caption`** (no `body`). `activities` gained a **`url`** column (Phase 8) and uses **`scheduled_for`** (single timestamptz) with **no `source`/`starts_at`/`ends_at`** — an activity created from a local idea just carries the prefilled title/location/url. **`trip-media`** is a **private** bucket: upload to your own `<trip_id>/<user_id>/` folder, **read by any trip member** (shared trip-wide), delete uploader-only; clients read via **signed URLs**. Local ideas are fetched on demand by the **`nearby-ideas`** edge function (Google Places, key server-only) and are **not persisted** unless saved as an activity (foundation §10).

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

> **As built (Phase 9).** The recap shipped as a **single `trip_recap` row** (no separate `recap_stats` table): `stats` is an inline **jsonb** blob (`places_visited` + names, `miles_covered`, `verified_members`, `steps_completed`, `confirmed_travelers`, `total_media`, `trip_days`), `collage_url` is **one** private `trip-media` path (singular, not `collage_urls[]`; capture-a-styled-view via react-native-view-shot), `generated_at` marks generation. There's **no `created_by`/`status`/`share_url`** — sharing exports the captured image live (`expo-sharing`/Web Share). **Insert/update loosened to any member** (was admin-only). **Miles** come from a new **`trip_distances`** table (opt-in, **self-only** — location is sensitive, §12-5); only the **aggregate** is exposed via `get_trip_distance_summary` (SECURITY DEFINER), never per-user values. Auto video montage stays Phase 2 (D9) — a marked TODO seam in `collage-view.tsx`.

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

## messages  — trip group chat (promoted backlog item)
Real-time text chat scoped to a trip. **Promoted from the Phase 2 backlog** ("Trip chat + announcements") on explicit request; only real-time text is built.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | On delete cascade. |
| `sender_id` | uuid FK → profiles(id) | Author (= `auth.uid()` on insert). |
| `body` | text not null | Message text. |
| `attachment_url` | text null | **Reserved** — image attachments (a later phase). |
| `attachment_type` | text null | `'image'` \| null (reserved). |
| `created_at` | timestamptz | Stored UTC, rendered local. Index `(trip_id, created_at desc)` for paginated newest-first reads. |

*Unread tracking is deliberately minimal: a **`trip_members.last_read_at`** watermark per member, with SECURITY DEFINER RPCs **`mark_chat_read(trip_id)`** (set the caller's watermark to now) and **`trip_unread_counts()`** (per-trip unread = messages after the watermark, excluding the caller's own). The table is added to the **`supabase_realtime`** publication (with `replica identity full`) so INSERT/DELETE stream live; RLS is still enforced per-subscriber.*

> **As built (Group chat).** RLS: member-read (`is_trip_member`), **own-insert** (`sender_id = auth.uid()`), **own-delete**; **no UPDATE** (messages are immutable). Live via Supabase Realtime `postgres_changes` (INSERT + DELETE, filtered by `trip_id`); the client sends **optimistically** and reconciles on the realtime echo by `id`, paginates older history on scroll-up, and marks read on open. Push fan-out is the **`notify-message`** edge function (Expo Push over the stored `push_tokens`, excluding the sender) — best-effort, fired-and-forgotten from the client so the chat never blocks on push. Image attachments are **schema-only** (columns reserved), not built.

---

## outfits  +  outfit_items  +  outfit_reactions  — outfit planner (promoted backlog item)
Pinterest-powered outfit boards. **Promoted on explicit request**; MVP is link/pin + upload based (no gated Pinterest API — an OAuth seam is reserved in the edge function).

**outfits**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | On delete cascade. |
| `owner_id` | uuid FK → profiles(id) | The member whose look this is. |
| `title` | text not null | e.g. "Beach day fit". |
| `day` | date null | Optional trip day (drives By-Day grouping). |
| `activity_id` | uuid null FK → activities(id) | Optional link to an activity (on delete set null). |
| `notes` | text null | |
| `created_at` / `updated_at` | timestamptz | |

**outfit_items** (moodboard cards; `owner_id` + `trip_id` denormalized for RLS)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `outfit_id` | uuid FK → outfits(id) | On delete cascade. |
| `source_url` | text null | Original pin/site link (null for uploads). |
| `image_url` | text null | Remote preview URL (pinterest/link) **or** a private `trip-media` PATH when `provider='upload'` (sign to view). |
| `title` | text null | |
| `provider` | text | `pinterest` \| `link` \| `upload`. |
| `position` | int | Order within the moodboard. |
| `created_at` | timestamptz | |

**outfit_reactions** (lightweight "love")

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `outfit_id` | uuid FK → outfits(id) | On delete cascade. |
| `trip_id` / `user_id` | uuid | |
| — | UNIQUE `(outfit_id, user_id)` | One love per member per outfit. |

**link_previews** (server-side preview cache)

| Column | Type | Notes |
|---|---|---|
| `url` | text PK | The pasted link (cache key). |
| `title` / `image_url` / `author` / `provider` | text null | Normalized preview fields. |
| `fetched_at` | timestamptz | 7-day TTL, enforced in the edge function. |

> **As built (Outfit planner).** RLS: any trip member **reads** all outfits/items/reactions for their trip; a member **creates/edits/deletes only their OWN** outfits + items (items gated by an EXISTS check that the parent outfit is theirs) and toggles only their own reaction. Uploaded item images **reuse the private `trip-media` bucket** (`<trip_id>/<user_id>/…`, member-read via signed URLs) — no new bucket. Previews come from the **`link-preview`** edge function (Pinterest **oEmbed** + OpenGraph scrape fallback, cached in `link_previews`, graceful timeout/blocked handling), which also covers any non-Pinterest link; `link_previews` is written only by the function's service role (clients read-only). A **PINTEREST OAUTH SEAM** is documented in the edge function for later (connect a user's account to browse their own boards/pins). Real Pinterest API + image attachments beyond the reserved upload path are **not** built.

---

## bring_items  +  bring_claims  — shared bring list (packing/supplies)
A claimable per-trip checklist of what the group needs. **Built on explicit request.**

**bring_items**

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `trip_id` | uuid FK → trips(id) | On delete cascade. |
| `created_by` | uuid FK → profiles(id) | Any member may add. |
| `name` | text not null | e.g. "Bluetooth speaker". |
| `category` | text null | gear \| food \| docs \| misc (free text). |
| `priority` | `bring_priority` enum | `needed` \| `optional` (default optional) — essentials stand out. |
| `quantity` | int null | Optional target count. |
| `notes` | text null | |
| `created_at` / `updated_at` | timestamptz | |

**bring_claims** ("I'll bring it" — multiple claimers per item; `trip_id` denormalized for RLS)

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `item_id` | uuid FK → bring_items(id) | On delete cascade. |
| `trip_id` / `user_id` | uuid | |
| `quantity` | int null | Optional partial quantity ("I'll bring 1 of 2"). |
| `claimed_at` | timestamptz | |
| — | UNIQUE `(item_id, user_id)` | One claim per member per item (a re-claim upserts). |

> **As built (Bring list).** RLS: any trip member **reads** all items/claims; a member **adds** items and **edits/deletes only their own OR as a trip admin**; a member **claims/unclaims only for themselves**. The UI groups by status (**unclaimed, needed-first, then claimed**), shows a progress summary, one-tap **optimistic** claim/unclaim (the `bring_claims.quantity` column is schema-ready for partial claims; MVP claim is one-tap), and a light **"fully packed"** celebration when the last `needed` item is claimed (reuses the reanimated checkmark). Hooks: `useBringList` / `useAddBringItem` / `useClaimItem`.

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
- **messages:** membership-gated read; **insert/delete own only**; immutable (no edits). Streamed via Realtime (RLS enforced per-subscriber).
- **outfits / outfit_items / outfit_reactions:** membership-gated read; **create/edit/delete your OWN only** (items gated to your own outfit). Uploaded item images live in the private `trip-media` bucket (signed-URL reads).
- **link_previews:** read-only to members; written only by the `link-preview` edge function (service role).
- **bring_items:** membership-gated read; any member adds; **edit/delete creator-or-admin**.
- **bring_claims:** membership-gated read; **claim/unclaim self-only** (one per member per item).

**Storage buckets:**
- `trip-covers` — **public read**, authenticated write (uploaders manage their own objects); trip cover images. *(Built in Phase 2; was named `posters` in earlier drafts.)*
- `flight-itineraries` — **private**; path namespaced `trip_id/user_id`; uploader + admins only. Never logged (D6). *(Phase 4.)*
- `trip-media` — trip-scoped read for activity media + recap collages. *(Phase 8.)*

---

## GroupPad seam (reserved — build nothing, → D7)

GroupPad (browse rentals → like → shortlist → **AI compare** → vote → **lock a winner**) is an existing **web-React** product to be **adapted into this React Native codebase as the Airbnb-selection module later, on explicit instruction.** The seam is reserved at the **Airbnb-selection point**:

- **Attach point:** `airbnb_options` + `votes` + `trips.airbnb_pick`. MVP fills these via the **manual stub** (link + total-cost + one-vote-per-member + admin lock).
- **Later:** GroupPad adds its own **`grouppad_*` tables** (e.g. `grouppad_rentals`, `grouppad_shortlists`, `grouppad_comparisons`), each FK → `trips(id)` and RLS-gated like every trip-scoped table; it feeds/supersedes `airbnb_options` and ultimately sets `trips.airbnb_pick`.
- **Navigation:** reserve one nav entry for the Airbnb-selection/GroupPad module; render the manual stub in MVP.

**Do not create `grouppad_*` tables or build any browse/shortlist/compare/vote-engine behavior until explicitly instructed.**
