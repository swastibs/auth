import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";

import { StreakFlame } from "@/components/habits/StreakFlame";

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function startOfWeekMonday(date = new Date()) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  const day = next.getDay();
  const diff = day === 0 ? 6 : day - 1;
  next.setDate(next.getDate() - diff);
  return next;
}

function toKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function RitualGrid({ habits, checkedInIds, onCheckIn, onUndo, busyId }) {
  const monday = useMemo(() => startOfWeekMonday(), []);
  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + index);
        return {
          key: toKey(date),
          label: DAY_LABELS[index],
          isToday: toKey(date) === toKey(new Date()),
        };
      }),
    [monday],
  );

  if (habits.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
      <div className="grid grid-cols-[minmax(0,1fr)_repeat(7,40px)_80px] items-center gap-2 border-b border-border/60 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>Habit</span>
        {days.map((day) => (
          <span key={day.key} className={`text-center ${day.isToday ? "text-[var(--accent-atomic)]" : ""}`}>
            {day.label}
          </span>
        ))}
        <span className="text-right">Streak</span>
      </div>

      {habits.map((habit) => {
        const checkedToday = checkedInIds.has(habit._id);
        const accent = habit.color || "var(--accent-atomic)";

        return (
          <div
            key={habit._id}
            className="grid grid-cols-[minmax(0,1fr)_repeat(7,40px)_80px] items-center gap-2 border-b border-border/40 px-4 py-3 last:border-0 transition-colors hover:bg-muted/20"
            style={{
              background: `linear-gradient(90deg, color-mix(in oklch, ${accent} 4%, transparent), transparent 40%)`,
            }}
          >
            <Link to={`/habits/${habit._id}`} className="flex min-w-0 items-center gap-2.5">
              <span className="size-2.5 shrink-0 rounded-full" style={{ background: accent }} />
              <span className="truncate text-sm font-medium">{habit.name}</span>
            </Link>

            {days.map((day) => {
              const isChecked = day.isToday && checkedToday;
              return (
                <button
                  key={day.key}
                  type="button"
                  onClick={() => {
                    if (!day.isToday) return;
                    if (busyId === habit._id) return;
                    if (isChecked) onUndo(habit);
                    else onCheckIn(habit);
                  }}
                  disabled={busyId === habit._id}
                  aria-label={`${habit.name} — ${day.label}`}
                  className={`ritual-cell relative mx-auto grid size-7 place-items-center rounded-lg border transition-all ${
                    day.isToday ? "ritual-today" : ""
                  } ${isChecked ? "ritual-hit" : ""}`}
                  style={{
                    borderColor: day.isToday ? accent : undefined,
                    background: isChecked ? accent : undefined,
                    color: isChecked ? "var(--accent-atomic-foreground)" : undefined,
                  }}
                >
                  {isChecked && <Check className="size-3.5" strokeWidth={3} />}
                </button>
              );
            })}

            <div className="flex items-center justify-end gap-1">
              <StreakFlame streak={habit.currentStreak ?? 0} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default RitualGrid;
