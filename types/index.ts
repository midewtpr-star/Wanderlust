// Trippl — shared TypeScript types (mirror docs/data-model.md + the Phase 1 schema).

export type ID = string;

export type TripStatus = "planning" | "locked" | "active" | "completed";
export type MemberRole = "host" | "admin" | "member";

// --- Destination themes ---
// Where a trip's palette came from (priority: cover image → curated → generated).
export type ThemeSource = "cover_image" | "curated" | "generated";

// A trip's generated theme. Colors are raw hex; they only drive the accent layer
// inside the trip (contrast-clamped at use). motif is a one-word decorative key.
export type TripTheme = {
  primary: string;
  secondary: string;
  surface_tint: string;
  motif: string;
  source: ThemeSource;
};

// A row of `trips`.
export type Trip = {
  id: ID;
  host_id: ID;
  title: string;
  cover_url: string | null;
  location_city: string | null;
  location_lat: number | null;
  location_lng: number | null;
  start_date: string | null; // ISO date (YYYY-MM-DD)
  end_date: string | null;
  car_rental_ref: string | null;
  airbnb_pick: ID | null;
  status: TripStatus;
  theme: TripTheme | null; // destination theme (null = default Trippl accent)
  created_at: string;
  updated_at: string;
};

// GROUPPAD SEAM — a manual Airbnb option. Replaced by the GroupPad module later (D7).
export type AirbnbOption = {
  id: ID;
  trip_id: ID;
  added_by: ID | null;
  title: string | null;
  url: string | null;
  total_cost: number | null;
  image_url: string | null;
  notes: string | null;
  created_at: string;
};

export type AirbnbOptionInput = {
  title: string;
  url: string;
  total_cost: number | null;
  image_url: string | null;
};

export type CreateTripInput = {
  title: string;
  cover_url: string | null;
  location_city: string;
  location_lat?: number | null;
  location_lng?: number | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  car_rental_ref?: string | null;
  airbnb_options: AirbnbOptionInput[];
};

// --- Phase 3: invites + RSVP ---

export type RsvpStatus = "going" | "maybe" | "not";

// A row of `invites`.
export type Invite = {
  id: ID;
  trip_id: ID;
  code: string;
  invited_by: ID | null;
  expires_at: string | null;
  created_at: string;
};

// Minimal invite preview (from the trip_preview RPC) — readable while signed out.
export type GoingMember = { display_name: string | null; avatar_url: string | null };
export type TripPreview = {
  trip_id: ID;
  title: string;
  cover_url: string | null;
  location_city: string | null;
  start_date: string | null;
  end_date: string | null;
  going_count: number;
  going_members: GoingMember[];
};

// A trip member joined with their profile + current RSVP (for the RSVP wall).
export type MemberWithRsvp = {
  user_id: ID;
  role: MemberRole;
  display_name: string | null;
  avatar_url: string | null;
  status: RsvpStatus | null; // null = invited, not yet responded
};

// --- Phase 4: travel proof ---

export type ProofType = "flight" | "driving";

// A row of `travel_proofs` (itinerary PII — owner + admins only, D6).
export type TravelProof = {
  id: ID;
  trip_id: ID;
  user_id: ID;
  type: ProofType;
  passenger_name: string | null;
  confirmation_number: string | null;
  arrival_airport: string | null;
  arrival_city: string | null;
  travel_dates: string | null;
  file_url: string | null; // private storage PATH (sign to view)
  note: string | null;
  verified: boolean;
  verified_at: string | null;
  verified_by: ID | null;
  created_at: string;
};

// Non-PII per-member status (from the get_travel_status RPC) for the status wall.
export type TravelStatusRow = { user_id: ID; type: ProofType; verified: boolean };

