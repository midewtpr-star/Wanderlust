# Trippl — Decisions

> **What this governs:** the *why* behind each locked decision — context, the alternative we rejected, consequences, and what would make us revisit. The authoritative **rationale record**.
> **Authority:** the *set* of locked decisions and product scope is owned by `foundation.md §7`. This file never introduces a decision not indexed there; if the two disagree on whether/what a decision is, **`foundation.md` wins**. This file *explains*, it doesn't override.
> Keyed by the same **D-numbers** as `foundation.md §7`. **Revised for v2** (the full commit-and-plan brief). Codename `Trippl`, logo `[LOGO SLOT]` — TBD.

**Status key:** ✅ locked · 🕗 TBD · **[LOCKED]** settled.

---

## D1 — Locked stack: Expo + React Native + TypeScript (+ AI vision + native modules) ✅ [LOCKED]

**Context.** Ship to web, iOS, and Android for a 10–25 person group, with file storage, phone auth, an AI itinerary reader, and device camera/location/push.

**Decision.** Lock:
- **Expo (latest stable SDK) + React Native + TypeScript**; **Expo Router** (file-based, all three platforms).
- **NativeWind** (Tailwind for RN) + **React Native Reusables** (shadcn-style primitives).
- **Supabase** — Auth (phone-first, D4), Postgres + RLS, Storage (posters, flight itineraries, trip media).
- **AI extraction for flight itineraries** — a vision/LLM step that reads an uploaded itinerary and returns structured `{passenger_name, confirmation_number, arrival_airport, dates}`; **geocode** the arrival airport to validate proximity to the trip city.
- **Native modules:** expo-image-picker / expo-camera (itineraries + media), **expo-location** (miles/places for recap), expo-notifications (push).
- **Deploy:** EAS Build (iOS + Android); Expo web export on Vercel; Supabase backend.

**Rationale.** One Expo/Expo Router toolchain genuinely targets all three platforms; NativeWind + React Native Reusables keep a Tailwind/shadcn DX; Supabase collapses auth + DB + storage + RLS for a small build. The AI + native pieces are exactly what the core loop (travel proof, recap) requires.

