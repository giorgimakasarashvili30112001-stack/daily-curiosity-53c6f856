/** Milliseconds until the next UTC midnight — when a new daily fact appears. */
export function msUntilUtcMidnight(): number {
  const now = new Date();
  const next = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
    0,
    0,
    0,
    0,
  );
  return Math.max(1000, next - now.getTime());
}

/** Keep offline content around for a month. */
export const FACT_GC_TIME = 1000 * 60 * 60 * 24 * 30;
