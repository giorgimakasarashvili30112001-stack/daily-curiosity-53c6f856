import { createFileRoute, Link } from "@tanstack/react-router";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { AppHeader } from "@/components/AppHeader";
import { getArchive } from "@/lib/facts.functions";
import { FACT_GC_TIME, msUntilUtcMidnight } from "@/lib/cache-time";

const archiveQuery = queryOptions({
  queryKey: ["archive"],
  queryFn: () => getArchive(),
  // Served straight from the device cache until a new day starts.
  staleTime: msUntilUtcMidnight(),
  gcTime: FACT_GC_TIME,
});


export const Route = createFileRoute("/archive")({
  loader: ({ context }) => context.queryClient.ensureQueryData(archiveQuery),
  head: () => ({
    meta: [
      { title: "Archive — every past explainer from The Daily How" },
      {
        name: "description",
        content:
          "Catch up on every explainer that has been featured, from how a door key works to what a credit score means.",
      },
      { property: "og:title", content: "Archive — every past explainer from The Daily How" },
      {
        property: "og:description",
        content: "Browse past days and read the explainers you missed.",
      },
    ],
  }),
  component: ArchivePage,
});

function CountdownNote() {
  const [timeLeft, setTimeLeft] = useState<string>("");

  useEffect(() => {
    const updateCountdown = () => {
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
      const msLeft = Math.max(0, next - now.getTime());

      // Convert milliseconds to hours, minutes, seconds
      const totalSeconds = Math.floor(msLeft / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      // Format as "12h 34m 56s"
      setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="mb-5 rounded-2xl border border-dashed border-border p-5 text-center">
      <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Tomorrow</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Sealed until midnight UTC. A new topic, a different category.
      </p>
      {timeLeft && (
        <p className="mt-3 text-xs font-semibold text-primary">
          Time left: {timeLeft}
        </p>
      )}
    </div>
  );
}

function ArchivePage() {
  const { data = [] } = useQuery(archiveQuery);

  return (
    <AppShell>
      <AppHeader eyebrow="Archive" />
      <CountdownNote />

      {data.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing archived yet — come back tomorrow.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((entry) => (
            <li key={entry.pick_date}>
              <Link
                to="/fact/$slug"
                params={{ slug: entry.slug }}
                className="block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/50"
              >
                <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                  <span>{entry.category}</span>
                  <time dateTime={entry.pick_date}>
                    {new Date(`${entry.pick_date}T00:00:00Z`).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      timeZone: "UTC",
                    })}
                  </time>
                </div>
                <h2 className="mt-2 text-display text-lg leading-snug text-foreground">
                  {entry.title}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{entry.hook}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
