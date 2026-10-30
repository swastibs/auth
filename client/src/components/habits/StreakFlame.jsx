import { Flame } from "lucide-react";

export function StreakFlame({ streak = 0 }) {
  let size = "sm";
  if (streak >= 30) size = "xl";
  else if (streak >= 7) size = "lg";
  else if (streak >= 3) size = "md";

  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
      <Flame className="flame-grow size-3.5" data-size={size} />
      {streak}
    </span>
  );
}
