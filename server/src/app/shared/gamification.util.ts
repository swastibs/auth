import chalk from "chalk";

import User from "../modules/auth/auth.model.js";
import { AccountStatus } from "../modules/auth/auth.constants.js";

/* ────────────────────────── Level curve ─────────────────────────────── */

/**
 * Quadratic level curve: level N requires 100 * N^2 XP.
 * Level 1 → 0-99 XP, Level 2 → 100-399, Level 3 → 400-899, ...
 * Same formula used by the task module — kept here so both sources agree.
 */
export const levelFromXp = (totalXp: number): number =>
  Math.max(1, 1 + Math.floor(Math.sqrt(Math.max(0, totalXp) / 100)));

/* ────────────────────────── Helpers ─────────────────────────────────── */

const startOfDay = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const daysBetween = (a: Date, b: Date): number =>
  Math.round(
    (startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000,
  );

/* ────────────────────────── Public API ──────────────────────────────── */

export type CompletionSource = "task" | "habit";

export interface CompletionResult {
  xpAwarded: number;
  totalXp: number;
  currentLevel: number;
  currentStreak: number;
  longestStreak: number;
  source: CompletionSource;
}

/**
 * Awards XP + updates the user's daily streak.
 * Non-fatal — any error is logged but never thrown to the caller.
 *
 * Callers pass an explicit `xpAmount` (from a priority map or fixed value)
 * and a `source` tag for logs / future analytics.
 */
export const awardCompletion = async (
  userId: string,
  xpAmount: number,
  source: CompletionSource,
): Promise<CompletionResult | null> => {
  try {
    const user = await User.findById(userId).select(
      "totalXp currentLevel currentStreak longestStreak lastCompletionDate status deletedAt",
    );
    if (!user || user.deletedAt || user.status !== AccountStatus.ACTIVE) {
      return null;
    }

    const now = new Date();
    const today = startOfDay(now);
    const last = user.lastCompletionDate
      ? startOfDay(user.lastCompletionDate)
      : null;

    /* ── Streak math ───────────────────────────────────────────────── */
    let streak = user.currentStreak ?? 0;
    if (!last) {
      streak = 1;
    } else {
      const gap = daysBetween(last, today);
      if (gap === 0) {
        // already completed something today — keep streak
      } else if (gap === 1) {
        streak += 1;
      } else {
        streak = 1;
      }
    }
    const longest = Math.max(user.longestStreak ?? 0, streak);

    /* ── Total XP + level ─────────────────────────────────────────── */
    const safeXp = Math.max(0, Math.floor(xpAmount));
    const totalXp = (user.totalXp ?? 0) + safeXp;
    const currentLevel = levelFromXp(totalXp);

    /* ── Persist (single write) ───────────────────────────────────── */
    const incField =
      source === "task" ? { tasksCompletedTotal: 1 } : { habitsCompletedTotal: 1 };

    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          totalXp,
          currentLevel,
          currentStreak: streak,
          longestStreak: longest,
          lastCompletionDate: today,
          lastActiveAt: now,
        },
        $inc: incField,
      },
    );

    return {
      xpAwarded: safeXp,
      totalXp,
      currentLevel,
      currentStreak: streak,
      longestStreak: longest,
      source,
    };
  } catch (error) {
    console.error(
      chalk.red(`[gamification.awardCompletion:${source}] Failed:`),
      error,
    );
    return null;
  }
};
