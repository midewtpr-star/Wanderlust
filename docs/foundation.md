# Trippl — Foundation

> **Status:** v2 — revised from the full brief. Last updated 2026-07-22. **Changes from v1:** MVP core loop expanded to the ten-step commit-and-plan flow — travel-proof becomes a **dual-path hard-confirm** (AI-verified flight **or** self-declared driving), money becomes **two pools (Airbnb + car) + a personal safe** with equal-split auto-calc, plus Airbnb voting + admin-lock + countdown, verified badge, step checklist, local ideas, activity docs, and a post-trip recap. Auth is now **decided** (phone-first). A large **Phase 2 / backlog** is recorded (kept strictly out of MVP). Stack gains **AI vision extraction** for itineraries and **expo-location**.
> **Source of truth.** Every other doc references this; none restate it. If any doc disagrees with this one, **this one wins.**
> **Name (locked, Phase 10):** **Trippl**. The brushstroke mark + full theming/typography system are applied; the design system is recorded in **`docs/design.md`** (D11 resolved).

---

## How to use this doc system

Four docs, read in this order before any coding task so we don't drift:

| Order | Doc | Job |
|---|---|---|
| 1 | **foundation.md** (this file) | The seed. What the product is, who it's for, scope (MVP vs backlog), and the index of locked decisions. Source of truth. |
| 2 | **decisions.md** | The *why* behind each locked decision — context, rejected alternatives, consequences, revisit triggers. |
| 3 | **data-model.md** | The Postgres/Supabase table sketch and the reserved GroupPad seam. |
| 4 | **build-plan.md** | The phased MVP build order + the Phase 2 backlog, all marked not-started. |

**The contract:** read these four docs at the start of every coding task; when a decision changes, update **this file first**, then ripple the change into the others so no two disagree. Never invent to fill a gap — mark it 🕗 TBD and surface it. **Keep MVP tight:** anything in §8 → Deferred/Backlog does **not** get built until it's explicitly promoted.

**Status key (used system-wide):** ✅ locked / built · 🕗 TBD (decide later) · ⬜ planned / not-started · 🟡 in progress · **[LOCKED]** inline on a settled decision · ⏳ external lead time.

---

## §0 Build constraints

- **Team size / hours / budget:** 🕗 TBD — not specified. System is **solo-mode** by default (one progress track, no collaboration layer). Upgrade to team-mode if more than one person builds in parallel sessions.
- **Implication — scope discipline is the whole game.** This MVP is *ambitious* (AI verification, dual money pools, voting, recap). The forcing function is the MVP/backlog split in §8: the ten core-loop features are in; the entire Phase 2 list stays out until explicitly promoted. Backlog must never bleed into MVP.

## §1 What it is

**One-liner:** A group-trip planning app — Partiful, but for **trips**: a host creates a trip, invites the group, and everyone **commits and plans in one place** instead of a chaotic group chat.

The wedge isn't itinerary management. It's **converting a soft "we should all go somewhere" into hard-committed reality** — members who have *proven they're traveling*, *put money into the shared pools*, and *locked an Airbnb together* — with a visible per-member readiness signal that makes flaking socially obvious. It ships to **web, iOS, and Android from one codebase** so the whole group is reachable wherever they are.

## §2 Who it's for

Friend groups of **10–25 people** planning a **multi-day domestic trip**. The pain is social: the group chat is chaos, nobody commits, money is awkward, and plans never firm up. A **flagship use case is ~20 people driving** to a destination — so the "hard confirm" must treat **driving/carpool as first-class**, not a flight-only afterthought (see §6-3, decisions.md D6). The host (and up to 3 admins total) herds the group; members are everyone they invite.

## §3 Success & stage

- **Stage:** pre-build. This doc system is the foundation laid before scaffolding.
- **Success (MVP):** the commit-and-plan loop demonstrably works — members **hard-confirm travel** (flight or driving), **money lands in both pools + personal safes**, the group **locks an Airbnb**, **verified badges** light up as members finish their steps, and a **post-trip recap** gets shared.

