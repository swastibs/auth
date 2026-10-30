import { Redis } from "ioredis";
import chalk from "chalk";

import { REDIS_URL } from "./env.config.js";

let client: Redis | null = null;

export const getRedisClient = (): Redis => {
  if (!client) {
    client = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 100, 3_000),
    });

    client.on("connect", () => console.log(chalk.green("Redis connected")));
    client.on("error", (error: Error) =>
      console.error(chalk.red("Redis error:"), error),
    );
  }

  return client;
};

export const closeRedis = async (): Promise<void> => {
  if (!client) return;

  const activeClient = client;
  client = null;
  await activeClient.quit();
};