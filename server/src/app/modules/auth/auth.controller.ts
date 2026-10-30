import type { Request, RequestHandler, Response } from "express";
import type { Types } from "mongoose";
import bcrypt from "bcryptjs";
import chalk from "chalk";
import jwt from "jsonwebtoken";

import User from "./auth.model.js";
import { AccountStatus, AuthProvider } from "./auth.constants.js";
import ApiError from "../../shared/utils/api-error.util.js";
import ApiResponse from "../../shared/utils/api-response.util.js";
import catchAsync from "../../shared/utils/catch-async.util.js";
import {
  JWT_ACCESS_EXPIRE,
  JWT_ACCESS_SECRET,
  JWT_REFRESH_EXPIRE,
  JWT_REFRESH_SECRET,
} from "../../shared/config/env.config.js";
import { emailQueue } from "../../shared/queues/email.queue.js";
import { blacklistAccessToken } from "../../shared/utils/token-blacklist.util.js";

/** Body shape after route-level validation. */
interface RegisterBody {
  name: string;
  email: string;
  password: string;
  timezone?: string;
  referralCode?: string;
}

interface LoginBody {
  email: string;
  password: string;
}

interface RefreshBody {
  refreshToken: string;
}

interface LogoutBody {
  refreshToken: string;
}

interface RefreshTokenPayload {
  sub: string;
  type: "refresh";
  jti: string;
  iat: number;
  exp: number;
}

/** Fields to select when checking if a user already exists. */
const EXISTING_USER_PROJECTION = "_id provider deletedAt";
const DUMMY_PASSWORD_HASH =
  "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const INVALID_CREDENTIALS = "Invalid email or password.";
const LOGIN_SELECT =
  "+password +loginAttempts +lockUntil +refreshTokenSessions";
const REFRESH_INVALID_MESSAGE = "Invalid or expired refresh token.";

const extractBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
};

const extractUserIdFromRefreshToken = (token: string): string | null => {
  try {
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET);
    if (
      typeof decoded === "object" &&
      decoded !== null &&
      decoded.type === "refresh" &&
      typeof decoded.sub === "string"
    ) {
      return decoded.sub;
    }
    return null;
  } catch {
    return null;
  }
};

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

/* ═══════════════════════════════════════════════════════════════════════ */
/*  LOGIN                                                                 */
/* ═══════════════════════════════════════════════════════════════════════ */

export const login: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const { email, password } = req.body as LoginBody;
    const normalizedEmail = email.trim().toLowerCase();

    /* ── 1. Load hidden authentication fields ─────────────────────────── */
    const user = await User.findOne({ email: normalizedEmail }).select(
      LOGIN_SELECT,
    );

    if (!user) {
      await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
      throw ApiError.unauthorized(INVALID_CREDENTIALS);
    }

    /* ── 2. Check account state and authentication provider ───────────── */
    if (user.deletedAt) {
      throw ApiError.unauthorized(INVALID_CREDENTIALS);
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw ApiError.forbidden(
        "Your account has been suspended. Please contact support.",
      );
    }

    if (user.provider !== AuthProvider.LOCAL) {
      throw ApiError.badRequest(
        `This account uses ${user.provider} sign-in. Please continue with ${user.provider}.`,
      );
    }

    /* ── 3. Enforce lockout before performing password verification ───── */
    if (user.isLocked()) {
      throw ApiError.tooManyRequests(
        "Too many failed login attempts. Please try again later.",
      );
    }

    /* ── 4. Verify credentials and persist failed attempts ─────────────── */
    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      await user.incLoginAttempts();
      throw ApiError.unauthorized(INVALID_CREDENTIALS);
    }

    /* ── 5. Reset counters and stamp activity ────────────────────────── */
    const now = new Date();
    user.loginAttempts = 0;
    user.set("lockUntil", undefined);
    user.lastLogin = now;
    user.lastActiveAt = now;

    /* ── 6. Issue tokens and persist refresh session ──────────────────── */
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    const userAgent = req.headers["user-agent"];

    await user.addRefreshTokenSession(refreshToken, {
      ...(typeof userAgent === "string" && {
        device: userAgent,
        userAgent,
      }),
      ...(req.ip !== undefined && { ip: req.ip }),
    });

    /* ── 7. Respond with the shared authentication response ───────────── */
    return ApiResponse.ok(res, "Login successful.", {
      user: user.toJSON(),
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: JWT_ACCESS_EXPIRE,
        refreshTokenExpiresIn: JWT_REFRESH_EXPIRE,
        tokenType: "Bearer" as const,
      },
    });
  },
);

/* ═══════════════════════════════════════════════════════════════════════ */
/*  REFRESH — rotate refresh token and detect reuse                      */
/* ═══════════════════════════════════════════════════════════════════════ */

