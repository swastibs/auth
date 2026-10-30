import { Router } from "express";

import { login, refresh, register } from "./auth.controller.js";
import { LoginDto, RefreshDto, RegisterDto } from "./auth.dto.js";
import validate from "../../shared/middleware/validate.middleware.js";

const router: Router = Router();

router.post("/register", validate(RegisterDto), register);
router.post("/login", validate(LoginDto), login);
router.post("/refresh", validate(RefreshDto), refresh);

export default router;
