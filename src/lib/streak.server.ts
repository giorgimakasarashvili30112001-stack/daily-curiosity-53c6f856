import { STREAK_SAVE_COST } from "./quiz.constants";

const DAY_MS = 86400000;

export type ProfileRow = {
  display_name: string | null;
  streak_count: number;
  longest_streak: number;
  last_seen_date: string | null;
  coins: number;
  saved_days: string[];
};

export type Settlement = {
  profile: ProfileRow;
  streak: number;
  longestStreak: number;
  coins: number;
  savedDays: string[];
  /** Last day that counts as part of the streak chain (correct answer or bought back). */
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

/* eslint-disable @typescript-eslint/no-explicit-any */
type Db = any;

/** Reads the profile; tolerates a database that has not gained `saved_days` yet. */
export async function loadProfileRow(supabase: Db, userId: string): Promise<ProfileRow | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(`${BASE_COLUMNS}, saved_days`)
    .eq("id", userId)
    .maybeSingle();

  if (!error && data) return { ...data, saved_days: data.saved_days ?? [] };
  if (!error) return null;

  const { data: legacy } = await supabase
    .from("profiles")
    .select(BASE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();
  return legacy ? { ...legacy, saved_days: [] } : null;
}

/** Writes a profile patch; retries without `saved_days` if the column is absent. */
export async function saveProfileRow(
  supabase: Db,
  userId: string,
  patch: Record<string, unknown>,
) {
  const payload = { id: userId, updated_at: new Date().toISOString(), ...patch };
  const { error } = await supabase.from("profiles").upsert(payload, { onConflict: "id" });
  if (!error) return;
  if (!("saved_days" in payload)) throw error;
  const { saved_days: _dropped, ...rest } = payload;
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
 * Charges coins for every day missed since the last correct answer (or the last
 * day already bought back), or resets the streak when the balance is short.
 * Idempotent: days recorded in `saved_days` are never charged twice.
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
  };

  let streak = row.streak_count ?? 0;
  let longestStreak = row.longest_streak ?? 0;
  let coins = row.coins ?? 0;
  let savedDays = [...(row.saved_days ?? [])];
  let streakSaved = false;
  let streakLost = false;

  // First ever visit counts as day one; after that only correct answers extend it.
  if (!row.last_seen_date && !lastCorrect && streak === 0) {
    streak = 1;
    longestStreak = Math.max(longestStreak, 1);
    await saveProfileRow(supabase, userId, {
      streak_count: streak,
      longest_streak: longestStreak,
      last_seen_date: today,
      saved_days: savedDays,
    });
    return {
      profile: { ...row, streak_count: streak, longest_streak: longestStreak, last_seen_date: today },
      streak,
      longestStreak,
      coins,
      savedDays,
      anchor: today,
      lastCorrect,
      streakSaved,
      streakLost,
    };
  }

  const candidates = [
    lastCorrect,
    savedDays.length ? savedDays.slice().sort().at(-1)! : null,
    // A day-one grant has no attempt behind it; the visit date anchors the chain.
    !lastCorrect && streak > 0 ? row.last_seen_date : null,
  ].filter((d): d is string => !!d);

  let anchor = candidates.length ? candidates.sort().at(-1)! : null;

  if (anchor && anchor < today) {
    const missed: string[] = [];
    for (let i = 1; i < dayDiff(anchor, today); i++) {
      const day = shiftDay(anchor, i);
      if (!savedDays.includes(day)) missed.push(day);
    }

    if (missed.length > 0) {
      const cost = missed.length * STREAK_SAVE_COST;
      if (streak > 0 && coins >= cost) {
        coins = Math.max(0, coins - cost);
        savedDays = [...savedDays, ...missed].sort();
        streakSaved = true;
        anchor = savedDays.at(-1)!;
      } else {
        streak = 0;
        savedDays = [];
        streakLost = true;
        anchor = null;
      }

      await saveProfileRow(supabase, userId, {
        streak_count: streak,
        longest_streak: longestStreak,
        coins,
        saved_days: savedDays,
        last_seen_date: today,
      });
    }
  }

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
