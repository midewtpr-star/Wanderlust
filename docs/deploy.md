# Trippl — Deploy Runbook

> Phase 12. How to ship Trippl to production: **web on Vercel**, **iOS + Android via EAS**.
> Everything in the repo (config, audit fixes, this runbook) is done. The remaining work
> needs **your accounts + dashboard clicks** — each is marked 🛑 **STOP (you)** with exact steps.
>
> **What's automated (in the repo):** the pre-launch audit + fixes, env wiring (no hardcoded
> creds), `vercel.json`, `eas.json`, `app.config.ts` identifiers/permissions/runtime version,
> lint + type-check + production builds. **What needs you:** creating the prod Supabase project,
> Vercel + Expo/EAS + Apple + Google accounts, and store listings.

---

## STEP 0 — Pre-launch audit ✅ (done)

Audited and fixed before shipping:

- **RLS:** every one of the **36 tables** (incl. the Release-2 set: journal_entries, journal_media,
  passport_stats, connections, reports, moderation_actions, discovery_optins, share_audio, landmarks)
  has Row-Level Security **enabled** (verified: created-tables list == RLS-enabled list). Policies are membership-gated via
  `is_trip_member` / `is_trip_admin`; private data (personal safes, flight itineraries) is
  self/admin-only. Nothing is directly world-readable — the only `anon` grants are the four
  invite-preview helper functions (`trip_preview`, `is_trip_member`, `is_trip_admin`,
  `shares_trip_with`, all SECURITY DEFINER) that power the signed-out invite page.
- **Storage buckets:** `flight-itineraries` (`public=false`) and `trip-media` (`public=false`)
  are private — clients read via short-lived **signed URLs**. `trip-covers` is public by design
  (non-sensitive cover images shown in invite previews).
- **Secrets:** no `ANTHROPIC_API_KEY` / `GOOGLE_PLACES_API_KEY` / service-role key anywhere in
  client code or the repo — they exist only in Edge Function code that reads them from Supabase
  secrets. `.env` (and `.env.*`) are gitignored; only `.env.example` (placeholders) is tracked.
- **Tooling:** `npm run typecheck` (tsc) passes; **ESLint** was set up (Expo preset) and
  `npm run lint` passes (0 errors; remaining items are advisory React-Compiler warnings on the
  idiomatic fetch-on-mount / `Animated.Value` patterns). Production builds succeed for **web,
  iOS, and Android**.
- **States:** every screen has loading (skeletons), empty, and error states; missing data
  renders a friendly state rather than crashing (verified via headless boot in light + dark).

Fixes made this phase: added ESLint config + `lint`/`build:web` scripts; removed 3 unused
imports + 2 stale lint directives; broadened `.gitignore` (`.env.*`, `secrets/`, `dist-native/`).

---

## STEP 0b — Release 2 hardening (social layer present → stricter store path) ✅ (done)

Re-audited with the Release-2 social layer live. Fixed in-repo (commit "Deploy hardening"):

- **Silent blocks.** `send_connection_request` no longer raises a distinguishable `'blocked'`
  error (it returns silently); `connection_state_with` returns `'none'` instead of
  `'blocked_by_them'`. A block is now indistinguishable from a private profile — no notification,
  presence signal, or error reveals it. Bidirectional via `has_block_with`, and extended into chat
  (`messages_select`).
- **In-app account deletion (Apple requirement).** Settings → **Delete account** → confirm screen →
  `delete-account` edge function: hands off hosted trips to another member, purges private storage,
  `admin.deleteUser` (cascades profile, connections, journal, passport, nearby, reports). Shared-pool
  **contributions are anonymised, not deleted** (`ON DELETE SET NULL`), so the group's money-in total
  stays correct.
- **Under-18** excluded from discovery + public visibility (trigger + policy + client), enforced.
- **WCAG AA** re-verified across **3 skins × 2 modes × 10 accent presets × destination themes** —
  all pass. Accent-as-text is clamped to AA (`readableInk`); destination clamp handles pale-yellow +
  near-white. Collage keeps text-labelled equivalents; 44pt targets; reduce-motion honoured.
