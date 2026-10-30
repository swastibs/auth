import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import HabitLog from "../dist/app/modules/habits/habit-logs.model.js";
import { HabitFrequency } from "../dist/app/modules/habits/habits.constants.js";
import {
  computeHabitStreak,
  isCheckInAllowedToday,
} from "../dist/app/modules/habits/habits.streak.util.js";

const originalExists = HabitLog.exists;
const originalCountDocuments = HabitLog.countDocuments;

afterEach(() => {
  HabitLog.exists = originalExists;
  HabitLog.countDocuments = originalCountDocuments;
});

test("daily streak counts consecutive check-ins without gaps", async () => {
  const dates = ["2026-10-30", "2026-10-29", "2026-10-28"];
  HabitLog.exists = async ({ dateKey }) => dates.includes(dateKey);

  const habit = {
    _id: "habit-daily",
    frequency: HabitFrequency.DAILY,
  };

  assert.equal(
    await computeHabitStreak(habit, "2026-10-30", "UTC"),
    3,
  );
});

test("custom habit accepts only scheduled days", () => {
  const habit = {
    frequency: HabitFrequency.CUSTOM,
    targetDays: [1, 3, 5],
  };

  const monday = new Date("2026-10-26T12:00:00Z");
  const tuesday = new Date("2026-10-27T12:00:00Z");

  assert.equal(isCheckInAllowedToday(habit, monday, "UTC"), true);
  assert.equal(isCheckInAllowedToday(habit, tuesday, "UTC"), false);
});

test("weekly streak counts consecutive target weeks but ignores current week if unmet", async () => {
  const weeks = [
    { start: "2026-10-26", end: "2026-11-01", count: 3 },
    { start: "2026-10-19", end: "2026-10-25", count: 3 },
    { start: "2026-10-12", end: "2026-10-18", count: 1 },
  ];

  HabitLog.countDocuments = async ({ dateKey }) => {
    const range = dateKey;
    const match = weeks.find(
      ({ start, end }) => range.$gte === start && range.$lte === end,
    );
    return match ? match.count : 0;
  };

  const habit = {
    _id: "habit-weekly",
    frequency: HabitFrequency.WEEKLY,
    targetCount: 3,
  };

  assert.equal(
    await computeHabitStreak(habit, "2026-10-30", "UTC"),
    2,
  );
});
