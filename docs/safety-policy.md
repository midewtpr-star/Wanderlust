# Trippl — Community Safety Policy

_Last updated: 2026-07-24 · Release 2 · Phase 21 (Safety & Moderation)_

Trippl helps friend groups turn a soft “we should all go somewhere” into a real,
committed trip. The social layer (profiles, connections, and — soon — nearby
travelers) only works if it is **safe by default**. This page is the published
policy the app points to; the mechanisms it describes are enforced in code
(`supabase/migrations/20260722260001_safety.sql`, `lib/safety.ts`).

## Who can use Trippl

- Trippl is for people **13 and older**.
- Travelers **under 18** can plan and join trips, but are **excluded from public
  discovery**: their profile is always **private**, never appears in search, and
  cannot be made public. This is enforced by an age band stored on the account
  (we store only *whether* you are over 18 — **never your date of birth**) plus a
  database trigger that forces a minor’s profile private on every write.

## Your controls

- **Private by default.** Every profile starts private. Only you, people you
  share a trip with, and connections you accept can see it. Going public is an
  explicit, adult-only choice.
- **Block.** Blocking someone is mutual and immediate: you disappear from each
  other on every world surface (profiles, search, connections) and you stop
  seeing each other’s chat messages in shared trips. Block is reachable from a
  person’s profile in one tap.
- **Report.** Any user-generated surface — a profile, a chat message, a trip,
  an activity, a journal entry, an outfit — can be reported in one interaction.
  Reports are private, go to the moderation team, and never notify the person
  reported. Choose a reason (harassment, inappropriate content, spam, scam,
  impersonation, under-age, a safety concern, or something else) and optionally
  add detail.

## What isn’t allowed

- Harassment, bullying, threats, or hate.
- Sexually explicit or otherwise inappropriate content.
- Spam, scams, or fraud.
- Impersonating another person or organisation.
- Anything that puts someone’s real-world safety at risk.

## How we keep it safe (enforcement)

- **Trip content stays inside the trip.** Being someone’s connection — or having
  a public profile — never grants access to a trip’s chat, money, media, journal,
  or member list. That boundary is absolute and independent of this policy.
- **Rate limits.** Connection requests, reports, and messages are rate-limited to
  blunt spam and abuse.
- **Moderation.** The moderation team reviews reports and can dismiss them,
  remove content, or **suspend** an account. A suspended account drops out of
  discovery and cannot send requests or messages. Every moderator action is
  recorded in an audit trail.
- **Appeals & contact.** If you believe a moderation decision was wrong, contact
  support (channel TBD before launch — see `docs/deploy.md`).

## Roadmap (not yet built)

- **Nearby Travelers (Phase 22)** — opt-in, per-trip, off by default, coarse area
  only, mutual-consent contact, and **under-18 + blocked users excluded in both
  directions**. It ships only after this safety layer, never before.
- A fuller in-app **appeals flow** and a public transparency summary.

_This is product policy text for the app’s safety surface. Legal Terms of Service
and a Privacy Policy live alongside it (`docs/` / the deploy runbook) and govern
in case of any conflict._