- **Permissions:** `expo-audio` ships with **no microphone** permission (preview playback only);
  photo/camera strings cover trip media; **location is opt-in mileage only and never shared** —
  **Nearby uses the trip's public destination (a coarse geohash), not device GPS.**
- **Music** ships **OFF** — the picker is hidden until an operator configures a **cleared** catalogue
  (`EXPO_PUBLIC_MUSIC_PROVIDER`). Do not enable it without a licence covering social redistribution.
- **UGC surfacing (Apple):** in-app **report** (every profile + chat message), **block**, a
  **moderation** queue, an **age gate**, and a **contact address** + **community guidelines** +
  **privacy** links in Settings → *Legal & safety*. Bundled-font **OFL notices** ship in
  *Acknowledgements*.

### 🛑 STOP (you): host the two policy pages + set the contact address

The store review needs a **community policy** and a **privacy policy** live at real URLs, and the app
links to them:

- Host **`docs/safety-policy.md`** at `‹your-web-origin›/community` and **`PRIVACY.md`** at
  `‹your-web-origin›/privacy` (e.g. add `/community` + `/privacy` routes, or static pages).
- Set **`EXPO_PUBLIC_SUPPORT_EMAIL`** (the reports contact) and **`EXPO_PUBLIC_WEB_URL`** in Vercel
  (web) + EAS env (native). Until set, the app defaults the links to the current origin and
  `support@trippl.app`.

---

## STEP 1 — Production Supabase

**Recommendation: use a SEPARATE prod project from dev.**
**Tradeoff:** two projects means you apply migrations / set secrets / seed twice and manage two
sets of keys — but you get a clean prod dataset, no risk of a dev migration or test row hitting
real users, independent rate limits, and the ability to break dev freely. For a launch this is
the right call. (A single project is simpler but couples testing to production — not recommended
once real users exist.)

The app already reads creds from env per build — **nothing is hardcoded** (`lib/supabase.ts`
reads `extra.supabaseUrl/anonKey`, populated from `EXPO_PUBLIC_SUPABASE_*` in `app.config.ts`).
You point each environment at the right project by setting those vars (Vercel for web, EAS
environments for native — see Steps 2–3).

### 🛑 STOP (you): create the prod project

1. In the Supabase dashboard → **New project** (name e.g. `trippl-prod`, strong DB password,
   nearest region). Note its **Project Ref**, **Project URL**, **anon key**, and **service_role
   key** (Settings → API).

Then run the following **against prod** (the CLI needs your access token — `supabase login`):

```sh
# 1) Link the repo to the PROD project (run from the repo root)
supabase link --project-ref <PROD_PROJECT_REF>

# 2) Apply ALL migrations to prod (everything in supabase/migrations, incl. the
#    Release-2 set: passport, profiles/connections, safety, nearby, share_music)
supabase db push

# 3) Deploy the 6 Edge Functions to prod
supabase functions deploy verify-flight
supabase functions deploy nearby-ideas
supabase functions deploy notify-message
supabase functions deploy link-preview
supabase functions deploy generate-destination-theme
supabase functions deploy delete-account          # Release 2 — in-app account deletion

# 4) Set the Edge Function secrets in PROD (server-only; never in the app)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...    # verify-flight + generate-destination-theme
supabase secrets set GOOGLE_PLACES_API_KEY=AIza...   # nearby-ideas (local ideas)
#   notify-message + link-preview need no secrets.

# 5) Seed the airports reference table in PROD (~4k rows, idempotent)
SUPABASE_URL=https://<PROD_PROJECT_REF>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<PROD_service_role_key> \
node scripts/seed-airports.mjs
```

**Demo seed (optional, DEV/DEMO projects only — never prod).** To see the app
populated instead of empty (five demo travelers, a completed Tokyo trip that
fills a passport, a journal, connections, and a Nearby match for an upcoming
Lisbon trip), run the demo seeder against a **dev/demo** project. It creates fake
`@demo.trippl.invalid` auth users and is idempotent (re-runnable):

```sh
SUPABASE_URL=https://<DEV_PROJECT_REF>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<DEV_service_role_key> \
SEED_CONFIRM=1 npm run seed
```

