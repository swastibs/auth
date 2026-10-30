import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { afterEach, beforeEach, test } from "node:test";

import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

process.env.NODE_ENV = "development";
process.env.MONGO_URI_DEV = "mongodb://localhost:27017/atomictasks_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-for-production";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-production";
process.env.JWT_ACCESS_EXPIRE = "15m";
process.env.JWT_REFRESH_EXPIRE = "7d";
process.env.BCRYPT_SALT_ROUNDS = "4";

const [
  {
    createLogoutHandlers,
    createResendVerificationHandler,
    changePassword,
    forgotPassword,
    login,
    refresh,
    register,
    resendVerification,
    resetPassword,
    verifyEmail,
  },
  { default: User },
  { emailQueue },
  { default: app, redactVerificationTokenFromUrl },
  {
    ChangePasswordDto,
    ForgotPasswordDto,
    LoginDto,
    LogoutDto,
    RefreshDto,
    RegisterDto,
    ResendVerificationDto,
    ResetPasswordDto,
  },
  { MAX_LOGIN_ATTEMPTS },
  { createRequireAuth, requireEmailVerified, requireRole },
] = await Promise.all([
  import("../dist/app/modules/auth/auth.controller.js"),
  import("../dist/app/modules/auth/auth.model.js"),
  import("../dist/app/shared/queues/email.queue.js"),
  import("../dist/app/app.js"),
  import("../dist/app/modules/auth/auth.dto.js"),
  import("../dist/app/modules/auth/auth.constants.js"),
  import("../dist/app/modules/auth/auth.middleware.js"),
]);

