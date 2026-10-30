import type { Request, RequestHandler } from "express";
import mongoose from "mongoose";

import Habit, { type HabitDocument } from "./habits.model.js";
import ApiError from "../../shared/utils/api-error.util.js";
import catchAsync from "../../shared/utils/catch-async.util.js";

declare global {
  namespace Express {
    interface Request {
      habit?: HabitDocument | null;
    }
  }
}

/**
 * Loads the habit by `:id`, asserts `req.user` owns it and it isn't deleted.
 * Attaches `req.habit`. Returns 404 for missing *or* foreign habits —
 * never 403 — to avoid leaking existence of other users' habits.
 */
export const loadOwnedHabit: RequestHandler = catchAsync(
  async (req, _res, next): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid habit id.");
    }
    if (!req.user) throw ApiError.unauthorized("Not authenticated.");

    const habit = await Habit.findOne({
      _id: id,
      userId: req.user._id,
      deletedAt: null,
    });

    if (!habit) throw ApiError.notFound("Habit not found.");

    req.habit = habit;
    next();
  },
);
