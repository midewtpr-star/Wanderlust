# AppName — Decisions

> **What this governs:** the *why* behind each locked decision — context, the alternative we rejected, consequences, and what would make us revisit. This is the authoritative **rationale record**.
> **Authority:** the *set* of locked decisions and product scope is owned by `foundation.md §7` — this file never introduces a decision that isn't indexed there, and if the two ever disagree on whether/what a decision is, **`foundation.md` wins**. This file wins on nothing; it *explains*.
> Keyed by the same **D-numbers** as `foundation.md §7`. Codename `AppName`, logo `[LOGO SLOT]` — both TBD.

**Status key:** ✅ locked · 🕗 TBD · ⬜ planned · 🟡 in progress · **[LOCKED]** settled.

---

## D1 — Locked stack: Expo + React Native + TypeScript ✅ [LOCKED]

**Context.** The product must ship to web, iOS, and Android for a 10–25 person friend group that spans every device (foundation §2, §4-1). We need one toolchain that reaches all three, plus file storage, auth, and a database, without standing up bespoke backend infra.

**Decision.** Lock the stack:
- **Expo (latest stable SDK) + React Native + TypeScript** — the app runtime.
- **Expo Router** — file-based routing that targets iOS, Android, and web from one route tree.
- **NativeWind** — Tailwind CSS for React Native (utility styling shared across platforms).
- **React Native Reusables** — shadcn-style component primitives built on NativeWind.
- **Supabase** — Auth, Postgres, Storage (flight tickets + cover images), Row-Level Security.
- **Native modules:** expo-image-picker / expo-camera (flight tickets), expo-notifications (push).
- **Deploy:** EAS Build for iOS + Android; Expo web export hosted on Vercel; Supabase for backend.

**Rationale.** Expo + Expo Router is the least-friction way to get one codebase onto all three platforms. NativeWind + React Native Reusables gives a Tailwind/shadcn-style DX in React Native, so styling knowledge transfers and components stay consistent cross-platform. Supabase collapses auth + DB + storage + row-level security into one managed backend, which suits a solo/small build (foundation §0). The stack is also chosen to make the **future GroupPad adaptation** land cleanly in the same runtime (see D4).

**Rejected alternatives.**
- *React + Vite web-only* (the original framing) — cut when the platform target became web + iOS + Android; a web-only stack can't ship native apps or use the device camera/push.
- *React Native without Expo (bare RN)* — more native config burden, no unified web target, no EAS/Expo web export story.
- *Separate native apps (Swift/Kotlin) + a web app* — three codebases for a solo-scale build; fragments the group and the code (foundation §4-1).

**Consequences.** Some code is platform-divergent (camera capture, push registration, web export quirks); isolate it behind small wrappers (foundation §9). Web is a first-class export target but not every native capability maps to web 1:1 — notably push (see D5).

**Revisit triggers.** A hard requirement Expo can't meet (a native module outside Expo's support) → consider a config plugin or bare workflow before abandoning the stack.

---

## D2 — One codebase for all three platforms ✅ [LOCKED]

**Context.** The group spans iOS, Android, and desktop/web. The host needs everyone reachable in the same product.

**Decision.** **A single Expo/React Native codebase produces the web, iOS, and Android apps.** Shared Expo Router route tree; platform-specific behavior is the justified exception, not the norm.

**Rationale.** One UI source of truth means a feature ships everywhere at once and the group is never split by device. It also concentrates limited build hours (foundation §0) on one codebase instead of three.

**Rejected alternatives.** Platform-forked codebases or a web app plus separate native apps — rejected for the same fragmentation/effort reasons as D1.

**Consequences.** We accept platform-conditional code where the platforms genuinely differ (camera, push, deep links, web export). Those live behind wrappers so screens stay platform-agnostic.

**Revisit triggers.** A platform needing a fundamentally different UX (not just different native calls) that can't be expressed in the shared tree.

---

## D3 — Savings = ledger only, never custody (Stripe Connect is Phase 2) ✅ [LOCKED]

