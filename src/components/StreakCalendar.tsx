import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getStreakCalendar } from "@/lib/quiz.functions";
import { StreakIcon } from "./StreakIcon";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function StreakCalendar() {
  const fetchCalendar = useServerFn(getStreakCalendar);
  const now = new Date();
  const [view, setView] = useState(() => new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const key = monthKey(view);
  const isCurrentMonth = key === monthKey(now);

  const { data: markedDays } = useQuery({
    queryKey: ["streak-calendar", key],
    queryFn: () => fetchCalendar({ data: { month: key } }),
    staleTime: 1000 * 60 * 60,
  });
  const marked = new Set(markedDays ?? []);

  const year = view.getUTCFullYear();
  const month = view.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  // Monday-first offset (getUTCDay: 0 = Sunday)
  const firstOffset = (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;

  const monthLabel = view.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
  const today = todayKey();

  const cells: (number | null)[] = [
    ...Array<null>(firstOffset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="mt-5 rounded-3xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setView(new Date(Date.UTC(year, month - 1, 1)))}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="text-sm font-semibold text-foreground">{monthLabel}</p>
        <button
          type="button"
          aria-label="Next month"
          disabled={isCurrentMonth}
          onClick={() => setView(new Date(Date.UTC(year, month + 1, 1)))}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-30"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={`e${i}`} />;
          const dateKey = `${key}-${String(day).padStart(2, "0")}`;
          const isMarked = marked.has(dateKey);
          const isToday = dateKey === today;
          return (
            <span
              key={dateKey}
              className={[
                "flex aspect-square items-center justify-center rounded-full text-xs",
                isMarked ? "bg-primary/15 font-semibold text-primary" : "text-muted-foreground",
                isToday && !isMarked ? "border border-primary text-foreground" : "",
                isToday && isMarked ? "ring-1 ring-primary" : "",
              ].join(" ")}
            >
              {day}
            </span>
          );
        })}
      </div>

      <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <StreakIcon streak={10} className="h-3.5 w-3.5" />
        Marked days kept your streak alive
      </p>
    </div>
  );
}
