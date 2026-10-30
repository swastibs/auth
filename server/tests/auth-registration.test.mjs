import assert from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, beforeEach, test } from "node:test";

import mongoose from "mongoose";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "development";
process.env.MONGO_URI_DEV = "mongodb://127.0.0.1:27017/atomictasks_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-for-production";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-production";
process.env.JWT_ACCESS_EXPIRE = "15m";
process.env.JWT_REFRESH_EXPIRE = "7d";
process.env.BCRYPT_SALT_ROUNDS = "4";

const [
  { login, refresh, register },
  { default: User },
  { emailQueue },
  { default: app },
  { LoginDto, RefreshDto, RegisterDto },
  { MAX_LOGIN_ATTEMPTS },
] = await Promise.all([
  import("../dist/app/modules/auth/auth.controller.js"),
  import("../dist/app/modules/auth/auth.model.js"),
  import("../dist/app/shared/queues/email.queue.js"),
  import("../dist/app/app.js"),
  import("../dist/app/modules/auth/auth.dto.js"),
  import("../dist/app/modules/auth/auth.constants.js"),
]);

const LOGIN_SELECT =
  "+password +loginAttempts +lockUntil +refreshTokenSessions";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const REFRESH_SELECT = "+refreshTokenSessions";

const originalMethods = {
  findOne: User.findOne,
  findById: User.findById,
  updateOne: User.updateOne,
  save: User.prototype.save,
  createEmailVerificationToken: User.prototype.createEmailVerificationToken,
  generateAccessToken: User.prototype.generateAccessToken,
  generateRefreshToken: User.prototype.generateRefreshToken,
  addRefreshTokenSession: User.prototype.addRefreshTokenSession,
  emailQueueAdd: emailQueue.add,
  consoleError: console.error,
};

let state;

beforeEach(() => {
  state = {
    existingUser: null,
    loginUser: null,
    refreshUser: null,
    loginProjection: null,
    refreshProjection: null,
    refreshLookups: [],
    rotationCalls: [],
    rotationResult: { rotated: true },
    passwordChecks: [],
    passwordMatches: false,
    referrer: null,
    saveError: null,
    findQueries: [],
    order: [],
    sessions: [],
    queuedJobs: [],
    updates: [],
    errors: [],
  };

  User.findOne = (filter) => {
    state.findQueries.push(filter);
    if (Object.hasOwn(filter, "email")) {
      return {
        select: async (projection) => {
          if (projection === LOGIN_SELECT) {
            state.loginProjection = projection;
            return state.loginUser;
          }
          state.existingProjection = projection;
          return state.existingUser;
        },
      };
    }

    return {
      select: (projection) => ({
        lean: async () => {
          state.referralProjection = projection;
          return state.referrer;
        },
      }),
    };
  };

  User.findById = (id) => {
    state.refreshLookups.push(id);
    return {
      select: async (projection) => {
        state.refreshProjection = projection;
        return state.refreshUser;
      },
    };
  };

  User.updateOne = (filter, update) => {
    state.updates.push({ filter, update });
    return Promise.resolve({ acknowledged: true });
  };

  User.prototype.save = async function () {
    state.order.push("save");
    if (state.saveError) throw state.saveError;
    return this;
  };

  User.prototype.createEmailVerificationToken = function () {
    state.order.push("verification-token");
    this.emailVerificationToken = "hashed-verification-token";
    this.emailVerificationExpires = new Date(Date.now() + 86_400_000);
    return "plain-verification-token";
  };

  User.prototype.generateAccessToken = () => "test-access-token";
  User.prototype.generateRefreshToken = () => "test-refresh-token";
  User.prototype.addRefreshTokenSession = async function (token, metadata) {
    state.order.push("refresh-session");
    state.sessions.push({ token, metadata });
    return this;
  };

  emailQueue.add = async (job, payload) => {
    state.queuedJobs.push({ job, payload });
  };
  console.error = (...args) => state.errors.push(args);
});

afterEach(() => {
  User.findOne = originalMethods.findOne;
  User.findById = originalMethods.findById;
  User.updateOne = originalMethods.updateOne;
  User.prototype.save = originalMethods.save;
  User.prototype.createEmailVerificationToken =
    originalMethods.createEmailVerificationToken;
  User.prototype.generateAccessToken = originalMethods.generateAccessToken;
  User.prototype.generateRefreshToken = originalMethods.generateRefreshToken;
  User.prototype.addRefreshTokenSession =
    originalMethods.addRefreshTokenSession;
  emailQueue.add = originalMethods.emailQueueAdd;
  console.error = originalMethods.consoleError;
});

