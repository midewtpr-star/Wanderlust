# AppName — Foundation

> **Status:** v1 — converged from brief. Last updated 2026-07-22. Changes from v0: initial foundation, written against the **locked Expo / React Native stack** (web + iOS + Android from one codebase). This supersedes any earlier web/Vite framing.
> **Source of truth.** Every other doc references this; none restate it. If any doc disagrees with this one, **this one wins.**
> **Codename** `AppName` is a placeholder for the real product name (TBD) — find-and-replace when locked. The logo is likewise TBD; every surface leaves a **`[LOGO SLOT]`** marker.

---

## How to use this doc system

Four docs, read in this order before any coding task so we don't drift:

| Order | Doc | Job |
|---|---|---|
| 1 | **foundation.md** (this file) | The seed. What the product is, who it's for, scope, and the index of locked decisions. Source of truth. |
| 2 | **decisions.md** | The *why* behind each locked decision — context, rejected alternatives, consequences, revisit triggers. |
| 3 | **data-model.md** | The Postgres/Supabase table sketch and the reserved GroupPad seam. |
| 4 | **build-plan.md** | The phased build order, each phase marked not-started. |

**The contract:** read these four docs at the start of every coding task; when a decision changes, update **this file first**, then ripple the change into the others so no two disagree. Never invent to fill a gap — mark it 🕗 TBD and surface it.

**Status key (used system-wide):** ✅ locked / built · 🕗 TBD (decide later) · ⬜ planned / not-started · 🟡 in progress · **[LOCKED]** inline on a settled decision · ⏳ external lead time.

---

## §0 Build constraints

<!-- The forcing function. Scope discipline follows from these. -->

- **Team size / hours / budget:** 🕗 TBD — not specified in the brief. This system is set up **solo-mode** by default: one progress track, no collaboration layer (no `CLAUDE.md` / `COLLAB.md`, no per-entry progress folder). Upgrade to team-mode if more than one person builds in parallel sessions.
- **Implication:** MVP scope is deliberately narrow (the seven features in §8). Anything not in the In-scope list is cut or deferred — the non-goals in §8 exist to stop unprompted scope creep.

## §1 What it is

**One-liner:** A group-trip planning app — Partiful, but built around **trips** instead of parties: a host creates a trip, invites the group via a shareable link, and everyone plans and commits together in one place instead of a chaotic group chat.

The wedge/moat isn't "another itinerary tool." It's solving the three things that actually kill group trips: **getting people to commit, pooling money, and agreeing on plans.** The product turns a fuzzy "we should all go somewhere" into named, committed, paying participants with an agreed set of plans — and it does it on **web, iOS, and Android from a single codebase** so the whole group is reachable wherever they already are.

## §2 Who it's for

Friend groups of **10–25 people** planning a **multi-day domestic trip** together. The pain is social, not logistical: the group chat is chaos, nobody commits, money is awkward, and plans never firm up. The host is whoever is willing to herd the group; members are everyone they invite.

## §3 Success & stage

- **Stage:** pre-build. No code yet — this doc system is the foundation laid before scaffolding.
- **Success (MVP):** the three hard parts are demonstrably eased — people **commit** (measured by the RSVP → Confirmed transition via flight-ticket upload), **pool money** (a visible growing savings total against a goal), and **agree on plans** (notes + activities converge instead of scrolling away in a chat).
- **Business vs portfolio vs tool-for-self:** 🕗 TBD — not stated. Treated as a real product MVP.

## §4 Guiding principles

Each settles arguments later:

1. **One codebase, three platforms.** Web + iOS + Android ship from the same Expo/React Native tree. Platform-specific code is the exception (camera, push), justified case by case — not the default. *Why: a 10–25 person group spans every device; fragmenting the codebase fragments the group.*
2. **Commitment is the core loop.** The flight-ticket → "Confirmed" mechanic is the product's heartbeat, not a feature bullet. *Why: the deepest risk (§11) is that groups never commit.*
3. **Ledger, not custody.** MVP tracks money; it never holds money. *Why: real fund custody is a regulatory and trust burden we refuse to take on before validating the product (see decisions.md D3).*
4. **Reserve seams; don't build them.** GroupPad (rental decisions) and Stripe Connect (real money) get clearly-marked seams and nothing more. *Why: unprompted building of deferred scope is the fastest way to sink an MVP.*
5. **Explicit over magic.** Prefer visible, debuggable failure modes (an unscoped query is a bug, not a shortcut) over hidden cleverness. *Why: RLS and cross-platform code both punish magic.*

## §5 Core model

