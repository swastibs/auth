import assert from "node:assert/strict";
import { createServer } from "node:http";
import { afterEach, beforeEach, test } from "node:test";

import mongoose from "mongoose";

process.env.NODE_ENV = "development";
process.env.MONGO_URI_DEV = "mongodb://127.0.0.1:27017/atomictasks_test";
process.env.JWT_ACCESS_SECRET = "test-access-secret-not-for-production";
process.env.JWT_REFRESH_SECRET = "test-refresh-secret-not-for-production";
process.env.JWT_ACCESS_EXPIRE = "15m";
process.env.JWT_REFRESH_EXPIRE = "7d";
process.env.BCRYPT_SALT_ROUNDS = "4";

const [{ register }, { default: User }, { emailQueue }, { default: app },
  { RegisterDto }] = await Promise.all([
  import("../dist/app/modules/auth/auth.controller.js"),
  import("../dist/app/modules/auth/auth.model.js"),
  import("../dist/app/shared/queues/email.queue.js"),
  import("../dist/app/app.js"),
  import("../dist/app/modules/auth/auth.dto.js"),
]);

const originalMethods = {
  findOne: User.findOne,
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

function flushSideEffects() {
  return new Promise((resolve) => setImmediate(resolve));
}

function assertApiError(error, statusCode, message) {
  assert.equal(error.statusCode, statusCode);
  assert.equal(error.message, message);
  return true;
}

async function postToApp(t, body) {
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
  return fetch(`http://127.0.0.1:${address.port}/api/v1/auth/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
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