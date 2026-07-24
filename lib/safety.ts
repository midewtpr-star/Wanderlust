// Pure trust-and-safety helpers (Release 2 · B4). No React, no Supabase — the
// same rules the DB enforces (age gating, discoverability), expressed once so the
// client and server agree and the invariants can be unit-tested.
import type { AgeBand, ProfileVisibility, ReportReason, ReportSubjectKind } from "@/types";

// The report reason taxonomy shown in the report sheet (and CHECK-constrained in
// the DB). Order = display order.
export const REPORT_REASONS: { key: ReportReason; label: string }[] = [
  { key: "harassment", label: "Harassment or bullying" },
  { key: "inappropriate", label: "Inappropriate or explicit content" },
  { key: "spam", label: "Spam" },
  { key: "scam", label: "Scam or fraud" },
  { key: "impersonation", label: "Impersonation" },
  { key: "underage", label: "Under-age user" },
  { key: "safety", label: "Safety concern or threat" },
  { key: "other", label: "Something else" },
];

// Human labels for the surface a report targets.
export const SUBJECT_KIND_LABEL: Record<ReportSubjectKind, string> = {
  profile: "profile",
  message: "message",
  trip: "trip",
  activity: "activity",
  journal_entry: "journal entry",
  outfit: "outfit",
  other: "content",
};

// The age at which a traveler counts as an adult for discovery/public visibility.
export const ADULT_AGE = 18;

// Derive an age band from a birthdate (YYYY-MM-DD). Only the band is ever stored;
// the raw date is not persisted. Returns null for an invalid/future date.
export function ageBandFromBirthdate(iso: string): AgeBand | null {
  const dob = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  if (dob.getTime() > now.getTime()) return null;
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age >= ADULT_AGE ? "adult" : "minor";
}

// A profile may be PUBLIC only if its owner is a verified adult. Unknown age
// (null) → not eligible, so we never make an unverified user public.
export function canBePublic(band: AgeBand | null): boolean {
  return band === "adult";
}

// Does a profile appear in discovery? Mirrors the search_profiles policy: public
// + adult + not suspended + not blocked either way. Any missing precondition hides it.
export function isDiscoverable(p: {
  visibility: ProfileVisibility;
  ageBand: AgeBand | null;
  suspended: boolean;
  blocked: boolean;
}): boolean {
  return p.visibility === "public" && p.ageBand === "adult" && !p.suspended && !p.blocked;
}
