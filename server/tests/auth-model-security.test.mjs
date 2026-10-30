import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { afterEach, test } from "node:test";

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "development";
process.env.MONGO_URI_DEV = "mongodb://127.0.0.1:27017/atomictasks_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-for-production";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-production";
process.env.JWT_ACCESS_EXPIRE = "15m";
process.env.JWT_REFRESH_EXPIRE = "7d";
process.env.BCRYPT_SALT_ROUNDS = "4";

const [{ default: User }, { MAX_REFRESH_SESSIONS }] = await Promise.all([
  import("../dist/app/modules/auth/auth.model.js"),
  import("../dist/app/modules/auth/auth.constants.js"),
]);

const originalSave = User.prototype.save;
const originalExists = User.exists;
const originalFindOneAndUpdate = User.findOneAndUpdate;

afterEach(() => {
  User.prototype.save = originalSave;
  User.exists = originalExists;
  User.findOneAndUpdate = originalFindOneAndUpdate;
});

function createUser() {
  return new User({
    name: "Security Test",
    email: "security@example.com",
    password: "AtomicTask123!",
  });
}

function stubSave(user) {
  user.save = async function () {
    return this;
  };
}

test("verification and reset tokens store only SHA-256 hashes with expirations", () => {
  const user = createUser();
  const verificationToken = user.createEmailVerificationToken();
  const verificationHash = createHash("sha256")
    .update(verificationToken)
    .digest("hex");

  assert.notEqual(user.emailVerificationToken, verificationToken);
  assert.equal(user.emailVerificationToken, verificationHash);
  assert.ok(user.emailVerificationExpires > new Date());

  const resetToken = user.createPasswordResetToken();
  const resetHash = createHash("sha256").update(resetToken).digest("hex");
  assert.notEqual(user.passwordResetToken, resetToken);
  assert.equal(user.passwordResetToken, resetHash);
  assert.ok(user.passwordResetExpires > new Date());
});

test("password comparison verifies correct input and rejects wrong input", async () => {
  const user = createUser();
  user.password = await bcrypt.hash("AtomicTask123!", 4);

  assert.equal(await user.comparePassword("AtomicTask123!"), true);
  assert.equal(await user.comparePassword("wrong-password"), false);

  const oauthUser = createUser();
  oauthUser.password = undefined;
  assert.equal(await oauthUser.comparePassword("anything"), false);
});

test("pre-save middleware hashes a changed password without database access", async () => {
  const user = createUser();
  const plainPassword = user.password;
  User.exists = async () => null;

  await User.schema.s.hooks.execPre("save", user);

  assert.notEqual(user.password, plainPassword);
  assert.equal(await user.comparePassword(plainPassword), true);
});

test("access and refresh JWTs have correct claims and refresh tokens are unique", () => {
  const user = createUser();
  const accessToken = user.generateAccessToken();
  const refreshTokenOne = user.generateRefreshToken();
  const refreshTokenTwo = user.generateRefreshToken();
  const accessClaims = jwt.verify(accessToken, process.env.JWT_ACCESS_SECRET);
  const refreshClaims = jwt.verify(refreshTokenOne, process.env.JWT_REFRESH_SECRET);

  assert.equal(accessClaims.sub, String(user._id));
  assert.equal(accessClaims.email, user.email);
  assert.equal(accessClaims.type, "access");
  assert.equal(refreshClaims.sub, String(user._id));
  assert.equal(refreshClaims.type, "refresh");
  assert.ok(refreshClaims.jti);
  assert.notEqual(refreshTokenOne, refreshTokenTwo);
});

test("refresh sessions store token hashes, prune expired sessions, and cap devices", async () => {
  const user = createUser();
  const now = Date.now();
  user.refreshTokenSessions = Array.from(
    { length: MAX_REFRESH_SESSIONS },
    (_, index) => ({
      token: `existing-${index}`,
      expiresAt: new Date(now + 86_400_000),
      createdAt: new Date(now + index),
    }),
  );
  user.refreshTokenSessions.push({
    token: "expired",
    expiresAt: new Date(now - 1),
    createdAt: new Date(now - 10),
  });
  stubSave(user);

  await user.addRefreshTokenSession("plain-refresh-token", {
    device: "desktop",
    ip: "127.0.0.1",
    userAgent: "test-agent",
  });

  assert.equal(user.refreshTokenSessions.length, MAX_REFRESH_SESSIONS);
  assert.equal(
    user.refreshTokenSessions.some(({ token }) => token === "expired"),
    false,
  );
  assert.equal(
    user.refreshTokenSessions[0].token,
    "existing-1",
    "oldest active session should be evicted when the cap is reached",
  );
  const newest = user.refreshTokenSessions.at(-1);
  assert.equal(
    newest.token,
    createHash("sha256").update("plain-refresh-token").digest("hex"),
  );
  assert.equal(newest.device, "desktop");
  assert.equal(newest.ip, "127.0.0.1");
  assert.equal(newest.userAgent, "test-agent");
  assert.ok(newest.expiresAt > new Date(now + 6 * 86_400_000));
});