// The verify-flight edge function's response.
export type FlightVerdict = {
  ok: boolean;
  status: "verified" | "failed" | "error";
  reason: string | null;
  extracted: {
    passenger_name: string | null;
    confirmation_number: string | null;
    arrival_airport_iata: string | null;
    arrival_city: string | null;
    travel_dates: string | null;
  } | null;
  distance_miles: number | null;
  resolved_city: string | null;
  name_match: boolean;
  date_in_window: boolean | null;
  warnings: string[];
};

// --- Phase 5: money ledger (integer CENTS everywhere — D3, D5) ---

export type PoolType = "airbnb" | "car";

// A row of `money_pools` (ledger only — no custody).
export type MoneyPool = {
  id: ID;
  trip_id: ID;
  type: PoolType;
  total_cents: number | null;
  unlock_date: string | null; // defaults to trip start_date
  created_at: string;
};

// A row of `pool_contributions` (append-only ledger).
export type PoolContribution = {
  id: ID;
  pool_id: ID;
  trip_id: ID;
  user_id: ID;
  amount_cents: number;
  method: string | null;
  note: string | null;
  contributed_at: string;
};

// A row of `personal_safes` (private, self-only).
export type PersonalSafe = {
  id: ID;
  trip_id: ID;
  user_id: ID;
  goal_cents: number | null;
  unlock_date: string | null;
  created_at: string;
};

// A row of `safe_deposits` (append-only personal ledger; no trip_id — self-only).
export type SafeDeposit = {
  id: ID;
  safe_id: ID;
  user_id: ID;
  amount_cents: number;
  note: string | null;
  deposited_at: string;
};

// The progressive checklist steps (member_steps.step enum).
export type StepKey = "travel_proof" | "airbnb_paid" | "car_paid";

export type MemberStep = {
  trip_id: ID;
  user_id: ID;
  step: StepKey;
  completed: boolean;
  completed_at: string | null;
};

// --- Phase 8: local ideas + activities + media ---

// A normalized local idea from the nearby-ideas edge function (source-agnostic).
export type Idea = {
  name: string;
  category: string; // food | outdoors | nightlife | attractions | events
  description: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  rating: number | null;
  url: string | null;
  image: string | null;
  source: string;
};

export type NearbyIdeasResult = {
  configured: boolean;
  ideas: Idea[];
  coords?: { lat: number; lng: number };
  noDestination?: boolean;
  note?: string | null;
  error?: string;
};

// A row of `activities`.
export type Activity = {
  id: ID;
  trip_id: ID;
  created_by: ID | null;
  title: string;
  description: string | null;
  scheduled_for: string | null; // ISO timestamptz
  location: string | null;
  url: string | null;
  created_at: string;
};

export type ActivityInput = {
  title: string;
  description?: string | null;
  scheduled_for?: string | null;
  location?: string | null;
  url?: string | null;
};

export type MediaType = "photo" | "video" | "other";

// A row of `activity_media` (url is a PRIVATE trip-media storage path).
export type ActivityMedia = {
  id: ID;
  activity_id: ID;
  trip_id: ID;
  uploaded_by: ID | null;
  media_type: MediaType;
  url: string | null;
  caption: string | null;
  created_at: string;
};

// --- Phase 9: post-trip recap + opt-in miles ---

// Real, computed numbers stored into trip_recap.stats (no fabricated metrics).
export type TripStats = {
  places_visited: number;
  place_names: string[];
  miles_covered: number; // group total (miles) from opt-in tracking
  miles_tracked_members: number; // how many opted in (for honesty)
  member_count: number;
  verified_members: number; // fully-verified members
  steps_completed: number; // total completed member_steps
  confirmed_travelers: number; // members with travel_proof done
  total_media: number; // activity + journal photos/videos
  journal_entries: number; // Release 2: diary entries written
  trip_days: number;
};

// A row of `trip_recap` (one per trip).
export type TripRecap = {
  id: ID;
  trip_id: ID;
  generated_at: string | null;
  stats: TripStats | null;
  collage_url: string | null; // PRIVATE trip-media storage path (sign to view)
  created_at: string;
};

