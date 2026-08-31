import { Link } from "@tanstack/react-router";
import { StreakIcon } from "./StreakIcon";

export function AppHeader({
  eyebrow,
  streak,
}: {
  eyebrow: string;
  streak?: number | null;
}) {
  return (
    <header className="flex items-center justify-between pt-8 pb-6">
      <Link to="/" className="flex flex-col">
        <span className="text-display text-lg leading-none text-foreground">The Daily How</span>
        <span className="mt-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </span>
      </Link>
      {typeof streak === "number" && streak > 0 ? (
        <span className="flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-sm font-semibold text-primary">
          <StreakIcon streak={streak} className="h-4 w-4" />
          {streak}
        </span>
      ) : null}
    </header>
  );
}
