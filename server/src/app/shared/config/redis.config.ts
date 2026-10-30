import { Redis as UpstashRedis } from "@upstash/redis";
import { Redis as IORedis } from "ioredis";
import chalk from "chalk";

import {
  NODE_ENV,
  REDIS_URL,
  UPSTASH_REDIS_REST_TOKEN,
  UPSTASH_REDIS_REST_URL,
} from "./env.config.js";
import { NodeEnv } from "../constants/env.constant.js";

export interface RedisClient {
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  exists(key: string): Promise<number>;
  set(
    key: string,
    value: string,
    options: { ex: number; nx?: boolean },
  ): Promise<string | null>;
}

let client: RedisClient | null = null;
let tcpClient: IORedis | null = null;

export const usesUpstashRedis = (environment: NodeEnv): boolean =>
  environment === NodeEnv.PROD || environment === NodeEnv.STAGE;

export const getRedisClient = (): RedisClient => {
  if (client) return client;

  if (usesUpstashRedis(NODE_ENV)) {
    if (!UPSTASH_REDIS_REST_URL || !UPSTASH_REDIS_REST_TOKEN) {
      throw new Error(
        "UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in staging and production.",
      );
    }

    console.log(chalk.green("Connecting to Upstash Redis (REST)..."));
    const upstashClient = new UpstashRedis({
      url: UPSTASH_REDIS_REST_URL,
      token: UPSTASH_REDIS_REST_TOKEN,
    });
    void upstashClient
      .ping()
      .then(() => console.log(chalk.green("Redis connected (Upstash REST)")))
      .catch((error: unknown) =>
        console.error(chalk.red("Redis error:"), error),
      );

    client = {
      setex: (key, seconds, value) =>
        upstashClient.setex(key, seconds, value),
      exists: (key) => upstashClient.exists(key),
      set: (key, value, options) =>
        options.nx
          ? upstashClient.set(key, value, { ex: options.ex, nx: true })
          : upstashClient.set(key, value, { ex: options.ex }),
    };
    return client;
  }

  console.log(chalk.green("Connecting to local Redis (TCP)..."));
  tcpClient = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3_000),
    });

  tcpClient.on("connect", () => console.log(chalk.green("Redis connected")));
  tcpClient.on("error", (error: Error) =>
    console.error(chalk.red("Redis error:"), error),
  );

  const activeTcpClient = tcpClient;
  client = {
    setex: (key, seconds, value) =>
      activeTcpClient.setex(key, seconds, value),
    exists: (key) => activeTcpClient.exists(key),
    set: (key, value, options) =>
      options.nx
        ? activeTcpClient.set(key, value, "EX", options.ex, "NX")
        : activeTcpClient.set(key, value, "EX", options.ex),
  };

  return client;
};

export const closeRedis = async (): Promise<void> => {
  client = null;
  if (tcpClient) {
    const activeTcpClient = tcpClient;
    tcpClient = null;
    await activeTcpClient.quit();
  }
};