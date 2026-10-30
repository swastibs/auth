import type { Request, RequestHandler, Response } from "express";
import type { SortOrder } from "mongoose";
import chalk from "chalk";

import Task, { type ITask, type TaskDocument } from "./tasks.model.js";
import {
  MAX_ACTIVE_TASKS_PER_USER,
  TaskStatus,
} from "./tasks.constants.js";
import { awardTaskCompletion } from "./gamification.util.js";
import { ListTasksDto } from "./tasks.dto.js";
import ApiError from "../../shared/utils/api-error.util.js";
import ApiResponse from "../../shared/utils/api-response.util.js";
import catchAsync from "../../shared/utils/catch-async.util.js";

interface CreateTaskBody {
  title: string;
  description?: string;
  priority: string;
  dueDate?: string | null;
  estimatedMinutes?: number;
  tags: string[];
}

interface UpdateTaskBody {
  title?: string;
  description?: string;
  priority?: string;
  status?: string;
  dueDate?: string | null;
  estimatedMinutes?: number;
  tags?: string[];
}

interface ListQuery {
  status?: string;
  priority?: string;
  tag?: string;
  dueFrom?: string;
  dueTo?: string;
  search?: string;
  sortBy: "createdAt" | "dueDate" | "priority" | "updatedAt";
  sortOrder: "asc" | "desc";
  page: number;
  limit: number;
}

const assertAuthenticated = (req: Request) => {
  if (!req.user) throw ApiError.unauthorized("Not authenticated.");
  return req.user;
};

const assertOwnedTask = (req: Request): TaskDocument => {
  if (!req.task) throw ApiError.notFound("Task not found.");
  return req.task;
};

export const createTask: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = assertAuthenticated(req);
    const body = req.body as CreateTaskBody;

    const activeCount = await Task.countDocuments({
      userId: user._id,
      deletedAt: null,
    });
    if (activeCount >= MAX_ACTIVE_TASKS_PER_USER) {
      throw ApiError.badRequest(
        `You've reached the limit of ${MAX_ACTIVE_TASKS_PER_USER} tasks. Complete or archive some first.`,
      );
    }

    const taskPayload = {
      userId: user._id,
      title: body.title.trim(),
      priority: body.priority as ITask["priority"],
      ...(body.dueDate ? { dueDate: new Date(body.dueDate) } : {}),
      ...(body.estimatedMinutes !== undefined ? { estimatedMinutes: body.estimatedMinutes } : {}),
      tags: body.tags ?? [],
      status: TaskStatus.TODO,
      ...(body.description?.trim() ? { description: body.description.trim() } : {}),
    } as Parameters<typeof Task.create>[0];

    const task = await Task.create(taskPayload);
    return ApiResponse.created(res, "Task created.", { task: task.toJSON() });
  },
);

export const listTasks: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = assertAuthenticated(req);

    const validation = ListTasksDto.validate(req.query);
    if (validation.errors) {
      throw ApiError.badRequest(validation.errors.join(", "));
    }

    const q = validation.value as ListQuery;

    const filter: Record<string, unknown> = {
      userId: user._id,
      deletedAt: null,
    };

    if (q.status) filter.status = q.status;
    if (q.priority) filter.priority = q.priority;
    if (q.tag) filter.tags = q.tag;
    if (q.search) {
      filter.$or = [
        { title: { $regex: q.search, $options: "i" } },
        { description: { $regex: q.search, $options: "i" } },
      ];
    }
    if (q.dueFrom || q.dueTo) {
      const dueDateFilter: Record<string, Date> = {};
      if (q.dueFrom) dueDateFilter.$gte = new Date(q.dueFrom);
      if (q.dueTo) dueDateFilter.$lte = new Date(q.dueTo);
      filter.dueDate = dueDateFilter;
    }

    const sortValue: SortOrder = q.sortOrder === "asc" ? 1 : -1;
    const sort: Record<string, SortOrder> = { [q.sortBy]: sortValue };
    const skip = (q.page - 1) * q.limit;

    const [tasks, total] = await Promise.all([
      Task.find(filter).sort(sort).skip(skip).limit(q.limit).lean(),
      Task.countDocuments(filter),
    ]);

    return ApiResponse.ok(res, "Tasks fetched.", {
      tasks,
      pagination: {
        page: q.page,
        limit: q.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / q.limit)),
      },
    });
  },
);

