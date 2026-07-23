# Trippl — Privacy Policy

> **DRAFT / TEMPLATE.** This is an accurate starting point based on what the app actually
> collects, provided to speed up your store submission. It is **not legal advice** — review it
> with counsel, replace the **[bracketed]** placeholders, publish it at a public URL, and link
> that URL in App Store Connect and Google Play. Both stores also require you to complete their
> in-console data-safety / privacy questionnaires consistently with this policy.

**Effective date:** [DATE]
**Contact:** [privacy@yourdomain.com]
**Entity:** [Your name / company], the operator of the Trippl app ("Trippl", "we", "us").

Trippl helps groups plan trips together — committing to travel, pooling money (as a ledger),
choosing a place to stay, chatting, planning outfits, and sharing a recap. This policy explains
what we collect, why, who processes it, and your choices.

## Information we collect

- **Account & identity.** Your phone number and/or email (used to sign in — phone-first with an
  email fallback) and a display name. Authentication is handled by our processor Supabase.
- **Profile.** Display name, optional legal/full name (used only to match the passenger name on
  a flight itinerary you upload), and an optional avatar image.
- **Trip content you create.** Trips, invites/RSVPs, contribution ledger entries (amounts you log
  — Trippl does **not** hold or move money), Airbnb options + votes, activities, the shared bring
  list and your claims, and outfit boards.
- **Chat messages.** The text of messages you send in a trip's group chat, visible to members of
  that trip.
- **Photos & media.** Images/videos you upload (trip covers, activity media, recap photos, outfit
  images). Trip covers are public; activity/recap/outfit media are stored privately and shared
  only with members of that trip via short-lived signed links.
- **Flight itineraries.** If you use flight verification, the itinerary image/PDF you upload is
  stored privately (visible only to you and trip admins) and sent to an AI vision service
  (Anthropic) to extract flight details (passenger name, confirmation number, arrival airport,
  dates) so we can confirm your arrival is near the trip. We do not use it for advertising.
- **Location (optional).** If you opt in to trip-mileage tracking for the recap, we use your
  device location while the app is in use to tally miles. This is opt-in, and only an aggregate
  group total is shown — never other members' individual locations.
- **Device push token.** If you enable notifications, an Expo push token so we can notify you of
  new chat messages.
- **Technical/log data.** Standard logs from our hosting/processors (e.g. IP, timestamps) for
  security and reliability.

We do **not** sell your personal information, and we do not use it for third-party advertising.

## How we use it

To provide the service: authenticate you, run the commit-and-plan features, deliver chat and
notifications, verify flight arrivals, compute your recap, keep trips scoped to their members
(enforced by row-level security), and secure and debug the app.

## Who processes your data (sub-processors)

- **Supabase** — authentication, database, file storage (US/your chosen region).
- **Anthropic** — AI extraction of details from flight itineraries you upload.
- **Google Places** — powering "local ideas" near your destination (queried server-side).
- **Expo (push)** / **Apple APNs** / **Google FCM** — delivering push notifications.
- **Vercel** — hosting the web app.
- **Twilio** — sending SMS one-time passcodes (if phone sign-in is enabled).

Each processes data only to provide its function to us. Review their policies for details.

## Sharing within a trip

Trip content is visible to members of that trip. Some data is more restricted: your **personal
savings ("safe")** and your **flight itinerary file** are private to you (itineraries are also
visible to trip admins for verification override). We never expose one member's private data to
another member outside these rules.

## Data retention & deletion

We keep your data while your account is active. **You can request deletion of your account and
associated data at [privacy@yourdomain.com]**; we will delete or anonymize it except where we
must retain limited records for legal/security reasons. [Describe your in-app deletion path once
built.]

## Security

Access is protected by authentication and database row-level security; private files are served
only via short-lived signed URLs; server secrets (API keys) are never shipped in the app. No
system is perfectly secure, but we take reasonable measures to protect your data.

## Children

Trippl is not directed to children under [13/16, per your jurisdiction], and we do not knowingly
collect their data. If you believe a child has provided data, contact us to remove it.

## Your rights

Depending on where you live (e.g. GDPR/CCPA), you may have rights to access, correct, delete, or
port your data, and to object to certain processing. Contact us at [privacy@yourdomain.com] to
exercise them.

## International transfers

Your data may be processed in the United States or other countries where our processors operate.
[Add your transfer-mechanism disclosure if serving the EU/UK.]

## Changes

We may update this policy; we will post the new effective date here and, for material changes,
notify you in the app.

## Contact

[Your name / company] — [privacy@yourdomain.com] — [postal address if required].
