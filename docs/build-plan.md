# AppName — Build Plan

> **What this governs:** the **phased MVP build order** + the **Phase 2 backlog**, each marked not-started. Read this to know what to build next and what "done" means.
> **Authority:** subordinate to `foundation.md` (scope) and `decisions.md` (rationale); cites both by §/D-number. If this doc disagrees with `foundation.md`, **`foundation.md` wins.**
> **Revised for v2.** Codename `AppName`; logo `[LOGO SLOT]` — TBD.

**Status key:** ⬜ not-started · 🟡 in progress · ✅ done · ⏳ external lead time.
**Every phase and backlog item below is ⬜ not-started.** Update markers (+ a progress note) as work happens.

**How to read this:** MVP phases are in intended build order (per brief). The **keystone unlock** is Phases 1–2 (auth + schema + RLS + trip-create); after that, most feature phases are trip-scoped slices. **Keep MVP tight — the Phase 2 backlog below is a parking lot, not a queue; nothing there is built until explicitly promoted (foundation §4-7, §8).**

---

# MVP

## Phase 0 — Scaffold ⬜
**Goal:** a running Expo app on all three targets, empty but healthy.
**Deliverables:** Expo (latest stable) + RN + TS; Expo Router tree; NativeWind + React Native Reusables wired; `AppName` token + `[LOGO SLOT]` placeholders (→ D11); Supabase client configured (env, no secrets committed); app shell / nav skeleton.
**Depends on:** nothing (cold start).
**Done when:** boots on iOS sim, Android emulator, and web export; a styled placeholder renders on all three; lint/typecheck pass.

## Phase 1 — Auth + Schema ⬜
**Goal:** phone-first sign-in; the database exists with RLS. **Half the keystone unlock (foundation §9).**
**Deliverables:** **Supabase phone-first Auth + email fallback** (→ D4); `profiles` mirror (incl. `full_name` for name-matching); **all MVP tables** (data-model.md); **RLS policies** (→ D12); **`trip_admins` max-3 trigger** (→ D8); Storage buckets `posters`, `flight-itineraries` (private), `trip-media`.
**Depends on:** Phase 0.
**Done when:** a user signs in by phone (email fallback works); `profiles` row created; tables exist with RLS on; a smoke test confirms a non-member cannot read another trip's rows and a 4th admin insert is rejected.

## Phase 2 — Trip create + Dashboard ⬜
**Goal:** the central object is real. **Completes the keystone unlock.**
**Deliverables:** create a trip — cover/poster upload (→ `posters`), location + **geocode** (`destination_*` for later proximity checks), dates, **car rental** (`car_rental_ref`), and the **Airbnb-selection stub** (manual link + total-cost, the GroupPad seam → D7); creator seeded as `host` + `trip_admins`; a dashboard listing the user's trips + a single-trip view shell.
**Depends on:** Phase 1.
**Done when:** a user creates a trip with all fields, sees it on the dashboard/trip view; RLS confirms only members see it.

## Phase 3 — Invites + RSVP ⬜
**Goal:** the group forms and softly commits (foundation §6-2).
**Deliverables:** generate + share a Partiful-style invite link (deep-links into app/web); opening a valid invite joins as `member`; **RSVP** `going`/`maybe`/`not` (`rsvps`).
**Depends on:** Phase 2.
**Done when:** an invited user joins via link and RSVPs; membership + RSVP are RLS-gated.

## Phase 4 — Travel proof (driving first, then AI flight verify) ⬜
**Goal:** the **hard confirm** (foundation §11, → D6). Build the simple path first.
**Deliverables:**
- **4a — Driving:** self-declared driving confirmation → `travel_proofs(type='driving', verified=true)`. First-class (foundation §2).
- **4b — Flight AI verify:** upload/photograph itinerary (expo-camera/-image-picker) → **private** `flight-itineraries` → **AI/vision extraction** `{passenger_name, confirmation_number, arrival_airport, dates}` (server/edge boundary) → **geocode** arrival airport → **proximity check** vs `trips.destination_*` → **name match** vs `profiles.full_name` with **admin override** for mismatches → **"Flight itinerary verified" animation** on success; handled `failed`/`mismatch` states.
**Depends on:** Phase 2 (geocoded destination), Phase 3 (members). ⏳ AI provider selection (foundation §12-1).
**Done when:** a road-tripper verifies via driving; a flyer uploads an itinerary and gets verified through extraction→proximity→name-match (with the override path working); failures degrade gracefully. Itinerary files stay private (owner + admins).