## §4 Guiding principles

1. **One codebase, three platforms.** Web + iOS + Android from the same Expo/React Native tree; platform-specific code (camera, location, push) is the justified exception. *Why: the group spans every device.*
2. **Commitment is the core loop, and it's a *hard* confirm.** Proof-of-travel (flight or driving) + money-in + Airbnb-locked is the heartbeat — not a tapped RSVP. *Why: the deepest risk (§11) is that groups never truly commit.*
3. **Driving is first-class.** A self-declared driving confirmation verifies a member just as a flight does. *Why: the flagship group drives (§2).*
4. **Ledger-first, custody gated by config — not a rebuild.** MVP builds the full money UX as a ledger; real fund custody (Stripe Connect + KYC) is architected to **flip on via config later**. *Why: deliver the money experience without taking on money-transmission risk pre-validation (decisions.md D3).*
5. **Simplicity in the split.** Equal per-person split in MVP; room/bed-based split is Phase 2. *Why: equal split is understandable and unblocks the money loop now.*
6. **Reserve seams; don't build them.** GroupPad (Airbnb selection) and Stripe custody get marked seams and nothing more. *Why: unprompted deferred-scope building sinks the MVP.*
7. **Keep MVP tight.** The Phase 2 backlog (§8) is a parking lot, not a to-do list. *Why: an ambitious MVP only ships if the backlog stays parked.*
8. **Explicit over magic.** Visible, debuggable failure modes (an unscoped query is a bug; a failed AI extraction is a handled state, not a crash) over hidden cleverness.

## §5 Core model

**The Trip is the central object and the tenancy unit.** Almost everything is trip-scoped; access is gated by membership (decisions.md D12).

- **Roles:** one **host** (creator) plus **admins capped at 3 total per trip** (`trip_admins`, host counts toward the 3 — decisions.md D8). Admins lock the Airbnb pick and can manually override a legal-name mismatch on flight verification. Everyone else is a **member**.
- **Per-member progressive readiness** — the spine of the product:

```
invited ──► RSVP (soft: going/maybe/not) ──► TRAVEL PROOF (hard: flight-verified OR driving-declared)
        ──► MONEY IN (Airbnb share + car share) ──► all required steps done ──► ✅ VERIFIED BADGE
```

- **A member's required steps** = `travel_proof` + `airbnb_money` + (`car_money` **only if** the trip has a car pool). "Money in" for a pool = that member's contributions ≥ their equal-split share. The **verified badge** appears beside their name once all required steps are complete. A **step checklist** materializes this, and completing a step plays a completion animation and reveals what's left (§6-7).
- **Money model:** two shared **pools** — `airbnb` and `car` (car optional) — each with a known `total` that drives an **equal per-person split**; members log **contributions** (ledger). Plus a private **personal safe** per member (their own saved amount). Every pool total and the personal safe show as **locked** until the trip start date, then **unlock** — a derived UI state over a ledger (decisions.md D3).
- **Airbnb selection:** members add options (MVP: manual link + total-cost), the group **votes**, an admin **locks** the official pick (`trips.airbnb_pick`). This step **is the GroupPad seam** (§9, decisions.md D7).
- **Trip lifecycle:** `planning → locked` (Airbnb locked) `→ active` (start date; money unlocks; countdown hits zero) `→ completed` (after end date; recap).
- **User-scoped, not trip-scoped:** `profiles`, `push_tokens`.

See **data-model.md** for tables.

## §6 Core flows & surfaces

**Surfaces:** iOS, Android, and web — one Expo/React Native codebase, one Expo Router tree. A Partiful-style **invite link** deep-links into the app (or web).

**The ten MVP core-loop flows (this is exactly the In-scope list in §8):**

