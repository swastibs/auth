import crypto from "node:crypto";

import { getRedisClient } from "../config/redis.config.js";

const KEY_PREFIX = "blacklist:access:";

interface BlacklistRedisClient {
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  exists(key: string): Promise<number>;
}

const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const createTokenBlacklist = (redis: BlacklistRedisClient) => ({
  blacklistAccessToken: async (
    plainToken: string,
    expiresAtMs: number,
  ): Promise<void> => {
    const ttlMs = expiresAtMs - Date.now();
    if (ttlMs <= 0) return;

    await redis.setex(
      `${KEY_PREFIX}${hashToken(plainToken)}`,
      Math.ceil(ttlMs / 1000),
      "1",
    );
  },
  isAccessTokenBlacklisted: async (plainToken: string): Promise<boolean> => {
    const result = await redis.exists(`${KEY_PREFIX}${hashToken(plainToken)}`);
    return result === 1;
  },
});

const tokenBlacklist = createTokenBlacklist({
  setex: (key, seconds, value) => getRedisClient().setex(key, seconds, value),
  exists: (key) => getRedisClient().exists(key),
});

export const blacklistAccessToken = tokenBlacklist.blacklistAccessToken;
export const isAccessTokenBlacklisted =
  tokenBlacklist.isAccessTokenBlacklisted;