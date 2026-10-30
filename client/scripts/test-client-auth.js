import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { jwtDecode } from "jwt-decode";

process.env.VITE_API_BASE_URL =
  process.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1";

const runClientTests = async () => {
  console.log("Starting client auth flows verification...");

  // Mock sessionStorage and localStorage in Node
  const storage = {};
  const sessionStorageStore = {};

  global.localStorage = {
    getItem: (k) => storage[k] || null,
    setItem: (k, v) => {
      storage[k] = String(v);
    },
    removeItem: (k) => {
      delete storage[k];
    },
    clear: () => {
      for (const k in storage) delete storage[k];
    },
  };

  global.sessionStorage = {
    getItem: (k) => sessionStorageStore[k] || null,
    setItem: (k, v) => {
      sessionStorageStore[k] = String(v);
    },
    removeItem: (k) => {
      delete sessionStorageStore[k];
    },
    clear: () => {
      for (const k in sessionStorageStore) delete sessionStorageStore[k];
    },
  };

  global.window = {
    location: {
      pathname: "/",
      assign: (url) => {
        console.log("[Redirected to]", url);
      },
    },
  };

  const {
    setTokens,
    clearTokens,
    getAccessToken,
    getRefreshToken,
    getUserFromToken,
    isTokenValid,
  } = await import("../src/utils/token.js");

  const { default: authApi } = await import("../src/api/auth.api.js");

  const uniqueId = randomUUID().slice(0, 8);
  const testName = `Client Tester ${uniqueId}`;
  const testEmail = `client-${uniqueId}@example.com`;
  const testPassword = `Pass1234-${uniqueId}`;

  // 1. Registration without role
  console.log("\n[Test 1] Registering user (ensuring no role is sent)...");
  const regData = await authApi.register({
    name: testName,
    email: testEmail,
    password: testPassword,
    // notice: NO role sent
  });
  assert.ok(regData.user);
  assert.equal(regData.user.role, "user");
  assert.equal(regData.user.name, testName);
  assert.ok(regData.accessToken);
  assert.ok(regData.refreshToken);
  console.log("✔ Registration succeeded; role is 'user'.");

  // Verify name in access token payload
  const decodedAccess = jwtDecode(regData.accessToken);
  assert.equal(
    decodedAccess.name,
    testName,
    "Name must be present in access token payload",
  );
  console.log(
    "✔ Access token contains 'name' in JWT payload:",
    decodedAccess.name,
  );

  // 2. Set tokens and test getUserFromToken
  setTokens({
    accessToken: regData.accessToken,
    refreshToken: regData.refreshToken,
  });
  assert.equal(getAccessToken(), regData.accessToken);
  assert.equal(getRefreshToken(), regData.refreshToken);
  assert.equal(
    storage.refreshToken,
    undefined,
    "Refresh token must NOT be in localStorage",
  );
  assert.equal(
    sessionStorageStore.refreshToken,
    regData.refreshToken,
    "Refresh token isolated in sessionStorage",
  );
  assert.ok(isTokenValid(regData.accessToken));

  const userFromToken = getUserFromToken(regData.accessToken);
  assert.equal(userFromToken.name, testName);
  assert.equal(userFromToken.email, testEmail);
  console.log(
    "✔ getUserFromToken extracted name immediately without API call.",
  );

  // 3. Authenticated getMe
  console.log("\n[Test 2] Fetching profile via authApi.getMe()...");
  const profile = await authApi.getMe();
  assert.equal(profile.email, testEmail);
  console.log("✔ Profile retrieved successfully.");

  // 4. Automatic refresh on expired access token
  console.log(
    "\n[Test 3] Simulating expired access token and auto-refresh in axios...",
  );
  // Create an expired dummy token with exp in the past
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      id: decodedAccess.id,
      email: testEmail,
      name: testName,
      role: "user",
      exp: Math.floor(Date.now() / 1000) - 60, // 60s in the past
    }),
  ).toString("base64url");
  const expiredToken = `${header}.${payload}.invalidsignature`;

  assert.equal(isTokenValid(expiredToken), false);

  // Set the expired access token in client storage while keeping valid refresh token
  setTokens({ accessToken: expiredToken });
  assert.equal(isTokenValid(getAccessToken()), false);
  console.log(
    "Set expired access token. Access token valid?",
    isTokenValid(getAccessToken()),
  );

  // Call getMe() - the axios interceptor should catch 401, refresh token, update storage, and return profile!
  const refreshedProfile = await authApi.getMe();
  assert.equal(refreshedProfile.email, testEmail);
  assert.ok(
    isTokenValid(getAccessToken()),
    "Access token should now be renewed and valid",
  );
  assert.notEqual(
    getAccessToken(),
    expiredToken,
    "Access token must have changed",
  );
  console.log(
    "✔ Axios response interceptor successfully recovered session with refresh token.",
  );

  // 5. Logout with expired access token flow
  console.log("\n[Test 4] Logout flow with expired access token...");
  const currentRefresh = getRefreshToken();
  // Again expire the access token
  setTokens({ accessToken: expiredToken });
  assert.equal(isTokenValid(getAccessToken()), false);

  // Simulate AuthContext.logout logic: proactive refresh before calling authApi.logout()
  const accessToken = getAccessToken();
  const refreshToken = getRefreshToken();
  if ((!accessToken || !isTokenValid(accessToken)) && refreshToken) {
    const refreshData = await authApi.refreshToken(refreshToken);
    setTokens({
      accessToken: refreshData.accessToken,
      refreshToken: refreshData.refreshToken,
    });
  }
  assert.ok(isTokenValid(getAccessToken()));

  const logoutResult = await authApi.logout();
  assert.equal(logoutResult.success, true);
  clearTokens();
  assert.equal(getAccessToken(), null);
  assert.equal(getRefreshToken(), null);
  console.log(
    "✔ Logout succeeded even when access token was initially expired.",
  );

  // Verify server session is indeed revoked
  try {
    await authApi.refreshToken(currentRefresh);
    assert.fail("Should have thrown 401 after logout");
  } catch (err) {
    assert.equal(err.response?.status, 401);
    console.log("✔ Server revoked refresh token; replay returned 401.");
  }

  console.log("\n================================================");
  console.log("ALL CLIENT AUTH TESTS PASSED!");
  console.log("================================================\n");
};

runClientTests().catch((err) => {
  console.error("Test failure:", err);
  process.exit(1);
});
