/// <reference types="jest" />
import {
  clampTrimStart,
  clipEnd,
  formatMs,
  getMusicProvider,
  musicConfigured,
  DEFAULT_CLIP_MS,
} from "@/lib/music";

// B6: music-on-shares. The catalogue is operator-configured; the app SHIPS with
// none, and never accepts uploads. Trim is a pure 15s window.
describe("music on shares", () => {
  it("ships not configured (no provider until an operator sets one)", () => {
    // EXPO_PUBLIC_MUSIC_PROVIDER is unset in tests → the shipped default state.
    expect(getMusicProvider()).toBeNull();
    expect(musicConfigured()).toBe(false);
  });

  it("clamps the trim start inside [0, duration - clip]", () => {
    const dur = 168_000; // 2:48
    expect(clampTrimStart(20_000, dur)).toBe(20_000);
    expect(clampTrimStart(200_000, dur)).toBe(dur - DEFAULT_CLIP_MS); // past the end → last valid start
    expect(clampTrimStart(-5, dur)).toBe(0);
    expect(clampTrimStart(NaN, dur)).toBe(0);
  });

  it("computes a 15s clip end, capped at the track length", () => {
    expect(clipEnd(0, 168_000)).toBe(15_000);
    expect(clipEnd(160_000, 168_000)).toBe(168_000); // clamped start + clip, capped
  });

  it("formats milliseconds as m:ss", () => {
    expect(formatMs(0)).toBe("0:00");
    expect(formatMs(15_000)).toBe("0:15");
    expect(formatMs(168_000)).toBe("2:48");
  });
});
