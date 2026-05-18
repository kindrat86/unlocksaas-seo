/**
 * ISO 8601 date guards and formatters.
 *
 * Every claim that changes over time (pricing, guarantee, audience,
 * competitor facts on a comparison page) needs a `lastVerified` ISO date
 * attached. Without it, an LLM caching the page has no way to tell how
 * stale its snapshot is, and Google's freshness heuristic downweights
 * the content.
 *
 * The functions here are intentionally strict: malformed input returns
 * the raw string unchanged or throws (depending on the function). We
 * never silently coerce nonsense into a plausible-looking date.
 */

const MONTHS_EN_US: ReadonlyArray<string> = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Returns true if the string is a YYYY-MM-DD ISO date that resolves to a valid UTC date. */
export function isIsoDate(input: unknown): input is string {
  if (typeof input !== "string") return false;
  const parts = input.split("-");
  if (parts.length !== 3) return false;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return false;
  }
  if (year < 1900 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  // Calendar-check: handle February + leap years correctly.
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

/**
 * Format a YYYY-MM-DD ISO date as "Month D, YYYY" in en-US.
 *
 *   formatVerifiedDate("2026-05-17") -> "May 17, 2026"
 *
 * On malformed input returns the raw string unchanged. That is the honest
 * fallback: a visible "2026-05-17" beats a silently coerced "January 0, NaN".
 */
export function formatVerifiedDate(iso: string): string {
  if (!isIsoDate(iso)) return String(iso);
  const [yearStr, monthStr, dayStr] = iso.split("-");
  const month = Number(monthStr);
  const day = Number(dayStr);
  return `${MONTHS_EN_US[month - 1]} ${day}, ${yearStr}`;
}

/** Today's ISO date in UTC. */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the ISO date `days` after `iso`. Throws on malformed input. */
export function addDaysIso(iso: string, days: number): string {
  if (!isIsoDate(iso)) {
    throw new Error(`addDaysIso: invalid ISO date "${iso}"`);
  }
  if (!Number.isInteger(days)) {
    throw new Error(`addDaysIso: days must be an integer, got ${days}`);
  }
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