export const getTask: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const task = assertOwnedTask(req);
    return ApiResponse.ok(res, "Task fetched.", { task: task.toJSON() });
  },
);

export const updateTask: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const task = assertOwnedTask(req);
    const body = req.body as UpdateTaskBody;

    if (body.title !== undefined) task.title = body.title.trim();
    if (body.description !== undefined) {
      if (body.description.trim()) {
        task.description = body.description.trim();
      } else {
        delete task.description;
      }
    }
    if (body.priority !== undefined)
      task.priority = body.priority as ITask["priority"];
    if (body.dueDate !== undefined) {
      if (body.dueDate) {
        task.dueDate = new Date(body.dueDate);
      } else {
        delete task.dueDate;
      }
    }
    if (body.estimatedMinutes !== undefined)
      task.estimatedMinutes = body.estimatedMinutes;
    if (body.tags !== undefined) task.tags = body.tags;

    if (body.status !== undefined && body.status !== task.status) {
      if (body.status === TaskStatus.DONE) {
        throw ApiError.badRequest(
          "Use POST /tasks/:id/complete to mark a task as done.",
        );
      }
      task.status = body.status as TaskStatus;
      if (body.status !== TaskStatus.DONE) delete task.completedAt;
    }

    await task.save();
    return ApiResponse.ok(res, "Task updated.", { task: task.toJSON() });
  },
);

export const deleteTask: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const task = assertOwnedTask(req);
    task.deletedAt = new Date();
    await task.save();
    return ApiResponse.noContent(res);
  },
);

export const completeTask: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const task = assertOwnedTask(req);

    if (task.status === TaskStatus.DONE) {
      return ApiResponse.ok(res, "Task already completed.", {
        task: task.toJSON(),
        alreadyCompleted: true,
      });
    }

    task.status = TaskStatus.DONE;
    task.completedAt = new Date();
    await task.save();

    let gamification = null;
    try {
      gamification = await awardTaskCompletion(
        task.userId.toString(),
        task.priority,
      );
    } catch (error) {
      console.error(
        chalk.red("[tasks.completeTask] Gamification failed:"),
        error,
      );
    }

    return ApiResponse.ok(res, "Task completed.", {
      task: task.toJSON(),
      gamification,
    });
  },
);

export const reopenTask: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const task = assertOwnedTask(req);

    if (task.status !== TaskStatus.DONE) {
      throw ApiError.badRequest("Task is not completed.");
    }

    task.status = TaskStatus.TODO;
    delete task.completedAt;
    await task.save();

    return ApiResponse.ok(res, "Task reopened.", { task: task.toJSON() });
  },
);

export const taskStats: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const user = assertAuthenticated(req);
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const base = { userId: user._id, deletedAt: null };

    const [total, todo, inProgress, done, overdue, dueToday, completedToday] =
      await Promise.all([
        Task.countDocuments(base),
        Task.countDocuments({ ...base, status: TaskStatus.TODO }),
        Task.countDocuments({ ...base, status: TaskStatus.IN_PROGRESS }),
        Task.countDocuments({ ...base, status: TaskStatus.DONE }),
        Task.countDocuments({
          ...base,
          status: { $nin: [TaskStatus.DONE, TaskStatus.ARCHIVED] },
          dueDate: { $lt: startOfToday },
        }),
        Task.countDocuments({
          ...base,
          status: { $nin: [TaskStatus.DONE, TaskStatus.ARCHIVED] },
          dueDate: { $gte: startOfToday, $lt: startOfTomorrow },
        }),
        Task.countDocuments({
          ...base,
          status: TaskStatus.DONE,
          completedAt: { $gte: startOfToday, $lt: startOfTomorrow },
        }),
      ]);

    return ApiResponse.ok(res, "Task stats fetched.", {
      stats: {
        total,
        todo,
        inProgress,
        done,
        overdue,
        dueToday,
        completedToday,
      },
    });
  },
);