1. **Trip creation** — cover/poster image, destination/location (geocoded), dates, **car rental** (link or confirmation number), and an **Airbnb-selection step** (MVP stub: manual Airbnb link + total-cost entry; **this is the GroupPad seam**).
2. **Invites + RSVP** — shareable invite link; RSVP `going`/`maybe`/`not` (a soft, verbal "I'm coming").
3. **Travel proof (hard confirm)** — a member proves they're actually traveling via **either**:
   a. **Flight:** upload/photograph the itinerary → **AI/vision extraction** returns `{passenger_name, confirmation_number, arrival_airport, dates}` → **geocode the arrival airport and verify proximity** to the trip's city → **match passenger name** against the member's stored name (**admin manual-override** for legal-name mismatches) → on success, play a **"Flight itinerary verified"** animation.
   b. **Driving/carpool:** a **self-declared driving confirmation** — verifies road-trippers too (first-class, §2).
4. **Money (ledger-first)** — two **separate pools** (Airbnb, car); once each total is known, auto-calc an **equal per-person split**; members log contributions to each pool; each pool total shows **locked until start date, then unlocks**. Plus a **personal safe** (private saved amount), also locked until start.
5. **Airbnb voting + lock** — the group votes among options; the creator/an admin **locks** the official pick. Once locked, the whole group sees the selection + overall progress + a **live date countdown**.
6. **Verified badge** — a per-member badge appears once **that member** finishes all required steps (travel proof + Airbnb money in + car money in).
7. **Step checklist + progressive flow** — each member has a checklist; completing a step plays a checkmark/completion animation, then advances to reveal what's left.
8. **Local ideas** (once location verified) — pull nearby events + things-to-do around the destination (places/events API) as activity inspiration.
9. **Activity documentation** — members document activities with **mixed media** (photos, text, video, other).
10. **Post-trip recap (MVP version)** — upload trip photos/videos → generate **photo collages + a Strava-style stats recap** (places visited, miles covered, checklist items completed) → **shareable** to social. *(Auto video montages are Phase 2 — decisions.md D9.)*

## §7 Locked decisions — index

Numbered so other docs cite `foundation.md §7 D3`. **Full rationale lives in `decisions.md`, keyed by the same D-number** — this table is the authoritative *list*; decisions.md is the authoritative *reasoning*.

| # | Decision | One-line reasoning |
|---|---|---|
| **D1** | **Locked stack: Expo (latest stable) + React Native + TS**, Expo Router, NativeWind, React Native Reusables, Supabase (Auth/Postgres+RLS/Storage), **AI vision extraction** for itineraries, expo-location/-camera/-image-picker/-notifications, EAS + Expo web export on Vercel | One toolchain for iOS + Android + web, plus the AI + native pieces the core loop needs. |
| **D2** | **One codebase for all three platforms** | The group spans every device; a shared Expo Router tree keeps one UI source of truth. |
| **D3** | **Money is ledger-first; real custody (Stripe Connect + KYC) is a gated phase that flips on via config, not a rebuild** | Deliver the full money UX now without money-transmission risk pre-validation. |
| **D4** | **Auth is phone-first (Partiful-style) with email fallback** | Contact-based invites work best off phone identity. |
| **D5** | **Cost split is equal per-person in MVP; room/bed-based split is Phase 2** | Equal split is understandable and unblocks the money loop; per-room split needs a claim-your-room feature. |
| **D6** | **Travel proof = hard confirm via AI-verified flight OR self-declared driving**; flight path does AI extraction → geocode proximity → name match with admin override | A proof (or an explicit driving declaration) is a real commitment signal; driving must be first-class. |
| **D7** | **GroupPad = the Airbnb-selection module, adapted from its web-React app later on explicit instruction**; MVP stubs manual link + total-cost; seam reserved at `airbnb_options` | The rental browse→shortlist→AI-compare→vote→lock engine is a whole product; stub now, integrate later. |
| **D8** | **Admins capped at 3 per trip** (host counts toward the 3) | Keeps authority (lock pick, name-match override) tight in a large group. |
| **D9** | **Post-trip recap = collages + stats in MVP; auto video montage is Phase 2** | Montages need server-side rendering; collages + stats ship client-side now. |
| **D10** | **Push notifications in MVP** (expo-notifications) | Re-engagement is part of the commitment loop. |
| **D11** | **Brand = Trippl** (resolved Phase 10): mark, runtime theming (mode + accent), Apple-like type; see `docs/design.md` | Placeholder token made the swap painless; a token + runtime-accent system keeps every screen cohesive + personalizable. |
| **D12** | **Tenancy = Supabase RLS, scoped by `trip_members`** (admins via `trip_admins`) | Trip is the isolation unit; RLS makes an unscoped read a policy failure, not a silent leak. |