test("refresh session removal only removes the matching hashed token", async () => {
  const user = createUser();
  const tokenHash = createHash("sha256").update("revoke-me").digest("hex");
  user.refreshTokenSessions = [
    { token: tokenHash, expiresAt: new Date(), createdAt: new Date() },
    { token: "another-session", expiresAt: new Date(), createdAt: new Date() },
  ];
  stubSave(user);

  await user.removeRefreshTokenSession("revoke-me");
  assert.deepEqual(
    user.refreshTokenSessions.map(({ token }) => token),
    ["another-session"],
  );

  await user.removeAllRefreshTokenSessions();
  assert.deepEqual(user.refreshTokenSessions, []);
});

test("refresh session supports missing IP metadata", async () => {
  const user = createUser();
  user.refreshTokenSessions = [];
  stubSave(user);

  await user.addRefreshTokenSession("token-without-ip", {});

  assert.equal(user.refreshTokenSessions.length, 1);
  assert.equal(user.refreshTokenSessions[0].ip, undefined);
  assert.equal(user.refreshTokenSessions[0].userAgent, undefined);
});

test("refresh rotation uses one atomic update and replaces the matching hash", async () => {
  const user = createUser();
  const oldToken = "old-refresh-token-value";
  const newToken = "new-refresh-token-value";
  const oldHash = createHash("sha256").update(oldToken).digest("hex");
  const newHash = createHash("sha256").update(newToken).digest("hex");
  const existingSession = {
    token: oldHash,
    expiresAt: new Date(Date.now() + 60_000),
    createdAt: new Date(),
  };
  user.refreshTokenSessions = [existingSession];

  let callCount = 0;
  let updateFilter;
  let updatePipeline;
  User.findOneAndUpdate = (filter, pipeline) => {
    callCount += 1;
    updateFilter = filter;
    updatePipeline = pipeline;
    return {
      select: async () => ({
        refreshTokenSessions: [
          {
            token: newHash,
            expiresAt: new Date(Date.now() + 86_400_000),
            createdAt: new Date(),
            device: "test-device",
          },
        ],
      }),
    };
  };
  User.prototype.save = async () => {
    throw new Error("rotation must not use document save");
  };

  const result = await user.rotateRefreshTokenSession(oldToken, newToken, {
    device: "test-device",
  });

  assert.deepEqual(result, { rotated: true });
  assert.equal(callCount, 1);
  assert.deepEqual(updateFilter, { _id: user._id });
  const rotationExpression = updatePipeline[0].$set.refreshTokenSessions.$cond;
  assert.equal(rotationExpression[0].$in[0], oldHash);
  assert.deepEqual(rotationExpression[2], []);
  assert.equal(
    rotationExpression[1].$let.in.$concatArrays[1].$literal[0].token,
    newHash,
  );
  assert.deepEqual(user.refreshTokenSessions.map(({ token }) => token), [newHash]);
});

test("refresh-token reuse clears all sessions in one atomic update", async () => {
  const user = createUser();
  user.refreshTokenSessions = [
    {
      token: "other-session-hash",
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    },
  ];
  let callCount = 0;
  let updatePipeline;
  User.findOneAndUpdate = (_filter, pipeline) => {
    callCount += 1;
    updatePipeline = pipeline;
    return { select: async () => ({ refreshTokenSessions: [] }) };
  };
  User.prototype.save = async () => {
    throw new Error("reuse revocation must not use document save");
  };

  const result = await user.rotateRefreshTokenSession(
    "replayed-token-value",
    "unused-new-token-value",
  );

  assert.deepEqual(result, { rotated: false });
  assert.equal(callCount, 1);
  assert.deepEqual(
    updatePipeline[0].$set.refreshTokenSessions.$cond[2],
    [],
  );
  assert.deepEqual(user.refreshTokenSessions, []);
});

test("login lockout increments, locks, expires, and resets attempts", async () => {
  const user = createUser();
  stubSave(user);
  user.loginAttempts = 4;

  await user.incLoginAttempts();
  assert.equal(user.loginAttempts, 5);
  assert.equal(user.isLocked(), true);

  user.lockUntil = new Date(Date.now() - 1);
  await user.incLoginAttempts();
  assert.equal(user.loginAttempts, 1);
  assert.equal(user.lockUntil, undefined);
  assert.equal(user.isLocked(), false);

  await user.resetLoginAttempts();
  assert.equal(user.loginAttempts, 0);
  assert.equal(user.lockUntil, undefined);
});

test("JSON serialization removes password, tokens, sessions, and lock internals", () => {
  const user = createUser();
  user.emailVerificationToken = "verification-hash";
  user.emailVerificationExpires = new Date();
  user.passwordResetToken = "reset-hash";
  user.passwordResetExpires = new Date();
  user.loginAttempts = 3;
  user.lockUntil = new Date();
  user.refreshTokenSessions = [
    { token: "refresh-hash", expiresAt: new Date(), createdAt: new Date() },
  ];

  const publicUser = user.toJSON();

  for (const field of [
    "password",
    "emailVerificationToken",
    "emailVerificationExpires",
    "passwordResetToken",
    "passwordResetExpires",
    "loginAttempts",
    "lockUntil",
    "refreshTokenSessions",
  ]) {
    assert.equal(field in publicUser, false, `${field} must not be serialized`);
  }
});