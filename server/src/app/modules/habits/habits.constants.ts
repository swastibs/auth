/* ────────────────────────── Frequency ───────────────────────────────── */

export enum HabitFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  CUSTOM = "custom",
}

export const HABIT_FREQUENCY_VALUES: readonly HabitFrequency[] =
  Object.values(HabitFrequency);

/* ────────────────────────── XP ──────────────────────────────────────── */

/** Fixed XP per habit check-in. Low enough not to overshadow tasks. */
export const HABIT_CHECK_IN_XP = 15;

/* ────────────────────────── Limits ──────────────────────────────────── */

export const MAX_HABIT_NAME_LENGTH = 100;
export const MAX_HABIT_DESCRIPTION_LENGTH = 2000;
export const MAX_HABITS_PER_USER = 100;
export const MAX_STREAK_WALK_BACK = 365;
export const HABIT_REMINDER_TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
export const HABIT_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

/* ────────────────────────── Date utilities ──────────────────────────── */

/** Returns "YYYY-MM-DD" for the given date, in the given IANA timezone. */
export const dateKeyInTimezone = (date: Date, timezone: string): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
};

/** 0 = Sunday, ..., 6 = Saturday — evaluated in the given timezone. */
export const dayOfWeekInTimezone = (date: Date, timezone: string): number => {
  try {
    const short = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "short",
    }).format(date);
    const map: Record<string, number> = {
      Sun: 0,
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
    };
    return map[short] ?? 0;
  } catch {
    return date.getUTCDay();
  }
};

/** Adds (or subtracts, with negative `days`) days to a `YYYY-MM-DD` key. */
export const shiftDateKey = (dateKey: string, days: number): string => {
  const parts = dateKey.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Invalid dateKey: ${dateKey}`);
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** Monday of the week containing `dateKey`. */
export const startOfWeekKey = (dateKey: string): string => {
  const parts = dateKey.split("-");
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) {
    throw new Error(`Invalid dateKey: ${dateKey}`);
  }
  const date = new Date(Date.UTC(y, m - 1, d));
  const dow = date.getUTCDay();
  const diffToMonday = dow === 0 ? 6 : dow - 1;
  date.setUTCDate(date.getUTCDate() - diffToMonday);
  return date.toISOString().slice(0, 10);
};

/** End of the week (Sunday) containing `dateKey`. */
export const endOfWeekKey = (dateKey: string): string => {
  const monday = startOfWeekKey(dateKey);
  return shiftDateKey(monday, 6);
};
