// Pure social/relationship helpers (Release 2 · B3). No React, no Supabase — the
// same rules the DB enforces in RLS, expressed once so the client and server
// agree and so the invariant can be unit-tested.
import type { ConnectionState, ProfileVisibility } from "@/types";
import { tripContentAllowed, type Surface } from "@/lib/surface";

// Who may READ a profile row — mirrors the `profiles_select` policy exactly:
//   self OR a co-trip-member (trip function) OR — when not blocked either way —
//   a public profile or an accepted connection.
// Being a connection widens PROFILE visibility; it does NOT touch trip access
// (see `connectionGrantsTripAccess` below).
export function profileVisibleTo(rel: {
  isSelf: boolean;
  sharesTrip: boolean;
  isConnected: boolean;
  isBlocked: boolean;
  visibility: ProfileVisibility;
}): boolean {
  if (rel.isSelf) return true;
  if (rel.sharesTrip) return true; // trip co-members always, for trip function
  if (rel.isBlocked) return false; // a block hides both directions on world surfaces
  return rel.visibility === "public" || rel.isConnected;
}

// THE B3 INVARIANT, stated as code: no relationship — not a connection, not a
// public profile, nothing — grants access to another user's trip content. Trip
// content is gated on trip membership alone, forever. This is intentionally a
// constant-false function of the relationship: there is no state that flips it.
export function connectionGrantsTripAccess(_state: ConnectionState): boolean {
  return false;
}

// A profile / connections screen is a WORLD surface, so trip content can never
// render on it regardless of how close the relationship is. Ties the invariant
// to the B1 surface machine.
export function worldSurfaceAllowsTripContent(surface: Surface): boolean {
  return tripContentAllowed(surface); // false for "world", true only for "inside"
}

// The primary action button for a profile, given my relationship to them.
// `null` = show no primary action (that's me). `destructive` styles a block/undo.
export type ProfileAction = {
  label: string;
  rpc: "send_connection_request" | "respond_connection_request" | "remove_connection" | "set_connection_block";
  tone: "primary" | "secondary" | "muted";
};

export function connectionAction(state: ConnectionState): ProfileAction | null {
  switch (state) {
    case "self":
      return null;
    case "none":
      return { label: "Connect", rpc: "send_connection_request", tone: "primary" };
    case "outgoing":
      return { label: "Requested — tap to cancel", rpc: "remove_connection", tone: "muted" };
    case "incoming":
      return { label: "Accept request", rpc: "respond_connection_request", tone: "primary" };
    case "connected":
      return { label: "Connected", rpc: "remove_connection", tone: "secondary" };
    case "blocked":
      return { label: "Blocked — tap to unblock", rpc: "set_connection_block", tone: "muted" };
    case "blocked_by_them":
      return null;
  }
}

// A one-line summary of how two people are connected, for the profile header.
export function provenanceLine(sharedTrips: number, mutuals: number): string | null {
  const bits: string[] = [];
  if (sharedTrips > 0) bits.push(`${sharedTrips} trip${sharedTrips === 1 ? "" : "s"} together`);
  if (mutuals > 0) bits.push(`${mutuals} mutual connection${mutuals === 1 ? "" : "s"}`);
  return bits.length ? bits.join(" · ") : null;
}