## §8 Scope

### In (v1 MVP) — the ten core-loop flows in §6

Trip creation (incl. manual Airbnb-selection stub) · Invites + RSVP · Travel proof (flight AI-verify + driving declaration) · Money ledger (two pools + equal split + personal safe) · Airbnb voting + admin lock + countdown · Verified badge · Step checklist + progressive flow · Local ideas · Activity documentation (mixed media) · Post-trip recap (collages + stats).

### Out / cut (never build unprompted in MVP)

- **Real payment custody / fund movement** — ledger only in MVP; Stripe Connect is the gated money phase (→ D3, backlog).
- **The GroupPad rental engine** (browse → like → shortlist → AI compare → vote → lock) — MVP ships the manual Airbnb stub; GroupPad is adapted in later (→ D7, backlog).
- **Auto video montages** — recap is collages + stats only (→ D9, backlog).
- **Room/bed-based cost splitting** — equal split only (→ D5, backlog).
- Anything in the Deferred/Backlog list below.

### Deferred — Phase 2 / Cool Backlog (recorded, **not** built; kept out of MVP)

Group readiness meter (live ring) · Trip Pass (boarding-pass identity card) · Readiness leaderboard · AI trip concierge (auto day-by-day itinerary) · Trip chat + announcements · In-trip Splitwise-style expense splitting + settle-up · Collaborative itinerary + packing list · Shared collaborative playlist (Spotify/Apple Music) · "Trip Wrapped" animated recap + auto video montage · Memory map (pins + miles) · Home-screen countdown widget · Trip templates (birthday/road-trip/beach-week) · **Real payment custody (Stripe Connect)** — the gated money phase · **Room/bed-based cost splitting**. Full list mirrored in **build-plan.md → Phase 2 backlog**.

> **Promoted (2026-07-22):** two items were **explicitly promoted** from the backlog and built, on instruction — the rest stays parked (§4-7):
> - **Trip chat** (from "Trip chat + announcements") → **real-time group messaging** (per-trip `messages` table + RLS + Supabase Realtime; see build-plan and data-model → `messages`). **Announcements** + image attachments remain deferred (columns reserved, unbuilt).
> - **Outfit planner** (Pinterest-powered) → per-member **outfit boards** (`outfits` / `outfit_items` / `outfit_reactions` + a `link-preview` edge function; link/pin + image-upload based). The real **Pinterest OAuth** integration is deferred behind a documented seam.
> - **Shared bring list** → a **claimable group packing/supplies checklist** (`bring_items` / `bring_claims` + RLS: member-read, add items, edit/delete creator-or-admin, claim/unclaim self-only).

## §9 Architecture keystones

