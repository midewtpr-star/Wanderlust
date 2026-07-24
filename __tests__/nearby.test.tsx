/// <reference types="jest" />
import { encodeGeohash } from "@/lib/geohash";
import { areaGeohash, sameArea, windowsOverlap, nearbyEligible } from "@/lib/nearby";

// B5 Nearby rules, expressed purely so the client and the matching RPC agree.
// The area is always a geohash of a trip's PUBLIC destination — never device GPS.
describe("nearby matching", () => {
  it("encodes a known coordinate to the right geohash", () => {
    // Paris (48.8566, 2.3522) → geohash u09tv…
    expect(encodeGeohash(48.8566, 2.3522, 5)).toBe("u09tv");
    // non-finite input is a safe empty string, never a bogus cell
    expect(encodeGeohash(NaN, 10)).toBe("");
  });

  it("groups nearby points into one coarse region, separates far ones", () => {
    const paris = areaGeohash(48.8566, 2.3522);
    const parisish = areaGeohash(48.86, 2.35); // ~0.5 km away
    const tokyo = areaGeohash(35.6812, 139.7671);
    expect(sameArea(paris, parisish)).toBe(true); // same ~150 km region
    expect(sameArea(paris, tokyo)).toBe(false); // different continent
    expect(sameArea("", paris)).toBe(false); // missing area never matches
  });

  it("overlaps date windows inclusively", () => {
    expect(windowsOverlap("2026-08-01", "2026-08-07", "2026-08-05", "2026-08-10")).toBe(true);
    expect(windowsOverlap("2026-08-01", "2026-08-07", "2026-08-07", "2026-08-09")).toBe(true); // touch
    expect(windowsOverlap("2026-08-01", "2026-08-07", "2026-08-08", "2026-08-10")).toBe(false);
  });

  it("only a verified, unsuspended adult is eligible for Nearby", () => {
    expect(nearbyEligible("adult", false)).toBe(true);
    expect(nearbyEligible("minor", false)).toBe(false); // under-18 excluded
    expect(nearbyEligible("adult", true)).toBe(false); // suspended excluded
    expect(nearbyEligible(null, false)).toBe(false); // unverified age excluded
  });
});