export const refresh: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    const { refreshToken: plainRefreshToken } = req.body as RefreshBody;

    /* ── 1. Verify the token and its expected payload ─────────────────── */
    let payload: RefreshTokenPayload;

    try {
      const decoded = jwt.verify(plainRefreshToken, JWT_REFRESH_SECRET);
      if (
        typeof decoded !== "object" ||
        decoded === null ||
        decoded.type !== "refresh" ||
        typeof decoded.sub !== "string" ||
        typeof decoded.jti !== "string" ||
        typeof decoded.iat !== "number" ||
        typeof decoded.exp !== "number"
      ) {
        throw new Error("Malformed refresh token payload");
      }

      payload = {
        sub: decoded.sub,
        type: "refresh",
        jti: decoded.jti,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch {
      throw ApiError.unauthorized(REFRESH_INVALID_MESSAGE);
    }

    /* ── 2. Load the user and its hidden refresh-session array ────────── */
    const user = await User.findById(payload.sub).select(
      "+refreshTokenSessions",
    );

    if (!user || user.deletedAt || user.status === AccountStatus.DELETED) {
      throw ApiError.unauthorized(REFRESH_INVALID_MESSAGE);
    }

    if (user.status === AccountStatus.SUSPENDED) {
      throw ApiError.forbidden(
        "Your account has been suspended. Please contact support.",
      );
    }

    /* ── 3. Rotate atomically; reuse revokes the entire session family ── */
    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();
    const userAgent = req.headers["user-agent"];
    const { rotated } = await user.rotateRefreshTokenSession(
      plainRefreshToken,
      newRefreshToken,
      {
        ...(typeof userAgent === "string" && {
          device: userAgent,
          userAgent,
        }),
        ...(req.ip !== undefined && { ip: req.ip }),
      },
    );

    if (!rotated) {
      console.error(
        chalk.red(
          `[auth.refresh] Refresh-token reuse detected for user ${user._id.toString()} — all sessions revoked.`,
        ),
      );
      throw ApiError.unauthorized(
        "Refresh token is no longer valid. Please log in again.",
      );
    }

    /* ── 4. Update activity without blocking token delivery ───────────── */
    void Promise.resolve()
      .then(() =>
        User.updateOne({ _id: user._id }, { lastActiveAt: new Date() }),
      )
      .catch((err: unknown) =>
        console.error(
          chalk.red("[auth.refresh] lastActiveAt update failed:"),
          err,
        ),
      );

    /* ── 5. Respond with the newly-issued token pair ──────────────────── */
    return ApiResponse.ok(res, "Token refreshed.", {
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        accessTokenExpiresIn: JWT_ACCESS_EXPIRE,
        refreshTokenExpiresIn: JWT_REFRESH_EXPIRE,
        tokenType: "Bearer" as const,
      },
    });
  },
);

/* ═══════════════════════════════════════════════════════════════════════ */
/*  LOGOUT — revoke one refresh session and blacklist current access token */
/* ═══════════════════════════════════════════════════════════════════════ */

export const createLogoutHandlers = (
  blacklistToken: typeof blacklistAccessToken = blacklistAccessToken,
): { logout: RequestHandler; logoutAll: RequestHandler } => {
  const blacklistCurrentAccessToken = async (
    req: Request,
    action: "logout" | "logoutAll",
  ): Promise<void> => {
    const token = extractBearerToken(req);
    if (!token) return;

    let expiresAtMs: number;
    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
      if (
        typeof decoded !== "object" ||
        decoded === null ||
        decoded.type !== "access" ||
        typeof decoded.exp !== "number"
      ) {
        return;
      }
      expiresAtMs = decoded.exp * 1000;
    } catch {
      return;
    }

    try {
      await blacklistToken(token, expiresAtMs);
    } catch (error) {
      console.error(
        chalk.red(`[auth.${action}] Access-token blacklist failed:`),
        error,
      );
    }
  };

  const logout: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<Response> => {
      const { refreshToken } = req.body as LogoutBody;

      await blacklistCurrentAccessToken(req, "logout");

      const userId = extractUserIdFromRefreshToken(refreshToken);
      if (userId) {
        try {
          const user = await User.findById(userId).select(
            "+refreshTokenSessions",
          );
          if (user) await user.removeRefreshTokenSession(refreshToken);
        } catch (error) {
          console.error(
            chalk.red("[auth.logout] Refresh-session revoke failed:"),
            error,
          );
        }
      }

      return ApiResponse.noContent(res);
    },
  );

  const logoutAll: RequestHandler = catchAsync(
    async (req: Request, res: Response): Promise<Response> => {
      const { refreshToken } = req.body as LogoutBody;

      await blacklistCurrentAccessToken(req, "logoutAll");

      const userId = extractUserIdFromRefreshToken(refreshToken);
      if (userId) {
        try {
          const user = await User.findById(userId).select(
            "+refreshTokenSessions",
          );
          if (user) await user.removeAllRefreshTokenSessions();
        } catch (error) {
          console.error(
            chalk.red("[auth.logoutAll] Session revoke failed:"),
            error,
          );
        }
      }

      return ApiResponse.noContent(res);
    },
  );

  return { logout, logoutAll };
};

const logoutHandlers = createLogoutHandlers();
export const logout: RequestHandler = logoutHandlers.logout;
export const logoutAll: RequestHandler = logoutHandlers.logoutAll;

/* ═══════════════════════════════════════════════════════════════════════ */
/*  ME — protected profile endpoint                                      */
/* ═══════════════════════════════════════════════════════════════════════ */

export const me: RequestHandler = catchAsync(
  async (req: Request, res: Response): Promise<Response> => {
    if (!req.user) throw ApiError.unauthorized("Not authenticated.");

    return ApiResponse.ok(res, "User fetched.", {
      user: req.user.toJSON(),
    });
  },
);