- **Tenancy / isolation:** Supabase RLS; every trip-scoped table gated on membership in `trip_members`; admins (`trip_admins`, **max 3, enforced by trigger**) elevated. Personal safes + flight itineraries are **private** (owner/admins only). (→ D12)
- **Keystone unlock:** **auth + schema + RLS + trip-create.** Once a trip and membership exist under RLS, every remaining feature is "just another trip-scoped table." Build first (build-plan Phase 1–2).
- **Travel-proof pipeline (build driving first, then flight):** driving = a self-declared row → verified. Flight = an **isolated AI-extraction service seam** (upload → vision/LLM returns structured fields → geocode arrival airport → proximity check vs geocoded trip city → name match → admin-override path). Keep the AI call and geocoding behind a small server-side/edge boundary, not inline in the client. (→ D6)
- **Config-flippable custody seam:** the money layer is written against a ledger interface with a `custody`/provider switch, so Stripe Connect flips on later without a rewrite. (→ D3)
- **GroupPad seam:** attaches at the **Airbnb-selection point** (`airbnb_options` + votes + `trips.airbnb_pick`). MVP is the manual stub; GroupPad's `grouppad_*` tables + adapted RN UI plug in here later. (→ D7)
- **Cross-platform wrappers:** `expo-camera`/`expo-image-picker`, `expo-location`, `expo-notifications` isolated behind small wrappers, not sprinkled through screens. (→ D1/D2)

## §10 Known scale seams

- **AI vision extraction** is an external API (cost + latency + accuracy). MVP: one call per flight upload, a handled `failed` state, and an admin manual path. Batch/caching only if volume grows.
- **Recap collages** are generated client-side in MVP (auto video montage deferred to server-side rendering, D9).
- **Equal-split** is computed on read (`total_cents / member_count`); rounding-remainder policy is open (§12).
- **Miles/places for recap** come from `expo-location`; tracking cadence + privacy are open (§12).
- **Places/events API** for local ideas — provider + rate limits TBD (§12); fetched on demand, not persisted (results can be saved as `activities`).
- **Push fan-out** is a simple loop over device tokens via Expo Push API; web push is best-effort (§12).
- **Money totals** summed on read — fine at 10–25 members.

## §11 The deepest risk

**The product dies if groups never actually commit.** Everything downstream (money, Airbnb, recap) depends on members crossing from soft RSVP to **hard proof-of-travel**. The core bet is that the **dual-path travel proof + money-in + Airbnb-lock progressive flow** (with a visible verified badge) converts a 10–25 person group better than a group chat does. **Driving must be as first-class as flying**, or the flagship road-trip cohort is locked out.

Secondary bet: **AI flight verification reliability.** The "Flight itinerary verified" moment is a flagship delight — if extraction/geocoding/name-matching is flaky or expensive, it breaks or annoys. The admin-override + driving paths are the safety valves.

**Honest scope note:** this MVP is large. If timeline pressure hits, the heaviest/riskiest slices to *trim or simplify* (not silently) are **AI flight verification** (fall back to admin manual-verify), **post-trip recap**, and **local ideas API**. These are flagged for sequencing awareness — they are still in MVP unless explicitly cut.

## §12 Open questions

Resolved since v1: **auth** (phone-first, D4); **ledger semantics** (ledger-first, append-only, D3). Still open:

1. **AI extraction provider/model + cost ceiling + accuracy fallback** — which vision/LLM API; per-call budget; what happens when extraction fails (admin manual-verify assumed). 🕗
2. **Arrival-airport "near" threshold** — how close to the trip city counts (miles radius? same metro/CBSA?). 🕗
3. **Equal-split rounding** — who absorbs the remainder cents when `total` doesn't divide evenly. 🕗
4. **Personal safe ↔ pools relationship** — is the safe a purely personal target independent of pool obligations, or does it feed pool contributions? MVP assumption: **independent personal ledger**. 🕗 confirm.
5. **Miles source + location privacy** — is "miles covered" from live `expo-location` tracking during the trip, and what's the consent/privacy model? 🕗
6. **Places/events API provider** — Google Places / Foursquare / Ticketmaster / Eventbrite? 🕗
7. **Car pool optionality** — trips without a car rental have no car pool and no `car_money` step (assumed). 🕗 confirm.
8. **Airbnb voting mechanics** — one vote per member (assumed) vs multi-like/ranked; can an admin lock against the vote? 🕗
9. **Media limits** — size/type/count caps for activity + recap uploads. 🕗
10. **Web push** — required on web, or iOS/Android only with web best-effort? 🕗 (affects D10).
11. **Real name & branding, team-vs-solo build constraints (§0).** 🕗