It refuses to run without `SEED_CONFIRM=1`, and prints the demo logins (password
`Trippl-Demo-2026!`) plus what each account shows. **Do not point it at
production** — it inserts demo users and data.

### 🛑 STOP (you): configure Auth in the prod dashboard

- **Auth → Providers → Email:** enable. For instant testing you can disable "Confirm email";
  for production, keep confirmation on and configure the email templates.
- **Auth → Providers → Phone (D4, phone-first):** enable and connect **Twilio** (Account SID,
  Auth Token, Message Service SID). Until Twilio is connected, phone OTP returns an error and
  users fall back to email — the app already handles this gracefully.
- **Auth → URL Configuration:** set **Site URL** to your web origin (e.g.
  `https://trippl.vercel.app`) and add it (plus `trippl://`) to **Redirect URLs**.
- **Storage:** the three buckets are created by the migrations (`trip-covers` public,
  `flight-itineraries` + `trip-media` private). If you raise the media size cap, raise it on the
  bucket **and** in Storage settings.

---

## STEP 2 — Web on Vercel

`vercel.json` is committed and configured: build command `npx expo export --platform web`,
output `dist`, `cleanUrls`, and **rewrites for every dynamic route** (`/trip/:id`, `/chat/:id`,
`/outfits/:id`, `/outfit/:id`, `/bring/:id`, `/recap/:id`, `/activity/:id`, `/join/:code`) so
deep links / hard refreshes resolve.

### 🛑 STOP (you): deploy to Vercel

1. Push this branch and **Import the repo** in Vercel (New Project → import
   `midewtpr-star/Wanderlust`). Vercel reads `vercel.json`, so:
   - **Framework preset:** Other (leave as-is — `framework: null`).
   - **Build command:** `npx expo export --platform web` (already set).
   - **Output directory:** `dist` (already set).
2. **Project → Settings → Environment Variables** (Production):
   - `EXPO_PUBLIC_SUPABASE_URL` = your **prod** Project URL
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY` = your **prod** anon key
   - `EXPO_PUBLIC_WEB_URL` = your real Vercel domain (e.g. `https://trippl.vercel.app`) — this is
     the origin baked into shareable **invite links**.
3. **Deploy.** Then set the same domain as the Supabase **Site URL / Redirect URL** (Step 1) and,
   if you add a custom domain later, update both `EXPO_PUBLIC_WEB_URL` and Supabase.

### Verify (web)
- Open the domain → you should land on **Sign in to Trippl** (light/dark follows the browser).
- Sign in (email works without Twilio), **create a trip**, then open its **invite link**
  (`/join/<code>`) in a fresh/incognito tab — the signed-out invite preview should render.
- Open a trip → Chat, Outfits, Bring list all load.

---

## STEP 3 — EAS build config

`eas.json` is committed with **development / preview / production** profiles
(`appVersionSource: remote`, so EAS auto-increments build numbers on production). `app.config.ts`
has the identifiers (`com.trippl.app`), icon/splash, all **permission strings** (camera, photos,
location, notifications), `runtimeVersion` (for OTA), and the iOS export-compliance flag.

### 🛑 STOP (you): initialize EAS + credentials

```sh
npm i -g eas-cli
eas login

# Links the project + prints your EAS Project ID. Put it in app config extra.eas.projectId
# (set EAS_PROJECT_ID in your environment, or paste it into app.config.ts) — it also enables
# Expo push tokens (lib/push.ts) and EAS Update.
eas init

# Per-environment client vars (the build profiles pull these). Create for each environment
# you build (production shown; repeat for preview/development pointing at dev Supabase):
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_URL --value "https://<PROD_REF>.supabase.co"
eas env:create --environment production --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "<PROD_anon_key>"
eas env:create --environment production --name EXPO_PUBLIC_WEB_URL --value "https://trippl.vercel.app"

# EAS Update (OTA) channel wiring
eas update:configure
```

### 🛑 STOP (you): push notification credentials (interactive)

- **iOS:** `eas credentials` → iOS → set up a **Push Key (APNs)**. (Requires the Apple Developer
  account from Step 4.) EAS can generate + store it for you.