const validBody = {
  name: "  Atomic User  ",
  email: "  ALICE@example.com  ",
  password: "AtomicTask123!",
};

function callRegister(body, request = {}) {
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: 0,
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(jsonBody) {
        resolve({ statusCode: this.statusCode, body: jsonBody });
        return this;
      },
    };

    register(
      {
        body,
        headers: request.headers ?? {},
        ip: request.ip,
      },
      response,
      reject,
    );
  });
}

function callLogin(body, request = {}) {
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: 0,
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(jsonBody) {
        resolve({ statusCode: this.statusCode, body: jsonBody });
        return this;
      },
    };

    login(
      {
        body,
        headers: request.headers ?? {},
        ip: request.ip,
      },
      response,
      reject,
    );
  });
}

function callRefresh(body, request = {}) {
  return new Promise((resolve, reject) => {
    const response = {
      statusCode: 0,
      status(statusCode) {
        this.statusCode = statusCode;
        return this;
      },
      json(jsonBody) {
        resolve({ statusCode: this.statusCode, body: jsonBody });
        return this;
      },
    };

    refresh(
      {
        body,
        headers: request.headers ?? {},
        ip: request.ip,
      },
      response,
      reject,
    );
  });
}

function createLoginUser(overrides = {}) {
  const user = new User({
    name: "Ada Lovelace",
    email: "ada@example.com",
    password: "stored-password-hash",
    ...overrides,
  });
  user.comparePassword = async (candidate) => {
    state.passwordChecks.push(candidate);
    return state.passwordMatches;
  };
  return user;
}

function createRefreshUser(overrides = {}) {
  const user = new User({
    name: "Ada Lovelace",
    email: "ada@example.com",
    ...overrides,
  });
  user.rotateRefreshTokenSession = async (...args) => {
    state.rotationCalls.push(args);
    return state.rotationResult;
  };
  return user;
}

function createRefreshToken(claims = {}, secret = REFRESH_SECRET, options = {}) {
  return jwt.sign(
    {
      sub: new mongoose.Types.ObjectId().toString(),
      type: "refresh",
      jti: "test-refresh-jti",
      ...claims,
    },
    secret,
    { expiresIn: "7d", ...options },
  );
}

function flushSideEffects() {
  return new Promise((resolve) => setImmediate(resolve));
}

function assertApiError(error, statusCode, message) {
  assert.equal(error.statusCode, statusCode);
  assert.equal(error.message, message);
  return true;
}

async function requestApp(t, path, { method = "GET", body } = {}) {
  const server = createServer(app);
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  return fetch(`http://127.0.0.1:${address.port}${path}`, {
    method,
    ...(body === undefined
      ? {}
      : {
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        }),
  });
}

function postToApp(t, body) {
  return requestApp(t, "/api/v1/auth/register", { method: "POST", body });
}

function postLoginToApp(t, body) {
  return requestApp(t, "/api/v1/auth/login", { method: "POST", body });
}

function postRefreshToApp(t, body) {
  return requestApp(t, "/api/v1/auth/refresh", { method: "POST", body });
}

test("DTO normalizes input, defaults timezone, and strips unknown fields", () => {
  const result = RegisterDto.validate({
    name: "  Alice  ",
    email: " ALICE@EXAMPLE.COM ",
    password: "AtomicTask123!",
    referralCode: " ab12cd ",
    unexpected: "discard me",
  });

  assert.equal(result.errors, null);
  assert.deepEqual(result.value, {
    name: "Alice",
    email: "alice@example.com",
    password: "AtomicTask123!",
    timezone: "UTC",
    referralCode: "AB12CD",
  });
});

test("DTO rejects missing fields, weak passwords, invalid email, and referral codes", () => {
  const missing = RegisterDto.validate({ name: "A", password: "short" });
  assert.ok(missing.errors?.some((error) => error.includes('"email" is required')));
  assert.ok(missing.errors?.some((error) => error.includes('"password" length')));

  for (const password of ["PasswordOnly", "12345678"]) {
    const result = RegisterDto.validate({
      name: "Alice",
      email: "alice@example.com",
      password,
    });
    assert.ok(
      result.errors?.includes(
        "Password must contain at least one letter and one number",
      ),
    );
  }

  const invalid = RegisterDto.validate({
    name: "Alice",
    email: "not-an-email",
    password: "AtomicTask123!",
    referralCode: "not-valid",
  });
  assert.ok(invalid.errors?.some((error) => error.includes('"email"')));
  assert.ok(invalid.errors?.some((error) => error.includes('"referralCode"')));
});

