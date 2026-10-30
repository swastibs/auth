import { Router } from "express";

import {
	changePassword,
	forgotPassword,
	login,
	logout,
	logoutAll,
	me,
	refresh,
	register,
	resendVerification,
	resetPassword,
	verifyEmail,
} from "./auth.controller.js";
import {
	ChangePasswordDto,
	ForgotPasswordDto,
	LoginDto,
	LogoutDto,
	RefreshDto,
	RegisterDto,
	ResendVerificationDto,
	ResetPasswordDto,
} from "./auth.dto.js";
import { requireAuth } from "./auth.middleware.js";
import {
	forgotPasswordLimiter,
	loginLimiter,
	registerLimiter,
	resendVerificationLimiter,
} from "./rate-limit.middleware.js";
import validate from "../../shared/middleware/validate.middleware.js";

const router: Router = Router();

router.post("/register", registerLimiter, validate(RegisterDto), register);
router.post("/login", loginLimiter, validate(LoginDto), login);
router.post("/refresh", validate(RefreshDto), refresh);
router.post("/logout", validate(LogoutDto), logout);
router.post("/logout-all", validate(LogoutDto), logoutAll);
router.get("/me", requireAuth, me);

/* ── Email verification ──────────────────────────────────────────────── */
router.get("/verify-email/:token", verifyEmail);
router.post(
	"/resend-verification",
	resendVerificationLimiter,
	validate(ResendVerificationDto),
	resendVerification,
);
router.post(
	"/forgot-password",
	forgotPasswordLimiter,
	validate(ForgotPasswordDto),
	forgotPassword,
);
router.post(
	"/reset-password/:token",
	validate(ResetPasswordDto),
	resetPassword,
);
router.post(
	"/change-password",
	requireAuth,
	validate(ChangePasswordDto),
	changePassword,
);

export default router;