// The non-PII distance aggregate (get_trip_distance_summary RPC).
export type DistanceSummary = {
  total_meters: number;
  tracked_count: number;
  member_count: number;
};

// --- Group chat (promoted backlog item) ---

// A row of `messages`. created_at is stored UTC; render in local time.
// attachment_* are reserved for a later image phase (schema-ready only).
export type ChatMessage = {
  id: ID;
  trip_id: ID;
  sender_id: ID;
  body: string;
  attachment_url: string | null;
  attachment_type: string | null; // 'image' | null (reserved)
  created_at: string;
  // Client-only optimistic flags (never persisted):
  pending?: boolean; // sent, awaiting the server round-trip
  failed?: boolean; // the insert failed — offer a retry
};

// One row of the trip_unread_counts() RPC.
export type TripUnread = { trip_id: ID; unread: number };

// --- Outfit planner (Pinterest-powered; promoted backlog item) ---

export type OutfitProvider = "pinterest" | "link" | "upload";

// A row of `outfits` — one member's look for a trip.
export type Outfit = {
  id: ID;
  trip_id: ID;
  owner_id: ID;
  title: string;
  day: string | null; // ISO date (YYYY-MM-DD) or null (any day)
  activity_id: ID | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// A row of `outfit_items` — one moodboard card.
export type OutfitItem = {
  id: ID;
  outfit_id: ID;
  trip_id: ID;
  owner_id: ID;
  source_url: string | null; // original pin/site link (null for uploads)
  image_url: string | null; // remote URL, or a private trip-media PATH when provider='upload'
  title: string | null;
  provider: OutfitProvider;
  position: number;
  created_at: string;
};

export type OutfitInput = {
  title: string;
  day?: string | null;
  activity_id?: ID | null;
  notes?: string | null;
};

// The link-preview edge function's normalized response.
export type LinkPreview = {
  ok: boolean;
  url: string | null;
  title: string | null;
  image_url: string | null;
  author: string | null;
  provider: string; // 'pinterest' | 'link'
};

// --- Shared bring list (group packing/supplies) ---

export type BringPriority = "needed" | "optional";

// A row of `bring_items`.
export type BringItem = {
  id: ID;
  trip_id: ID;
  created_by: ID;
  name: string;
  category: string | null; // gear | food | docs | misc (free text)
  priority: BringPriority;
  quantity: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

// A row of `bring_claims` (who's bringing an item; multiple claimers allowed).
export type BringClaim = {
  id: ID;
  item_id: ID;
  trip_id: ID;
  user_id: ID;
  quantity: number | null;
  claimed_at: string;
};

export type BringItemInput = {
  name: string;
  category?: string | null;
  priority?: BringPriority;
  quantity?: number | null;
  notes?: string | null;
};

// --- Release 2 · Phase 18: Trip Journal ---

export type JournalMediaType = "photo" | "video";

// A row of `journal_media` (url is a PRIVATE trip-media storage path).
export type JournalMedia = {
  id: ID;
  entry_id: ID;
  trip_id: ID;
  uploaded_by: ID | null;
  media_type: JournalMediaType;
  url: string;
  position: number;
  created_at: string;
};

// A row of `journal_entries`. `body` may be "" — media-only entries are valid
// (the app requires text OR at least one media item).
export type JournalEntry = {
  id: ID;
  trip_id: ID;
  author_id: ID;
  body: string;
  day: string | null; // ISO date (YYYY-MM-DD) or null (unpinned)
  activity_id: ID | null;
  created_at: string;
  updated_at: string;
};

export type JournalEntryInput = {
  body: string;
  day?: string | null;
  activity_id?: ID | null;
};

// Media with a resolved short-lived signed URL (private trip-media bucket).
export type JournalMediaWithUrl = JournalMedia & { signedUrl: string | null };

// A journal entry composed with its author + media, for the timeline + detail.
export type JournalEntryView = JournalEntry & {
  author_name: string | null;
  author_avatar: string | null;
  media: JournalMediaWithUrl[];
};

// --- Profiles & Connections (Release 2 · B3) ---

// Who may read a profile row. Private is the default; trip co-members always
// can (trip function); a connection can; a public profile is visible to all.
export type ProfileVisibility = "public" | "private";

// The world-facing identity fields of a profile (never trip content).
export type PublicProfile = {
  id: ID;
  display_name: string | null;
  handle: string | null; // 3–20 chars [a-z0-9_], case-insensitively unique
  avatar_url: string | null;
  bio: string | null;
  home_city: string | null;
  visibility: ProfileVisibility;
};

// My relationship to another user, from connection_state_with(). Drives the
// action button on their profile. "blocked" = I blocked them; "blocked_by_them"
// should not normally be reachable (their profile is hidden from me by RLS).
export type ConnectionState =
  | "self"
  | "connected"
  | "outgoing"
  | "incoming"
  | "blocked"
  | "blocked_by_them"
  | "none";

// A row from list_connections() — an accepted connection + basic identity.
export type ConnectionSummary = {
  id: ID;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  home_city: string | null;
  visibility: ProfileVisibility;
  since: string;
};

// A row from list_connection_requests() — a pending request either direction.
export type ConnectionRequest = {
  id: ID;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  direction: "incoming" | "outgoing";
  requested_at: string;
};

// A row from search_profiles() — a discoverable (public) profile.
export type ProfileSearchResult = {
  id: ID;
  display_name: string | null;
  handle: string | null;
  avatar_url: string | null;
  home_city: string | null;
};

// A shared trip from get_profile_provenance() — only ever a trip the VIEWER is
// also a member of, so it can never leak a trip's existence.
export type ProvenanceTrip = {
  trip_id: ID;
  title: string;
  start_date: string | null;
  end_date: string | null;
};

// Lifetime passport counters shared outward (the B2 snapshot, no trip identifies).
export type PassportSummary = {
  trips: number;
  places: number;
  countries: number;
  continents: number;
  airports: number;
  landmarks: number;
  miles: number;
  days: number;
  started_on: string | null;
};

// Everything the profile screen needs, composed: identity + how-we're-connected
// (provenance + mutuals) + the outward passport summary. NO trip content.
export type ProfileOverview = {
  profile: PublicProfile;
  state: ConnectionState;
  provenance: ProvenanceTrip[];
  mutualCount: number;
  passport: PassportSummary | null;
};

// --- Safety & Moderation (Release 2 · B4) ---

// Age band, derived once from a birthdate (the raw date is never stored). A minor
// is forced private + excluded from discovery.
export type AgeBand = "adult" | "minor";

// What a report targets, and why. Both are CHECK-constrained in the DB.
export type ReportSubjectKind =
  | "profile"
  | "message"
  | "trip"
  | "activity"
  | "journal_entry"
  | "outfit"
  | "other";

export type ReportReason =
  | "spam"
  | "harassment"
  | "inappropriate"
  | "impersonation"
  | "underage"
  | "scam"
  | "safety"
  | "other";

export type ReportStatus = "open" | "reviewing" | "actioned" | "dismissed";

// What the client passes to submit_report().
export type ReportInput = {
  subjectKind: ReportSubjectKind;
  subjectId?: ID | null;
  subjectUserId?: ID | null;
  reason: ReportReason;
  detail?: string | null;
};

export type ModerationActionKind = "dismiss" | "remove_content" | "suspend_user" | "unsuspend_user";

// A row from list_open_reports() (moderator queue).
export type ModerationReport = {
  id: ID;
  subject_kind: ReportSubjectKind;
  subject_id: ID | null;
  subject_user_id: ID | null;
  reason: ReportReason;
  detail: string | null;
  status: ReportStatus;
  created_at: string;
  reporter_name: string | null;
  subject_user_name: string | null;
};
