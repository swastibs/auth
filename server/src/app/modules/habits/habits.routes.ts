import { Router } from "express";

import {
  checkInHabit,
  createHabit,
  deleteHabit,
  getHabit,
  habitHistory,
  habitStats,
  listHabits,
  undoCheckInHabit,
  updateHabit,
} from "./habits.controller.js";
import {
  CheckInHabitDto,
  CreateHabitDto,
  ListHabitsDto,
  UpdateHabitDto,
} from "./habits.dto.js";
import { loadOwnedHabit } from "./habits.middleware.js";
import { requireAuth } from "../auth/auth.middleware.js";
import validate from "../../shared/middleware/validate.middleware.js";

const router: Router = Router();

router.use(requireAuth);

router.get("/stats", habitStats);
router.post("/", validate(CreateHabitDto), createHabit);
router.get("/", listHabits);

router.get("/:id", loadOwnedHabit, getHabit);
router.get("/:id/history", loadOwnedHabit, habitHistory);
router.patch("/:id", loadOwnedHabit, validate(UpdateHabitDto), updateHabit);
router.delete("/:id", loadOwnedHabit, deleteHabit);
router.post("/:id/check-in", loadOwnedHabit, validate(CheckInHabitDto), checkInHabit);
router.delete("/:id/check-in", loadOwnedHabit, undoCheckInHabit);

export default router;
