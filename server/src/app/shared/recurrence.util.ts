export type RecurrenceFrequency = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";

export interface ParsedRecurrenceRule {
  freq: RecurrenceFrequency;
  interval: number;
  byDay?: number[];
  byMonthDay?: number[];
  count?: number;
  until?: Date;
}

const WEEKDAY_TO_RRULE: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

const RRULE_TO_WEEKDAY = Object.fromEntries(
  Object.entries(WEEKDAY_TO_RRULE).map(([key, value]) => [value, key]),
);

const SUPPORTED_FREQUENCIES = new Set<RecurrenceFrequency>([
  "DAILY",
  "WEEKLY",
  "MONTHLY",
  "YEARLY",
]);

const normalizeRRuleString = (raw: string): string => {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new Error("Recurrence rule is empty.");
  }

  const candidate = /^RRULE:/i.test(trimmed) ? trimmed : `RRULE:${trimmed}`;
  if (!/^RRULE:[A-Z0-9;=,_-]+$/i.test(candidate)) {
    throw new Error("Recurrence rule contains unsupported characters.");
  }

  return candidate;
};

export const normalizeRRule = (raw?: string | null): string | null => {
  if (!raw) return null;

  const candidate = normalizeRRuleString(raw);
  const body = candidate.slice("RRULE:".length);
  const params = new Map<string, string>();

  for (const part of body.split(";")) {
    if (!part) continue;
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) continue;
    const key = part.slice(0, eqIndex).toUpperCase();
    const value = part.slice(eqIndex + 1);
    if (!value) continue;
    params.set(key, value);
  }

  const freq = params.get("FREQ");
  if (!freq || !SUPPORTED_FREQUENCIES.has(freq.toUpperCase() as RecurrenceFrequency)) {
    throw new Error(`Unsupported recurrence frequency: ${freq ?? "missing"}`);
  }

  const normalizedParts: string[] = [`FREQ=${freq.toUpperCase()}`];
  const intervalValue = Number(params.get("INTERVAL") ?? "1");
  if (!Number.isFinite(intervalValue) || intervalValue < 1) {
    throw new Error("Recurrence interval must be a positive integer.");
  }
  normalizedParts.push(`INTERVAL=${String(intervalValue)}`);

  const byDayValue = params.get("BYDAY");
  if (byDayValue) {
    const normalizedDays = byDayValue
      .split(",")
      .map((day) => day.trim().toUpperCase())
      .filter(Boolean)
      .map((day) => {
        const weekdayValue = WEEKDAY_TO_RRULE[day];
        if (weekdayValue === undefined) {
          throw new Error(`Unsupported RRULE weekday: ${day}`);
        }
        return RRULE_TO_WEEKDAY[weekdayValue] ?? "";
      })
      .filter((day) => day !== "");

    if (normalizedDays.length > 0) {
      normalizedParts.push(`BYDAY=${normalizedDays.join(",")}`);
    }
  }

  const byMonthDayValue = params.get("BYMONTHDAY");
  if (byMonthDayValue) {
    const values = byMonthDayValue
      .split(",")
      .map((day) => Number(day.trim()))
      .filter((day) => Number.isInteger(day) && day >= 1 && day <= 31);

    if (values.length > 0) {
      normalizedParts.push(`BYMONTHDAY=${values.join(",")}`);
    }
  }

  const count = params.get("COUNT");
  if (count) {
    const countValue = Number(count);
    if (!Number.isInteger(countValue) || countValue < 1) {
      throw new Error("COUNT must be a positive integer.");
    }
    normalizedParts.push(`COUNT=${String(countValue)}`);
  }

  const until = params.get("UNTIL");
  if (until) {
    const date = new Date(until);
    if (Number.isNaN(date.getTime())) {
      throw new Error("UNTIL must be a valid ISO date.");
    }
    normalizedParts.push(`UNTIL=${date.toISOString()}`);
  }

  return `RRULE:${normalizedParts.join(";")}`;
};

export const isValidRecurrenceRule = (raw?: string | null): boolean => {
  try {
    parseRRule(raw ?? "");
    return true;
  } catch {
    return false;
  }
};

