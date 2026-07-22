# Trippl — Build Plan

> **What this governs:** the **phased MVP build order** + the **Phase 2 backlog**, each marked not-started. Read this to know what to build next and what "done" means.
> **Authority:** subordinate to `foundation.md` (scope) and `decisions.md` (rationale); cites both by §/D-number. If this doc disagrees with `foundation.md`, **`foundation.md` wins.**
> **Revised for v2.** Codename `Trippl`; logo `[LOGO SLOT]` — TBD.

**Status key:** ⬜ not-started · 🟡 in progress · ✅ done · ⏳ external lead time.
**Phases 0–10 are ✅ done; Phases 11–12 are ⬜ not-started.** Two backlog items — **Trip group chat** and the **Outfit planner** — were **explicitly promoted and built (2026-07-22)**; see the backlog table below. Update each phase's marker (+ a short note) as work completes.

**How to read this:** MVP phases are in intended build order (per brief). The **keystone unlock** is Phases 1–2 (auth + schema + RLS + trip-create); after that, most feature phases are trip-scoped slices. **Keep MVP tight — the Phase 2 backlog below is a parking lot, not a queue; nothing there is built until explicitly promoted (foundation §4-7, §8).**

---

# MVP

## Phase 0 — Scaffold ✅ (2026-07-22)
**Goal:** a running Expo app on all three targets, empty but healthy.
**Deliverables (built):** Expo **SDK 57** + RN 0.86 + TS; Expo Router tree — `(auth)/sign-in`, `(tabs)` = Trips/Create/Profile, `trip/[id]`; **NativeWind v4** (+ Tailwind 3, `global.css` token system) + **React Native Reusables-style** `components/ui/` primitives (Button, Text) wired; `Trippl` token + `[LOGO SLOT]` placeholders (→ D11); **single Supabase client** from `EXPO_PUBLIC_*` env via app config (`.env.example`, no secrets committed); the four **native modules installed + permissioned** (image-picker, camera, location, notifications) — config only, no logic; folder structure `app/ components/ lib/ hooks/ constants/ types/`.
**Depends on:** nothing (cold start).
**Done when (verified):** ✅ `tsc --noEmit` passes · ✅ web export builds (NativeWind CSS emitted, classes compiled) and `expo start --web` serves HTTP 200 · ✅ iOS + Android Metro bundles compile (Hermes bytecode). *iOS/Android **simulator** launch isn't verifiable in the headless build env — native **bundling** was verified instead; run on a device/simulator locally (see README).*

## Phase 1 — Auth + Schema ✅ (2026-07-22)
**Goal:** phone-first sign-in; the database exists with RLS. **Half the keystone unlock (foundation §9).**
**Deliverables (built):**
- **Schema** — `supabase/migrations/` (3 files): **18 tables** (profiles, trips, trip_members, trip_admins, invites, rsvps, travel_proofs, airbnb_options [GroupPad seam], airbnb_votes, money_pools, pool_contributions, personal_safes, safe_deposits, member_steps, activities, activity_media, trip_recap, push_tokens) + 8 enums + FKs + indexes; **RLS on every table** via helpers `is_trip_member()` / `is_trip_admin()` (+ `shares_trip_with`, `trip_preview`) (→ D12); triggers: **auto-create profiles** on new auth user, **seed host** as member+admin on trip create, **max-3 admins** (→ D8), `updated_at`.
- **Auth** — Supabase **phone-first OTP** UI + **working email+password fallback** (→ D4); **AuthProvider + useAuth** (AsyncStorage-persisted session); **route protection** (signed-out → (auth), signed-in → (tabs)) + **sign-out**; profiles row (with `display_name`) created on first sign-in by trigger.
- **Reconciliations w/ docs:** money = `numeric(12,2)` (exact; matches `*_amount` names); `travel_proofs` PII scoped to **owner + admins** per D6 (trip-wide "confirmed" surfaces via `member_steps`).
- **Deferred to consuming phases:** Storage buckets (`posters`→P2, `flight-itineraries`→P4, `trip-media`→P8) + their storage policies — no uploads occur in this phase; Twilio SMS is a Supabase dashboard connection the operator makes.
**Depends on:** Phase 0.
**Done when (verified):** ✅ `tsc` passes · ✅ web bundle builds · ✅ signed-out → `/sign-in` route protection verified in a headless browser. Live email/OTP sign-in round-trip is verified by the operator against their Supabase project after `db push` + `.env` (see PR/summary for steps).