test("LoginDto normalizes email and enforces the current password minimum", () => {
  const valid = LoginDto.validate({
    email: " ADA@EXAMPLE.COM ",
    password: "ValidPass1!",
    extra: "stripped",
  });
  assert.equal(valid.errors, null);
  assert.deepEqual(valid.value, {
    email: "ada@example.com",
    password: "ValidPass1!",
  });

  const invalid = LoginDto.validate({
    email: "not-an-email",
    password: "short",
  });
  assert.ok(invalid.errors?.some((error) => error.includes('"email"')));
  assert.ok(invalid.errors?.some((error) => error.includes('"password"')));
});

test("RefreshDto trims and bounds refresh tokens", () => {
  const token = "a".repeat(32);
  const valid = RefreshDto.validate({ refreshToken: ` ${token} `, extra: true });
  assert.equal(valid.errors, null);
  assert.deepEqual(valid.value, { refreshToken: token });

  for (const refreshToken of ["short", "a".repeat(4097)]) {
    const invalid = RefreshDto.validate({ refreshToken });
    assert.ok(invalid.errors?.some((error) => error.includes("refreshToken")));
  }
});

test("registration normalizes identity, saves verification before user, and returns sanitized tokens", async () => {
  const referrerId = new mongoose.Types.ObjectId();
  state.referrer = { _id: referrerId };

  const result = await callRegister(
    { ...validBody, referralCode: " ab12cd " },
    { headers: { "user-agent": ["unexpected", "array"] }, ip: undefined },
  );
  await flushSideEffects();

  assert.equal(result.statusCode, 201);
  assert.equal(result.body.data.user.name, "Atomic User");
  assert.equal(result.body.data.user.email, "alice@example.com");
  assert.equal(result.body.data.user.timezone, "UTC");
  assert.equal("password" in result.body.data.user, false);
  assert.equal("emailVerificationToken" in result.body.data.user, false);
  assert.equal("refreshTokenSessions" in result.body.data.user, false);
  assert.deepEqual(result.body.data.tokens, {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    accessTokenExpiresIn: "15m",
    refreshTokenExpiresIn: "7d",
    tokenType: "Bearer",
  });
  assert.deepEqual(state.order, ["verification-token", "save", "refresh-session"]);
  assert.deepEqual(state.sessions[0], {
    token: "test-refresh-token",
    metadata: {},
  });
  assert.deepEqual(state.findQueries[0], { email: "alice@example.com" });
  assert.equal(state.existingProjection, "_id provider deletedAt");
  assert.deepEqual(state.findQueries[1], {
    referralCode: "AB12CD",
    status: "active",
    deletedAt: null,
  });
  assert.equal(state.referralProjection, "_id");
  assert.equal(String(result.body.data.user.referredBy), String(referrerId));
  assert.deepEqual(state.queuedJobs.map(({ job }) => job).sort(), [
    "verification",
    "welcome",
  ]);
  assert.equal(
    state.queuedJobs.find(({ job }) => job === "verification").payload.token,
    "plain-verification-token",
  );
  assert.deepEqual(state.updates, [
    { filter: { _id: referrerId }, update: { $inc: { totalXp: 100 } } },
  ]);
});

test("existing local account returns 409", async () => {
  state.existingUser = { provider: "local", deletedAt: null };

  await assert.rejects(
    callRegister(validBody),
    (error) =>
      assertApiError(error, 409, "An account with this email already exists."),
  );
  assert.deepEqual(state.order, []);
});

