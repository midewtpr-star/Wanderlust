# AppName

> `AppName` is a placeholder name (logo/name TBD — see `docs/decisions.md` D11). A group-trip planning app — Partiful, but for trips. Web + iOS + Android from one Expo/React Native codebase.

**This repo is at the scaffold stage** (build-plan Phase 0 ✅). Screens are labeled placeholders — no features, auth, or database yet. The source of truth for what gets built and why lives in **[`/docs`](./docs)** (`foundation.md`, `decisions.md`, `data-model.md`, `build-plan.md`) — read those before writing code.

## Stack

Expo SDK 57 · React Native 0.86 · TypeScript · Expo Router · NativeWind v4 (Tailwind 3) · React Native Reusables-style UI primitives · Supabase (client wired, backend not built).

## Setup

```sh
npm install
cp .env.example .env   # then fill in your Supabase URL + anon key
```

The app runs without real credentials (a placeholder Supabase client is used) — you only need `.env` once you start wiring up Supabase.

## Run

```sh
npm run start     # Expo dev server (press w / i / a to open web / iOS / Android)
npm run web       # web only        → http://localhost:8081
npm run ios       # iOS simulator (requires macOS + Xcode)
npm run android   # Android emulator (requires Android Studio/SDK)
npm run typecheck # tsc --noEmit
```

On a phone, install **Expo Go** and scan the QR code from `npm run start` (no Mac needed for iOS this way).

## Structure

```
app/          Expo Router routes — (auth)/, (tabs)/, trip/[id]
components/    shared components; ui/ = React Native Reusables primitives
lib/          supabase client, utils (cn)
hooks/  constants/  types/
global.css    NativeWind design tokens (placeholder palette)
app.config.ts dynamic config: native-module plugins/permissions, env → extra
docs/         source-of-truth context system
```
