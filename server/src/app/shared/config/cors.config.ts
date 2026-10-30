import { NodeEnv } from "../constants/env.constant.js";
import { NODE_ENV } from "./env.config.js";

export const CORS_ORIGINS: Record<NodeEnv, string[]> = {
  [NodeEnv.LOCAL]: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
    "https://atomictask.vercel.app",
  ],
  [NodeEnv.STAGE]: [
    "https://atomictask.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
  [NodeEnv.PROD]: [
    "https://atomictask.vercel.app",
    "http://localhost:5173",
    "http://localhost:3000",
  ],
};

export const allowedOrigins: string[] = CORS_ORIGINS[NODE_ENV];
