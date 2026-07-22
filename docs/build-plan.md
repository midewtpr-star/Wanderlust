# AppName — Build Plan

> **What this governs:** the **phased build order** for the MVP, each phase marked not-started. Read this to know what to build next and what "done" means for each phase.
> **Authority:** subordinate to `foundation.md` (scope) and `decisions.md` (rationale); cites both by §/D-number. If this doc disagrees with `foundation.md`, **`foundation.md` wins.**
> Codename `AppName`; logo `[LOGO SLOT]` — TBD.

**Status key:** ⬜ not-started · 🟡 in progress · ✅ done · ⏳ external lead time.
**Every phase below is ⬜ not-started.** Update its marker (and add a progress note) as work happens.

**How to read this:** phases are listed in the intended build order (per brief). They're also roughly a dependency chain — the **keystone unlock** is Phases 1–2 (auth + schema + RLS + trip-create); once those exist, most feature phases (4–7) are independent "trip-scoped table + screens" slices and could reorder if needed. Branding (9) and Polish (10) ride on top of whatever's built. **GroupPad (11) is gated** — build nothing until explicitly instructed (→ D4).

---

## Phase 0 — Scaffold ⬜
**Goal:** a running Expo app on all three targets, empty but healthy.
**Deliverables:** Expo (latest stable) + React Native + TypeScript project; Expo Router route tree; NativeWind + React Native Reusables wired; `AppName` token + `[LOGO SLOT]` placeholders in place (→ D7); Supabase client configured (env, no secrets committed); base app shell / navigation skeleton.
**Depends on:** nothing (cold start).
**Done when:** the app boots on iOS simulator, Android emulator, and web export; a styled placeholder screen renders on all three; lint/typecheck pass.

## Phase 1 — Auth + Schema ⬜
**Goal:** users can sign in; the database exists with RLS. **This is half the keystone unlock (foundation §9).**
**Deliverables:** Supabase Auth wired into the app (method per foundation §12-2, 🕗); `profiles` mirror + signup population; all MVP tables from `data-model.md` created; **RLS policies** per the RLS sketch (→ D8); Storage buckets `cover-images` (trip-read) and `flight-tickets` (private).
**Depends on:** Phase 0.
**Done when:** a user can sign up / sign in on all platforms; `profiles` row is created; tables exist with RLS on; a smoke test confirms a non-member cannot read another trip's rows.

## Phase 2 — Trip create + Dashboard ⬜
**Goal:** the central object is real. **Completes the keystone unlock** — after this, features are trip-scoped slices.
**Deliverables:** create a trip (title, destination, dates, cover image upload → `cover-images`, description); creator becomes `host` in `trip_members`; a dashboard listing the user's trips and a single-trip view shell.
**Depends on:** Phases 1.
**Done when:** a user creates a trip, uploads a cover image, and sees it on their dashboard and trip view; RLS confirms only members see it.

## Phase 3 — Invites / RSVP / Flight-confirm ⬜
**Goal:** the group forms and commits — the commitment loop (foundation §11, → D6).
**Deliverables:** generate + share an invite link (deep-links into app/web); opening a valid invite joins the user as `member`; RSVP `going`/`maybe`/`not`; flight-ticket upload via **expo-image-picker / expo-camera** → private `flight-tickets` bucket → `flight_confirmations` row → member shows **Confirmed** (MVP: any upload confirms, foundation §12-1).
**Depends on:** Phase 2. (Camera/picker wrappers per foundation §9.)
**Done when:** an invited user joins via link, RSVPs, uploads/photographs a ticket, and flips to Confirmed; ticket file is private (only uploader + host can read).

## Phase 4 — Notes board ⬜
**Goal:** shared ideas + rental links + light discussion (foundation §6-5).
**Deliverables:** post notes (`body` and/or `link_url`), `kind` incl. `rental_link` (the GroupPad soft link, → seam); one level of replies (`parent_id`); trip-scoped list UI.
**Depends on:** Phase 2 (independent of 3).
**Done when:** members post ideas/links and reply; entries are visible to the whole trip and RLS-gated.

