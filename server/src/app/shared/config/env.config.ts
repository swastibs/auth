import "dotenv/config";
import { NodeEnv, NODE_ENV_VALUES } from "../constants/env.constant.js";

/* ------------------------------ NODE_ENV ------------------------------ */
const rawNodeEnv = process.env.NODE_ENV ?? NodeEnv.LOCAL;

if (!NODE_ENV_VALUES.includes(rawNodeEnv as NodeEnv)) {
  throw new Error(
    `Invalid NODE_ENV "${rawNodeEnv}". Allowed values: ${NODE_ENV_VALUES.join(", ")}`,
  );
}

export const NODE_ENV: NodeEnv = rawNodeEnv as NodeEnv;

/** Convenience flags — use instead of comparing strings. */
export const isLocal = NODE_ENV === NodeEnv.LOCAL;
export const isStage = NODE_ENV === NodeEnv.STAGE;
export const isProd = NODE_ENV === NodeEnv.PROD;

/* -------------------------------- PORT -------------------------------- */
const rawPort = process.env.PORT ?? "8080";
const parsedPort = Number(rawPort);

if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
  throw new Error(`Invalid PORT: "${rawPort}" (must be integer 1–65535)`);
}

export const PORT: number = parsedPort;

/* ------------------------------ MONGO URI ----------------------------- */
const MONGO_URI_MAP: Record<NodeEnv, string | undefined> = {
  [NodeEnv.LOCAL]: process.env.MONGO_URI_DEV,
  [NodeEnv.STAGE]: process.env.MONGO_URI_STAGE,
  [NodeEnv.PROD]: process.env.MONGO_URI_PROD,
};

const resolvedMongoUri = MONGO_URI_MAP[NODE_ENV];

if (!resolvedMongoUri) {
  throw new Error(
    `Missing MONGO_URI for NODE_ENV="${NODE_ENV}". Check your .env file.`,
  );
}

export const MONGO_URI: string = resolvedMongoUri;
