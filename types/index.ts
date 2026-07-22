// Trippl — shared TypeScript types (mirror docs/data-model.md + the Phase 1 schema).

export type ID = string;

export type TripStatus = "planning" | "locked" | "active" | "completed";
export type MemberRole = "host" | "admin" | "member";

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
  total_media: number;
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
