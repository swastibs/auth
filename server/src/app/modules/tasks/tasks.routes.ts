import { Router } from "express";

import {
  completeTask,
  createTask,
  deleteTask,
  getTask,
  listTasks,
  reopenTask,
  taskStats,
  updateTask,
} from "./tasks.controller.js";
import {
  CreateTaskDto,
  UpdateTaskDto,
} from "./tasks.dto.js";
import { loadOwnedTask } from "./tasks.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import validate from "../../shared/middleware/validate.middleware.js";

const router: Router = Router();

/* ── All task routes require an authenticated user ───────────────────── */
router.use(requireAuth);

/* ── Collection routes ───────────────────────────────────────────────── */
router.post("/", validate(CreateTaskDto), createTask);
router.get("/", listTasks);
router.get("/stats", taskStats);

/* ── Item routes (ownership enforced by middleware) ──────────────────── */
router.get("/:id", loadOwnedTask, getTask);
router.patch("/:id", loadOwnedTask, validate(UpdateTaskDto), updateTask);
router.delete("/:id", loadOwnedTask, deleteTask);
router.post("/:id/complete", loadOwnedTask, completeTask);
router.post("/:id/reopen", loadOwnedTask, reopenTask);

export default router;
