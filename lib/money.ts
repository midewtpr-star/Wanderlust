// Calor — money helpers. LEDGER MODE (decisions.md D3): amounts are integer
// CENTS everywhere; never floats. Nothing here holds or moves funds — these are
// honor-system records. Real custody (Stripe Connect + KYC) is the gated later
// phase that flips on via config, not a rebuild.

import { toISODate } from "@/lib/dates";

// The equal-split denominator source (D5). Change this ONE constant to switch the
// split from "members who RSVP'd going" to "all members" later.
export const SPLIT_DENOMINATOR: "going" | "all_members" = "going";

// Human label for the denominator, shown next to the split so N isn't a mystery.
export const SPLIT_DENOMINATOR_LABEL =
  SPLIT_DENOMINATOR === "going" ? "going" : "members";

// Format integer cents as "$1,234.56" (manual — no Intl dependency, Hermes-safe).
export function formatCents(cents: number | null | undefined): string {
  const n = cents ?? 0;
  const neg = n < 0;
  const v = Math.abs(n);
  const dollars = Math.floor(v / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const rem = (v % 100).toString().padStart(2, "0");
  return `${neg ? "-" : ""}$${dollars}.${rem}`;
}

// Parse a user-typed dollar string ("1,234.5", "$40") to integer cents, or null.
export function dollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = parseFloat(cleaned);
  if (Number.isNaN(n) || n < 0) return null;
  return Math.round(n * 100);
}

// Equal per-person share, in cents. Ceil so the group never under-collects when
// the total doesn't divide evenly (rounding policy — foundation §12-3). Returns
// null when there's no total or no one to split across.
export function perPersonCents(
  totalCents: number | null | undefined,
  denominator: number,
): number | null {
  if (totalCents == null || denominator <= 0) return null;
  return Math.ceil(totalCents / denominator);
}

// A pool/safe is "unlocked" on or after its unlock_date (the trip start day).
// Before then it renders sealed — a UI/ledger state, not fund custody.
export function isUnlocked(unlockDate: string | null | undefined): boolean {
  if (!unlockDate) return true; // no date set → nothing to seal
  return toISODate(new Date()) >= unlockDate;
}

// Clamp a 0..1 progress fraction.
export function fraction(paid: number, target: number): number {
  if (target <= 0) return paid > 0 ? 1 : 0;
  return Math.max(0, Math.min(1, paid / target));
}
