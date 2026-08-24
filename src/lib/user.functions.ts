import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { STREAK_SAVE_COST } from "./quiz.constants";

export type ProfileState = {
  displayName: string | null;
  streak: number;
  longestStreak: number;
  lastSeenDate: string | null;
  coins: number;
  streakSaved?: boolean;
  streakLost?: boolean;
};


export type SavedFact = {
  slug: string;
  title: string;
  category: string;
  hook: string;
  savedAt: string;
};

export const getProfile = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileState & { savedCount: number }> => {
    const { supabase, userId } = context;
    const { todayUtc } = await import("./facts.server");

    const [{ data: profile }, { count }] = await Promise.all([
      supabase
        .from("profiles")
        .select("display_name, streak_count, longest_streak, last_seen_date, coins")
        .eq("id", userId)
        .maybeSingle(),
      supabase.from("favorites").select("fact_id", { count: "exact", head: true }),
    ]);

    let streak = profile?.streak_count ?? 0;
    let longestStreak = profile?.longest_streak ?? 0;
    let lastSeenDate = profile?.last_seen_date ?? null;
    let coins = profile?.coins ?? 0;
    let streakSaved = false;
    let streakLost = false;

    const today = todayUtc();

    // First ever visit counts as day one of the streak; every day after that
    // the streak only grows through a correct quiz answer.
    if (!lastSeenDate && streak === 0) {
      streak = 1;
      longestStreak = Math.max(longestStreak, 1);
      lastSeenDate = today;
      await supabase.from("profiles").upsert(
        {
          id: userId,
          streak_count: streak,
          longest_streak: longestStreak,
          last_seen_date: today,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );
    } else if (lastSeenDate && lastSeenDate < today) {
      // Settle missed days as soon as the user shows up, instead of waiting for
      // an answer: each missed day costs coins, otherwise the streak is gone.
      const daysSince = Math.round(
        (Date.parse(`${today}T00:00:00Z`) - Date.parse(`${lastSeenDate}T00:00:00Z`)) / 86400000,
      );
      const missedDays = daysSince - 1;
      if (missedDays > 0) {
        const cost = missedDays * STREAK_SAVE_COST;
        if (streak > 0 && coins >= cost) {
          coins = Math.max(0, coins - cost);
          streakSaved = true;
        } else {
          streak = 0;
          streakLost = true;
        }
        // Park the marker on yesterday so today's correct answer still extends
        // the streak by exactly one day.
        const yesterday = new Date(`${today}T00:00:00Z`);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        lastSeenDate = yesterday.toISOString().slice(0, 10);

        await supabase.from("profiles").upsert(
          {
            id: userId,
            streak_count: streak,
            longest_streak: longestStreak,
            last_seen_date: lastSeenDate,
            coins,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "id" },
        );
      }
    }

    return {
      displayName: profile?.display_name ?? null,
      streak,
      longestStreak,
      lastSeenDate,
      coins,
      streakSaved,
      streakLost,
      savedCount: count ?? 0,
    };

  });


export const updateDisplayName = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ displayName: z.string().max(60) }).parse(input))
  .handler(async ({ data, context }) => {
    const name = data.displayName.trim();
    const { error } = await context.supabase
      .from("profiles")
      .upsert(
        { id: context.userId, display_name: name || null, updated_at: new Date().toISOString() },
        { onConflict: "id" },
      );
    if (error) throw error;
    return { ok: true };
  });

export const getSavedFacts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SavedFact[]> => {
    const { data } = await context.supabase
      .from("favorites")
      .select("created_at, facts:fact_id (slug, title, category, hook)")
      .order("created_at", { ascending: false });

    return (data ?? [])
      .map((row) => {
        const fact = row.facts as
          | { slug: string; title: string; category: string; hook: string }
          | null;
        if (!fact) return null;
        return { ...fact, savedAt: row.created_at };
      })
      .filter((row): row is SavedFact => row !== null);
  });

export const isFactSaved = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ factId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: row } = await context.supabase
      .from("favorites")
      .select("fact_id")
      .eq("fact_id", data.factId)
      .maybeSingle();
    return { saved: !!row };
  });

export const toggleFavorite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ factId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: existing } = await supabase
      .from("favorites")
      .select("fact_id")
      .eq("fact_id", data.factId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase.from("favorites").delete().eq("fact_id", data.factId);
      if (error) throw error;
      return { saved: false };
    }

    const { error } = await supabase
      .from("favorites")
      .insert({ user_id: userId, fact_id: data.factId });
    if (error) throw error;
    return { saved: true };
  });
