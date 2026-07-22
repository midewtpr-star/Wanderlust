// AppName — shared TypeScript types (mirror docs/data-model.md + the Phase 1 schema).

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
