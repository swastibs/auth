import type { Request, RequestHandler, Response } from "express";
import type { SortOrder } from "mongoose";
import chalk from "chalk";

import Habit, { type HabitDocument, type IHabit } from "./habits.model.js";
import HabitLog from "./habit-logs.model.js";
import {
  HABIT_CHECK_IN_XP,
  MAX_HABITS_PER_USER,
  dateKeyInTimezone,
  shiftDateKey,
} from "./habits.constants.js";
import {
  computeHabitStreak,
  isCheckInAllowedToday,
} from "./habits.streak.util.js";
import { awardCompletion } from "../../shared/gamification.util.js";
import { ListHabitsDto } from "./habits.dto.js";
import ApiError from "../../shared/utils/api-error.util.js";
import ApiResponse from "../../shared/utils/api-response.util.js";
import catchAsync from "../../shared/utils/catch-async.util.js";

interface CreateHabitBody {
  name: string;
  description?: string;
  frequency: IHabit["frequency"];
  targetCount?: number;
  targetDays?: number[];
  reminderTime?: string;
  color?: string;
  icon?: string;
}

interface UpdateHabitBody {
  name?: string;
  description?: string;
  frequency?: IHabit["frequency"];
  targetCount?: number;
  targetDays?: number[];
  reminderTime?: string | null;
  color?: string | null;
  icon?: string | null;
  archived?: boolean;
}

interface CheckInBody {
  note?: string;
}

interface ListQuery {
  frequency?: string;
  archived: boolean;
  search?: string;
  sortBy: "createdAt" | "name" | "currentStreak" | "totalCompletions";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}

const assertAuthenticated = (req: Request) => {
  if (!req.user) throw ApiError.unauthorized("Not authenticated.");
  return req.user;
};

const assertOwnedHabit = (req: Request): HabitDocument => {
  if (!req.habit) throw ApiError.notFound("Habit not found.");
  return req.habit;
};

export const createHabit: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = assertAuthenticated(req);
    const body = req.body as CreateHabitBody;

    const count = await Habit.countDocuments({
      userId: user._id,
      deletedAt: null,
    });
    if (count >= MAX_HABITS_PER_USER) {
      throw ApiError.badRequest(
        `You've reached the limit of ${MAX_HABITS_PER_USER} habits.`,
      );
    }

    const habitPayload = {
      userId: user._id,
      name: body.name.trim(),
      frequency: body.frequency,
      ...(body.targetCount !== undefined ? { targetCount: body.targetCount } : {}),
      ...(body.targetDays !== undefined ? { targetDays: body.targetDays } : {}),
      ...(body.reminderTime !== undefined ? { reminderTime: body.reminderTime } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.icon !== undefined ? { icon: body.icon } : {}),
      ...(body.description?.trim() ? { description: body.description.trim() } : {}),
    } as Parameters<typeof Habit.create>[0];

    const habit = await Habit.create(habitPayload);

    return ApiResponse.created(res, "Habit created.", {
      habit: habit.toJSON(),
    });
  },
);

export const listHabits: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = assertAuthenticated(req);
    const validation = ListHabitsDto.validate(req.query);
    if (validation.errors) {
      throw ApiError.badRequest(validation.errors.join(", "));
    }

    const q = validation.value as ListQuery;

    const filter: Record<string, unknown> = {
      userId: user._id,
      deletedAt: null,
      archivedAt: q.archived ? { $ne: null } : null,
    };

    if (q.frequency) filter.frequency = q.frequency;
    if (q.search) {
      filter.$or = [
        { name: { $regex: q.search, $options: "i" } },
        { description: { $regex: q.search, $options: "i" } },
      ];
    }

    const sortValue: SortOrder = q.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, SortOrder> = { [q.sortBy]: sortValue };
    const skip = (q.page - 1) * q.limit;

    const [habits, total] = await Promise.all([
      Habit.find(filter).sort(sort).skip(skip).limit(q.limit).lean(),
      Habit.countDocuments(filter),
    ]);

    return ApiResponse.ok(res, "Habits fetched.", {
      habits,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.limit)),
      },
    });
  },
);

export const getHabit: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = assertAuthenticated(req);
    const habit = assertOwnedHabit(req);

    const todayKey = dateKeyInTimezone(new Date(), user.timezone);
    const todayLog = await HabitLog.findOne({
      habitId: habit._id,
      dateKey: todayKey,
    }).lean();

    return ApiResponse.ok(res, "Habit fetched.", {
      habit: habit.toJSON(),
      today: {
        dateKey: todayKey,
        checkedIn: Boolean(todayLog),
        note: todayLog?.note,
      },
    });
  },
);

export const updateHabit: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const habit = assertOwnedHabit(req);
    const body = req.body as UpdateHabitBody;

    if (body.name !== undefined) habit.name = body.name.trim();
    if (body.description !== undefined) {
      if (body.description.trim()) {
        habit.description = body.description.trim();
      } else {
        delete habit.description;
      }
    }
    if (body.frequency !== undefined) habit.frequency = body.frequency;
    if (body.targetCount !== undefined) habit.targetCount = body.targetCount;
    if (body.targetDays !== undefined) habit.targetDays = body.targetDays;
    if (body.reminderTime !== undefined) {
      if (body.reminderTime) {
        habit.reminderTime = body.reminderTime;
      } else {
        delete habit.reminderTime;
      }
    }
    if (body.color !== undefined) {
      if (body.color) {
        habit.color = body.color;
      } else {
        delete habit.color;
      }
    }
    if (body.icon !== undefined) {
      if (body.icon) {
        habit.icon = body.icon;
      } else {
        delete habit.icon;
      }
    }

    if (body.archived !== undefined) {
      habit.archivedAt = body.archived ? new Date() : null;
    }

    await habit.save();
    return ApiResponse.ok(res, "Habit updated.", { habit: habit.toJSON() });
  },
);

