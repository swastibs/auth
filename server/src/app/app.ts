import express, { type Application } from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";

import { allowedOrigins } from "./shared/config/cors.config.js";
import routes from "./routes.js";
import {
  errorHandler,
  notFound,
} from "./shared/middleware/error.middleware.js";

const app: Application = express();

export const redactVerificationTokenFromUrl = (url: string): string =>
  url.replace(/(\/verify-email\/)[^/?]+/gi, "$1[redacted]");

/* ── Security ─────────────────────────────────────────────────── */
app.use(helmet());

/* ── CORS ────────────────────────────────────────────────────── */
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

/* ── Logging (redact one-time tokens in verification URLs) ────── */
app.use(
  morgan((tokens, req, res) => {
    const url = redactVerificationTokenFromUrl(req.originalUrl);
      const method = tokens.method?.(req, res) ?? "-";
      const status = tokens.status?.(req, res) ?? "-";
      const responseTime = tokens["response-time"]?.(req, res) ?? "-";
      const contentLength = tokens.res?.(req, res, "content-length") ?? "-";
      return `${method} ${url} ${status} ${responseTime} ms - ${contentLength}`;
  }),
);

/* ── Body parsers ────────────────────────────────────────────── */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* ── Routes ──────────────────────────────────────────────────── */
app.use(routes);

/* ── 404 + Global error handler (MUST be last) ───────────────── */
app.use(notFound);
app.use(errorHandler);

export default app;
