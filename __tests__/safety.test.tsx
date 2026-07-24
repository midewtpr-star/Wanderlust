/// <reference types="jest" />
import {
  ageBandFromBirthdate,
  canBePublic,
  isDiscoverable,
  REPORT_REASONS,
} from "@/lib/safety";

// A YYYY-MM-DD string for `yearsAgo` years before today (jest env: real Date ok).
function yearsAgo(years: number): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - years);
  return d.toISOString().slice(0, 10);
}

// B4 headline: a minor (or an unverified/ suspended user) can NEVER be public or
// discoverable — the age gate + discovery rule enforced client-side to match RLS.
describe("safety invariants", () => {
  it("derives an age band from a birthdate", () => {
    expect(ageBandFromBirthdate(yearsAgo(30))).toBe("adult");
    expect(ageBandFromBirthdate(yearsAgo(18))).toBe("adult"); // exactly 18 today
    expect(ageBandFromBirthdate(yearsAgo(14))).toBe("minor");
    expect(ageBandFromBirthdate("not-a-date")).toBeNull();
    expect(ageBandFromBirthdate("2999-01-01")).toBeNull(); // future
  });

  it("only a verified adult can be public", () => {
    expect(canBePublic("adult")).toBe(true);
    expect(canBePublic("minor")).toBe(false);
    expect(canBePublic(null)).toBe(false); // unknown age → never public
  });

  it("a minor is NEVER discoverable, whatever else is set", () => {
    for (const suspended of [false, true]) {
      for (const blocked of [false, true]) {
        expect(
          isDiscoverable({ visibility: "public", ageBand: "minor", suspended, blocked }),
        ).toBe(false);
      }
    }
  });

  it("discovery requires public + adult + not suspended + not blocked", () => {
    const base = { visibility: "public" as const, ageBand: "adult" as const, suspended: false, blocked: false };
    expect(isDiscoverable(base)).toBe(true);
    expect(isDiscoverable({ ...base, visibility: "private" })).toBe(false);
    expect(isDiscoverable({ ...base, ageBand: null })).toBe(false); // unverified age
    expect(isDiscoverable({ ...base, suspended: true })).toBe(false);
    expect(isDiscoverable({ ...base, blocked: true })).toBe(false);
  });

  it("the report taxonomy is present and covers the key reasons", () => {
    const keys = REPORT_REASONS.map((r) => r.key);
    expect(keys).toEqual(expect.arrayContaining(["harassment", "underage", "safety", "spam"]));
    expect(REPORT_REASONS.length).toBeGreaterThanOrEqual(5);
  });
});