export const parseRRule = (raw: string): ParsedRecurrenceRule => {
  const normalized = normalizeRRule(raw);
  if (!normalized) {
    throw new Error("Recurrence rule is required.");
  }

  const body = normalized.slice("RRULE:".length);
  const params = new Map<string, string>();

  for (const part of body.split(";")) {
    if (!part) continue;
    const eqIndex = part.indexOf("=");
    if (eqIndex === -1) continue;
    const key = part.slice(0, eqIndex).toUpperCase();
    const value = part.slice(eqIndex + 1);
    if (!value) continue;
    params.set(key, value);
  }

  const freqValue = params.get("FREQ");
  if (!freqValue) {
    throw new Error("Recurrence rule must include a FREQ clause.");
  }

  const freq = freqValue.toUpperCase() as RecurrenceFrequency;
  if (!SUPPORTED_FREQUENCIES.has(freq)) {
    throw new Error(`Unsupported recurrence frequency: ${freq}`);
  }

  const result: ParsedRecurrenceRule = {
    freq,
    interval: Number(params.get("INTERVAL") ?? "1"),
  };

  const byDay = params.get("BYDAY");
  if (byDay) {
    const parsedByDay: number[] = [];
    for (const day of byDay.split(",")) {
      const key = day.trim().toUpperCase();
      if (!key) continue;
      const weekdayValue = WEEKDAY_TO_RRULE[key];
      if (weekdayValue === undefined) {
        throw new Error(`Unsupported RRULE weekday: ${key}`);
      }
      parsedByDay.push(weekdayValue);
    }
    if (parsedByDay.length > 0) {
      result.byDay = parsedByDay;
    }
  }

  const byMonthDay = params.get("BYMONTHDAY");
  if (byMonthDay) {
    result.byMonthDay = byMonthDay
      .split(",")
      .map((day) => Number(day.trim()))
      .filter((day) => Number.isInteger(day) && day >= 1 && day <= 31);

    if (result.byMonthDay.length === 0) {
      throw new Error("BYMONTHDAY must contain valid day-of-month values.");
    }
  }

  const count = params.get("COUNT");
  if (count) {
    result.count = Number(count);
    if (!Number.isInteger(result.count) || result.count < 1) {
      throw new Error("COUNT must be a positive integer.");
    }
  }

  const until = params.get("UNTIL");
  if (until) {
    const parsedUntil = new Date(until);
    if (Number.isNaN(parsedUntil.getTime())) {
      throw new Error("UNTIL must be a valid ISO date.");
    }
    result.until = parsedUntil;
  }

  return result;
};

export const getNextOccurrence = (
  from: Date,
  recurrence: string,
): Date | null => {
  const parsed = parseRRule(recurrence);
  const base = new Date(from.getTime());

  if (parsed.freq === "DAILY") {
    const next = new Date(base.getTime());
    next.setUTCDate(next.getUTCDate() + parsed.interval);
    return next;
  }

  const maxIterations = 366 * 5;
  for (let offset = 1; offset <= maxIterations; offset += 1) {
    const candidate = new Date(base.getTime());
    candidate.setUTCDate(candidate.getUTCDate() + offset);

    if (parsed.until && candidate.getTime() > parsed.until.getTime()) {
      return null;
    }

    if (parsed.freq === "WEEKLY") {
      const days = parsed.byDay ?? [candidate.getUTCDay()];
      if (!days.includes(candidate.getUTCDay())) {
        continue;
      }
      return candidate;
    }

    if (parsed.freq === "MONTHLY") {
      const byMonthDay = parsed.byMonthDay ?? [candidate.getUTCDate()];
      if (!byMonthDay.includes(candidate.getUTCDate())) {
        continue;
      }
      return candidate;
    }

    if (parsed.freq === "YEARLY") {
      const byMonthDay = parsed.byMonthDay ?? [candidate.getUTCDate()];
      if (!byMonthDay.includes(candidate.getUTCDate())) {
        continue;
      }
      return candidate;
    }
  }

  return null;
};
