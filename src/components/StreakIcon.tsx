import { useState } from "react";
import { Flame } from "lucide-react";
import level1 from "../assets/streak/streak-level-1.svg";
import level2 from "../assets/streak/streak-level-2.svg";
import level3 from "../assets/streak/streak-level-3.svg";
import level4 from "../assets/streak/streak-level-4.svg";

const levels = [
  { max: 10, src: level1 },
  { max: 30, src: level2 },
  { max: 100, src: level3 },
  { max: Infinity, src: level4 },
];

export function StreakIcon({
  streak,
  className,
}: {
  streak: number | null | undefined;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const value = streak ?? 0;
  if (value <= 0) return null;
  if (failed) {
    return <Flame className={className} aria-hidden="true" />;
  }

  const level = levels.find((l) => value <= l.max) ?? levels[levels.length - 1]!;

  return (
    <img
      src={level.src}
      alt=""
      className={className}
      aria-hidden="true"
      onError={() => setFailed(true)}
    />
  );
}
