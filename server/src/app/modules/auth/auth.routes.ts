import { Router } from "express";

import {
	login,
	logout,
	logoutAll,
	me,
	refresh,
	register,
} from "./auth.controller.js";
import {
	LoginDto,
	LogoutDto,
	RefreshDto,
	RegisterDto,
} from "./auth.dto.js";
import { requireAuth } from "./auth.middleware.js";
import validate from "../../shared/middleware/validate.middleware.js";

const router: Router = Router();

router.post("/register", validate(RegisterDto), register);
router.post("/login", validate(LoginDto), login);
router.post("/refresh", validate(RefreshDto), refresh);
router.post("/logout", validate(LogoutDto), logout);
router.post("/logout-all", validate(LogoutDto), logoutAll);
router.get("/me", requireAuth, me);

export default router;
