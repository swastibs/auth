import Joi from "joi";

import BaseDto from "../../shared/dto/base.dto.js";

/* ── Registration schema ──────────────────────────────────────────────── */
export const registerSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().lowercase().trim().max(254).required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .custom((value: string, helpers) => {
      if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
        return helpers.error("password.requireLetterAndNumber");
      }
      return value;
    })
    .messages({
      "password.requireLetterAndNumber":
        "Password must contain at least one letter and one number",
    })
    .required(),
  timezone: Joi.string().max(64).default("UTC"),
  referralCode: Joi.string()
    .trim()
    .uppercase()
    .pattern(/^[A-F0-9]{6,12}$/i)
    .max(12),
});

export class RegisterDto extends BaseDto {
  static override readonly schema = registerSchema;
}

/* ── Login schema ────────────────────────────────────────────────────── */
export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().max(254).required(),
  password: Joi.string().min(8).max(128).required(),
});

export class LoginDto extends BaseDto {
  static override readonly schema = loginSchema;
}

/* ── Refresh-token schema ────────────────────────────────────────────── */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().trim().min(20).max(4096).required(),
});

export class RefreshDto extends BaseDto {
  static override readonly schema = refreshTokenSchema;
}

/* ── Logout schema ───────────────────────────────────────────────────── */
export const logoutSchema = Joi.object({
  refreshToken: Joi.string().trim().min(20).max(4096).required(),
});

export class LogoutDto extends BaseDto {
  static override readonly schema = logoutSchema;
}