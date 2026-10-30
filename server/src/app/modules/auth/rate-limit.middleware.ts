import { rateLimit } from "express-rate-limit";

import ApiResponse from "../../shared/utils/api-response.util.js";

const createAuthLimiter = (limit: number, windowMs: number) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: "Too many requests. Please try again later.",
    handler: (_req, res) =>
      ApiResponse.send(res, 429, "Too many requests. Please try again later."),
  });

export const loginLimiter = createAuthLimiter(10, 15 * 60 * 1000);
export const registerLimiter = createAuthLimiter(5, 15 * 60 * 1000);
export const forgotPasswordLimiter = createAuthLimiter(5, 60 * 60 * 1000);
export const resendVerificationLimiter = createAuthLimiter(5, 60 * 60 * 1000);