**The Trip is the central object and the tenancy unit.** Almost everything is scoped to a trip; access is gated by membership in that trip.

**Trip lifecycle (derived from dates, not a stored workflow unless noted):**

```
created / planning ──(start_date reached)──► active ──(end_date passed)──► completed
```

- **Membership:** a `trip_members` row links a profile to a trip with a **role** (`host` | `member`), an **RSVP** (`going` | `maybe` | `not`), and a **confirmed** signal (set when the member uploads a flight ticket — see §6 flow 3).
- **Savings "locked" state is derived, not stored:** the pooled total shows as *locked* while `now() < trips.start_date` and *unlocked* on/after it. No custody, no real lock — a UI state over a ledger sum.
- **Sub-objects, all trip-scoped:** `invites`, `flight_confirmations`, `savings_contributions`, `notes` (idea board, incl. rental links + light discussion), `activities` (+ `activity_rsvps`).
- **User-scoped, not trip-scoped:** `profiles`, `push_tokens` (a user's devices, used to deliver notifications about the trips they belong to).

See **data-model.md** for the table sketch.

## §6 Core flows & surfaces

**Surfaces:** iOS app, Android app, and web app — one Expo/React Native codebase, Expo Router file-based routes shared across all three. A shared **invite link** deep-links into the app on mobile (or the web app on desktop).

**The seven MVP flows** (this is exactly the In-scope list in §8):

1. **Create a trip** — title, destination, dates, cover image, description. Creator becomes host.
2. **Invite & RSVP** — host shares an invite link; anyone opening it joins as a member and RSVPs `going` / `maybe` / `not`.
3. **Flight-ticket confirmation** — a member uploads or **photographs** their flight ticket (device camera / photo library on mobile) to move from *RSVP'd* → **Confirmed** — the signal they're actually coming. Ticket files are private.
4. **Savings pool (ledger only)** — members log contributions toward a trip goal; the pooled total shows as *locked* until the trip start date, then *unlocks*. No real money moves (§8 non-goals, decisions.md D3).
5. **Notes / idea board** — shared board for ideas, activity links, and Airbnb/rental links, with light discussion (replies).
6. **Activities** — sub-events within a trip (soccer, basketball, beach day) that any member can create, invite the group to, and RSVP to individually.
7. **Push notifications** — RSVP updates, new activities, and savings reminders, delivered to members' devices (expo-notifications).

## §7 Locked decisions — index

The heart of the file. Numbered so other docs cite `foundation.md §7 D3`. **Full rationale, rejected alternatives, and revisit triggers for each live in `decisions.md`, keyed by the same D-number** — this table is the authoritative *list*; decisions.md is the authoritative *reasoning*.

| # | Decision | One-line reasoning |
|---|---|---|
| **D1** | **Locked stack: Expo (latest stable SDK) + React Native + TypeScript**, Expo Router, NativeWind, React Native Reusables, Supabase (Auth/Postgres/Storage/RLS), EAS Build + Expo web export on Vercel | One toolchain that genuinely targets iOS + Android + web, with a Tailwind-flavored component story and a batteries-included backend. |
| **D2** | **One codebase for all three platforms** (web + iOS + Android) | The group spans every device; a shared Expo Router tree keeps one source of UI truth. |
| **D3** | **Savings = ledger only, never custody** in MVP; real money movement (Stripe Connect) is **Phase 2**, documented but not built | Holding funds is a regulatory/trust burden to avoid until the product is validated. |
| **D4** | **GroupPad = later module**, *adapted/rebuilt from its existing web-React app into React Native*; reserve a seam, build nothing now | The rental browse→shortlist→AI-compare→vote→lock engine is a whole product; bolting it in now would blow MVP scope. |
| **D5** | **Push notifications in MVP** (expo-notifications) for RSVP updates, new activities, savings reminders | Re-engagement is part of the commitment loop, not a nice-to-have. |
| **D6** | **Flight-ticket upload is the "Confirmed" signal**, captured via device camera / photo library (expo-image-picker / expo-camera) on mobile | A concrete artifact (a real ticket) is a far stronger commitment signal than a tapped button. |
| **D7** | **`AppName` placeholder token + `[LOGO SLOT]` marker everywhere**; real name & branding deferred to the branding phase | Name/logo are TBD; a consistent token makes the eventual swap a painless find-and-replace. |
| **D8** | **Tenancy = Supabase Row-Level Security, scoped by `trip_members`** | Trip is the isolation unit; RLS makes an unscoped read a policy failure, not a silent leak. |

## §8 Scope

### In (v1) — the seven flows in §6

Trips · Invites & RSVP · Flight-ticket confirmation · Savings pool (ledger) · Notes/idea board · Activities (+ per-member RSVP) · Push notifications.

### Out / cut (the forcing function — never build these unprompted)

- **Real payment custody / holding of funds.** Savings is a tracked ledger only. (→ D3)
- **The rental-decision / voting engine** (browse rentals → like → shortlist → AI compare → vote → lock a winner). That is **GroupPad**, a separate existing web-React product to be adapted in later as a module. Reserve the seam (data-model.md → GroupPad seam; navigation); build nothing. (→ D4)
- Anything not among the seven In-scope flows.

### Deferred (noted, not built)

- **Stripe Connect / real money movement** — Phase 2. (→ D3)
- **GroupPad module** — added later, on explicit instruction, adapted from web React into React Native. (→ D4)
- **Real name & logo / full branding** — branding phase. (→ D7)

## §9 Architecture keystones

Decisions + reasoning live here and in decisions.md; the *how* (repo layout, RLS policy specifics) is build-time detail for later.

- **Tenancy / isolation:** Supabase RLS, every trip-scoped table gated on the caller's membership in `trip_members` for that `trip_id`; host role carries elevated rights (edit trip, manage members). Ticket files are private to the uploader (+ host). (→ D8)
- **Keystone unlock:** **auth + schema + RLS + trip-create.** Once a trip exists, membership is enforced by RLS, and a member can be created, *every remaining feature is "just another trip-scoped table"* — invites, RSVP, confirmations, savings, notes, activities all follow the same pattern. Build this first (build-plan Phase 1–2).
- **Cross-platform seam:** one Expo Router route tree for all three platforms; platform-divergent code (`expo-camera`, `expo-notifications`) is isolated behind small wrappers, not sprinkled through screens. (→ D1/D2)
- **GroupPad seam:** reserved at the **trip level** — GroupPad will attach via its own `grouppad_*` tables (FK → `trips.id`) and a reserved nav entry; MVP keeps rental links as free-form entries in `notes`. See data-model.md → "GroupPad seam." (→ D4)

## §10 Known scale seams

Honest, not aspirational — what's accepted as not-scaling for a 10–25 person group, and what replaces it when it breaks:

- **Savings total is summed on read** (`SUM(amount_cents)` per trip). Fine at this size; add a materialized/cached balance if trips or contribution volume ever grow large.
- **Push fan-out is a simple loop over device tokens** via the Expo Push API (no batching/queue infra in MVP). Replace with a queue/edge-function fan-out if volume grows.
- **RLS policy per table** is the isolation mechanism; correct but verbose. Accepted.
- **Notes discussion is shallow** (one level of replies), not a full threaded forum.

## §11 The deepest risk

**The product dies if groups never actually commit.** Everything else (savings, notes, activities) is downstream of people deciding they're really going. The core bet is that the **flight-ticket → Confirmed** mechanic (D6) converts soft "maybe" into hard commitment better than a button would. If uploading a real ticket doesn't meaningfully move people from RSVP to Confirmed, the wedge is gone.

Secondary risk: **cross-platform push is uneven** — expo-notifications is solid on iOS/Android but web push under Expo is limited (see §12, decisions.md D5). Don't let the notification story quietly assume web parity.

## §12 Open questions

Honest gaps — resolve as decisions when answered; do not fabricate answers in other docs.

1. **Flight-ticket verification:** is any uploaded ticket enough to flip *Confirmed*, or does the host verify (or OCR check) it? MVP assumption: **any upload confirms**; host verification is a later refinement.
2. **Auth method:** brief says "Supabase Auth" but not which method (email magic link vs OAuth vs phone). 🕗 TBD.
3. **Savings ledger semantics:** append-only with adjusting entries, or can a member edit/delete their own contribution? MVP assumption: **append-only**, correction via a new (possibly negative) entry. 🕗 confirm.
4. **Web push:** is push required on web, or iOS/Android only with web as best-effort/none? 🕗 TBD (affects D5 scope).
5. **Invite-link security:** expiry, max-uses, revocation, and whether one link is per-trip or per-invitee. MVP assumption: one shareable per-trip token; expiry/max-uses reserved as columns.
6. **Notification delivery mechanism:** Supabase Edge Function + DB triggers vs an external worker calling the Expo Push API. 🕗 build-time decision (record in build-plan Phase 7).
7. **Currency:** domestic trips imply single currency; assume **USD**, integer cents. Confirm if multi-currency ever needed.
8. **Real name & branding, team-vs-solo build constraints (§0):** 🕗 TBD.