## Phase 5 — Activities ⬜
**Goal:** sub-events with their own RSVPs (foundation §6-6).
**Deliverables:** any member creates an activity (title, description, location, start/end); per-member `activity_rsvps` (`going`/`maybe`/`not`); activity list within the trip.
**Depends on:** Phase 2 (independent of 3–4).
**Done when:** a member creates an activity, the group RSVPs individually, and counts display.

## Phase 6 — Savings ledger ⬜
**Goal:** visible pooled commitment — **ledger only, no custody** (→ D3).
**Deliverables:** set `trips.savings_goal_cents`; log contributions (`savings_contributions`, append-only); pooled total = `SUM(amount_cents)`; **locked** until `trips.start_date`, then **unlocked** (derived UI state); progress-toward-goal display.
**Depends on:** Phase 2.
**Done when:** members log contributions, the total updates, and the locked/unlocked state flips on the start date. **No real money moves anywhere.**

## Phase 7 — Push notifications ⬜
**Goal:** re-engagement nudges (→ D5) — RSVP updates, new activities, savings reminders.
**Deliverables:** register devices via **expo-notifications** → `push_tokens`; a send mechanism (edge function + DB triggers vs external worker — decide here, foundation §12-6); notifications for the three MVP triggers via Expo Push API.
**Depends on:** Phases 3, 5, 6 (the events being notified about). ⏳ iOS needs Apple/APNs setup via EAS.
**Done when:** iOS + Android devices register tokens and receive the three notification types. **Web push = best-effort/TBD (foundation §12-4)** — decide fallback or scope out explicitly.

## Phase 8 — Branding ⬜
**Goal:** replace placeholders with the real identity (→ D7).
**Deliverables:** find-and-replace `AppName` → real name across code + docs; real logo into every `[LOGO SLOT]`; app icon, splash, theme colors; store metadata.
**Depends on:** name + logo chosen (foundation §12-8, 🕗). Can run once assets exist.
**Done when:** no `AppName` / `[LOGO SLOT]` placeholders remain; icons/splash render on all platforms.

## Phase 9 — Polish ⬜
**Goal:** make the MVP feel finished.
**Deliverables:** empty/loading/error states; cross-platform layout pass (web ↔ mobile); accessibility; performance; edge cases from the open questions resolved (foundation §12).
**Depends on:** the feature phases (3–7).
**Done when:** the core flows feel solid on all three platforms and the open-question decisions are closed or explicitly deferred.

## Phase 10 — Deploy ⬜
**Goal:** shippable on all three platforms.
**Deliverables:** **EAS Build** for iOS + Android; **Expo web export → Vercel**; Supabase project promoted to production (RLS verified, buckets, env); store submission prep. ⏳ App Store / Play review lead time.
**Depends on:** Phases 8–9.
**Done when:** web is live on Vercel; iOS/Android builds are produced via EAS and submitted; production Supabase is verified.

## Phase 11 — GroupPad integration ⬜ (GATED — do not start unprompted)
**Goal:** adapt GroupPad (browse → shortlist → AI compare → vote → lock) from its **web-React app into this React Native codebase** as a module (→ D4).
**Deliverables (later, on explicit instruction only):** `grouppad_*` tables (FK → trips, RLS-gated); activate the reserved `trips.grouppad_locked_rental_id` pointer + FK; the nav entry; the RN-adapted UI; migrate/reference `notes.kind = 'rental_link'` entries.
**Depends on:** explicit instruction (§ foundation §8 Deferred). Reuses the MVP trip/membership/RLS foundation.
**Done when:** N/A — **not started, and not to be started until explicitly instructed.** The MVP reserves the seam (data-model.md → GroupPad seam) and builds nothing here.
