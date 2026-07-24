// Pure Nearby-Travelers helpers (Release 2 · B5). The coarse-area matching rules,
// expressed once so the client and the matching RPC agree — and so the privacy
// guarantees are unit-testable. No React, no Supabase.
import { encodeGeohash } from "@/lib/geohash";
import type { AgeBand } from "@/types";

// The area is ALWAYS derived from a trip's public destination — never a user's
// device location. We store a precision-5 geohash (still just the coarse public
// destination) but MATCH on the precision-3 prefix (~150 km region), so two
// travelers heading to the same metro/region match without a precise point.
export const STORE_PRECISION = 5;
export const AREA_PRECISION = 3;

export function areaGeohash(lat: number, lng: number): string {
  return encodeGeohash(lat, lng, STORE_PRECISION);
}

// Do two stored geohashes fall in the same coarse region?
export function sameArea(a: string, b: string): boolean {
  if (!a || !b) return false;
  return a.slice(0, AREA_PRECISION) === b.slice(0, AREA_PRECISION);
}

// Inclusive overlap of two ISO (YYYY-MM-DD) date windows. Lexicographic compare
// is correct for zero-padded ISO dates.
export function windowsOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}

// Who may be discoverable at all: a verified ADULT who isn't suspended. Minors
// and suspended users are excluded from Nearby entirely (both as seekers and as
// results). Pairwise blocks are handled in the match query.
export function nearbyEligible(ageBand: AgeBand | null, suspended: boolean): boolean {
  return ageBand === "adult" && !suspended;
}