- **Android:** Expo uses **FCM v1** — in the Firebase console create/download the service account
  and add it via `eas credentials` → Android → **FCM V1**.
- Once these exist, `registerPushTokenAsync()` gets a real token and `notify-message` can deliver
  chat pushes. Until then push simply no-ops (the app never blocks on it).

The chat/notification hooks already read the **prod** project via the env vars above — no code
change needed to point them at production.

---

## STEP 4 — Store submissions

### 🛑 STOP (you): accounts + app records

- **Apple:** enroll in the **Apple Developer Program ($99/yr)**. In **App Store Connect** create
  an app record (name **Trippl**, bundle id **com.trippl.app**, SKU). Note the **ASC App ID** and
  your **Apple Team ID** → put them in `eas.json` → `submit.production.ios` (replace the
  `REPLACE_WITH_…` placeholders), along with your Apple ID email.
- **Google:** create a **Google Play Console account ($25 one-time)**. Create an app (Trippl,
  package **com.trippl.app**). Create a **service account** with Play permissions, download its
  JSON key to `./secrets/google-play-service-account.json` (gitignored) — referenced by
  `eas.json` → `submit.production.android`.

### Build + submit commands

```sh
# Production builds (EAS cloud; signs with the credentials from Step 3)
eas build --platform ios --profile production
eas build --platform android --profile production

# Submit the finished builds to the stores
eas submit --platform ios --profile production      # → App Store Connect / TestFlight
eas submit --platform android --profile production  # → Play Console (internal track first)
```

Recommended: submit to **TestFlight** (iOS) and the **internal testing track** (Android) first,
verify on real devices, then promote to production review.

### Store-listing checklist (you fill these in each console)

| Field | Notes |
|---|---|
| App name | **Trippl** |
| Subtitle / short description | e.g. "Group trips, actually planned." (iOS subtitle ≤ 30 chars) |
| Full description | What it does: commit-and-plan trips — travel proof, shared money (ledger), Airbnb vote, group chat, outfits, bring list, destination themes, recap. |
| Keywords (iOS) | trip, group travel, planning, itinerary, split, packing, friends |
| Category | Travel (primary) |
| Privacy Policy URL | **Required** — host `PRIVACY.md` (see below) at a public URL and link it. |
| Support URL | A contact/support page or email link. |
| Marketing URL | Optional (your Vercel domain). |
| Screenshots — iOS | 6.7" (1290×2796) and 6.5" (1242×2688) at minimum; 12.9" iPad if you keep `supportsTablet`. |
| Screenshots — Android | Phone (min 2, up to 8) + a 1024×500 feature graphic + 512×512 icon. |
| App icon | Already generated (`assets/images/icon.png`). |
| Data-safety / privacy questionnaire | Both stores require it — fill from the **Data disclosure** table below. |

### 🛑 Release 2 — the stricter User-Generated-Content path (social layer present)

Because Trippl now has profiles, connections, chat, journal, and discovery, both stores apply
their **UGC rules**. Everything they require **already exists in the build** — here's where, so you
can point to it in review:

| Store requirement | Where it lives in Trippl |
|---|---|
| **A way to report content/users** | `<ReportSheet>` on every profile + long-press any chat message (rate-limited). |
| **A way to block abusive users** | Block on any profile; bidirectional + **silent**; hides them on world surfaces + in chat. |
| **A content-filtering / moderation method** | `reports` + `moderation_actions` + the moderator queue (`app/moderation`, suspend/remove/dismiss). |
| **Published contact for reports** | Settings → *Legal & safety* → "Report a problem or abuse" (`EXPO_PUBLIC_SUPPORT_EMAIL`). |
| **Community policy live at a URL** | `docs/safety-policy.md` → host at `/community` (linked from Settings). |
| **Age gate / no under-18 in discovery** | Age band (birthdate never stored); minors forced private + off discovery, enforced in DB + client. |

- **Apple age rating questionnaire:** answer **Yes** to *user-generated content* and *unrestricted
  web access* only if you keep any outbound links (invite links are first-party). With UGC + social,
  expect a **12+ / 17+** rating — answer honestly; the moderation + block + report features are your
  justification for approval.