export const deleteHabit: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const habit = assertOwnedHabit(req);
    habit.deletedAt = new Date();
    await habit.save();
    return ApiResponse.noContent(res);
  },
);

export const checkInHabit: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = assertAuthenticated(req);
    const habit = assertOwnedHabit(req);
    const body = req.body as CheckInBody;

    if (habit.archivedAt) {
      throw ApiError.badRequest("Cannot check in to an archived habit.");
    }

    const now = new Date();
    const todayKey = dateKeyInTimezone(now, user.timezone);

    if (!isCheckInAllowedToday(habit, now, user.timezone)) {
      throw ApiError.badRequest(
        "Today is not a scheduled day for this habit.",
      );
    }

    try {
      await HabitLog.create({
        habitId: habit._id,
        userId: user._id,
        dateKey: todayKey,
        ...(body.note?.trim() ? { note: body.note.trim() } : {}),
      });
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw ApiError.conflict("You've already checked in today.");
      }
      throw err;
    }

    const streak = await computeHabitStreak(habit, todayKey, user.timezone);

    habit.currentStreak = streak;
    habit.longestStreak = Math.max(habit.longestStreak, streak);
    habit.lastCompletionDate = now;
    habit.totalCompletions += 1;
    await habit.save();

    let gamification = null;
    try {
      gamification = await awardCompletion(
        user._id.toString(),
        HABIT_CHECK_IN_XP,
        "habit",
      );
    } catch (error) {
      console.error(
        chalk.red("[habits.checkIn] Gamification failed:"),
        error,
      );
    }

    return ApiResponse.ok(res, "Checked in.", {
      habit: habit.toJSON(),
      checkIn: { dateKey: todayKey, note: body.note },
      gamification,
    });
  },
);

export const undoCheckInHabit: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = assertAuthenticated(req);
    const habit = assertOwnedHabit(req);

    const todayKey = dateKeyInTimezone(new Date(), user.timezone);
    const deleted = await HabitLog.findOneAndDelete({
      habitId: habit._id,
      dateKey: todayKey,
    });
    if (!deleted) {
      throw ApiError.notFound("No check-in found for today.");
    }

    const streak = await computeHabitStreak(habit, todayKey, user.timezone);
    habit.currentStreak = streak;
    habit.totalCompletions = Math.max(0, habit.totalCompletions - 1);
    await habit.save();

    return ApiResponse.ok(res, "Check-in undone.", {
      habit: habit.toJSON(),
      undo: { dateKey: todayKey },
    });
  },
);

export const habitHistory: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = assertAuthenticated(req);
    const habit = assertOwnedHabit(req);

    const daysBack = Math.min(
      Math.max(Number(req.query.days) || 30, 1),
      365,
    );
    const todayKey = dateKeyInTimezone(new Date(), user.timezone);
    const sinceKey = shiftDateKey(todayKey, -(daysBack - 1));

    const logs = await HabitLog.find({
      habitId: habit._id,
      dateKey: { $gte: sinceKey, $lte: todayKey },
    })
      .select("dateKey note -_id")
      .sort({ dateKey: "asc" })
      .lean();

    return ApiResponse.ok(res, "Habit history fetched.", {
      habitId: habit._id,
      days: daysBack,
      dateRange: { from: sinceKey, to: todayKey },
      logs,
      totalInRange: logs.length,
    });
  },
);

export const habitStats: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = assertAuthenticated(req);
    const todayKey = dateKeyInTimezone(new Date(), user.timezone);

    const [total, archived, activeHabits, todayLogs] = await Promise.all([
      Habit.countDocuments({ userId: user._id, deletedAt: null }),
      Habit.countDocuments({
        userId: user._id,
        deletedAt: null,
        archivedAt: { $ne: null },
      }),
      Habit.find({
        userId: user._id,
        deletedAt: null,
        archivedAt: null,
      })
        .select("_id name frequency currentStreak longestStreak totalCompletions")
        .lean(),
      HabitLog.find({ userId: user._id, dateKey: todayKey })
        .select("habitId")
        .lean(),
    ]);

    const bestCurrent = activeHabits.reduce(
      (max, h) => Math.max(max, h.currentStreak ?? 0),
      0,
    );
    const bestEver = activeHabits.reduce(
      (max, h) => Math.max(max, h.longestStreak ?? 0),
      0,
    );
    const totalCompletions = activeHabits.reduce(
      (sum, h) => sum + (h.totalCompletions ?? 0),
      0,
    );
    const checkedInHabitIds = todayLogs.map((l) => String(l.habitId));

    return ApiResponse.ok(res, "Habit stats fetched.", {
      stats: {
        totalHabits: total,
        activeHabits: total - archived,
        archivedHabits: archived,
        checkedInToday: checkedInHabitIds.length,
        bestCurrentStreak: bestCurrent,
        bestEverStreak: bestEver,
        totalCompletions,
      },
      checkedInHabitIds,
      habits: activeHabits,
      todayKey,
    });
  },
);
