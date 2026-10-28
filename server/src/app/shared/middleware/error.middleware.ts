import type { Request, Response, NextFunction } from "express";
import chalk from "chalk";
import ApiError from "../utils/api-error.util.js";
import ApiResponse from "../utils/api-response.util.js";
import { isProd } from "../config/env.config.js";

/** Catches any request that didn't match a route. */
export const notFound = (_req: Request, _res: Response, next: NextFunction) => {
  next(new ApiError(404, "Route not found"));
};

/**
 * Global error handler — must be registered LAST.
 * Signature must keep 4 args for Express to recognise it as an error handler.
 */
export const errorHandler = (
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Expected / operational errors
  if (err instanceof ApiError) {
    return ApiResponse.send(res, err.statusCode, err.message);
  }

  // Mongoose duplicate key (E11000)
  if (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  ) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const field = keyValue ? Object.keys(keyValue)[0] : undefined;
    return ApiResponse.send(
      res,
      409,
      field ? `Duplicate value for "${field}"` : "Duplicate key",
    );
  }

  // Unexpected — log the full thing, don't leak internals in prod
  console.error(chalk.red("Unexpected error:"), err);

  const message = isProd
    ? "Internal Server Error"
    : String((err as Error)?.message ?? err);

  return ApiResponse.send(res, 500, message);
};
