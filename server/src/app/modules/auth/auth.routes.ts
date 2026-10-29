import { Router } from "express";

import { register } from "./auth.controller.js";
import { RegisterDto } from "./auth.dto.js";
import validate from "../../shared/middleware/validate.middleware.js";

const router: Router = Router();

router.post("/register", validate(RegisterDto), register);

export default router;
