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

interface StreakSegment {
  startIndex: number;
  endIndex: number;
  isFullWeek?: boolean;
}

function calculateStreakSegments(cells: (number | null)[], marked: Set<string>, key: string): StreakSegment[] {
  const segments: StreakSegment[] = [];
  let currentStartIndex: number | null = null;

  for (let i = 0; i < cells.length; i++) {
    const day = cells[i];
    if (day === null) {
      if (currentStartIndex !== null) {
        segments.push({ startIndex: currentStartIndex, endIndex: i - 1 });
        currentStartIndex = null;
      }
      continue;
    }

    const dateKey = `${key}-${String(day).padStart(2, "0")}`;
    const isMarked = marked.has(dateKey);
    const weekIndex = Math.floor(i / 7);
    const dayOfWeek = i % 7;

    // Check if we need to end the current streak (week boundary)
    if (currentStartIndex !== null) {
      const currentWeekIndex = Math.floor(currentStartIndex / 7);
      if (weekIndex !== currentWeekIndex) {
        segments.push({ startIndex: currentStartIndex, endIndex: i - 1 });
        currentStartIndex = null;
      }
    }

    if (isMarked) {
      if (currentStartIndex === null) {
        currentStartIndex = i;
      }
    } else {
      if (currentStartIndex !== null) {
        segments.push({ startIndex: currentStartIndex, endIndex: i - 1 });
        currentStartIndex = null;
      }
    }
  }

  // Handle remaining segment
  if (currentStartIndex !== null) {
    segments.push({ startIndex: currentStartIndex, endIndex: cells.length - 1 });
  }

  // Check which segments are full weeks and mark them
  return segments.map((segment) => {
    const weekStartIndex = (Math.floor(segment.startIndex / 7)) * 7;
    const weekEndIndex = weekStartIndex + 6;
    const isFullWeek = segment.startIndex === weekStartIndex && segment.endIndex === weekEndIndex;
    return { ...segment, isFullWeek };
  });
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

  const streakSegments = calculateStreakSegments(cells, marked, key);

  // Create a set of indices that are part of streak segments for quick lookup
  const streakIndices = new Set<number>();
  const fullWeekIndices = new Set<number>();
  streakSegments.forEach((segment) => {
    for (let i = segment.startIndex; i <= segment.endIndex; i++) {
      streakIndices.add(i);
      if (segment.isFullWeek) {
        fullWeekIndices.add(i);
      }
    }
  });

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
          const isInStreak = streakIndices.has(i);
          const isFullWeek = fullWeekIndices.has(i);

          if (!isInStreak) {
            return (
              <span
                key={dateKey}
                className={[
                  "flex aspect-square items-center justify-center rounded-full text-xs",
                  "text-muted-foreground",
                  isToday ? "border border-primary text-foreground" : "",
                ].join(" ")}
              >
                {day}
              </span>
            );
          }

          // Find the segment this index belongs to
          const segment = streakSegments.find(
            (seg) => seg.startIndex <= i && i <= seg.endIndex
          );

          if (!segment) {
            return (
              <span key={dateKey} className="flex aspect-square items-center justify-center text-xs text-muted-foreground">
                {day}
              </span>
            );
          }

          const isStart = i === segment.startIndex;
          const isEnd = i === segment.endIndex;
          const isSingle = isStart && isEnd;

          // Determine rounded corners based on position in segment
          let roundedClasses = "";
          if (isSingle) {
            roundedClasses = "rounded-full";
          } else if (isStart) {
            roundedClasses = "rounded-l-full";
          } else if (isEnd) {
            roundedClasses = "rounded-r-full";
          } else {
            roundedClasses = "rounded-none";
          }

          // Use vivid colors for full weeks, muted for partial streaks
          // Full weeks use a red-tinted color (rose/red) for higher visibility
          const bgColor = isFullWeek ? "bg-red-500" : "bg-primary/15";
          const textColor = isFullWeek ? "text-white font-bold" : "text-primary font-semibold";

          return (
            <span
              key={dateKey}
              className={[
                "flex aspect-square items-center justify-center text-xs",
                bgColor,
                textColor,
                roundedClasses,
                isToday && isFullWeek ? "ring-2 ring-red-500" : isToday ? "ring-2 ring-primary" : "",
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
