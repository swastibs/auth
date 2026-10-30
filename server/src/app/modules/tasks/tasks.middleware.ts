import type { Request, RequestHandler } from "express";
import mongoose from "mongoose";

import Task, { type TaskDocument } from "./tasks.model.js";
import ApiError from "../../shared/utils/api-error.util.js";
import catchAsync from "../../shared/utils/catch-async.util.js";

declare global {
  namespace Express {
    interface Request {
      task?: TaskDocument | null;
    }
  }
}

/**
 * Loads the task by `:id` and asserts `req.user` owns it.
 * Attaches `req.task`. Responds 404 for missing *or* foreign tasks
 * — never 403 — to avoid leaking existence of other users' tasks.
 */
export const loadOwnedTask: RequestHandler = catchAsync(
  async (req, _res, next): Promise<void> => {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw ApiError.badRequest("Invalid task id.");
    }

    if (!req.user) throw ApiError.unauthorized("Not authenticated.");

    const task = await Task.findOne({
      _id: id,
      userId: req.user._id,
      deletedAt: null,
    });

    if (!task) throw ApiError.notFound("Task not found.");

    req.task = task;
    next();
  },
);
