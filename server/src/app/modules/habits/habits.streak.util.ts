import HabitLog from "./habit-logs.model.js";
import {
  MAX_STREAK_WALK_BACK,
  HabitFrequency,
  dayOfWeekInTimezone,
  shiftDateKey,
  startOfWeekKey,
} from "./habits.constants.js";
import type { IHabit } from "./habits.model.js";

const parseDateKey = (dateKey: string): [number, number, number] | null => {
  const parts = dateKey.split("-");
  if (parts.length !== 3) return null;

  const [yearText, monthText, dayText] = parts;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);

  if ([year, month, day].some((value) => !Number.isFinite(value))) {
    return null;
  }

  return [year, month, day];
};

/**
 * Counts consecutive days ending at `todayKey` where a log exists.
 * Stops at the first missing day or after MAX_STREAK_WALK_BACK iterations.
 */
const computeDailyStreak = async (
  habitId: string,
  todayKey: string,
): Promise<number> => {
  let streak = 0;
  let cursor = todayKey;

  for (let i = 0; i < MAX_STREAK_WALK_BACK; i++) {
    const exists = await HabitLog.exists({ habitId, dateKey: cursor });
    if (!exists) break;
    streak += 1;
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
};

/**
 * Counts consecutive *target days* (walking back from today) that were hit.
 * Non-target days are skipped — they don't break the streak.
 */
const computeCustomStreak = async (
  habitId: string,
  targetDays: number[],
  todayKey: string,
  timezone: string,
): Promise<number> => {
  const targetSet = new Set(targetDays);
  let streak = 0;
  let cursor = todayKey;

  for (let i = 0; i < MAX_STREAK_WALK_BACK; i++) {
    const parsed = parseDateKey(cursor);
    if (!parsed) break;
    const [year, month, day] = parsed;
    const date = new Date(Date.UTC(year, month - 1, day));
    const dow = dayOfWeekInTimezone(date, timezone);

    if (targetSet.has(dow)) {
      const exists = await HabitLog.exists({ habitId, dateKey: cursor });
      if (!exists) break;
      streak += 1;
    }
    cursor = shiftDateKey(cursor, -1);
  }

  return streak;
};

/**
 * Counts consecutive *weeks* (Monday-anchored) where completions >= target.
 * The current week is treated leniently: if not yet satisfied, it neither
 * breaks nor extends the streak (user still has days left).
 */
const computeWeeklyStreak = async (
  habitId: string,
  targetCount: number,
  todayKey: string,
): Promise<number> => {
  const thisWeekStart = startOfWeekKey(todayKey);

  let streak = 0;
  let weekStart = thisWeekStart;
  let isCurrentWeek = true;

  for (let i = 0; i < MAX_STREAK_WALK_BACK; i++) {
    const weekEnd = shiftDateKey(weekStart, 6);
    const count = await HabitLog.countDocuments({
      habitId,
      dateKey: { $gte: weekStart, $lte: weekEnd },
    });

    if (count >= targetCount) {
      streak += 1;
    } else if (!isCurrentWeek) {
      break;
    }

    weekStart = shiftDateKey(weekStart, -7);
    isCurrentWeek = false;
  }

  return streak;
};

/**
 * Recomputes the habit's current streak from scratch.
 * Called after every check-in and undo.
 */
export const computeHabitStreak = async (
  habit: IHabit & { _id: unknown },
  todayKey: string,
  timezone: string,
): Promise<number> => {
  const habitId = String(habit._id);

  switch (habit.frequency) {
    case HabitFrequency.DAILY:
      return computeDailyStreak(habitId, todayKey);

    case HabitFrequency.CUSTOM:
      return computeCustomStreak(
        habitId,
        habit.targetDays ?? [],
        todayKey,
        timezone,
      );

    case HabitFrequency.WEEKLY:
      return computeWeeklyStreak(
        habitId,
        habit.targetCount ?? 1,
        todayKey,
      );

    default:
      return 0;
  }
};

/**
 * Returns `true` if `todayKey` is a valid check-in day for this habit.
 *   DAILY → always true
 *   CUSTOM → today's weekday must be in targetDays
 *   WEEKLY → always true (user can hit target on any day)
 */
export const isCheckInAllowedToday = (
  habit: IHabit,
  todayDate: Date,
  timezone: string,
): boolean => {
  if (habit.frequency === HabitFrequency.CUSTOM) {
    const dow = dayOfWeekInTimezone(todayDate, timezone);
    return (habit.targetDays ?? []).includes(dow);
  }
  return true;
};