- **Google Play:** complete the **UGC declaration** and the **Data Safety** form (use the table
  above). Declare the in-app reporting + moderation.
- **Location disclosure (both):** state that location is **opt-in, in-use only, for trip mileage**,
  and that **Nearby never uses or shares precise location** (it matches on the trip's public
  destination). Mark Location **optional**.
- **Music:** submit with the picker **off** (default). Do **not** enable a catalogue without a
  licence covering **social redistribution** of exports; rights metadata is retained per track.

### 🚨 Privacy policy is REQUIRED

Trippl collects sensitive data, so both stores require a published privacy policy **and** the
in-console data-safety forms. A ready starting draft is in **`PRIVACY.md`** — review it with
counsel, host it (e.g. a `/privacy` route or a simple page), and link it. It must disclose that
the app collects and how it uses: **account identity (phone/email, name), profile + avatar, trip
content, chat messages, uploaded photos/videos, flight itineraries (processed by an AI service to
extract flight details), and location (for trip-mileage in the recap, opt-in)**, plus the
processors used (**Supabase, Anthropic, Google Places, Expo push, Vercel**), retention, how to
delete an account/data, children's-use stance, and a contact address.

### 📋 Data disclosure (paste into Apple App Privacy + Google Data Safety)

Trippl uses **no third-party analytics or advertising SDKs**, so **no data is used for tracking**
(Apple: "Data Not Used to Track You") and **nothing is "shared"** in the store sense — data is
only processed by our service providers on our behalf. Everything is **encrypted in transit
(HTTPS)** and **user-deletable** (account/data deletion on request; wire an in-app delete before
launch). Answer the forms as:

| Data collected | Collected? | Linked to the user | Purpose | Notes for the form |
|---|---|---|---|---|
| **Email address** | Yes | Yes | App functionality, account management | Sign-in (email path). |
| **Phone number** | Yes (if phone sign-in) | Yes | App functionality, account management | Phone-first OTP via Twilio. |
| **Name** | Yes | Yes | App functionality | Display name; optional legal name used only to match a flight itinerary. |
| **Photos or videos** | Yes | Yes | App functionality | Trip covers (public), activity/recap/outfit media (private, member-only). |
| **Other user content — travel documents** | Yes | Yes | App functionality | Flight itinerary image/PDF; sent to Anthropic to extract flight details; stored private. |
| **Messages / other user content** | Yes | Yes | App functionality | Group chat text; visible only to trip members. |
| **Precise location** | Yes — **optional, opt-in** | Yes | App functionality | In-use only, to tally trip mileage for the recap; off by default; aggregate-only display. |
| **User ID / device identifiers** | Yes | Yes | App functionality | User id; Expo push token for notifications. |
| **Purchases / payment info** | **No** | — | — | **Ledger only — Trippl never processes real payments or collects card data.** |
| **Financial info (amounts logged)** | Yes | Yes | App functionality | User-entered contribution/savings **numbers** in the ledger — not payment instruments. |
| **Contacts** | **No** | — | — | Invites are link-based; no address-book access. |
| **Profile info (handle, bio, home city, avatar)** | Yes | Yes | App functionality | Release 2 social profile; **private by default**, public is an explicit adult-only choice. |
| **Connections / social graph** | Yes | Yes | App functionality | Who you connect with; mutual-consent; never grants trip access. |
| **User content — journal, passport** | Yes | Yes | App functionality | Journal entries + media (member-only); passport stats derived from your own trips. |
| **Age band** | Yes | Yes | App functionality, safety | Adult / minor only — **the birthdate itself is never stored**; used to keep under-18 off discovery. |
| **Usage data / diagnostics** | Minimal | Yes | App functionality, security | Standard host/server logs (Supabase/Vercel); no analytics SDK. |

**Release 2 notes for both forms:** **Nearby Travelers collects NO device/precise location** — it matches on the trip's *public destination* (a coarse ~150 km geohash), so precise location is never shared with other users. Music-on-shares ships **off** (no catalogue). **In-app account deletion** exists (Settings → Delete account), so answer **"users can delete their account/data" = Yes**. Still **no analytics/ad SDKs → no tracking, nothing "sold" or "shared"** in the store sense.

