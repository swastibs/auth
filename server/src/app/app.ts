import express, { type Application } from "express";
import helmet from "helmet";
import morgan from "morgan";
import cors from "cors";

import { allowedOrigins } from "./shared/config/cors.config.js";
import {
  errorHandler,
  notFound,
} from "./shared/middleware/error.middleware.js";

const app: Application = express();

/* ── Security ─────────────────────────────────────────────────── */
app.use(helmet());

/* ── CORS ────────────────────────────────────────────────────── */
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);

/* ── Logging (before body parsers so malformed bodies are logged) ── */
app.use(morgan("dev"));

/* ── Body parsers ────────────────────────────────────────────── */
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

/* ── Routes ──────────────────────────────────────────────────── */
// Register your routers here, e.g.:
// app.use("/api/v1/users", userRoutes);

/* ── 404 + Global error handler (MUST be last) ───────────────── */
app.use(notFound);
app.use(errorHandler);

export default app;