test("successful login normalizes email, resets counters, creates a session, and returns sanitized tokens", async () => {
  state.passwordMatches = true;
  state.loginUser = createLoginUser({
    loginAttempts: 4,
    lockUntil: new Date(Date.now() - 1),
    isEmailVerified: false,
  });

  const result = await callLogin(
    { email: " ADA@EXAMPLE.COM ", password: "CorrectPass1!" },
    { headers: { "user-agent": "test-browser" }, ip: "127.0.0.1" },
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.message, "Login successful.");
  assert.equal(result.body.data.user.email, "ada@example.com");
  assert.equal("password" in result.body.data.user, false);
  assert.equal("refreshTokenSessions" in result.body.data.user, false);
  assert.equal(result.body.data.tokens.accessToken, "test-access-token");
  assert.equal(result.body.data.tokens.refreshToken, "test-refresh-token");
  assert.equal(state.loginProjection, LOGIN_SELECT);
  assert.deepEqual(state.findQueries[0], { email: "ada@example.com" });
  assert.equal(state.loginUser.loginAttempts, 0);
  assert.equal(state.loginUser.lockUntil, undefined);
  assert.ok(state.loginUser.lastLogin instanceof Date);
  assert.equal(state.loginUser.lastLogin, state.loginUser.lastActiveAt);
  assert.deepEqual(state.sessions[0], {
    token: "test-refresh-token",
    metadata: {
      device: "test-browser",
      userAgent: "test-browser",
      ip: "127.0.0.1",
    },
  });
  assert.deepEqual(state.order, ["refresh-session"]);
});

test("unknown and wrong-password logins use the same 401 message", async () => {
  const body = { email: "ghost@example.com", password: "WrongPass1" };
  await assert.rejects(callLogin(body), (error) =>
    assertApiError(error, 401, "Invalid email or password."),
  );

  state.loginUser = createLoginUser();
  await assert.rejects(callLogin(body), (error) =>
    assertApiError(error, 401, "Invalid email or password."),
  );
  assert.equal(state.loginUser.loginAttempts, 1);
  assert.deepEqual(state.order, ["save"]);
});

test("deleted account uses generic credentials error", async () => {
  state.loginUser = createLoginUser({ deletedAt: new Date() });

  await assert.rejects(callLogin(validBody), (error) =>
    assertApiError(error, 401, "Invalid email or password."),
  );
  assert.deepEqual(state.passwordChecks, []);
});

test("suspended account returns 403 before checking its password", async () => {
  state.loginUser = createLoginUser({ status: "suspended" });

  await assert.rejects(callLogin(validBody), (error) =>
    assertApiError(
      error,
      403,
      "Your account has been suspended. Please contact support.",
    ),
  );
  assert.deepEqual(state.passwordChecks, []);
});

test("OAuth account returns its provider-specific login guidance", async () => {
  state.loginUser = createLoginUser({ provider: "google" });

  await assert.rejects(callLogin(validBody), (error) =>
    assertApiError(
      error,
      400,
      "This account uses google sign-in. Please continue with google.",
    ),
  );
  assert.deepEqual(state.passwordChecks, []);
});

test("locked accounts are rejected before password comparison", async () => {
  state.loginUser = createLoginUser({
    lockUntil: new Date(Date.now() + 60_000),
  });

  await assert.rejects(callLogin(validBody), (error) =>
    assertApiError(
      error,
      429,
      "Too many failed login attempts. Please try again later.",
    ),
  );
  assert.deepEqual(state.passwordChecks, []);
});

test("fifth wrong password locks the account and the next attempt returns 429", async () => {
  state.loginUser = createLoginUser({ loginAttempts: MAX_LOGIN_ATTEMPTS - 1 });

  await assert.rejects(callLogin(validBody), (error) =>
    assertApiError(error, 401, "Invalid email or password."),
  );
  assert.equal(state.loginUser.loginAttempts, MAX_LOGIN_ATTEMPTS);
  assert.equal(state.loginUser.isLocked(), true);

  await assert.rejects(callLogin(validBody), (error) =>
    assertApiError(
      error,
      429,
      "Too many failed login attempts. Please try again later.",
    ),
  );
  assert.equal(state.passwordChecks.length, 1);
});

test("refresh rotates a valid token and returns the new pair", async () => {
  const userId = new mongoose.Types.ObjectId();
  const oldRefreshToken = createRefreshToken({ sub: userId.toString() });
  state.refreshUser = createRefreshUser({ _id: userId });

  const result = await callRefresh(
    { refreshToken: oldRefreshToken },
    { headers: { "user-agent": "refresh-test-agent" }, ip: "127.0.0.1" },
  );
  await flushSideEffects();

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.message, "Token refreshed.");
  assert.deepEqual(result.body.data.tokens, {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    accessTokenExpiresIn: "15m",
    refreshTokenExpiresIn: "7d",
    tokenType: "Bearer",
  });
  assert.equal("user" in result.body.data, false);
  assert.deepEqual(state.refreshLookups, [userId.toString()]);
  assert.equal(state.refreshProjection, REFRESH_SELECT);
  assert.deepEqual(state.rotationCalls, [[
    oldRefreshToken,
    "test-refresh-token",
    {
      device: "refresh-test-agent",
      userAgent: "refresh-test-agent",
      ip: "127.0.0.1",
    },
  ]]);
  assert.equal(state.updates.length, 1);
  assert.deepEqual(state.updates[0].filter, { _id: userId });
  assert.ok(state.updates[0].update.lastActiveAt instanceof Date);
});