## Phase 5 — Money ledger (pools + personal safe) ⬜
**Goal:** the full money UX as a **ledger, no custody** (→ D3, D5).
**Deliverables:** `money_pools` for `airbnb` (always) and `car` (if `car_rental_ref`); set totals (Airbnb from the option's `total_cost_cents`); **equal per-person split** = `total / member_count`; log `contributions`; **personal_safes + safe_deposits** (private); **locked-until-`unlock_date`** UI on every pool + safe; progress-toward-share display. **Write the money layer against a ledger/provider interface with a custody switch** so Stripe flips on later (→ D3).
**Depends on:** Phase 2 (car pool, Airbnb total), Phase 3 (member_count for split).
**Done when:** members log contributions to each pool and to their private safe; totals + per-person shares display; locked/unlocked flips on the start date. **No real money moves.**

## Phase 6 — Airbnb voting + admin lock + countdown ⬜
**Goal:** the group agrees on and locks the Airbnb (foundation §6-5). **GroupPad seam stays manual (→ D7).**
**Deliverables:** add `airbnb_options` (manual link + total-cost); group **votes** (one per member, foundation §12-8); an **admin locks** `trips.airbnb_pick` (→ `status='locked'`); locked view shows the selection + overall progress + a **live date countdown**.
**Depends on:** Phase 2 (options stub), Phase 3 (voters), Phase 1 (admins).
**Done when:** members add options and vote; an admin locks the pick; the group sees the locked selection, progress, and a running countdown.

## Phase 7 — Verified badge + step checklist ⬜
**Goal:** the per-member readiness signal + progressive flow (foundation §5, §6-6/7).
**Deliverables:** materialize `member_steps` (`travel_proof`, `airbnb_money`, `car_money` when a car pool exists); "money in" = contributions ≥ equal share; **verified badge** (`trip_members.is_verified`) when all required steps complete; **completion animations** + progressive reveal of remaining steps.
**Depends on:** Phase 4 (travel proof), Phase 5 (money-in), Phase 6 (car pool presence).
**Done when:** a member who finishes travel proof + Airbnb money (+ car money) shows the verified badge; completing a step animates and advances the checklist.

## Phase 8 — Local ideas + Activity docs ⬜
**Goal:** inspiration + mixed-media documentation (foundation §6-8/9).
**Deliverables:** once location is set/verified, pull **nearby events + things-to-do** from a places/events API (provider TBD, foundation §12-6) — fetched on demand, savable as `activities(source='local_idea')`; create `activities`; document with `activity_media` (**photo/text/video/other**) → `trip-media`.
**Depends on:** Phase 2 (location). Independent of 4–7.
**Done when:** members see nearby ideas, create activities, and attach mixed media; all trip-scoped/RLS-gated.

## Phase 9 — Post-trip recap (collages + stats) ⬜
**Goal:** the shareable payoff — **collages + stats only** (→ D9; montage is Phase 2).
**Deliverables:** upload trip photos/videos → generate **photo collages** (client-side) + **`recap_stats`** (places visited, **miles covered** via expo-location, checklist items completed) → `trip_recap` with a **shareable** link to social.
**Depends on:** Phase 8 (media), Phase 7 (checklist stats), expo-location (miles; privacy open, foundation §12-5).
**Done when:** a trip generates collages + a stats recap that shares out. **No auto video montage.**

## Phase 10 — Branding ⬜
**Goal:** replace placeholders with the real identity (→ D11).
**Deliverables:** find-and-replace `AppName` → real name (code + docs); real logo into every `[LOGO SLOT]`; app icon, splash, theme; store metadata.
**Depends on:** name + logo chosen (foundation §12-11, 🕗).
**Done when:** no `AppName` / `[LOGO SLOT]` remain; icons/splash render on all platforms.

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
| Trip chat + announcements | Replace the group chat. |
| In-trip expense splitting | Splitwise-style, with end-of-trip settle-up. |
| Collaborative itinerary + packing list | Day-by-day; shared + personal. |
| Shared collaborative playlist | Spotify / Apple Music. |
| Memory map | Pins every visited place + miles. |
| Home-screen countdown widget | iOS / Android. |
| Trip templates | Birthday / road-trip / beach-week; prefill activities + checklist. |

**Guardrail:** if a task touches anything in this table, stop and confirm it's being explicitly promoted before building — MVP scope is the ten core-loop phases above (foundation §8).