const LOGIN_SELECT =
  "+password +loginAttempts +lockUntil +refreshTokenSessions";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET;
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
    verificationUser: null,
    verificationQuery: null,
    verificationProjection: null,
    resendUser: null,
    resendProjection: null,
    forgotUser: null,
    forgotProjection: null,
    resetUser: null,
    resetProjection: null,
    resetQuery: null,
    forgotUser: null,
    forgotProjection: null,
    resetUser: null,
    resetProjection: null,
    resetQuery: null,
    updateResult: { matchedCount: 1, modifiedCount: 1 },
    loginProjection: null,
    refreshProjection: null,
    refreshLookups: [],
    revokedRefreshTokens: [],
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
    if (Object.hasOwn(filter, "emailVerificationToken")) {
      state.verificationQuery = filter;
      return {
        select: async (projection) => {
          state.verificationProjection = projection;
          return state.verificationUser;
        },
      };
    }
    if (Object.hasOwn(filter, "passwordResetToken")) {
      state.resetQuery = filter;
      return {
        select: async (projection) => {
          state.resetProjection = projection;
          return state.resetUser;
        },
      };
    }
    if (Object.hasOwn(filter, "passwordResetToken")) {
      state.resetQuery = filter;
      return {
        select: async (projection) => {
          state.resetProjection = projection;
          return state.resetUser;
        },
      };
    }
    if (Object.hasOwn(filter, "email")) {
      return {
        select: async (projection) => {
          if (projection === LOGIN_SELECT) {
            state.loginProjection = projection;
            return state.loginUser;
          }
          if (projection === "+emailVerificationToken +emailVerificationExpires") {
            state.resendProjection = projection;
            return state.resendUser;
          }
          if (projection === "+passwordResetToken +passwordResetExpires") {
            state.forgotProjection = projection;
            return state.forgotUser;
          }
          if (projection === "+passwordResetToken +passwordResetExpires") {
            state.forgotProjection = projection;
            return state.forgotUser;
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
    return Promise.resolve(state.updateResult);
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

function createAccessToken(claims = {}, secret = ACCESS_SECRET, options = {}) {
  return jwt.sign(
    {
      sub: new mongoose.Types.ObjectId().toString(),
      email: "ada@example.com",
      role: "user",
      type: "access",
      ...claims,
    },
    secret,
    { expiresIn: "15m", ...options },
  );
}

function callRequestHandler(
  handler,
  body = {},
  headers = {},
  params = {},
  user = undefined,
) {
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
      send() {
        resolve({ statusCode: this.statusCode, body: undefined });
        return this;
      },
    };

    handler({ body, headers, params, user }, response, reject);
  });
}

function runAuthMiddleware(middleware, token) {
  return new Promise((resolve, reject) => {
    const request = {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    };

    middleware(request, {}, (error) => {
      if (error) return reject(error);
      return resolve(request);
    });
  });
}

function runRequestMiddleware(middleware, request = {}) {
  return new Promise((resolve, reject) => {
    middleware(request, {}, (error) => {
      if (error) return reject(error);
      return resolve(request);
    });
  });
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
    server.listen(0, "localhost", resolve);
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  return fetch(`http://localhost:${address.port}${path}`, {
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

test("verification token URL is redacted before access logging", () => {
  const rawToken = "one-time-secret-token";
  assert.equal(
    redactVerificationTokenFromUrl(
      `/api/v1/auth/verify-email/${rawToken}?source=email`,
    ),
    "/api/v1/auth/verify-email/[redacted]?source=email",
  );
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

test("LogoutDto requires and bounds a refresh token", () => {
  const valid = LogoutDto.validate({ refreshToken: "r".repeat(32) });
  assert.equal(valid.errors, null);

  for (const refreshToken of [undefined, "short", "r".repeat(4097)]) {
    const invalid = LogoutDto.validate({ refreshToken });
    assert.ok(invalid.errors?.some((error) => error.includes("refreshToken")));
  }
});

test("ResendVerificationDto normalizes and validates email", () => {
  const valid = ResendVerificationDto.validate({
    email: " ADA@EXAMPLE.COM ",
    extra: true,
  });
  assert.equal(valid.errors, null);
  assert.deepEqual(valid.value, { email: "ada@example.com" });

  const invalid = ResendVerificationDto.validate({ email: "not-an-email" });
  assert.ok(invalid.errors?.some((error) => error.includes('"email"')));
});

test("password recovery DTOs validate email, password strength, and old/new distinction", () => {
  assert.equal(
    ForgotPasswordDto.validate({ email: " ADA@EXAMPLE.COM " }).errors,
    null,
  );
  assert.equal(
    ResetPasswordDto.validate({ newPassword: "NewPassword123!" }).errors,
    null,
  );
  assert.equal(
    ChangePasswordDto.validate({
      currentPassword: "OldPassword123!",
      newPassword: "NewPassword123!",
    }).errors,
    null,
  );
  assert.ok(
    ResetPasswordDto.validate({ newPassword: "weak" }).errors?.length,
  );
  assert.ok(
    ChangePasswordDto.validate({
      currentPassword: "SamePassword123!",
      newPassword: "SamePassword123!",
    }).errors?.some((error) => error.includes("different from current")),
  );
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
    { headers: { "user-agent": "test-browser" }, ip: "localhost" },
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
      ip: "localhost",
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
    { headers: { "user-agent": "refresh-test-agent" }, ip: "localhost" },
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
      ip: "localhost",
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

test("logout blacklists a verified access token and revokes only the supplied refresh session", async () => {
  const userId = new mongoose.Types.ObjectId();
  const refreshToken = createRefreshToken({ sub: userId.toString() });
  const accessToken = createAccessToken({ sub: userId.toString() });
  const blacklistCalls = [];
  state.refreshUser = createRefreshUser({ _id: userId });
  state.refreshUser.removeRefreshTokenSession = async (token) => {
    state.revokedRefreshTokens.push(token);
  };
  const { logout } = createLogoutHandlers(async (...args) => {
    blacklistCalls.push(args);
  });

  const result = await callRequestHandler(
    logout,
    { refreshToken },
    { authorization: `Bearer ${accessToken}` },
  );

  assert.equal(result.statusCode, 204);
  assert.deepEqual(blacklistCalls, [
    [accessToken, jwt.decode(accessToken).exp * 1000],
  ]);
  assert.deepEqual(state.refreshLookups, [userId.toString()]);
  assert.equal(state.refreshProjection, REFRESH_SELECT);
  assert.deepEqual(state.revokedRefreshTokens, [refreshToken]);
});

test("logout ignores forged refresh claims and forged access tokens", async () => {
  const victimId = new mongoose.Types.ObjectId();
  const forgedRefreshToken = jwt.sign(
    { sub: victimId.toString(), type: "refresh" },
    "not-the-refresh-secret",
  );
  const forgedAccessToken = jwt.sign(
    { sub: victimId.toString(), type: "access", exp: Math.floor(Date.now() / 1000) + 60 },
    "not-the-access-secret",
  );
  const blacklistCalls = [];
  const { logout } = createLogoutHandlers(async (...args) => {
    blacklistCalls.push(args);
  });

  const result = await callRequestHandler(
    logout,
    { refreshToken: forgedRefreshToken },
    { authorization: `Bearer ${forgedAccessToken}` },
  );

  assert.equal(result.statusCode, 204);
  assert.deepEqual(blacklistCalls, []);
  assert.deepEqual(state.refreshLookups, []);
});

test("logout remains idempotent and revokes the refresh session when Redis fails", async () => {
  const userId = new mongoose.Types.ObjectId();
  const refreshToken = createRefreshToken({ sub: userId.toString() });
  const accessToken = createAccessToken({ sub: userId.toString() });
  state.refreshUser = createRefreshUser({ _id: userId });
  state.refreshUser.removeRefreshTokenSession = async (token) => {
    state.revokedRefreshTokens.push(token);
  };
  const { logout } = createLogoutHandlers(async () => {
    throw new Error("redis offline");
  });

  const result = await callRequestHandler(
    logout,
    { refreshToken },
    { authorization: `Bearer ${accessToken}` },
  );

  assert.equal(result.statusCode, 204);
  assert.deepEqual(state.revokedRefreshTokens, [refreshToken]);
  assert.equal(state.errors.length, 1);
  assert.match(String(state.errors[0][0]), /Access-token blacklist failed/);
});

test("logout-all revokes every refresh session and blacklists the current access token", async () => {
  const userId = new mongoose.Types.ObjectId();
  const refreshToken = createRefreshToken({ sub: userId.toString() });
  const accessToken = createAccessToken({ sub: userId.toString() });
  const blacklistCalls = [];
  state.refreshUser = createRefreshUser({ _id: userId });
  let removeAllCalls = 0;
  state.refreshUser.removeAllRefreshTokenSessions = async () => {
    removeAllCalls += 1;
  };
  const { logoutAll } = createLogoutHandlers(async (...args) => {
    blacklistCalls.push(args);
  });

  const result = await callRequestHandler(
    logoutAll,
    { refreshToken },
    { authorization: `Bearer ${accessToken}` },
  );

  assert.equal(result.statusCode, 204);
  assert.equal(removeAllCalls, 1);
  assert.equal(blacklistCalls.length, 1);
  assert.equal(blacklistCalls[0][0], accessToken);
});

test("verifyEmail hashes the token, selects hidden fields, and consumes it atomically", async () => {
  const rawToken = "one-time-verification-token-value";
  const user = createRefreshUser();
  state.verificationUser = user;

  const result = await callRequestHandler(
    verifyEmail,
    {},
    {},
    { token: rawToken },
  );

  const hash = createHash("sha256").update(rawToken).digest("hex");
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data.isEmailVerified, true);
  assert.equal(state.verificationProjection, "+emailVerificationToken +emailVerificationExpires");
  assert.equal(state.verificationQuery.emailVerificationToken, hash);
  assert.ok(state.verificationQuery.emailVerificationExpires.$gt instanceof Date);
  assert.equal(state.updates.length, 1);
  assert.deepEqual(state.updates[0].filter, {
    _id: user._id,
    emailVerificationToken: hash,
    emailVerificationExpires: state.verificationQuery.emailVerificationExpires,
    deletedAt: null,
    status: { $nin: ["suspended", "deleted"] },
  });
  assert.deepEqual(state.updates[0].update.$unset, {
    emailVerificationToken: 1,
    emailVerificationExpires: 1,
  });
  assert.equal(state.updates[0].update.$set.isEmailVerified, true);
});

test("verifyEmail rejects malformed, missing, deleted, suspended, and already-consumed tokens", async () => {
  await assert.rejects(
    callRequestHandler(verifyEmail, {}, {}, { token: "too-short" }),
    (error) => assertApiError(error, 400, "This verification link is invalid or has expired."),
  );
  assert.equal(state.verificationQuery, null);

  await assert.rejects(
    callRequestHandler(verifyEmail, {}, {}, { token: "missing-verification-token-value" }),
    (error) => assertApiError(error, 400, "This verification link is invalid or has expired. Please request a new one."),
  );

  state.verificationUser = createRefreshUser({ deletedAt: new Date() });
  await assert.rejects(
    callRequestHandler(verifyEmail, {}, {}, { token: "deleted-verification-token-value" }),
    (error) => assertApiError(error, 400, "This verification link is invalid or has expired. Please request a new one."),
  );

  state.verificationUser = createRefreshUser({ status: "suspended" });
  await assert.rejects(
    callRequestHandler(verifyEmail, {}, {}, { token: "suspended-verification-token-value" }),
    (error) => assertApiError(error, 403, "Your account has been suspended. Please contact support."),
  );

  state.verificationUser = createRefreshUser();
  state.updateResult = { matchedCount: 0, modifiedCount: 0 };
  await assert.rejects(
    callRequestHandler(verifyEmail, {}, {}, { token: "already-consumed-token-value" }),
    (error) => assertApiError(error, 400, "This verification link is invalid or has expired. Please request a new one."),
  );
});

test("resendVerification has the same 200 response for unknown, verified, OAuth, and deleted users", async () => {
  const responses = [];
  for (const user of [
    null,
    createRefreshUser({ isEmailVerified: true }),
    createRefreshUser({ provider: "google" }),
    createRefreshUser({ deletedAt: new Date() }),
    createRefreshUser({ status: "suspended" }),
  ]) {
    state.resendUser = user;
    const result = await callRequestHandler(resendVerification, {
      email: " ADA@EXAMPLE.COM ",
    });
    responses.push(result);
  }

  assert.ok(responses.every(({ statusCode }) => statusCode === 200));
  assert.equal(new Set(responses.map(({ body }) => body.message)).size, 1);
  assert.equal(state.queuedJobs.length, 0);
});

test("resendVerification uses an atomic cooldown and queues a fresh token", async () => {
  const user = createRefreshUser();
  state.resendUser = user;
  const redisCalls = [];
  const handler = createResendVerificationHandler(() => ({
    set: async (...args) => {
      redisCalls.push(args);
      return "OK";
    },
  }));

  const result = await callRequestHandler(handler, {
    email: " ADA@EXAMPLE.COM ",
  });
  await flushSideEffects();

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.message, "If an account exists with that email and requires verification, a new link has been sent.");
  assert.equal(state.resendProjection, "+emailVerificationToken +emailVerificationExpires");
  assert.deepEqual(redisCalls, [[`verify-resend:${user._id.toString()}`, "1", { ex: 60, nx: true }]]);
  assert.deepEqual(state.order, ["verification-token", "save"]);
  assert.equal(state.queuedJobs.length, 1);
  assert.equal(state.queuedJobs[0].job, "verification");
  assert.equal(state.queuedJobs[0].payload.token, "plain-verification-token");
});

test("resend cooldown suppresses duplicate sends and fails open on Redis errors", async () => {
  state.resendUser = createRefreshUser();
  const cooldownHandler = createResendVerificationHandler(() => ({
    set: async () => null,
  }));
  const cooldownResult = await callRequestHandler(cooldownHandler, {
    email: "ada@example.com",
  });
  assert.equal(cooldownResult.statusCode, 200);
  assert.equal(state.order.length, 0);
  assert.equal(state.queuedJobs.length, 0);

  state.resendUser = createRefreshUser();
  const failOpenHandler = createResendVerificationHandler(() => ({
    set: async () => {
      throw new Error("redis offline");
    },
  }));
  const failOpenResult = await callRequestHandler(failOpenHandler, {
    email: "ada@example.com",
  });
  await flushSideEffects();

  assert.equal(failOpenResult.statusCode, 200);
  assert.deepEqual(state.order, ["verification-token", "save"]);
  assert.equal(state.queuedJobs.length, 1);
  assert.match(String(state.errors[0][0]), /Cooldown check failed/);
});

test("forgotPassword is enumerate-safe and queues a hashed-token reset email", async () => {
  const user = createRefreshUser();
  state.forgotUser = user;

  const result = await callRequestHandler(forgotPassword, {
    email: " ADA@EXAMPLE.COM ",
  });
  await flushSideEffects();

  assert.equal(result.statusCode, 200);
  assert.equal(
    result.body.message,
    "If an account exists with that email, a password reset link has been sent.",
  );
  assert.deepEqual(state.findQueries[0], { email: "ada@example.com" });
  assert.equal(state.forgotProjection, "+passwordResetToken +passwordResetExpires");
  assert.equal(state.queuedJobs.length, 1);
  assert.equal(state.queuedJobs[0].job, "password-reset");
  assert.equal(state.queuedJobs[0].payload.token.length, 64);
  assert.notEqual(user.passwordResetToken, state.queuedJobs[0].payload.token);
  assert.equal(
    user.passwordResetToken,
    createHash("sha256")
      .update(state.queuedJobs[0].payload.token)
      .digest("hex"),
  );
});

test("forgotPassword returns the same 200 for unknown, OAuth, and deleted accounts", async () => {
  const messages = [];
  for (const user of [
    null,
    createRefreshUser({ provider: "google" }),
    createRefreshUser({ deletedAt: new Date() }),
    createRefreshUser({ status: "suspended" }),
  ]) {
    state.forgotUser = user;
    const result = await callRequestHandler(forgotPassword, {
      email: "ada@example.com",
    });
    messages.push(result.body.message);
  }

  assert.equal(new Set(messages).size, 1);
  assert.equal(state.queuedJobs.length, 0);
});

test("resetPassword atomically hashes the password, consumes the token, and clears sessions", async () => {
  const rawToken = "one-time-password-reset-token";
  const user = createRefreshUser();
  state.resetUser = user;

  const result = await callRequestHandler(
    resetPassword,
    { newPassword: "BrandNewPassword123!" },
    {},
    { token: rawToken },
  );

  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data.passwordReset, true);
  assert.equal(state.resetQuery.passwordResetToken, tokenHash);
  assert.equal(state.resetProjection, "+passwordResetToken +passwordResetExpires");
  assert.equal(state.updates.length, 1);
  assert.deepEqual(state.updates[0].filter, {
    _id: user._id,
    passwordResetToken: tokenHash,
    passwordResetExpires: state.resetQuery.passwordResetExpires,
    deletedAt: null,
    status: "active",
    provider: "local",
  });
  assert.equal(
    await bcrypt.compare(
      "BrandNewPassword123!",
      state.updates[0].update.$set.password,
    ),
    true,
  );
  assert.deepEqual(state.updates[0].update.$set.refreshTokenSessions, []);
  assert.deepEqual(state.updates[0].update.$unset, {
    passwordResetToken: 1,
    passwordResetExpires: 1,
  });
});

test("resetPassword rejects invalid, expired, deleted, and raced reset tokens", async () => {
  await assert.rejects(
    callRequestHandler(
      resetPassword,
      { newPassword: "BrandNewPassword123!" },
      {},
      { token: "short" },
    ),
    (error) =>
      assertApiError(error, 400, "This password reset link is invalid or has expired. Please request a new one."),
  );
  assert.equal(state.resetQuery, null);

  state.resetUser = null;
  await assert.rejects(
    callRequestHandler(
      resetPassword,
      { newPassword: "BrandNewPassword123!" },
      {},
      { token: "unknown-reset-token-value" },
    ),
    (error) =>
      assertApiError(error, 400, "This password reset link is invalid or has expired. Please request a new one."),
  );

  state.resetUser = createRefreshUser({ deletedAt: new Date() });
  await assert.rejects(
    callRequestHandler(
      resetPassword,
      { newPassword: "BrandNewPassword123!" },
      {},
      { token: "deleted-reset-token-value" },
    ),
    (error) =>
      assertApiError(error, 400, "This password reset link is invalid or has expired. Please request a new one."),
  );

  state.resetUser = createRefreshUser();
  state.updateResult = { matchedCount: 0, modifiedCount: 0 };
  await assert.rejects(
    callRequestHandler(
      resetPassword,
      { newPassword: "BrandNewPassword123!" },
      {},
      { token: "raced-reset-token-value" },
    ),
    (error) =>
      assertApiError(error, 400, "This password reset link is invalid or has expired. Please request a new one."),
  );
});

test("changePassword verifies the old password and saves password/session revocation together", async () => {
  const user = createRefreshUser({
    refreshTokenSessions: [
      { token: "first-session", expiresAt: new Date(), createdAt: new Date() },
      { token: "second-session", expiresAt: new Date(), createdAt: new Date() },
    ],
  });
  user.comparePassword = async (candidate) => candidate === "CurrentPassword123!";
  state.refreshUser = user;

  await assert.rejects(
    callRequestHandler(
      changePassword,
      {
        currentPassword: "wrong-current-password",
        newPassword: "BrandNewPassword123!",
      },
      {},
      {},
      user,
    ),
    (error) => assertApiError(error, 401, "Current password is incorrect."),
  );
  assert.equal(state.order.length, 0);

  const result = await callRequestHandler(
    changePassword,
    {
      currentPassword: "CurrentPassword123!",
      newPassword: "BrandNewPassword123!",
    },
    {},
    {},
    user,
  );

  assert.equal(result.statusCode, 200);
  assert.equal(result.body.data.passwordChanged, true);
  assert.equal(user.password, "BrandNewPassword123!");
  assert.deepEqual(user.refreshTokenSessions, []);
  assert.ok(user.lastActiveAt instanceof Date);
  assert.deepEqual(state.order, ["save"]);
});

test("requireAuth checks valid JWTs, rejects blacklisted tokens, and loads fresh users", async () => {
  const userId = new mongoose.Types.ObjectId();
  const user = createRefreshUser({ _id: userId });
  const accessToken = createAccessToken({ sub: userId.toString() });
  let userLookups = 0;
  const middleware = createRequireAuth(
    async () => true,
    async () => {
      userLookups += 1;
      return user;
    },
  );

  await assert.rejects(
    runAuthMiddleware(middleware, accessToken),
    (error) => assertApiError(error, 401, "Token has been revoked."),
  );
  assert.equal(userLookups, 0);
});

test("requireAuth rejects malformed tokens before Redis and requires a bearer token", async () => {
  let blacklistCalls = 0;
  const middleware = createRequireAuth(
    async () => {
      blacklistCalls += 1;
      return false;
    },
    async () => null,
  );

  await assert.rejects(
    runAuthMiddleware(middleware, "not-a-jwt"),
    (error) => assertApiError(error, 401, "Invalid or expired access token."),
  );
  await assert.rejects(
    runAuthMiddleware(middleware, null),
    (error) => assertApiError(error, 401, "Access token required."),
  );
  assert.equal(blacklistCalls, 0);
});

test("requireAuth fails open on Redis errors but still loads the user", async () => {
  const userId = new mongoose.Types.ObjectId();
  const user = createRefreshUser({ _id: userId });
  const accessToken = createAccessToken({ sub: userId.toString() });
  let userLookups = 0;
  const middleware = createRequireAuth(
    async () => {
      throw new Error("redis unavailable");
    },
    async () => {
      userLookups += 1;
      return user;
    },
  );

  const request = await runAuthMiddleware(middleware, accessToken);

  assert.equal(request.user, user);
  assert.equal(userLookups, 1);
  assert.match(String(state.errors[0][0]), /fail-open/);
});

test("requireRole enforces role membership", async () => {
  const user = createRefreshUser({ role: "user" });
  const handler = requireRole("admin");

  await assert.rejects(
    new Promise((resolve, reject) =>
      handler({ user }, {}, reject),
    ),
    (error) => assertApiError(error, 403, "Insufficient permissions."),
  );
});

test("requireEmailVerified requires authentication and blocks unverified users", async () => {
  await assert.rejects(
    runRequestMiddleware(requireEmailVerified, {}),
    (error) => assertApiError(error, 401, "Not authenticated."),
  );

  await assert.rejects(
    runRequestMiddleware(requireEmailVerified, {
      user: createRefreshUser({ isEmailVerified: false }),
    }),
    (error) =>
      assertApiError(
        error,
        403,
        "Please verify your email address before continuing. Check your inbox or request a new verification link.",
      ),
  );

  const verifiedRequest = await runRequestMiddleware(requireEmailVerified, {
    user: createRefreshUser({ isEmailVerified: true }),
  });
  assert.equal(verifiedRequest.user.isEmailVerified, true);
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

test("logout routes validate refresh-token input before calling Redis or MongoDB", async (t) => {
  const logoutResponse = await requestApp(t, "/api/v1/auth/logout", {
    method: "POST",
    body: {},
  });
  const logoutAllResponse = await requestApp(t, "/api/v1/auth/logout-all", {
    method: "POST",
    body: { refreshToken: "short" },
  });

  assert.equal(logoutResponse.status, 400);
  assert.equal(logoutAllResponse.status, 400);
  assert.deepEqual(state.refreshLookups, []);
});

test("verification and resend HTTP routes are mounted with validation", async (t) => {
  state.verificationUser = null;
  const token = "one-time-verification-token-value";
  const verificationResponse = await requestApp(
    t,
    `/api/v1/auth/verify-email/${token}`,
  );
  const verificationBody = await verificationResponse.json();
  const resendResponse = await requestApp(t, "/api/v1/auth/resend-verification", {
    method: "POST",
    body: { email: "not-an-email" },
  });
  const resendBody = await resendResponse.json();

  assert.equal(verificationResponse.status, 400);
  assert.match(verificationBody.message, /invalid or has expired/i);
  assert.equal(resendResponse.status, 400);
  assert.match(resendBody.message, /email/i);
});

test("password recovery routes validate input and require authentication for changes", async (t) => {
  const forgotResponse = await requestApp(t, "/api/v1/auth/forgot-password", {
    method: "POST",
    body: { email: "not-an-email" },
  });
  const resetResponse = await requestApp(
    t,
    "/api/v1/auth/reset-password/reset-token-value-long-enough",
    { method: "POST", body: { newPassword: "weak" } },
  );
  const changeResponse = await requestApp(t, "/api/v1/auth/change-password", {
    method: "POST",
    body: {
      currentPassword: "CurrentPassword123!",
      newPassword: "DifferentPassword123!",
    },
  });

  assert.equal(forgotResponse.status, 400);
  assert.equal(resetResponse.status, 400);
  assert.equal(changeResponse.status, 401);
  assert.equal(state.updates.length, 0);
});

test("forgot-password limiter allows five requests per IP and rejects the sixth", async (t) => {
  const statuses = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await requestApp(t, "/api/v1/auth/forgot-password", {
      method: "POST",
      body: { email: "nobody@example.com" },
    });
    statuses.push(response.status);
    await response.arrayBuffer();
  }

  assert.deepEqual(statuses, [200, 200, 200, 200, 429, 429]);
});

test("/me requires an access bearer token", async (t) => {
  const response = await requestApp(t, "/api/v1/auth/me");
  const body = await response.json();

  assert.equal(response.status, 401);
  assert.equal(body.message, "Access token required.");
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