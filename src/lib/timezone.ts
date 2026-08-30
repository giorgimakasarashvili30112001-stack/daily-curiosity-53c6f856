/**
 * Timezone helpers shared by client and server.
 *
 * Streak accounting is anchored to the *user's* local calendar day, so a day is
 * "missed" at their own 00:00, not at UTC midnight.
 */

export const DEFAULT_TIME_ZONE = "UTC";

export function isValidTimeZone(tz: string | null | undefined): tz is string {
  if (!tz || typeof tz !== "string" || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-CA", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function normalizeTimeZone(tz: string | null | undefined): string {
  return isValidTimeZone(tz) ? tz : DEFAULT_TIME_ZONE;
}

/** The browser's IANA timezone; falls back to UTC during SSR. */
export function clientTimeZone(): string {
  try {
    return normalizeTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}

/** `YYYY-MM-DD` for the given instant in the given timezone. */
export function localDate(tz: string, at: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: normalizeTimeZone(tz),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
}

/** Minutes elapsed since local midnight in the given timezone (0 - 1439). */
export function minutesSinceLocalMidnight(tz: string, at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: normalizeTimeZone(tz),
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  return (get("hour") % 24) * 60 + get("minute");
}
