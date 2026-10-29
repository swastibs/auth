import type { Request, RequestHandler, Response } from "express";
import type { Types } from "mongoose";
import chalk from "chalk";

import User from "./auth.model.js";
import { AccountStatus, AuthProvider } from "./auth.constants.js";
import ApiError from "../../shared/utils/api-error.util.js";
import ApiResponse from "../../shared/utils/api-response.util.js";
import catchAsync from "../../shared/utils/catch-async.util.js";
import {
  JWT_ACCESS_EXPIRE,
  JWT_REFRESH_EXPIRE,
} from "../../shared/config/env.config.js";
import { emailQueue } from "../../shared/queues/email.queue.js";

/** Body shape after route-level validation. */
interface RegisterBody {
  name: string;
  email: string;
  password: string;
  timezone?: string;
  referralCode?: string;
}

/** Fields to select when checking if a user already exists. */
const EXISTING_USER_PROJECTION = "_id provider deletedAt";

/* ═══════════════════════════════════════════════════════════════════════ */
/*  REGISTER                                                              */
/* ═══════════════════════════════════════════════════════════════════════ */

export const register: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const { name, email, password, timezone, referralCode } =
      req.body as RegisterBody;

    const normalizedEmail = email.trim().toLowerCase();

    /* ── 1. Reject pre-existing emails (friendly errors) ──────────────── */
    const existingUser = await User.findOne({ email: normalizedEmail }).select(
      EXISTING_USER_PROJECTION,
    );

    if (existingUser) {
      if (existingUser.deletedAt) {
        throw ApiError.conflict(
          "An account with this email was previously deleted. Contact support to restore it.",
        );
      }
      if (existingUser.provider !== AuthProvider.LOCAL) {
        throw ApiError.conflict(
          `This email is already registered with ${existingUser.provider}. Please sign in with ${existingUser.provider}.`,
        );
      }
      throw ApiError.conflict("An account with this email already exists.");
    }

    /* ── 2. Resolve referral (only if code provided) ──────────────────── */
    let referredBy: Types.ObjectId | undefined;

    if (referralCode) {
      const referrer = await User.findOne({
        referralCode: referralCode.trim().toUpperCase(),
        status: AccountStatus.ACTIVE,
        deletedAt: null,
      })
        .select("_id")
        .lean<{ _id: Types.ObjectId } | null>();

      if (!referrer) {
        throw ApiError.badRequest("Invalid referral code.");
      }
      referredBy = referrer._id;
    }

    /* ── 3. Build + persist the user (single write) ───────────────────── */
    const user = new User({
      name: name.trim(),
      email: normalizedEmail,
      password,
      provider: AuthProvider.LOCAL,
      timezone: timezone ?? "UTC",
      ...(referredBy && { referredBy }),
    });

    // Set token BEFORE save → persisted atomically with the user document.
    // Method returns the *plain* token; only the SHA-256 hash is stored.
    const emailVerificationToken = user.createEmailVerificationToken();

    try {
      await user.save();
    } catch (err) {
      // Race-condition fallback: two concurrent registers with same email.
      if ((err as { code?: number }).code === 11000) {
        throw ApiError.conflict("An account with this email already exists.");
      }
      throw err;
    }

    /* ── 4. Issue tokens + persist refresh session ────────────────────── */
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // Second save — persists only the (hashed) refresh session. Failure here
    // is non-fatal: the user can still log in manually.
    const userAgent = req.headers["user-agent"];
    await user.addRefreshTokenSession(refreshToken, {
      ...(typeof userAgent === "string" && {
        device: userAgent,
        userAgent,
      }),
      ...(req.ip !== undefined && { ip: req.ip }),
    });

    /* ── 5. Fire-and-forget side effects ──────────────────────────────── */
    // Emails NEVER block the response and NEVER roll back registration.
    void Promise.resolve()
      .then(() =>
        emailQueue.add("verification", {
          to: user.email,
          name: user.name,
          token: emailVerificationToken,
          expiresInMs: 24 * 60 * 60 * 1000,
        }),
      )
      .catch((err: unknown) =>
        console.error(
          chalk.red("[auth.register] Verification email enqueue failed:"),
          err,
        ),
      );

    void Promise.resolve()
      .then(() =>
        emailQueue.add("welcome", { to: user.email, name: user.name }),
      )
      .catch((err: unknown) =>
        console.error(
          chalk.red("[auth.register] Welcome email enqueue failed:"),
          err,
        ),
      );

    if (referredBy) {
      void Promise.resolve()
        .then(() =>
          User.updateOne({ _id: referredBy }, { $inc: { totalXp: 100 } }),
        )
        .catch((err: unknown) =>
          console.error(
            chalk.red("[auth.register] Referrer XP award failed:"),
            err,
          ),
        );
    }

    /* ── 6. Respond (tokens included → auto-login UX) ─────────────────── */
    return ApiResponse.created(
      res,
      "Registration successful. Please check your email to verify your account.",
      {
        user: user.toJSON(), // toJSON transform strips sensitive fields
        tokens: {
          accessToken,
          refreshToken,
          accessTokenExpiresIn: JWT_ACCESS_EXPIRE,
          refreshTokenExpiresIn: JWT_REFRESH_EXPIRE,
          tokenType: "Bearer" as const,
        },
      },
    );
  },
);
