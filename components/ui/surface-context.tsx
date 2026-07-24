import { createContext, useContext, type ReactNode } from "react";
import { tripContentAllowed, type Surface } from "@/lib/surface";

// The private/public surface context + the <TripContent> guard. Kept free of heavy
// RN deps (only React + the pure lib/surface core) so the boundary invariant is
// directly render-testable — see __tests__/boundary.test.tsx.

export type SurfaceState = { surface: Surface; tripName?: string };

// Default "world": trip content only renders where a trip Boundary sets us inside.
export const SurfaceContext = createContext<SurfaceState>({ surface: "world" });

export function useSurface(): SurfaceState {
  return useContext(SurfaceContext);
}

export function SurfaceProvider({
  value,
  children,
}: {
  value: SurfaceState;
  children: ReactNode;
}) {
  return <SurfaceContext.Provider value={value}>{children}</SurfaceContext.Provider>;
}

// The hard guard: content wrapped in <TripContent> renders ONLY on an inside
// surface. On a world surface it renders `fallback` (nothing by default) — so trip
// content can never leak outward.
export function TripContent({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { surface } = useSurface();
  if (!tripContentAllowed(surface)) {
    if (typeof __DEV__ !== "undefined" && __DEV__) {
      console.warn('Boundary: trip content was blocked from rendering on a "world" surface.');
    }
    return <>{fallback}</>;
  }
  return <>{children}</>;
}