## Phase 2 — Trip create + Dashboard ✅ (2026-07-22)
**Goal:** the central object is real. **Completes the keystone unlock.**
**Deliverables (built):**
- **`trip-covers` Storage bucket** (public read / authed write) via migration `20260722100001_trip_covers_storage.sql` (renamed from docs' `posters`).
- **Multi-step Create form** (Create tab): title · cover pick (library/camera → upload → preview + busy state) · destination city (+ `lat/lng` reserved) · start/end **date pickers** (native community picker / web `<input type=date>`) with end≥start validation · **car rental** (`car_rental_ref`) · **Airbnb-selection stub** inserting `airbnb_options` — clearly commented **GROUPPAD SEAM** (D7), no voting. On submit: insert trip (`host_id`, `status='planning'`) → host seeded as member+admin by the `on_trip_created` trigger → route to detail.
- **Trips list** (Trips tab): RLS-scoped `useTrips`, cover/title/destination/date-range + **live countdown**, empty state + CTA, pull-to-refresh, loading skeletons, focus-reload.
- **Trip-detail shell** (`app/trip/[id].tsx`): cover/title/destination/dates/countdown header + "coming soon" section cards (Invites, Travel proof, Money, Airbnb pick, Activities); **members-only** with a not-authorized state (via RLS).
- Data calls in hooks (`useTrips`, `useTrip`, `useCreateTrip`); domain types in `/types`. Loading/empty/error states throughout.
**Depends on:** Phase 1.
**Done when (verified):** ✅ `tsc` passes · ✅ web + iOS + Android bundles compile · ✅ all routes static-render. Live create→list→detail (with a real cover upload) is verified by the operator against their Supabase project (needs `db push` of the bucket migration + `.env`).

## Phase 3 — Invites + RSVP ✅ (2026-07-22)
**Goal:** the group forms and softly commits (foundation §6-2).
**Deliverables (built):**
- **Deep linking:** scheme `appname://` (already set) + Expo Router → `app/join/[code]`; public route (viewable signed-out). Links: `appname://join/<code>` (native) and `<web-origin>/join/<code>` (web). Migration `20260722110001_invites_rsvp.sql`: members may create invites; `trip_preview(code)` extended (cover + going list); `join_trip(code)` SECURITY DEFINER self-join. *(TODO in app.config.ts: production universal/app links.)*
- **Generate + share** (trip detail, any member): "Invite people" → create/reuse an `invites` row → share sheet (RN `Share`) + copy (`expo-clipboard`), shows web + native links.
- **Join flow** (`app/join/[code]`): Partiful-style preview (cover, title, dates, countdown, who's going) via the public RPC; invalid/expired error state; "Join this trip" → signed-out routes to `(auth)` preserving the code (`?redirect=`) and returns, signed-in calls `join_trip` then prompts RSVP.
- **RSVP:** going/maybe/not upsert into `rsvps` (soft confirm — travel proof is later); change anytime; **optimistic** updates.
- **RSVP wall** (replaces the Invites card): members grouped by status w/ counts + avatars, "Going" prominent, "invited · no reply" group.
- Hooks `useInvite` / `useJoinTrip` / `useRsvp` / `useTripMembers` / `useTripPreview`; types in `/types`; loading/empty/error throughout.
**Depends on:** Phase 2.
**Done when (verified):** ✅ `tsc` passes · ✅ web + iOS + Android bundles compile · ✅ headless browser confirms `/join/[code]` is public (no redirect) while `/` still redirects to sign-in. Live A→invite→B-join→RSVP flow is verified by the operator against their Supabase project (after `db push`).

## Phase 4 — Travel proof (driving first, then AI flight verify) ✅ (2026-07-22)
**Goal:** the **hard confirm** (foundation §11, → D6). Build the simple path first.
**Deliverables (built):**
- **Migration** `20260722120001_travel_proof.sql`: **private `flight-itineraries` bucket** (never publicly readable) + storage RLS restricting reads to **uploader + trip admins** (path `<trip_id>/<user_id>/…`, D6); **`airports`** reference table (iata PK → city/coords) + RLS; `travel_proofs.note` + a **unique (trip_id, user_id)** index (one proof per member, upsertable); **`get_travel_status()`** SECURITY DEFINER (non-PII per-member status for the wall) and **`admin_override_travel_proof()`** SECURITY DEFINER (admin manual verify — needed because member_steps is self-only).
- **4a — Driving (built first):** self-declared "I'm driving / carpooling" + optional note → upsert `travel_proofs(type='driving', verified=true)` + mark `member_steps('travel_proof')` — **instant**, client-side (foundation §2).
- **4b — Flight AI verify:** upload (image/PDF via `expo-document-picker`) or photograph (`expo-image-picker` camera) → **private** `flight-itineraries` → **`verify-flight` edge function** (Deno): downloads with the service role, calls the **Anthropic Messages API (a vision model)** with **forced tool-use** for structured `{passenger_name, confirmation_number, arrival_airport_iata, arrival_city, travel_dates}` — **`ANTHROPIC_API_KEY` lives only in function secrets** → resolve IATA in `airports` (else geocode city) → **geocode the trip destination on demand** if missing (Nominatim; Google-key TODO noted) → **haversine proximity**, PASS within **`NEARBY_MILES = 100`** (tunable) → **fuzzy name-match** vs `profiles.full_name` (soft — warns, never hard-fails) → **dates** warn if outside window → upsert proof (verified on pass) + mark step. **"Flight itinerary verified" animation** (react-native-reanimated checkmark + confetti) on pass; specific reason (wrong city / unreadable / not an itinerary) + re-upload + **admin override** on fail.
- **Status wall:** per-member ✈️ flight-verified / 🚗 driving-confirmed / ⏳ pending (via `get_travel_status`), admins get inline "Verify" override. Own itinerary viewable via **signed URL** (private bucket). Seed script `scripts/seed-airports.mjs` (OurAirports). Hooks `useTravelProof` / `useTravelStatus`; types in `/types`; loading/error throughout.
**Depends on:** Phase 2 (destination), Phase 3 (members). AI provider = **Anthropic** (foundation §12-1).
**Done when (verified):** ✅ `tsc` passes · ✅ web + iOS + Android bundles compile · ✅ headless browser boots the client bundle (reanimated/worklets init) without runtime errors. Live driving-instant-confirm + real-itinerary verify/animate + wrong-city fail + admin override are verified by the operator against their Supabase project after `db push`, `functions deploy verify-flight`, `secrets set ANTHROPIC_API_KEY`, and the airports seed (see PR/summary for exact steps).

## Phase 5 — Money ledger (pools + personal safe) ✅ (2026-07-22)
**Goal:** the full money UX as a **ledger, no custody** (→ D3, D5).
**Deliverables (built):**
- **Migration** `20260722130001_money_ledger.sql`: reconciled the money columns to **integer cents** (bigint) — the foundation (§5/§10) and data-model both specify cents; Phase 1 had used `numeric` to match the `_amount` names. Retyped + renamed to `total_cents` / `amount_cents` / `goal_cents`; **dropped the stored `per_person_amount`** (computed on read per §10); added `method`/`note` to contributions, `note` to deposits. **No new RLS** — the ledger runs entirely under Phase-1 policies (pools: member-read/admin-write; contributions: member-read/self-write; safes+deposits: self-only; member_steps: self-write).
- **Ledger banner** on the Money card: "no real payment processing — Stripe Connect is the gated later phase" (D3). Amounts are **integer cents everywhere, never floats** (`lib/money.ts`).
- **Two pools** (`airbnb` always; `car` only when `trips.car_rental_ref` set). Admin sets each total (Airbnb prefilled from the locked `airbnb_options` pick if any, else typed — voting/lock is Phase 6). **Auto equal-split** `perPersonCents = ceil(total / going-count)`, **recomputed on read** so it tracks total + going-count changes; the denominator ("split across N going") is shown and sourced from a single constant **`SPLIT_DENOMINATOR`** (D5).
- **Contributions:** per pool, each member sees **my share / paid / remaining**, logs partial or full contributions (`pool_contributions`), and when their running total ≥ share the pool's **`member_steps` step (`airbnb_paid`/`car_paid`) completes + plays the step animation** (reuses the travel-proof reanimated checkmark). Group **progress bar** (contributed vs total) + a per-member paid/partial/unpaid list.
- **Locked-until-trip-day:** both pools + the safe render **sealed until `unlock_date` (= trip start)**, then unlocked — a derived UI/ledger state, not custody.
- **Personal safe** (`personal_safes` + `safe_deposits`, **private/self-only**): set a goal + unlock date (default = start), "Add to safe", **progress ring** (react-native-svg) toward the goal, sealed treatment until unlock.
- **Progressive checklist** (`member_steps`): the member's `travel_proof` + `airbnb_paid` (+ `car_paid` if a car pool) with completion states, the next incomplete step surfaced ("Next: pay your car share"), and a "You're all set" state (the aggregate verified badge is Phase 7).
- Hooks `usePools` / `useContribute` / `usePersonalSafe` / `useMemberSteps`; `lib/money.ts` (cents helpers, split constant, unlock check); loading/empty/error throughout.
**Depends on:** Phase 2 (car pool, Airbnb total), Phase 3 (going-count for split), Phase 4 (travel_proof step).
**Done when (verified):** ✅ `tsc` passes · ✅ web + iOS + Android bundles compile · ✅ headless browser boots the client bundle (incl. react-native-svg) without runtime errors. Live: a going member sees auto-calculated Airbnb+car shares, logs partial + full contributions (each full one animates + checks its step), pools show locked-until-start, and the private safe tracks its goal and stays sealed — verified by the operator against their Supabase project after `db push`. **No real money moves.**

## Phase 6 — Airbnb voting + admin lock + countdown ✅ (2026-07-22)
**Goal:** the group agrees on and locks the Airbnb (foundation §6-5). **GroupPad seam stays manual (→ D7).**
**Deliverables (built):**
- **Voting** on trip detail (replaces the "Airbnb pick" placeholder): lists `airbnb_options` (title/image/cost/notes + "Open listing ↗"); **one vote per member** via `airbnb_votes` (unique `trip_id,user_id`) — changing your vote **moves** it (upsert); **live tallies + voter avatars**. Members add options via the **GROUPPAD SEAM** form (comment kept; the real browse/AI-compare replaces this later, D7). Voting **informs** — it never auto-decides.
- **Admin lock** (RLS `is_trip_admin`): an admin locks the official pick → `trips.airbnb_pick` + `status='locked'`; the group sees **"Official stay: &lt;title&gt;"** prominently, voting goes read-only (tallies remain). On lock, the **Airbnb pool total is seeded from the locked option's `total_cost`** if an admin hadn't set it manually. **Unlock/change** (with confirm) reopens voting → `status='planning'`.
- **Admin management** (host-only): promote/demote admins with **role badges**; the **max-3 (D8)** cap is enforced by the DB trigger and surfaced as a clear limit message.
- **Group progress + countdown panel** (prominent, near the top): Going count · # fully verified · Airbnb locked ✓/✗ · both pool progress bars · a large live countdown to `start_date`. Lightweight (seed of the Phase-2 readiness meter).
- Hooks `useAirbnbVotes` / `useLockPick` / `useTripAdmins`; loading/empty/error throughout. **No migration** — runs under Phase-1 schema + RLS.
**Depends on:** Phase 2 (options stub), Phase 3 (voters), Phase 1 (admins).
**Done when (verified):** ✅ `tsc` passes · ✅ web + iOS + Android bundles compile · ✅ headless browser boots the client bundle without runtime errors. Live: members vote; an admin locks a pick and the group sees the official stay + the Airbnb pool total flows from it; promoting a 4th admin is blocked — verified by the operator against their Supabase project.

## Phase 7 — Verified badge + step checklist ✅ (2026-07-22)
**Goal:** the per-member readiness signal + progressive flow (foundation §5, §6-6/7).
**Deliverables (built):**
- **Aggregate verified badge**, **derived** off `member_steps` (a computed hook — the built `trip_members` has no `is_verified` column): `verified = travel_proof AND airbnb_paid AND (car_paid only when a car pool exists)` (§5). `member_steps` is member-readable, so the badge shows for every member wherever they're listed — **RSVP wall, progress panel, member list** — with **partial progress ("2/3 steps")** for the rest.
- **One-time celebration:** when the current user crosses into fully-verified, a celebratory animation plays **once** (reuses the reanimated checkmark; a per-trip+user AsyncStorage flag makes it once-only across sessions).
- **Progressive step checklist** (built in Phase 5, completed here): `travel_proof` + `airbnb_paid` (+ `car_paid` when a car pool), completion states, next-step reveal, and the "You're all set" state — which the badge now realizes.
- Hook `useMemberVerification` (+ `VerifiedBadge` / `StepProgress`); loading/empty/error throughout. **No migration.**
**Depends on:** Phase 4 (travel proof), Phase 5 (money-in + checklist), Phase 6 (car pool presence).
**Done when (verified):** ✅ `tsc` passes · ✅ web + iOS + Android bundles compile · ✅ headless client boots clean. Live: a member who's completed travel proof + both payments shows the **verified badge** with the **one-time celebration**; others show partial progress — verified by the operator against their Supabase project.

## Phase 8 — Local ideas + Activity docs ✅ (2026-07-22)
**Goal:** inspiration + mixed-media documentation (foundation §6-8/9).
**Deliverables (built):**
- **Migration** `20260722140001_trip_media.sql`: **private `trip-media` bucket** (photos + videos, 50 MB cap) + storage RLS — upload to your own `<trip_id>/<user_id>/` folder, **read for ANY trip member** (media is shared trip-wide, unlike itineraries), update/delete uploader-only. Adds **`activities.url`** (a link, e.g. from a local idea). The `activities`/`activity_media` tables + RLS already existed (Phase 1) — no policy changes.
- **`nearby-ideas` edge function** (Deno): membership-checked; resolves trip coords (**geocodes the destination on demand** if missing, foundation §9); returns a **normalized** `{ name, category, description, address, lat, lng, rating, url, image, source }` list backed by **Google Places** (`GOOGLE_PLACES_API_KEY` in function secrets — never client). Photos resolved to **keyless** CDN URLs server-side (redirect follow) so the key never leaks. A `SOURCES` array is the seam for adding Ticketmaster/Eventbrite later behind the same shape. **Missing key → `{configured:false}`** and the UI degrades gracefully.
- **Local ideas** on trip detail (gated on a resolved destination): cards grouped by category (food/outdoors/nightlife/attractions/events) with image, rating, **distance from the destination**, open/directions link, and **"Add to activities"** (prefills a new activity from the idea). Results **cached per trip** (module cache) so views don't re-hit the API. Tasteful "add a destination" / "not set up" / geocode-on-demand states.
- **Activities** (replaces the placeholder): list (title/date/location); any member creates one (manual or from an idea); tapping opens the **activity detail** route (`app/activity/[id]`).
- **Activity documentation (mixed media):** upload **photos + videos** (expo-image-picker library multi-select / camera; expo-video player) with **per-item captions** → private `trip-media` → `activity_media` rows (photo|video|other). **Size guardrail (50 MB) with a friendly per-item message**, per-item upload progress, **signed URLs** for viewing, delete-your-own. Any member views all media for the trip.
- Hooks `useNearbyIdeas` / `useActivities` / `useActivityMedia`; loading/empty/error throughout. *(Reconciliations: `activities` has no `source` column — an idea-sourced activity just keeps the prefilled fields + `url`; `media_type` is photo|video|other, no `text` — captions are stored on each media row.)*
**Depends on:** Phase 2 (location). Independent of 4–7.
**Done when (verified):** ✅ `tsc` passes · ✅ web + iOS + Android bundles compile · ✅ headless browser boots the client bundle (incl. expo-video) without runtime errors. Live: on a trip with a real destination, members see nearby ideas, turn one into an activity, and upload a photo + a short video with captions that everyone on the trip can view — verified by the operator after `db push`, `functions deploy nearby-ideas`, and `secrets set GOOGLE_PLACES_API_KEY`.

## Phase 9 — Post-trip recap (collages + stats) ✅ (2026-07-22)
**Goal:** the shareable payoff — **collages + stats only** (→ D9; montage is Phase 2).
**Deliverables (built):**
- **Migration** `20260722150001_recap_distance.sql`: **`trip_distances`** (opt-in miles per user per trip, **self-only RLS** — location is sensitive, §12-5) + **`get_trip_distance_summary`** SECURITY DEFINER (exposes only the group **aggregate**, never per-user distances); **loosened `trip_recap` insert/update to any member** (was admin-only — the recap is member-generated).
- **Opt-in miles** (`DistanceOptIn` + `useTripDistance`): explicit per-trip "Track my distance on this trip" consent → **foreground** `expo-location` accumulation during the trip window (jitter/jump-filtered, throttle-persisted). Non-opted-in members are excluded silently; the stat shows **"N of M members tracked."** A clear **TODO seam** marks where background tracking + its permissions go.
- **Real stats** (`useTripStats` → `trip_recap.stats` jsonb): `places_visited` (activities with media or a linked place) + names; `miles_covered` (opt-in group total); `checklist_completed` (fully-verified members + total completed steps); plus cheap extras (confirmed travelers, total media, trip days). **Real numbers only.**
- **Recap generation** (`app/recap/[id]`, available when `status='completed'` or start_date passed): a **"Generate recap"** action computes the stats and assembles a **photo collage on-device from real `trip-media` photos**, captured with **react-native-view-shot** to an image, uploaded to `trip-media`, with its path stored on `trip_recap.collage_url`. Few/no photos → **stats-only** recap (graceful). The capture-a-styled-view surface is the **marked Phase-2 video-montage seam** (D9).
- **Recap screen:** the collage + stat tiles + cover/title/dates as one scrollable, screenshot-worthy "trip story."
- **Sharing:** exports the recap card (react-native-view-shot) → native **share sheet** (`expo-sharing`) / **Web Share API** with a **download fallback** on web; copy/screenshot fallback messaging.
- Hooks `useTripStats` / `useGenerateRecap` (as `useTripRecap`) / `useTripDistance`; loading/empty/error throughout.
**Depends on:** Phase 8 (media), Phase 7 (checklist stats), expo-location (miles; privacy §12-5).
**Done when (verified):** ✅ `tsc` passes · ✅ web + iOS + Android bundles compile · ✅ headless browser boots the client bundle without runtime errors. Live: on a past-dated trip with some photos, a member generates a recap showing a **real collage + real stats** and **shares/downloads** the recap image — verified by the operator after `db push`. **No auto video montage** (marked TODO seam only).

## Phase 10 — Branding ✅ (2026-07-22)
**Goal:** replace placeholders with the real identity (→ D11). **Full design system in `docs/design.md`.**
**Deliverables (built):**
- **Identity = Trippl.** `AppName`→`Trippl`, `appname`→`trippl` (slug + scheme `trippl://`), ids `com.trippl.app`; store display name Trippl. The brushstroke **mark** ships black + auto-generated **white** variant (`assets/logo/trippl-mark*.png`), placed in auth, the Trips header, and the splash (light black-on-white / dark white-on-grey). App **icon + splash + favicon + Android adaptive/monochrome** generated from the mark (padded on a white plate).
- **Theming system** (`ThemeProvider`): `mode` (light/dark/**system**) + `accent`, persisted to the **profile** (`profiles.theme_mode` / `accent_color`, migrations `20260722160001` + `…170001` default Black) **and** AsyncStorage (instant/offline). Accent resolves to **runtime CSS vars** — `--accent` (visible ink → `primary`/`ring`), `--accent-fill` (solid fill; `transparent`→outlined when it'd vanish), `--accent-fg` (contrast label) — so presets **and any custom hex** recolor live and no accent is ever invisible. Neutral tokens per spec (dark base `#1C1C1E`, not black). Presets: **Black (default, mode-aware monochrome)**, White (mode-aware inverse/outlined), vivid Red/Orange/Yellow/Green/Blue/Purple/Pink, + Custom picker. Monochrome accents auto-flip to stay visible; chromatics keep their vivid value both modes.
- **Typography:** system font primary (real SF on Apple) + **Inter** bundled (Android/web fallback; SF Pro never bundled); two-role Apple type scale (`constants/theme.ts`).
- **Restyle:** shared primitives (Button/Card/Text/Input) + tokens reworked, ad-hoc palette colors repointed to the accent (verified badge, progress fills, official/paid states), logo placement — every screen cohesive in both modes, nothing default-Tailwind.
- **Settings → Appearance** (Profile): Light/Dark/System toggle + accent swatches + Custom hex, applying live; Trippl logo + "made with Trippl" footer.
**Depends on:** name + logo (now chosen).
**Done when (verified):** ✅ `tsc` passes · ✅ web + iOS + Android bundles compile · ✅ headless screenshots render the Trippl logo (correct variant per mode) and confirm Light/Dark + the **Black default accent flipping black↔white** to stay visible in both modes. No `AppName`/`[LOGO SLOT]` remain. *(The provided `trippl-mark.png` wasn't in the repo, so the brushstroke mark is reused; swap an exact PNG at `assets/logo/trippl-mark.png` — everything stays wired.)*

## Phase 11 — Polish ⬜
**Goal:** make the (large) MVP feel finished.
**Deliverables:** empty/loading/error states (esp. AI-extraction failure, foundation §11); cross-platform layout pass; accessibility; performance; close or explicitly defer the open questions (foundation §12).
**Depends on:** the feature phases (3–9).
**Done when:** the core loop feels solid on all three platforms; open-question decisions are closed or explicitly deferred.

## Phase 12 — Deploy ⬜
**Goal:** shippable on all three platforms.
**Deliverables:** **EAS Build** (iOS + Android); **Expo web export → Vercel**; production Supabase (RLS verified, buckets, phone-auth provider, env); store submission prep. ⏳ App Store / Play + SMS provider lead time.
**Depends on:** Phases 10–11.
**Done when:** web is live on Vercel; iOS/Android builds produced via EAS and submitted; production Supabase verified.

---

# Phase 2 / Cool Backlog — ⬜ NOT built in MVP

Recorded so nothing is lost; **do not build until explicitly promoted** (foundation §8). Each is ⬜ not-started.

| Item | Notes |
|---|---|
| **Real payment custody (Stripe Connect + KYC)** | The **gated money phase** — flips on via the config seam built in Phase 5 (→ D3), not a rebuild. |
| **Room/bed-based cost splitting** | Replaces equal split; tied to a claim-your-room feature (→ D5). |
| **Auto video montage / "Trip Wrapped"** | Animated end-of-trip recap + superlatives; needs server-side rendering (→ D9). |
| **GroupPad integration** | Adapt the web-React rental engine into the Airbnb-selection module (browse→shortlist→AI compare→vote→lock); the seam is reserved at `airbnb_options` (→ D7). **Gated — on explicit instruction only.** |
| Group readiness meter | One live ring: confirmed count, saved vs goal, Airbnb/car locked. |
| Trip Pass | Stylized boarding-pass identity card per verified member. |
| Readiness leaderboard | First to fully verify. |
| AI trip concierge | Recommend spots; auto-build a day-by-day itinerary. |
| **Outfit planner** ✅ **(built 2026-07-22)** | **Promoted on explicit request** — Pinterest-powered outfit boards (MVP: link/pin + upload; no gated Pinterest API). Built: `outfits` / `outfit_items` / `outfit_reactions` tables + RLS (member-read, own-write; items gated to your own outfit) + a `link_previews` cache; **`link-preview` edge function** (Pinterest **oEmbed** + OpenGraph scrape fallback, cached, graceful timeout/blocked handling, works for any link) with a clearly-commented **PINTEREST OAUTH SEAM**; a **board screen** (`app/outfits/[id]`) grouping outfits **By Day / By Person** (default By Day) with a create flow (title + day chips + optional activity link + notes); a **moodboard screen** (`app/outfit/[id]`) — visual item grid, add items via **paste pin/link (auto-preview)** or **image upload** (reusing the private `trip-media` bucket + signed URLs), reorder + delete, link-out to source; a lightweight **love** reaction (`outfit_reactions`); outfit-planner entry on the trip detail; hooks `useOutfits` / `useOutfitItems` / `useLinkPreview` / `useOutfitReaction`. **Real Pinterest OAuth + image attachments beyond the reserved path not built** (OAuth seam only). |
| **Trip group chat** ✅ **(built 2026-07-22)** | **Promoted on explicit request** — real-time text chat per trip. Built: `messages` table + RLS (member-read, own-insert/delete, immutable) + `(trip_id, created_at)` index; **Supabase Realtime** (live INSERT/DELETE, filtered by trip, reconnect catch-up); a full chat screen (`app/chat/[id]`) — grouped bubbles (mine = accent, others = surface + name/avatar), day dividers, **accent send button** (black-default + custom, contrast-checked, never invisible), multiline composer, **Enter-to-send on web**, `KeyboardAvoidingView`, **optimistic send**, **load-more pagination** on scroll-up, empty/loading/error states, long-press delete-own; hooks `useMessages` / `useSendMessage` / `useChatRealtime` / `useUnreadCounts`; **unread indicators** (`trip_members.last_read_at` + `mark_chat_read` / `trip_unread_counts`) on the trip-detail chat entry + Trips cards, cleared on open; **best-effort push fan-out** (`notify-message` edge fn over stored `push_tokens`, excludes sender; fired fire-and-forget). **Announcements + image attachments not built** (attachment columns reserved). |
| In-trip expense splitting | Splitwise-style, with end-of-trip settle-up. |
| Collaborative itinerary + packing list | Day-by-day; shared + personal. |
| Shared collaborative playlist | Spotify / Apple Music. |
| Memory map | Pins every visited place + miles. |
| Home-screen countdown widget | iOS / Android. |
| Trip templates | Birthday / road-trip / beach-week; prefill activities + checklist. |

**Guardrail:** if a task touches anything in this table, stop and confirm it's being explicitly promoted before building — MVP scope is the ten core-loop phases above (foundation §8).
