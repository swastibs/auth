import Joi from "joi";

import BaseDto from "../../shared/dto/base.dto.js";
import {
  MAX_TAGS_PER_TASK,
  MAX_TAG_LENGTH,
  TaskPriority,
  TaskStatus,
} from "./tasks.constants.js";

/* ────────────────────────── Shared bits ─────────────────────────────── */

const tagsSchema = Joi.array()
  .items(
    Joi.string()
      .trim()
      .lowercase()
      .min(1)
      .max(MAX_TAG_LENGTH)
      .pattern(/^[a-z0-9-]+$/),
  )
  .max(MAX_TAGS_PER_TASK)
  .unique()
  .default([]);

const prioritySchema = Joi.string()
  .valid(...Object.values(TaskPriority))
  .default(TaskPriority.MEDIUM);

const statusSchema = Joi.string().valid(...Object.values(TaskStatus));

const dueDateSchema = Joi.date().iso().greater("now").allow(null);
const recurrenceSchema = Joi.string().trim().max(500).pattern(/^RRULE:/i);

/* ────────────────────────── Create ──────────────────────────────────── */

export const createTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200).required(),
  description: Joi.string().trim().max(5000).allow(""),
  priority: prioritySchema,
  dueDate: dueDateSchema,
  estimatedMinutes: Joi.number().integer().min(1).max(1440),
  recurrence: recurrenceSchema,
  parentTaskId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  totalFocusTime: Joi.number().integer().min(0).max(10080),
  tags: tagsSchema,
});

export class CreateTaskDto extends BaseDto {
  static override readonly schema = createTaskSchema;
}

/* ────────────────────────── Update ──────────────────────────────────── */

export const updateTaskSchema = Joi.object({
  title: Joi.string().trim().min(1).max(200),
  description: Joi.string().trim().max(5000).allow(""),
  priority: Joi.string().valid(...Object.values(TaskPriority)),
  status: statusSchema,
  dueDate: dueDateSchema,
  estimatedMinutes: Joi.number().integer().min(1).max(1440),
  recurrence: recurrenceSchema.allow(null),
  parentTaskId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/),
  totalFocusTime: Joi.number().integer().min(0).max(10080),
  tags: tagsSchema,
}).min(1);

export class UpdateTaskDto extends BaseDto {
  static override readonly schema = updateTaskSchema;
}

/* ────────────────────────── List filters ────────────────────────────── */

export const listTasksSchema = Joi.object({
  status: statusSchema,
  priority: Joi.string().valid(...Object.values(TaskPriority)),
  tag: Joi.string().trim().lowercase().max(MAX_TAG_LENGTH),
  dueFrom: Joi.date().iso(),
  dueTo: Joi.date().iso(),
  search: Joi.string().trim().min(1).max(200),
  sortBy: Joi.string()
    .valid("createdAt", "dueDate", "priority", "updatedAt")
    .default("createdAt"),
  sortOrder: Joi.string().valid("asc", "desc").default("desc"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export class ListTasksDto extends BaseDto {
  static override readonly schema = listTasksSchema;
}
