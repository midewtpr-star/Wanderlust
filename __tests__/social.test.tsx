/// <reference types="jest" />
import {
  profileVisibleTo,
  connectionGrantsTripAccess,
  worldSurfaceAllowsTripContent,
  connectionAction,
  provenanceLine,
} from "@/lib/social";
import { WORLD_SURFACES } from "@/lib/surface";
import type { ConnectionState } from "@/types";

const ALL_STATES: ConnectionState[] = [
  "self",
  "connected",
  "outgoing",
  "incoming",
  "blocked",
  "blocked_by_them",
  "none",
];

// B3 headline: profile visibility widens who can READ a profile, but NOTHING —
// not a connection, not a public profile — ever grants access to trip content.
// Trip content stays gated on trip membership (the B1 world/inside boundary).
describe("profiles & connections invariant", () => {
  it("profileVisibleTo mirrors the RLS rule", () => {
    // stranger + private → hidden; stranger + public → visible
    expect(
      profileVisibleTo({ isSelf: false, sharesTrip: false, isConnected: false, isBlocked: false, visibility: "private" }),
    ).toBe(false);
    expect(
      profileVisibleTo({ isSelf: false, sharesTrip: false, isConnected: false, isBlocked: false, visibility: "public" }),
    ).toBe(true);
    // connection sees a private profile
    expect(
      profileVisibleTo({ isSelf: false, sharesTrip: false, isConnected: true, isBlocked: false, visibility: "private" }),
    ).toBe(true);
    // co-trip-member always sees identity (trip function), even if private
    expect(
      profileVisibleTo({ isSelf: false, sharesTrip: true, isConnected: false, isBlocked: false, visibility: "private" }),
    ).toBe(true);
    // self always
    expect(
      profileVisibleTo({ isSelf: true, sharesTrip: false, isConnected: false, isBlocked: false, visibility: "private" }),
    ).toBe(true);
    // a block hides both directions on world surfaces, even a public/connected one
    expect(
      profileVisibleTo({ isSelf: false, sharesTrip: false, isConnected: true, isBlocked: true, visibility: "public" }),
    ).toBe(false);
  });

  it("NO connection state grants trip access", () => {
    for (const state of ALL_STATES) {
      expect(connectionGrantsTripAccess(state)).toBe(false);
    }
  });

  it("a visible profile still cannot show trip content (visibility ≠ trip access)", () => {
    // profile is fully visible (public + connected)…
    const visible = profileVisibleTo({
      isSelf: false,
      sharesTrip: false,
      isConnected: true,
      isBlocked: false,
      visibility: "public",
    });
    expect(visible).toBe(true);
    // …yet the profile/connections screens are WORLD surfaces, where trip content
    // is never allowed to render.
    expect(WORLD_SURFACES).toEqual(expect.arrayContaining(["profile", "connections"]));
    expect(worldSurfaceAllowsTripContent("world")).toBe(false);
    expect(worldSurfaceAllowsTripContent("inside")).toBe(true);
  });

  it("connectionAction offers the right primary action per state", () => {
    expect(connectionAction("self")).toBeNull();
    expect(connectionAction("none")?.rpc).toBe("send_connection_request");
    expect(connectionAction("incoming")?.rpc).toBe("respond_connection_request");
    expect(connectionAction("outgoing")?.rpc).toBe("remove_connection");
    expect(connectionAction("connected")?.rpc).toBe("remove_connection");
    expect(connectionAction("blocked")?.rpc).toBe("set_connection_block");
  });

  it("provenanceLine summarises how two people are connected", () => {
    expect(provenanceLine(0, 0)).toBeNull();
    expect(provenanceLine(1, 0)).toBe("1 trip together");
    expect(provenanceLine(2, 3)).toBe("2 trips together · 3 mutual connections");
  });
});
