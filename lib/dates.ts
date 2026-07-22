// Date helpers for trip cards, the create form, and countdowns.

// Format a Date as a local YYYY-MM-DD string (for date columns).
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseISODate(s: string | null | undefined): Date | null {
  if (!s) return null;
  const d = new Date(`${s}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDate(s: string | null | undefined): string {
  const d = parseISODate(s);
  if (!d) return "—";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateRange(
  start?: string | null,
  end?: string | null,
): string {
  const s = parseISODate(start);
  const e = parseISODate(end);
  if (!s && !e) return "Dates TBD";
  if (s && e) {
    const sameYear = s.getFullYear() === e.getFullYear();
    const startStr = s.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      ...(sameYear ? {} : { year: "numeric" }),
    });
    const endStr = e.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return `${startStr} – ${endStr}`;
  }
  return formatDate(start ?? end);
}

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  done: boolean;
};

// Time remaining until a target date. `now` is injectable so components can tick.
export function countdownTo(
  target: string | null | undefined,
  now: number = Date.now(),
): CountdownParts | null {
  const d = parseISODate(target);
  if (!d) return null;
  let diff = Math.floor((d.getTime() - now) / 1000);
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, done: true };
  const days = Math.floor(diff / 86400);
  diff -= days * 86400;
  const hours = Math.floor(diff / 3600);
  diff -= hours * 3600;
  const minutes = Math.floor(diff / 60);
  const seconds = diff - minutes * 60;
  return { days, hours, minutes, seconds, done: false };
}
