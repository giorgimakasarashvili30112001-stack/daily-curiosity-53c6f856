import { STREAK_SAVE_COST } from "./quiz.constants";

const DAY_MS = 86400000;

export type ProfileRow = {
  display_name: string | null;
  streak_count: number;
  longest_streak: number;
  last_seen_date: string | null;
  coins: number;
  saved_days: string[];
  streak_anchor: string | null;
};

export type Settlement = {
  profile: ProfileRow;
  streak: number;
  longestStreak: number;
  coins: number;
  savedDays: string[];
  /** Last day that counts toward the current streak (correct answer, bought back, or day one). */
  anchor: string | null;
  lastCorrect: string | null;
  streakSaved: boolean;
  streakLost: boolean;
};

export const dayDiff = (from: string, to: string) =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);

export const shiftDay = (date: string, delta: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + delta * DAY_MS).toISOString().slice(0, 10);

const BASE_COLUMNS = "display_name, streak_count, longest_streak, last_seen_date, coins";
const FULL_COLUMNS = `${BASE_COLUMNS}, saved_days, streak_anchor`;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

const normalize = (row: any): ProfileRow => ({
  ...row,
  saved_days: (row.saved_days ?? []).map((d: string) => String(d).slice(0, 10)),
  streak_anchor: row.streak_anchor ?? null,
});

/** Reads the profile; tolerates a database without the newer streak columns. */
export async function loadProfileRow(supabase: Db, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(FULL_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (!error) return data ? normalize(data) : null;

  const { data: legacy } = await supabase
    .from("profiles")
    .select(BASE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  return legacy ? normalize(legacy) : null;
}

/** Writes a profile patch; retries without the newer columns if they are absent. */
export async function saveProfileRow(
  supabase: Db,
  userId: string,
  patch: Record<string, unknown>,
) {
  const payload = { id: userId, updated_at: new Date().toISOString(), ...patch };
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (!error) return;

  const { saved_days: _d, streak_anchor: _a, ...rest } = payload;
  if (Object.keys(rest).length === Object.keys(payload).length) throw error;
  const { error: retryError } = await supabase
    .from("profiles")
    .upsert(rest, { onConflict: "id" });
  if (retryError) throw retryError;
}

/** Latest day the user answered a question correctly, straight from quiz_attempts. */
export async function lastCorrectDate(supabase: Db): Promise<string | null> {
  const { data } = await supabase
    .from("quiz_attempts")
    .select("quiz_date")
    .eq("is_correct", true)
    .order("quiz_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.quiz_date ?? null;
}

/**
 * Brings the streak up to date for `today`:
 *  - no history at all -> today is the first streak day.
 *  - every day missed since the anchor costs STREAK_SAVE_COST coins and is
 *    recorded in `saved_days` (never charged twice).
 *  - when the coins run out the streak restarts at 1 with today as day one.
 */
export async function settleStreak(
  supabase: Db,
  userId: string,
  today: string,
): Promise<Settlement> {
  const [profile, lastCorrect] = await Promise.all([
    loadProfileRow(supabase, userId),
    lastCorrectDate(supabase),
  ]);

  const row: ProfileRow = profile ?? {
    display_name: null,
    streak_count: 0,
    longest_streak: 0,
    last_seen_date: null,
    coins: 0,
    saved_days: [],
    streak_anchor: null,
  };

  let streak = row.streak_count ?? 0;
  let longestStreak = row.longest_streak ?? 0;
  let coins = row.coins ?? 0;
  const savedDays = [...row.saved_days];
  let streakSaved = false;
  let streakLost = false;

  // Anchor = last day that counted. Fall back to older data for legacy rows.
  const candidates = [
    row.streak_anchor,
    lastCorrect,
    !row.streak_anchor && !lastCorrect && streak > 0 ? row.last_seen_date : null,
  ].filter((d): d is string => !!d);
  let anchor = candidates.length ? candidates.slice().sort().at(-1)! : null;

  const persist = async () => {
    await saveProfileRow(supabase, userId, {
      streak_count: streak,
      longest_streak: longestStreak,
      coins,
      saved_days: savedDays,
      streak_anchor: anchor,
      last_seen_date: today,
    });
  };

  // No history: today is the first streak day.
  if (!anchor || streak <= 0) {
    streak = 1;
    longestStreak = Math.max(longestStreak, 1);
    anchor = today;
    await persist();
    return {
      profile: row,
      streak,
      longestStreak,
      coins,
      savedDays,
      anchor,
      lastCorrect,
      streakSaved,
      streakLost,
    };
  }

  if (anchor >= today) {
    return {
      profile: row,
      streak,
      longestStreak,
      coins,
      savedDays,
      anchor,
      lastCorrect,
      streakSaved,
      streakLost,
    };
  }

  // Buy back every missed day, one at a time, until the coins run out.
  let changed = false;
  for (let i = 1; i < dayDiff(anchor, today); i++) {
    const day = shiftDay(anchor, i);
    if (savedDays.includes(day)) continue;
    if (coins >= STREAK_SAVE_COST) {
      coins -= STREAK_SAVE_COST;
      savedDays.push(day);
      streakSaved = true;
      changed = true;
    } else {
      streak = 1;
      longestStreak = Math.max(longestStreak, 1);
      streakLost = true;
      streakSaved = false;
      changed = true;
      break;
    }
  }

  anchor = streakLost ? today : shiftDay(today, -1);
  savedDays.sort();
  if (changed) await persist();

  return {
    profile: row,
    streak,
    longestStreak,
    coins,
    savedDays,
    anchor,
    lastCorrect,
    streakSaved,
    streakLost,
  };
}