**Context.** Pooling money is one of the three core pains (foundation §1). But *holding* other people's money is a regulated activity with real trust and compliance weight.

**Decision.** MVP savings is a **tracked ledger only**: members log contributions toward a trip goal, the app sums and displays the pooled total (shown *locked* until the trip start date, then *unlocked* — a derived UI state, foundation §5). **The app never holds, moves, or has custody of funds.** Real money movement via **Stripe Connect is a documented Phase 2** — noted, not built.

**Rationale.** A ledger delivers the *visible-commitment* value (a growing total against a goal) with none of the custody burden. We refuse to take on money-transmission/compliance risk before the product is validated (foundation §11).

**Rejected alternatives.**
- *Real custody in MVP (hold the pool)* — regulatory + trust burden, wrong bet pre-validation.
- *Integrate Stripe Connect now* — real payments infra is a project of its own; deferred to Phase 2.

**Consequences.** The ledger is trusted/honor-system in MVP; "locked" is a UI state, not an escrow. Correction semantics (append-only vs editable) are an open question (foundation §12-3; MVP assumption: append-only). Nothing in the schema or UI should imply the app holds money.

**Revisit triggers.** Validated demand for real pooling → begin Phase 2 (Stripe Connect) as a separate, explicitly-scoped effort.

---

## D4 — GroupPad is a later module, adapted from web React into React Native ✅ [LOCKED]

**Context.** "Agreeing on plans" includes choosing a rental. There is already a **separate existing product, GroupPad** — a **web React app** — that does the full rental decision flow: browse rentals → like → shortlist → AI compare → vote → lock a winner. It is a whole product in its own right.

