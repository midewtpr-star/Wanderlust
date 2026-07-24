// Trippl — the private/public boundary (B1), pure core. RN-free so it is directly
// unit-testable. The boundary is a HARD architectural rule, not decoration:
//
//   · "inside"  = a trip's closed room (chat, money, media, journal, dashboard …).
//   · "world"   = the outward social layer (passport, profile, connections, nearby).
//
// The invariant: TRIP-SCOPED CONTENT MAY ONLY RENDER ON AN "inside" SURFACE — it
// must never appear on a "world" surface. Enforced at runtime by the <TripContent>
// guard (components/ui/boundary.tsx), which is a thin wrapper over the pure
// decision below, and proven by __tests__/boundary.test.ts.

export type Surface = "inside" | "world";

// The outward-facing (public/social) surfaces. These never render trip content.
export const WORLD_SURFACES = ["passport", "profile", "connections", "nearby"] as const;
export type WorldSurface = (typeof WORLD_SURFACES)[number];

// The one rule: trip-scoped content is allowed ONLY inside a trip.
export function tripContentAllowed(surface: Surface): boolean {
  return surface === "inside";
}

// Dev/test guard: throws if trip content is asked to render on a world surface.
export function assertTripContentAllowed(surface: Surface, what = "trip content"): void {
  if (!tripContentAllowed(surface)) {
    throw new Error(`Boundary violation: ${what} cannot render on a "world" surface.`);
  }
}