test("malformed, expired, wrong-signature, and access JWTs all return the same 401", async () => {
  const expired = createRefreshToken({}, REFRESH_SECRET, { expiresIn: -1 });
  const badSignature = createRefreshToken({}, "wrong-refresh-secret");
  const accessToken = createRefreshToken({ type: "access" });
  const tokens = ["not-a-valid-refresh-token", expired, badSignature, accessToken];

  for (const refreshToken of tokens) {
    await assert.rejects(callRefresh({ refreshToken }), (error) =>
      assertApiError(error, 401, "Invalid or expired refresh token."),
    );
  }
  assert.deepEqual(state.refreshLookups, []);
});

test("missing refresh user returns a generic 401", async () => {
  await assert.rejects(
    callRefresh({ refreshToken: createRefreshToken() }),
    (error) =>
      assertApiError(error, 401, "Invalid or expired refresh token."),
  );
  assert.deepEqual(state.rotationCalls, []);
});

test("deleted refresh user returns a generic 401", async () => {
  state.refreshUser = createRefreshUser({ deletedAt: new Date() });

  await assert.rejects(
    callRefresh({ refreshToken: createRefreshToken() }),
    (error) =>
      assertApiError(error, 401, "Invalid or expired refresh token."),
  );
  assert.deepEqual(state.rotationCalls, []);
});

test("suspended refresh user returns 403", async () => {
  state.refreshUser = createRefreshUser({ status: "suspended" });

  await assert.rejects(
    callRefresh({ refreshToken: createRefreshToken() }),
    (error) =>
      assertApiError(
        error,
        403,
        "Your account has been suspended. Please contact support.",
      ),
  );
  assert.deepEqual(state.rotationCalls, []);
});

test("reused refresh token logs detection, rejects, and issues no tokens", async () => {
  const userId = new mongoose.Types.ObjectId();
  const oldRefreshToken = createRefreshToken({ sub: userId.toString() });
  state.refreshUser = createRefreshUser({ _id: userId });
  state.rotationResult = { rotated: false };

  await assert.rejects(
    callRefresh({ refreshToken: oldRefreshToken }),
    (error) =>
      assertApiError(
        error,
        401,
        "Refresh token is no longer valid. Please log in again.",
      ),
  );

  assert.equal(state.rotationCalls.length, 1);
  assert.equal(state.updates.length, 0);
  assert.equal(state.errors.length, 1);
  const reuseLog = String(state.errors[0][0]).replace(/\u001b\[\d+m/g, "");
  assert.match(reuseLog, /refresh-token reuse detected/i);
  assert.ok(reuseLog.includes(userId.toString()));
});

test("OAuth account returns provider-specific 409", async () => {
  state.existingUser = { provider: "google", deletedAt: null };

  await assert.rejects(
    callRegister(validBody),
    (error) =>
      assertApiError(
        error,
        409,
        "This email is already registered with google. Please sign in with google.",
      ),
  );
});

test("soft-deleted account returns the restore-support 409", async () => {
  state.existingUser = { provider: "local", deletedAt: new Date() };

  await assert.rejects(
    callRegister(validBody),
    (error) =>
      assertApiError(
        error,
        409,
        "An account with this email was previously deleted. Contact support to restore it.",
      ),
  );
});

test("unknown, suspended, or deleted referral returns the same 400", async () => {
  state.referrer = null;

  await assert.rejects(
    callRegister({ ...validBody, referralCode: "ABC123" }),
    (error) => assertApiError(error, 400, "Invalid referral code."),
  );
  assert.deepEqual(state.order, []);
  assert.equal(state.updates.length, 0);
});

test("concurrent duplicate E11000 becomes 409; other save errors propagate", async (t) => {
  await t.test("duplicate key", async () => {
    state.saveError = Object.assign(new Error("duplicate"), { code: 11000 });
    await assert.rejects(
      callRegister(validBody),
      (error) =>
        assertApiError(error, 409, "An account with this email already exists."),
    );
    assert.deepEqual(state.order, ["verification-token", "save"]);
  });

  await t.test("unexpected save error", async () => {
    const saveError = new Error("database unavailable");
    state.saveError = saveError;
    await assert.rejects(callRegister(validBody), (error) => error === saveError);
  });
});

test("synchronous side-effect throws are logged without changing 201", async () => {
  emailQueue.add = () => {
    throw new Error("queue unavailable");
  };
  User.updateOne = () => {
    throw new Error("database unavailable");
  };
  state.referrer = { _id: new mongoose.Types.ObjectId() };

  const result = await callRegister({ ...validBody, referralCode: "ABC123" });
  await flushSideEffects();

  assert.equal(result.statusCode, 201);
  assert.equal(state.errors.length, 3);
  assert.ok(state.errors.every(([message]) => String(message).includes("[auth.register]")));
});

test("rejected side-effect promises are logged without changing 201", async () => {
  emailQueue.add = async () => {
    throw new Error("queue rejected");
  };
  User.updateOne = () => Promise.reject(new Error("update rejected"));
  state.referrer = { _id: new mongoose.Types.ObjectId() };

  const result = await callRegister({ ...validBody, referralCode: "ABC123" });
  await flushSideEffects();

  assert.equal(result.statusCode, 201);
  assert.equal(state.errors.length, 3);
  assert.ok(state.errors.every(([message]) => String(message).includes("[auth.register]")));
});

test("registration route returns Joi 400 before querying the user model", async (t) => {
  const response = await postToApp(t, {
    name: "Alice",
    password: "short",
  });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /email.*required/i);
  assert.match(body.message, /at least 8/i);
  assert.match(body.message, /at least one letter and one number/i);
  assert.equal(state.findQueries.length, 0);
});