**Decision.** **Do not build any rental-decision/voting engine now.** GroupPad will be **rebuilt/adapted from its web-React codebase into this React Native codebase as a module later, on explicit instruction.** For MVP: reserve a clearly-marked **seam** in the data model (a `grouppad_*` table namespace FK'd to `trips.id`) and in navigation (a reserved entry); rental links meanwhile live as free-form entries on the notes board (foundation §9, data-model.md → GroupPad seam).

**Rationale.** Bolting a second product into the MVP would blow scope and timeline (foundation §4-4). Reserving a seam keeps future integration clean without spending effort now. Because GroupPad is currently **web React**, adapting it into React Native is real work (component and interaction rewrite onto NativeWind / React Native Reusables) — the fact that D1's stack matches makes this tractable, but it is explicitly a *later* effort.

**Rejected alternatives.**
- *Build rental voting now* — out of scope; that's GroupPad's job.
- *Embed GroupPad's web app in a WebView* — rejected as the target; the intent is a native-adapted module, not an embedded website. (A WebView could be a stopgap if ever needed, but is not the plan.)
- *No seam, integrate later from scratch* — risks a messy retrofit; a reserved seam is cheap insurance.

**Consequences.** MVP notes may accumulate rental links that GroupPad will later supersede; the seam (trip-level FK + reserved nav) must stay untouched-but-present. Nobody builds GroupPad behavior until explicitly told to.

**Revisit triggers.** Explicit instruction to integrate GroupPad → begin the adaptation as its own phase (build-plan Phase 11).

---

## D5 — Push notifications in MVP (expo-notifications) ✅ [LOCKED]

**Context.** Re-engagement is part of the commitment loop (foundation §11): people need nudges when RSVPs change, new activities appear, or savings reminders are due.

**Decision.** **Push notifications are in MVP scope**, delivered via **expo-notifications**, for at least: RSVP updates, new activities, and savings reminders. Device push tokens are stored per user (data-model.md → `push_tokens`) and used to fan out via the Expo Push API.

**Rationale.** Notifications aren't a nice-to-have here — they're how a plan stays alive between sessions instead of dying like a group chat. Expo-notifications is the native fit for D1's stack.

**Rejected alternatives.**
- *Defer push to post-MVP* — rejected; it's load-bearing for the commitment loop.
- *Roll our own APNs/FCM integration* — unnecessary; Expo Push abstracts it.

**Consequences.** **Web push is a known unevenness:** expo-notifications targets iOS/Android well, but web push under Expo is limited — treat web push as best-effort/TBD, not assumed parity (foundation §11, §12-4). A send mechanism (edge function + triggers vs external worker) is a build-time decision (foundation §12-6, build-plan Phase 7). iOS push requires an Apple developer account / APNs setup (⏳ external lead time) via EAS.

**Revisit triggers.** Web push turning out to be required and unsupported → decide a web fallback (email/in-app) or scope web push out explicitly.

---

## D6 — Flight-ticket upload is the "Confirmed" signal (device camera) ✅ [LOCKED]

**Context.** The deepest risk is that people never truly commit (foundation §11). We need a commitment signal stronger than a tapped button.

**Decision.** A member moves from *RSVP'd* → **Confirmed** by **uploading or photographing their flight ticket**, captured via **expo-image-picker / expo-camera** (device camera or photo library) on mobile. Ticket files are stored privately in Supabase Storage (data-model.md → `flight_confirmations`, storage notes).

**Rationale.** Producing a real artifact (an actual ticket) is a materially harder, more honest commitment than clicking "I'm in" — which is exactly the behavior change the product needs.

**Rejected alternatives.**
- *A "Confirm" button with no artifact* — too cheap a signal; doesn't move the commitment needle.
- *Payment as the confirm signal* — collides with the no-custody rule (D3).

**Consequences.** Flight tickets are sensitive personal documents → strict privacy (private bucket, RLS to owner + host; never logged). Whether any upload confirms or the host verifies is an open question (foundation §12-1; MVP assumption: any upload confirms). Web capture uses a file picker (no camera guarantee) — a platform nuance under D2.

**Revisit triggers.** Abuse or fake tickets → add host verification or a lightweight OCR/format check.

---

## D7 — `AppName` placeholder + `[LOGO SLOT]`, branding deferred ✅ [LOCKED]

**Context.** The real product name and logo are TBD and will be chosen later.

**Decision.** Use the literal token **`AppName`** everywhere the name appears (including code identifiers) and a clearly-marked **`[LOGO SLOT]`** everywhere the logo goes. Real name & branding land in the dedicated **branding phase** (build-plan Phase 9).

**Rationale.** A single consistent placeholder makes the eventual naming a painless global find-and-replace and prevents half-named drift. (Golden rule: codename anything unsettled.)

**Rejected alternatives.** Inventing a working name now — risks it sticking, or a messy rename across code and docs later.

**Revisit triggers.** Real name chosen → find-and-replace `AppName`; drop the real logo into every `[LOGO SLOT]`.

---

## D8 — Tenancy via Supabase Row-Level Security, scoped by `trip_members` ✅ [LOCKED]

**Context.** A trip's data (members, tickets, savings, notes, activities) must be visible only to that trip's members. Trip is the isolation unit (foundation §5).

**Decision.** **Isolation is enforced by Supabase RLS.** Every trip-scoped table carries a `trip_id` and is gated by a policy checking the caller's membership in `trip_members` for that trip; the `host` role carries elevated rights (edit trip, manage members, see tickets). Flight-ticket files are private to the uploader (+ host).

**Rationale.** RLS makes an unscoped read a *policy failure at the database*, not a silent leak in app code — explicit-over-magic (foundation §4-5). It also means the client can talk to Supabase directly without a bespoke authorization layer.

**Rejected alternatives.**
- *Authorization in app code only* — one missed check leaks another group's trip; unacceptable for a shared-group product.
- *Separate schema/DB per trip* — massive overkill at this scale.

**Consequences.** Policies are verbose (one per table/operation) and must be written carefully — a table without a correct policy is either a leak or a lockout. RLS correctness is a first-class build task (build-plan Phase 1).

**Revisit triggers.** A cross-trip feature (e.g. a user's global activity feed) needing reads across trips → add carefully-scoped policies or views, never a blanket open policy.
