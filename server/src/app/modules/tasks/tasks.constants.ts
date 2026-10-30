/* ────────────────────────── Status ──────────────────────────────────── */

export enum TaskStatus {
  TODO = "todo",
  IN_PROGRESS = "in_progress",
  DONE = "done",
  ARCHIVED = "archived",
}

export const TASK_STATUS_VALUES: readonly TaskStatus[] =
  Object.values(TaskStatus);

/* ────────────────────────── Priority ────────────────────────────────── */

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  URGENT = "urgent",
}

export const TASK_PRIORITY_VALUES: readonly TaskPriority[] =
  Object.values(TaskPriority);

/** XP awarded the first time a task is completed. */
export const TASK_PRIORITY_XP: Record<TaskPriority, number> = {
  [TaskPriority.LOW]: 10,
  [TaskPriority.MEDIUM]: 20,
  [TaskPriority.HIGH]: 30,
  [TaskPriority.URGENT]: 50,
};

/* ────────────────────────── Limits ──────────────────────────────────── */

export const MAX_TASK_TITLE_LENGTH = 200;
export const MAX_TASK_DESCRIPTION_LENGTH = 5000;
export const MAX_TAGS_PER_TASK = 10;
export const MAX_TAG_LENGTH = 30;
export const MAX_ACTIVE_TASKS_PER_USER = 5000;

export { levelFromXp } from "../../shared/gamification.util.js";
