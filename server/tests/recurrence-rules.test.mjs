import assert from "node:assert/strict";
import test from "node:test";

const { getNextOccurrence, isValidRecurrenceRule, parseRRule } = await import(
  "../dist/app/shared/recurrence.util.js",
);

test("daily recurrence is valid and advances to the next day", () => {
  const rule = "RRULE:FREQ=DAILY;INTERVAL=1";
  assert.equal(isValidRecurrenceRule(rule), true);

  const next = getNextOccurrence(new Date("2026-01-01T00:00:00.000Z"), rule);
  assert.ok(next instanceof Date);
  assert.equal(next.toISOString().slice(0, 10), "2026-01-02");
});

test("weekly recurrence respects BYDAY ordering and picks the next matching day", () => {
  const rule = "RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;INTERVAL=1";

  const next = getNextOccurrence(new Date("2026-01-01T00:00:00.000Z"), rule);
  assert.equal(next.toISOString().slice(0, 10), "2026-01-02");

  const parsed = parseRRule(rule);
  assert.equal(parsed.freq, "WEEKLY");
  assert.deepEqual(parsed.byDay, [1, 3, 5]);
});

test("monthly recurrence validates the RRULE structure", () => {
  const rule = "RRULE:FREQ=MONTHLY;BYMONTHDAY=1,15;INTERVAL=1";
  assert.equal(isValidRecurrenceRule(rule), true);
  const parsed = parseRRule(rule);
  assert.equal(parsed.freq, "MONTHLY");
  assert.deepEqual(parsed.byMonthDay, [1, 15]);
});
