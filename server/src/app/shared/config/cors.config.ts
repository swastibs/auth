import { NodeEnv } from "../constants/env.constant.js";
import { NODE_ENV } from "./env.config.js";

export const CORS_ORIGINS: Record<NodeEnv, string[]> = {
  [NodeEnv.LOCAL]: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8080",
  ],
  [NodeEnv.STAGE]: ["https://stage.yourdomain.com"],
  [NodeEnv.PROD]: ["https://yourdomain.com"],
};

export const allowedOrigins: string[] = CORS_ORIGINS[NODE_ENV];
