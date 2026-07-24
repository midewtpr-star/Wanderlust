/// <reference types="jest" />
import TestRenderer, { act } from "react-test-renderer";
import {
  tripContentAllowed,
  assertTripContentAllowed,
  WORLD_SURFACES,
} from "@/lib/surface";
import { SurfaceProvider, TripContent } from "@/components/ui/surface-context";

// Proves the B1 hard boundary: trip-scoped content may render INSIDE a trip but
// NEVER on a "world" surface (passport / profile / connections / nearby).

const json = (r: TestRenderer.ReactTestRenderer) => JSON.stringify(r.toJSON());

describe("private / public boundary invariant", () => {
  it("the pure decision allows trip content only inside", () => {
    expect(tripContentAllowed("inside")).toBe(true);
    expect(tripContentAllowed("world")).toBe(false);
  });

  it("the guard throws when trip content is asked to render on a world surface", () => {
    expect(WORLD_SURFACES).toEqual(
      expect.arrayContaining(["passport", "profile", "connections", "nearby"]),
    );
    expect(() => assertTripContentAllowed("world", "chat")).toThrow(/"world"/);
    expect(() => assertTripContentAllowed("inside", "chat")).not.toThrow();
  });

  it("<TripContent> renders inside but is BLOCKED on a world surface", () => {
    let world!: TestRenderer.ReactTestRenderer;
    act(() => {
      world = TestRenderer.create(
        <SurfaceProvider value={{ surface: "world" }}>
          <TripContent fallback="BLOCKED">SECRET_TRIP_CONTENT</TripContent>
        </SurfaceProvider>,
      );
    });
    const worldOut = json(world);
    expect(worldOut).not.toContain("SECRET_TRIP_CONTENT"); // never leaks outward
    expect(worldOut).toContain("BLOCKED");

    let inside!: TestRenderer.ReactTestRenderer;
    act(() => {
      inside = TestRenderer.create(
        <SurfaceProvider value={{ surface: "inside" }}>
          <TripContent fallback="BLOCKED">SECRET_TRIP_CONTENT</TripContent>
        </SurfaceProvider>,
      );
    });
    expect(json(inside)).toContain("SECRET_TRIP_CONTENT"); // shows inside the room
  });
});