test("login route validates before looking up the user", async (t) => {
  const response = await postLoginToApp(t, { email: "not-an-email" });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /email/i);
  assert.match(body.message, /password/i);
  assert.equal(state.findQueries.length, 0);
});

test("login route reaches the handler and returns tokens", async (t) => {
  state.passwordMatches = true;
  state.loginUser = createLoginUser();

  const response = await postLoginToApp(t, {
    email: "ada@example.com",
    password: "CorrectPass1!",
  });
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.message, "Login successful.");
  assert.equal(body.data.tokens.accessToken, "test-access-token");
  assert.equal(body.data.tokens.refreshToken, "test-refresh-token");
  assert.equal(state.passwordChecks.length, 1);
});

test("refresh route validates before looking up a user", async (t) => {
  const response = await postRefreshToApp(t, { refreshToken: "too-short" });
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.message, /refreshToken/i);
  assert.equal(state.refreshLookups.length, 0);
});

test("refresh route reaches the handler and returns rotated tokens", async (t) => {
  state.refreshUser = createRefreshUser();

  const response = await postRefreshToApp(t, {
    refreshToken: createRefreshToken(),
  });
  const body = await response.json();
  await flushSideEffects();

  assert.equal(response.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.message, "Token refreshed.");
  assert.equal(body.data.tokens.refreshToken, "test-refresh-token");
  assert.equal(state.rotationCalls.length, 1);
});

test("health route always returns success and formatted process uptime", async (t) => {
  const response = await requestApp(t, "/health");
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.message, "server is running");
  assert.match(
    body.data.uptime,
    /^(?:under 1s|[1-9]\d*(?:mo|y|d|h|m|s)(?:, [1-9]\d*(?:mo|y|d|h|m|s))*)$/,
  );
});

test("registration route reaches the handler and returns 201", async (t) => {
  const response = await postToApp(t, {
    name: "Alice",
    email: "alice@example.com",
    password: "AtomicTask123!",
  });
  const body = await response.json();
  await flushSideEffects();

  assert.equal(response.status, 201);
  assert.equal(body.data.user.email, "alice@example.com");
  assert.equal(state.order[0], "verification-token");
});

test("email queue stub never logs its sensitive payload", async () => {
  const { emailQueue: queue } = await import(
    "../dist/app/shared/queues/email.queue.js"
  );
  const originalLog = console.log;
  const output = [];
  console.log = (...args) => output.push(args.join(" "));

  try {
    await originalMethods.emailQueueAdd.call(queue, "verification", {
      token: "must-not-appear-in-logs",
    });
  } finally {
    console.log = originalLog;
  }

  assert.equal(output.length, 1);
  assert.match(output[0], /verification/);
  assert.doesNotMatch(output[0], /must-not-appear-in-logs/);
});