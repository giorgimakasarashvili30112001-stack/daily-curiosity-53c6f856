import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type FactStep = { heading: string; body: string };

export type Fact = {
  id: string;
  title: string;
  slug: string;
  question_type: string;
  category: string;
  hook: string;
  intro: string;
  steps: FactStep[];
  surprising_detail: string;
};

export type ArchiveEntry = {
  pick_date: string;
  slug: string;
  title: string;
  category: string;
  hook: string;
};

export const getTodayFact = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ date: string; fact: Fact | null }> => {
    const { ensureDailyPick, todayUtc, topUpFacts, countUnusedFacts } = await import(
      "./facts.server"
    );
    const date = todayUtc();

    let fact = await ensureDailyPick(date);
    if (!fact) {
      // Library exhausted: try to generate before serving, but never fail the page.
      try {
        await topUpFacts(15, 8);
        fact = await ensureDailyPick(date);
      } catch (error) {
        console.error("fact generation failed", error);
      }
    } else if ((await countUnusedFacts()) < 15) {
      // Warm the library in the background; failures are non-fatal.
      void topUpFacts(15, 8).catch((error) => console.error("fact top-up failed", error));
    }

    return { date, fact };
  },
);

export const getArchive = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArchiveEntry[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { todayUtc } = await import("./facts.server");

    const { data } = await supabaseAdmin
      .from("facts")
      .select("pick_date, slug, title, category, hook")
      .not("pick_date", "is", null)
      .lte("pick_date", todayUtc())
      .order("pick_date", { ascending: false })
      .limit(120);

    return (data ?? []).map((row) => ({
      pick_date: String(row.pick_date),
      slug: row.slug,
      title: row.title,
      category: row.category,
      hook: row.hook,
    }));
  },
);

export const getFactBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1) }).parse(input))
  .handler(async ({ data }): Promise<{ fact: Fact; pickDate: string | null } | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { FACT_COLUMNS, toFact, todayUtc } = await import("./facts.server");

    const { data: row } = await supabaseAdmin
      .from("facts")
      .select(`${FACT_COLUMNS}, pick_date`)
      .eq("slug", data.slug)
      .not("pick_date", "is", null)
      .lte("pick_date", todayUtc())
      .maybeSingle();

    // Only explainers that have already been featured are publicly readable.
    if (!row) return null;

    const record = row as Record<string, unknown>;
    return { fact: toFact(record), pickDate: String(record["pick_date"]) };
  });