**Rejected alternatives.** React + Vite web-only (can't ship native or use camera/location); bare React Native (more native config, no unified web); separate native + web codebases (fragmentation).

**Consequences.** Platform-divergent code (camera, location, push, web export) lives behind wrappers (foundation §9). The AI vision step is an external dependency with cost/latency/accuracy to manage (foundation §10, §12-1).

**Revisit triggers.** A required native capability Expo can't support → config plugin/bare workflow before abandoning the stack.

---

## D2 — One codebase for all three platforms ✅ [LOCKED]

**Context.** The group spans iOS, Android, and desktop/web.

**Decision.** A **single Expo/React Native codebase** produces web, iOS, and Android; platform-specific behavior is the justified exception.

**Rationale.** One UI source of truth ships features everywhere at once and concentrates limited build hours on one codebase.

**Rejected alternatives.** Forked codebases or web-app + separate native apps — fragmentation of code and group.

**Consequences.** Accept platform-conditional code (camera, location, push, deep links, web export) behind wrappers.

**Revisit triggers.** A platform needing a fundamentally different UX that can't live in the shared tree.

---

## D3 — Money is ledger-first; real custody is a gated, config-flippable phase ✅ [LOCKED]

**Context.** Pooling money (two pools + a personal safe) is core, but *holding* funds is a regulated activity (money transmission, KYC).

**Decision.** Build the **full money UX now as a ledger**: members log contributions to the Airbnb and car pools and to their personal safe; the app sums totals, computes the equal split (D5), and shows each pool + safe **locked until the trip start date, then unlocked** (a derived UI state). The app **never holds or moves funds** in MVP. **Real custody (Stripe Connect + KYC/compliance) is a documented gated phase, architected to flip on via config — not a rebuild:** the money layer is written against a ledger/provider interface with a custody switch.

**Rationale.** Delivers the money experience (visible progress, split clarity) with zero money-transmission risk before validation, while guaranteeing the later custody upgrade isn't a teardown.

**Rejected alternatives.** Real custody in MVP (regulatory/trust burden, wrong pre-validation bet); a throwaway ledger not designed for custody (forces a rewrite later); no money UX until custody is ready (kills a core loop).

**Consequences.** "Locked" is a UI state, not escrow; the ledger is honor-system in MVP. Contributions are append-only; corrections are new entries (foundation §12-3 rounding is open). Nothing in schema/UI may imply the app holds money. The provider seam must exist from day one.

**Revisit triggers.** Validated demand → flip the custody config and integrate Stripe Connect as the gated phase.

---

## D4 — Auth is phone-first with email fallback ✅ [LOCKED]

**Context.** Invites are contact-based and Partiful-style; identity should match how people share.

**Decision.** **Supabase Auth, phone-first** (SMS/OTP) with **email as fallback**.

**Rationale.** Phone identity best fits contact-based invites and a friend-group product; email fallback covers users without reliable SMS.

**Rejected alternatives.** Email-only (weaker fit for contact invites); social OAuth-only (extra friction, not contact-native). *(This resolves the v1 open question on auth method.)*

**Consequences.** SMS/OTP delivery cost + deliverability to manage; phone is the primary contact key for invites. Profiles still carry a display name and a stored name for flight name-matching (D6, data-model → profiles).

**Revisit triggers.** SMS cost/deliverability problems → weight email or add an OAuth option.

---

## D5 — Cost split is equal per-person in MVP; room/bed-based is Phase 2 ✅ [LOCKED]

**Context.** Once a pool's total is known, members owe a share. Splitting can be equal or room/bed-weighted.

**Decision.** **Equal per-person split** in MVP: `share = pool.total_cents / member_count`. **Room/bed-based split is Phase 2**, tied to a future claim-your-room feature.

**Rationale.** Equal split is instantly understandable and unblocks the money loop and the "money in" badge criterion now; per-room split needs room inventory + claiming that doesn't exist yet.

**Rejected alternatives.** Room/bed split in MVP (needs a whole claim-your-room subsystem); fully custom per-person amounts (opens disputes; out of scope).

**Consequences.** "Money in" for a pool = a member's contributions ≥ their equal share. Rounding remainder policy is open (foundation §12-3). Split recomputes as `member_count` changes.

**Revisit triggers.** Demand for fairness by room → build claim-your-room + weighted split (Phase 2).

---

## D6 — Travel proof: AI-verified flight OR self-declared driving ✅ [LOCKED]

**Context.** The hard-confirm signal must work for both flyers and the flagship **~20-people-driving** cohort (foundation §2, §11).

**Decision.** A member moves to **verified travel** via **either**:
- **Flight:** upload/photograph the itinerary → **AI/vision extraction** returns `{passenger_name, confirmation_number, arrival_airport, dates}` → **geocode the arrival airport** and verify **proximity to the trip city** → **match `passenger_name`** against the member's stored name, with **admin manual-override** for legal-name mismatches → on success, play a **"Flight itinerary verified"** animation.
- **Driving/carpool:** a **self-declared driving confirmation** → verified immediately. First-class, equal standing to a flight.

**Rationale.** A real artifact (or an explicit driving declaration) is a far stronger commitment than a tapped button. Making driving first-class is non-negotiable for the flagship group. AI extraction makes the flight path a delightful, near-automatic "verified" moment.

**Rejected alternatives.** Flight-only proof (locks out road-trippers — unacceptable); a plain "I'm confirmed" button (too cheap a signal); payment as the confirm signal (collides with no-custody, D3); fully manual admin verification of every flight (doesn't scale, loses the delight — kept only as the override/fallback).

**Consequences.** Flight itineraries are **sensitive** → private storage, RLS to owner + admins, never logged. Extraction can **fail** — a handled state plus admin manual-verify (foundation §12-1). The airport "near" threshold and provider are open (§12-1,2). Name matching needs the member's stored/legal name (D4, data-model → profiles). Driving proof is trust-based in MVP.

**Revisit triggers.** Fake/abused driving declarations → add a lightweight corroboration; poor AI accuracy → tune threshold or lean on admin path.

---

## D7 — GroupPad is the Airbnb-selection module, adapted later ✅ [LOCKED]

**Context.** Choosing the Airbnb is a whole decision flow. **GroupPad** — an existing **web-React** product (browse rentals → like → shortlist → **AI compare** → vote → **lock a winner**) — already does it.

**Decision.** **Do not build a rental engine now.** MVP ships the **Airbnb-selection step as a manual stub**: members add options as an **Airbnb link + total-cost entry**, the group votes, an admin locks the pick. **GroupPad will be adapted/rebuilt from its web-React app into this React Native codebase as that module later, on explicit instruction.** Reserve the **seam at `airbnb_options`** (+ votes + `trips.airbnb_pick`); build nothing for GroupPad now.

**Rationale.** Bolting a second product into MVP blows scope; the manual stub delivers the lock-an-Airbnb loop today, and the reserved seam keeps the later swap clean. GroupPad being web-React means the adaptation (onto NativeWind / React Native Reusables) is real work — explicitly later.

**Rejected alternatives.** Build rental voting/AI-compare now (out of scope); embed GroupPad's web app in a WebView (not the intent — a native-adapted module is; WebView only a possible stopgap); no seam (messy retrofit).

**Consequences.** MVP `airbnb_options` are manual; GroupPad later supersedes/feeds them and ultimately sets `trips.airbnb_pick`. The seam (tables + nav entry) stays present-but-unbuilt.

**Revisit triggers.** Explicit instruction → adapt GroupPad into the Airbnb-selection module (build-plan → backlog, gated).

---

## D8 — Admins capped at 3 per trip ✅ [LOCKED]

**Context.** Admin powers (lock the Airbnb pick, override a flight name-mismatch, edit the trip) are sensitive in a large group.

**Decision.** **At most 3 admins per trip**, host included, tracked in `trip_admins` and **enforced by a trigger** (reject insert when the trip already has 3).

**Rationale.** Keeps authority tight and accountable; avoids "everyone's an admin" chaos in a 25-person trip.

**Rejected alternatives.** Unlimited admins (dilutes accountability); host-only (too little redundancy if the host is unavailable).

**Consequences.** Enforcement is a DB trigger, not just app logic (foundation §9, data-model → trip_admins). UI must handle "admin slots full."

**Revisit triggers.** Trips needing more delegated authority → raise the cap or add scoped sub-roles.

---

## D9 — Post-trip recap = collages + stats in MVP; auto video montage is Phase 2 ✅ [LOCKED]

**Context.** The recap is the shareable payoff. Full auto video montages need server-side rendering.

**Decision.** **MVP recap = photo collages + a Strava-style stats recap** (places visited, miles covered, checklist items completed), generated client-side and shareable to social. **Auto video montages are Phase 2** (the "Trip Wrapped" backlog item), requiring server-side rendering.

**Rationale.** Collages + stats deliver a shareable recap now without standing up a render pipeline; montages are a heavier, deferrable delight.

**Rejected alternatives.** Auto montage in MVP (server-render infra, out of scope); no recap (loses the shareable payoff and a growth loop).

**Consequences.** Recap draws on trip media (`activity_media`) + `expo-location` miles + checklist completion. Miles source/privacy is open (foundation §12-5).

**Revisit triggers.** Recap proves a growth driver → build the server-side montage pipeline (Phase 2).

---

## D10 — Push notifications in MVP ✅ [LOCKED]

**Context.** Keeping a plan alive between sessions needs nudges (RSVP changes, new activities, savings/step reminders).

**Decision.** **Push in MVP** via **expo-notifications**; device tokens per user in `push_tokens`; fan out via the Expo Push API.

**Rationale.** Re-engagement is part of the commitment loop, not a nice-to-have.

**Rejected alternatives.** Defer push (loses re-engagement); hand-rolled APNs/FCM (unnecessary under Expo).

**Consequences.** **Web push is best-effort/TBD** under Expo — no assumed parity (foundation §11, §12-10). iOS push needs Apple/APNs setup via EAS (⏳). Send mechanism (edge function + triggers vs worker) is a build-time decision (build-plan Phase, foundation §12).

**Revisit triggers.** Web push required but unsupported → decide a web fallback or scope it out.

---

## D11 — Brand = **Trippl**; full identity + theming system ✅ [LOCKED] (resolved Phase 10)

**Context.** The build shipped against an `AppName`/`[LOGO SLOT]` placeholder so naming could be a painless global swap once the real identity was chosen.

**Decision (resolved).** The app is **Trippl**. Phase 10 replaced every placeholder (`AppName`→`Trippl`, `appname`→`trippl`, `com.appname.app`→`com.trippl.app`) and applied the full identity + a runtime theming system. **The design system is recorded in `docs/design.md`** (source-of-truth tokens live in `global.css`, `tailwind.config.js`, `constants/theme.ts`). Highlights:
- **Mark:** a minimal hand-drawn brushstroke (open circle + detached arc), with black/white variants swapped automatically by theme; used in auth, the Trips header, splash, and the generated icon set.
- **Theming:** `ThemeProvider` with `mode` (light/dark/**system** default) + an `accent` color, persisted to the **profile** (`profiles.theme_mode`, `accent_color`) **and** AsyncStorage. The accent resolves to **runtime CSS variables** — `--accent` (visible ink → `primary`/`accent`/`ring`), `--accent-fill` (solid fill, `transparent` when it would vanish → outlined control), `--accent-fg` (contrast-checked label) — so presets **and any custom hex** recolor the app live and no accent is ever invisible. Neutral tokens are Apple-like (dark base `#1C1C1E`, not black). Accent presets: **Black (default, mode-aware monochrome)**, White (mode-aware inverse/outlined), + vivid Red/Orange/Yellow/Green/Blue/Purple/Pink, + Custom. Monochrome accents auto-flip to stay visible; chromatics keep their vivid value in both modes. The accent drives interactive/primary elements only — bold but sparse.
- **Typography:** system font primary (real SF on Apple), **Inter** bundled as the Android/web fallback (SF Pro never bundled — licensing); a two-role Apple-like type scale (Display / Text).
- **Aesthetic:** editorial + slick-modern — whitespace, big headers, hairline borders, soft card elevation, rounded tactile controls, existing reanimated animations retained.

**Rationale.** The consistent placeholder made the swap trivial; a token + runtime-accent system keeps every screen cohesive and lets users personalize (mode + accent) without a rebuild.

**Rejected alternatives.** Hardcoding the palette (no live accent / user choice); bundling SF Pro (licensing); pure-black dark mode (harsher than the Apple-grey base).

**Revisit triggers.** New brand direction → update `docs/design.md` + the token files; add accent presets by extending `ACCENT_PRESETS`.

---

## D12 — Tenancy via Supabase RLS, scoped by `trip_members` ✅ [LOCKED]

**Context.** A trip's data (members, proofs, money, votes, media) must be visible only to that trip's people; some of it (personal safes, itineraries) is private even within the trip.

**Decision.** **Isolation via Supabase RLS.** Every trip-scoped table carries `trip_id` and is gated by a membership check against `trip_members`; **admins** (`trip_admins`, max 3 — D8) get elevated rights. **Personal safes/deposits are self-only; flight itineraries are owner + admins only.**

**Rationale.** RLS makes an unscoped read a *database policy failure*, not a silent cross-group leak (explicit-over-magic), and lets the client talk to Supabase directly.

**Rejected alternatives.** App-code-only authorization (one missed check leaks another group's trip); schema/DB per trip (overkill at this scale).

**Consequences.** Policies are per-table/per-operation and must be written carefully; the admin cap needs a trigger, not just a policy (D8). Private tables (safes, itineraries) get stricter self/admin policies.

**Revisit triggers.** A cross-trip feature (e.g. a user's global feed) → carefully-scoped views, never a blanket-open policy.