**Apple specifics:** "Data used to track you" → **None**. Data linked to you → the rows above.
Third-party partners → service providers only (Supabase, Anthropic, Google Places, Twilio, Expo,
Vercel), acting on our behalf.
**Google specifics:** for each type above set **Collected = Yes, Shared = No**, **encrypted in
transit = Yes**, **user can request deletion = Yes**; mark **Location** and **Financial info** as
optional; declare **no data sold**. Do **not** declare Payment info (no card/transaction data).

---

## STEP 5 — Update runbook (how to ship after launch)

**Ship a JS-only change (fastest — no store review), for web + native:**
```sh
# Web: push to the branch Vercel builds (auto-deploys), or `vercel --prod`.
# Native (OTA, same runtimeVersion): publish an EAS Update
eas update --branch production --message "Fix X"
```
OTA reaches existing installs on the next launch. Use it for JS/asset changes only.

**Cut a new native build (needed for native changes: new deps, permissions, icon, app version):**
```sh
# Bump `version` in app.config.ts when native changes ship (runtimeVersion follows it).
eas build --platform ios --profile production
eas build --platform android --profile production
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

**Change the backend — apply a new migration SAFELY to prod:**
```sh
# 1. Write a NEW timestamped migration file (never edit an already-applied one — migrations are
#    forward-only + append-only). Keep it idempotent (if not exists / drop policy if exists).
# 2. Test it on DEV first (a separate project, or a local `supabase start` stack):
supabase db push --project-ref <DEV_REF>
# 3. See exactly what is pending against PROD before applying:
supabase migration list --project-ref <PROD_REF>     # applied vs pending
# 4. Ensure a PROD backup exists (enable Point-in-Time Recovery, or take a manual dump), then:
supabase db push --project-ref <PROD_REF>
# 5. Redeploy any changed Edge Function:
supabase functions deploy <name> --project-ref <PROD_REF>
```
Safety rules: never edit a migration that has already run (add a new one); avoid destructive drops
without a backfill/rollback plan; RLS changes should be reviewed against `docs/data-model.md`;
every migration in this repo is idempotent and safe to re-run.

**Rotate a leaked key:**
```sh
# Server secrets live ONLY in Supabase Edge Function secrets + Vercel/EAS env — never in the app
# bundle or git (verified). To rotate one:
# 1. Revoke + reissue the key at its source (Anthropic / Google Cloud / Supabase).
# 2. Update it everywhere it's set:
supabase secrets set ANTHROPIC_API_KEY=<new>        # (or GOOGLE_PLACES_API_KEY)
#    Vercel: Project → Settings → Environment Variables → edit → redeploy.
#    EAS:    eas env:update --environment production --name <NAME> --value <new>
# 3. The Supabase anon key is public-by-design (RLS protects data); rotate it only if the
#    service_role key leaked — reissue in Supabase → API, then update EXPO_PUBLIC_SUPABASE_ANON_KEY
#    in Vercel + EAS. The service_role key must NEVER appear in the app or repo.
```

**Roll back a bad release:**
```sh
# Web (Vercel): Deployments → pick the previous good deploy → "Promote to Production" (instant).
# Native OTA:  re-point the channel at the last good update (or publish a revert):
eas update --branch production --message "Roll back to <good>"   # or use the EAS dashboard to
#            set the channel to a prior update group. Reaches installs on next launch.
# Native binary (a bad *store* build): submit the previous build, or expedite a fix build. The
#   already-shipped binary can't be pulled, but an OTA update can neutralise a JS-level regression.
# Backend (a bad migration): roll FORWARD with a new corrective migration (migrations are
#   append-only). If data was damaged, restore from PITR/backup (Step: apply a migration safely).
```

**Rule of thumb:** JS/UI fix → `eas update` + Vercel redeploy. Native/permission/version change →
new `eas build` + `eas submit`. Schema/function change → new migration → `supabase db push` /
`functions deploy` (test on dev first). **EAS Update channels** (`production` / `preview`) are wired
via `eas update:configure` + `runtimeVersion` — JS + asset changes ship OTA; **native changes (new
deps, permissions, icon, app version, the `expo-audio` addition) require a new build + store review**.
