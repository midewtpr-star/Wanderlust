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

- **RLS:** every one of the **28 tables** has Row-Level Security **enabled** (verified: the list
  of created tables equals the list of RLS-enabled tables). Policies are membership-gated via
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

# 2) Apply ALL 14 migrations to prod
supabase db push

# 3) Deploy the 4 Edge Functions to prod
supabase functions deploy verify-flight
supabase functions deploy nearby-ideas
supabase functions deploy notify-message
supabase functions deploy link-preview

# 4) Set the Edge Function secrets in PROD (server-only; never in the app)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...    # verify-flight (itinerary vision)
supabase secrets set GOOGLE_PLACES_API_KEY=AIza...   # nearby-ideas (local ideas)
#   notify-message + link-preview need no secrets.

# 5) Seed the airports reference table in PROD (~4k rows, idempotent)
SUPABASE_URL=https://<PROD_PROJECT_REF>.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=<PROD_service_role_key> \
node scripts/seed-airports.mjs
```

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
| Full description | What it does: commit-and-plan trips — travel proof, shared money, Airbnb vote, chat, outfits, bring list, recap. |
| Keywords (iOS) | trip, group travel, planning, itinerary, split, packing, friends |
| Category | Travel (primary) |
| Privacy Policy URL | **Required** — host `PRIVACY.md` (see below) at a public URL and link it. |
| Support URL | A contact/support page or email link. |
| Marketing URL | Optional (your Vercel domain). |
| Screenshots — iOS | 6.7" (1290×2796) and 6.5" (1242×2688) at minimum; 12.9" iPad if you keep `supportsTablet`. |
| Screenshots — Android | Phone (min 2, up to 8) + a 1024×500 feature graphic + 512×512 icon. |
| App icon | Already generated (`assets/images/icon.png`). |
| Data-safety / privacy questionnaire | Declare what you collect (see privacy policy) — both stores require this form. |

### 🚨 Privacy policy is REQUIRED

Trippl collects sensitive data, so both stores require a published privacy policy **and** the
in-console data-safety forms. A ready starting draft is in **`PRIVACY.md`** — review it with
counsel, host it (e.g. a `/privacy` route or a simple page), and link it. It must disclose that
the app collects and how it uses: **account identity (phone/email, name), profile + avatar, trip
content, chat messages, uploaded photos/videos, flight itineraries (processed by an AI service to
extract flight details), and location (for trip-mileage in the recap, opt-in)**, plus the
processors used (**Supabase, Anthropic, Google Places, Expo push, Vercel**), retention, how to
delete an account/data, children's-use stance, and a contact address.

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

**Change backend (schema / functions):**
```sh
# Add a new migration, then:
supabase db push                          # applies to the linked (prod) project
supabase functions deploy <name>          # redeploy a changed Edge Function
```

**Rule of thumb:** JS/UI fix → `eas update` + Vercel redeploy. Native/permission/version change →
new `eas build` + `eas submit`. Schema/function change → `supabase db push` / `functions deploy`.
