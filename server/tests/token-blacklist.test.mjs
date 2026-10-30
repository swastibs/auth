import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

process.env.NODE_ENV = "development";
process.env.MONGO_URI_DEV = "mongodb://127.0.0.1:27017/atomictasks_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-for-production";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-production";

const { createTokenBlacklist } = await import(
  "../dist/app/shared/utils/token-blacklist.util.js"
);

test("blacklist hashes access tokens and applies rounded-up remaining TTL", async () => {
  const writes = [];
  const redis = {
    setex: async (...args) => writes.push(args),
    exists: async () => 1,
  };
  const blacklist = createTokenBlacklist(redis);
  const token = "high-entropy-access-token";

  await blacklist.blacklistAccessToken(token, Date.now() + 1_100);

  assert.equal(writes.length, 1);
  assert.equal(writes[0][0], `blacklist:access:${createHash("sha256").update(token).digest("hex")}`);
  assert.notEqual(writes[0][0].includes(token), true);
  assert.ok(writes[0][1] === 1 || writes[0][1] === 2);
  assert.equal(writes[0][2], "1");
  assert.equal(await blacklist.isAccessTokenBlacklisted(token), true);
});

test("expired access tokens are not inserted into Redis", async () => {
  const writes = [];
  const blacklist = createTokenBlacklist({
    setex: async (...args) => writes.push(args),
    exists: async () => 0,
  });

  await blacklist.blacklistAccessToken("already-expired-token", Date.now() - 1);

  assert.deepEqual(writes, []);
  assert.equal(await blacklist.isAccessTokenBlacklisted("not-blacklisted"), false);
});