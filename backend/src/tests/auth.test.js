import http from 'http';
import app from '../app.js';
import { pool, closePool } from '../config/db.js';
import { redis, closeRedis, getCache } from '../config/redis.js';

const TEST_PORT = 5055;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

let server;

// Helper assertion function
let passedTests = 0;
let totalTests = 0;

const assert = (condition, message) => {
  totalTests++;
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
};

const runTests = async () => {
  console.log('\n🚀 Starting Day 2 Auth, JWT & User Model Verification Test Suite...\n');

  // Start temporary test server
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(TEST_PORT, resolve));
  console.log(`[Test Server] Listening on ${BASE_URL}`);

  const testUser = {
    email: `test_${Date.now()}@syncspace.io`,
    password: 'SecurePassword123',
    full_name: 'Alex Mercer',
    timezone: 'America/New_York',
    currency: 'USD',
  };

  let authToken = '';
  let userId = '';

  try {
    // 1. Test Registration Validation (invalid email & weak password)
    console.log('\n--- 1. Registration Validation ---');
    const invalidRegRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'not-an-email', password: '123', full_name: 'A' }),
    });
    const invalidRegData = await invalidRegRes.json();
    assert(invalidRegRes.status === 400, 'Rejects invalid registration payload with 400');
    assert(Array.isArray(invalidRegData.details) && invalidRegData.details.length >= 2, 'Returns structured field validation errors');

    // 2. Test Successful Registration
    console.log('\n--- 2. User Registration ---');
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Registers user with 201 Created');
    assert(!!regData.data.token, 'Returns signed JWT token');
    assert(regData.data.user.email === testUser.email.toLowerCase(), 'Returns correct user email');
    assert(regData.data.user.password_hash === undefined, 'Does not expose password_hash in response');
    assert(regData.data.user.timezone === 'America/New_York', 'Preserves user timezone preference');
    assert(regData.data.user.currency === 'USD', 'Preserves user currency preference');

    authToken = regData.data.token;
    userId = regData.data.user.id;

    // 3. Test Duplicate Email Prevention
    console.log('\n--- 3. Duplicate Email Prevention ---');
    const dupRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser),
    });
    assert(dupRes.status === 409, 'Rejects duplicate email with 409 Conflict');

    // 4. Test Login with Wrong Password
    console.log('\n--- 4. Login Credentials Verification ---');
    const wrongLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: 'WrongPassword999' }),
    });
    assert(wrongLoginRes.status === 401, 'Rejects incorrect password with 401 Unauthorized');

    // 5. Test Login with Correct Password
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Logs in successfully with 200 OK');
    assert(!!loginData.data.token, 'Returns new JWT token upon login');
    authToken = loginData.data.token;

    // 6. Test Protected Endpoint /api/auth/me without token
    console.log('\n--- 5. Protected Routes & Auth Middleware ---');
    const noTokenRes = await fetch(`${BASE_URL}/api/auth/me`);
    assert(noTokenRes.status === 401, 'Denies access without token with 401');

    // 7. Test Protected Endpoint /api/auth/me with valid token
    const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const meData = await meRes.json();
    assert(meRes.status === 200, 'Allows access with valid token');
    assert(meData.data.user.id === userId, 'Returns correct user id in profile');

    // 8. Test Redis Session Caching
    console.log('\n--- 6. Redis Session Caching ---');
    const cacheKey = `session:user:${userId}`;
    const cachedObj = await getCache(cacheKey);
    assert(cachedObj !== null, 'User session is cached');
    assert(cachedObj.id === userId, 'Cached user session matches database record');

    // 9. Test Profile Preferences Update
    console.log('\n--- 7. Profile Preferences Update ---');
    const updateRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        timezone: 'Europe/London',
        currency: 'EUR',
        full_name: 'Alex J. Mercer',
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'Updates profile with 200 OK');
    assert(updateData.data.user.timezone === 'Europe/London', 'Updates timezone preference');
    assert(updateData.data.user.currency === 'EUR', 'Updates currency preference');
    assert(updateData.data.user.full_name === 'Alex J. Mercer', 'Updates full name');

    // 10. Test Password Change Flow
    console.log('\n--- 8. Password Change Flow ---');
    const newPassword = 'BrandNewPassword456';
    const badChangeRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        currentPassword: 'IncorrectOldPassword',
        newPassword: newPassword,
      }),
    });
    assert(badChangeRes.status === 400, 'Rejects password change with incorrect current password');

    const goodChangeRes = await fetch(`${BASE_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        currentPassword: testUser.password,
        newPassword: newPassword,
      }),
    });
    const goodChangeData = await goodChangeRes.json();
    assert(goodChangeRes.status === 200, 'Changes password successfully with 200 OK');
    assert(!!goodChangeData.data.token, 'Returns fresh session token');
    authToken = goodChangeData.data.token;

    // Verify login with new password works and old password fails
    const oldLoginCheck = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: testUser.password }),
    });
    assert(oldLoginCheck.status === 401, 'Old password no longer valid for login');

    const newLoginCheck = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testUser.email, password: newPassword }),
    });
    assert(newLoginCheck.status === 200, 'New password successfully authenticates');

    // 11. Test Logout
    console.log('\n--- 9. Logout & Session Invalidation ---');
    const logoutRes = await fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(logoutRes.status === 200, 'Logs out with 200 OK');
    const cacheAfterLogout = await getCache(cacheKey);
    assert(cacheAfterLogout === null, 'Session cache invalidated on logout');

    // 12. Cleanup: Delete test user
    console.log('\n--- 10. User Account Cleanup ---');
    const delRes = await fetch(`${BASE_URL}/api/users/profile`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(delRes.status === 200, 'Deletes user account with 200 OK');

    console.log(`\n🎉 All ${passedTests}/${totalTests} tests passed successfully!\n`);
  } catch (error) {
    console.error('\n❌ Test suite failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (server) {
      server.close();
    }
    await closePool();
    await closeRedis();
  }
};

runTests();
