import {
  awardCompletion,
  levelFromXp,
  type CompletionResult,
} from "../../shared/gamification.util.js";
import { TASK_PRIORITY_XP, TaskPriority } from "./tasks.constants.js";

export { levelFromXp };
export type { CompletionResult };

/** Task-specific wrapper around the shared gamification util. */
export const awardTaskCompletion = (
  userId: string,
  priority: TaskPriority,
): Promise<CompletionResult | null> =>
  awardCompletion(
    userId,
    TASK_PRIORITY_XP[priority] ?? TASK_PRIORITY_XP[TaskPriority.MEDIUM],
    "task",
  );
