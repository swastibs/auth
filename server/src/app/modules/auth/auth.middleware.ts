import type { Request, RequestHandler } from "express";
import jwt from "jsonwebtoken";
import chalk from "chalk";

import { JWT_ACCESS_SECRET } from "../../shared/config/env.config.js";
import { isAccessTokenBlacklisted } from "../../shared/utils/token-blacklist.util.js";
import ApiError from "../../shared/utils/api-error.util.js";
import catchAsync from "../../shared/utils/catch-async.util.js";
import User, { type UserDocument } from "./auth.model.js";
import { AccountStatus, UserRole } from "./auth.constants.js";

declare global {
	namespace Express {
		interface Request {
			user?: UserDocument;
		}
	}
}

interface AccessTokenPayload {
	sub: string;
	email: string;
	role: UserRole;
	type: "access";
	iat: number;
	exp: number;
}

type BlacklistLookup = (token: string) => Promise<boolean>;
type UserLookup = (userId: string) => Promise<UserDocument | null>;

const extractBearerToken = (req: Request): string | null => {
	const header = req.headers.authorization;
	if (!header || !header.startsWith("Bearer ")) return null;
	return header.slice(7).trim() || null;
};

const findUserById: UserLookup = async (userId) => User.findById(userId);

export const createRequireAuth = (
	blacklistLookup: BlacklistLookup = isAccessTokenBlacklisted,
	userLookup: UserLookup = findUserById,
): RequestHandler =>
	catchAsync(async (req, _res, next): Promise<void> => {
		const token = extractBearerToken(req);
		if (!token) throw ApiError.unauthorized("Access token required.");

		let payload: AccessTokenPayload;
		try {
			const decoded = jwt.verify(token, JWT_ACCESS_SECRET);
			if (
				typeof decoded !== "object" ||
				decoded === null ||
				decoded.type !== "access" ||
				typeof decoded.sub !== "string" ||
				typeof decoded.email !== "string" ||
				typeof decoded.role !== "string" ||
				!Object.values(UserRole).includes(decoded.role as UserRole) ||
				typeof decoded.iat !== "number" ||
				typeof decoded.exp !== "number"
			) {
				throw new Error("Malformed access token payload");
			}

			payload = {
				sub: decoded.sub,
				email: decoded.email,
				role: decoded.role as UserRole,
				type: "access",
				iat: decoded.iat,
				exp: decoded.exp,
			};
		} catch {
			throw ApiError.unauthorized("Invalid or expired access token.");
		}

		try {
			if (await blacklistLookup(token)) {
				throw ApiError.unauthorized("Token has been revoked.");
			}
		} catch (error) {
			if (error instanceof ApiError) throw error;
			console.error(
				chalk.red("[auth.requireAuth] Blacklist check failed (fail-open):"),
				error,
			);
		}

		const user = await userLookup(payload.sub);
		if (
			!user ||
			user.deletedAt ||
			user.status === AccountStatus.DELETED
		) {
			throw ApiError.unauthorized("Invalid or expired access token.");
		}
		if (user.status === AccountStatus.SUSPENDED) {
			throw ApiError.forbidden(
				"Your account has been suspended. Please contact support.",
			);
		}

		req.user = user;
		next();
	});

export const requireAuth: RequestHandler = createRequireAuth();

export const requireRole = (...roles: UserRole[]): RequestHandler => {
	return (req, _res, next): void => {
		if (!req.user) return next(ApiError.unauthorized("Not authenticated."));
		if (!roles.includes(req.user.role)) {
			return next(ApiError.forbidden("Insufficient permissions."));
		}
		return next();
	};
};

export const requireEmailVerified: RequestHandler = (req, _res, next) => {
	if (!req.user) return next(ApiError.unauthorized("Not authenticated."));
	if (!req.user.isEmailVerified) {
		return next(
			ApiError.forbidden(
				"Please verify your email address before continuing. Check your inbox or request a new verification link.",
			),
		);
	}
	return next();
};
