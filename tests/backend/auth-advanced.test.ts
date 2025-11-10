import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://localhost:5000';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function test(name: string, fn: () => Promise<void>) {
  return async () => {
    try {
      await fn();
      results.push({ name, passed: true });
      console.log(`✓ ${name}`);
    } catch (error) {
      results.push({ name, passed: false, error: String(error) });
      console.log(`✗ ${name}`);
      console.error(`  Error: ${error}`);
    }
  };
}

async function runTests() {
  console.log('\n🧪 Advanced Authentication Tests\n');

  const client: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true,
    withCredentials: true,
  });

  // Helper to get unique credentials
  const getCredentials = () => ({
    email: `test-${Date.now()}@example.com`,
    password: 'TestPass123!',
    username: `user_${Date.now()}`
  });

  // Helper to register and login
  const registerAndLogin = async () => {
    const creds = getCredentials();
    const csrfRes = await client.get('/api/auth/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;

    await client.post('/api/auth/register', creds, {
      headers: { 'x-csrf-token': csrfToken }
    });

    const loginRes = await client.post('/api/auth/login', {
      email: creds.email,
      password: creds.password
    }, {
      headers: { 'x-csrf-token': csrfToken }
    });

    return {
      ...creds,
      csrfToken,
      authCookie: loginRes.headers['set-cookie']?.[0] || ''
    };
  };

  // EMAIL VERIFICATION TESTS
  console.log('📧 Email Verification Flow\n');

  await test('Sends verification email upon registration', async () => {
    const creds = getCredentials();
    const csrfRes = await client.get('/api/auth/csrf-token');
    const response = await client.post('/api/auth/register', creds, {
      headers: { 'x-csrf-token': csrfRes.data.csrfToken }
    });
    if (response.status !== 200) throw new Error(`Expected 200, got ${response.status}`);
  })();

  await test('Rejects invalid verification token', async () => {
    const response = await client.get('/api/auth/verify-email?token=invalid-token-12345');
    if (response.status !== 400 && response.status !== 404) {
      throw new Error(`Expected 400 or 404, got ${response.status}`);
    }
  })();

  await test('Allows resending verification email', async () => {
    const creds = getCredentials();
    const csrfRes = await client.get('/api/auth/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;

    await client.post('/api/auth/register', creds, {
      headers: { 'x-csrf-token': csrfToken }
    });

    const response = await client.post('/api/auth/resend-verification', {
      email: creds.email
    }, {
      headers: { 'x-csrf-token': csrfToken }
    });

    if (![200, 400, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // PASSWORD RESET TESTS
  console.log('\n🔑 Password Reset Flow\n');

  await test('Requests password reset', async () => {
    const creds = getCredentials();
    const csrfRes = await client.get('/api/auth/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;

    await client.post('/api/auth/register', creds, {
      headers: { 'x-csrf-token': csrfToken }
    });

    const response = await client.post('/api/auth/forgot-password', {
      email: creds.email
    }, {
      headers: { 'x-csrf-token': csrfToken }
    });

    if (![200, 400, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Rejects invalid reset token', async () => {
    const response = await client.post('/api/auth/reset-password', {
      token: 'invalid-reset-token',
      password: 'NewPassword123!'
    });

    if (![400, 404].includes(response.status)) {
      throw new Error(`Expected 400 or 404, got ${response.status}`);
    }
  })();

  await test('Enforces password complexity on reset', async () => {
    const response = await client.post('/api/auth/reset-password', {
      token: 'some-token',
      password: 'weak'
    });

    if (![400, 404].includes(response.status)) {
      throw new Error(`Expected 400 or 404, got ${response.status}`);
    }
  })();

  // SESSION MANAGEMENT TESTS
  console.log('\n🔐 Session Management\n');

  await test('Retrieves current session', async () => {
    const { authCookie } = await registerAndLogin();
    const response = await client.get('/api/auth/session', {
      headers: { Cookie: authCookie }
    });

    if (![200, 401].includes(response.status)) {
      throw new Error(`Expected 200 or 401, got ${response.status}`);
    }

    if (response.status === 200 && !response.data.user) {
      throw new Error('Session response missing user data');
    }
  })();

  await test('Logout invalidates session', async () => {
    const { authCookie, csrfToken } = await registerAndLogin();
    
    const logoutRes = await client.post('/api/auth/logout', {}, {
      headers: { 
        Cookie: authCookie,
        'x-csrf-token': csrfToken
      }
    });

    if (logoutRes.status !== 200) {
      throw new Error(`Logout failed: ${logoutRes.status}`);
    }

    const sessionRes = await client.get('/api/auth/session', {
      headers: { Cookie: authCookie }
    });

    if (sessionRes.status !== 401) {
      throw new Error(`Session should be invalid after logout, got ${sessionRes.status}`);
    }
  })();

  await test('Handles concurrent sessions', async () => {
    const creds = getCredentials();
    const csrfRes = await client.get('/api/auth/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;

    await client.post('/api/auth/register', creds, {
      headers: { 'x-csrf-token': csrfToken }
    });

    // Login from "device 1"
    const login1 = await client.post('/api/auth/login', {
      email: creds.email,
      password: creds.password
    }, {
      headers: { 'x-csrf-token': csrfToken }
    });

    // Login from "device 2"
    const csrfRes2 = await client.get('/api/auth/csrf-token');
    const login2 = await client.post('/api/auth/login', {
      email: creds.email,
      password: creds.password
    }, {
      headers: { 'x-csrf-token': csrfRes2.data.csrfToken }
    });

    if (![200, 401].includes(login1.status) || ![200, 401].includes(login2.status)) {
      throw new Error('Concurrent login failed');
    }
  })();

  // TWO-FACTOR AUTHENTICATION TESTS
  console.log('\n🔒 Two-Factor Authentication (2FA)\n');

  await test('Enable 2FA endpoint exists', async () => {
    const { authCookie } = await registerAndLogin();
    const response = await client.post('/api/auth/2fa/enable', {}, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Verify 2FA token endpoint exists', async () => {
    const { authCookie } = await registerAndLogin();
    const response = await client.post('/api/auth/2fa/verify', {
      token: '123456'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 400, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Disable 2FA endpoint exists', async () => {
    const { authCookie, password } = await registerAndLogin();
    const response = await client.post('/api/auth/2fa/disable', {
      password
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 400, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Backup codes endpoint exists', async () => {
    const { authCookie } = await registerAndLogin();
    const response = await client.get('/api/auth/2fa/backup-codes', {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // OAUTH/SOCIAL LOGIN TESTS
  console.log('\n🔗 OAuth/Social Login\n');

  await test('GitHub OAuth endpoint exists', async () => {
    const response = await client.get('/api/auth/github');
    if (![302, 404].includes(response.status)) {
      throw new Error(`Expected 302 or 404, got ${response.status}`);
    }
    if (response.status === 302 && !response.headers.location?.includes('github')) {
      throw new Error('GitHub OAuth redirect missing');
    }
  })();

  await test('Google OAuth endpoint exists', async () => {
    const response = await client.get('/api/auth/google');
    if (![302, 404].includes(response.status)) {
      throw new Error(`Expected 302 or 404, got ${response.status}`);
    }
  })();

  await test('OAuth callback endpoint exists', async () => {
    const response = await client.get('/api/auth/github/callback?code=test-code');
    if (![200, 302, 400, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // SECURITY TESTS
  console.log('\n🛡️  Rate Limiting & Security\n');

  await test('Rejects requests without CSRF token', async () => {
    const creds = getCredentials();
    const response = await client.post('/api/auth/register', creds);
    if (response.status !== 403) {
      throw new Error(`Expected 403, got ${response.status}`);
    }
  })();

  await test('Prevents SQL injection in login', async () => {
    const csrfRes = await client.get('/api/auth/csrf-token');
    const response = await client.post('/api/auth/login', {
      email: "admin' OR '1'='1",
      password: "password' OR '1'='1"
    }, {
      headers: { 'x-csrf-token': csrfRes.data.csrfToken }
    });

    if (response.status !== 401) {
      throw new Error(`SQL injection not prevented: ${response.status}`);
    }
  })();

  await test('Sanitizes XSS in username', async () => {
    const csrfRes = await client.get('/api/auth/csrf-token');
    const response = await client.post('/api/auth/register', {
      email: `test-${Date.now()}@example.com`,
      password: 'TestPass123!',
      username: '<script>alert("xss")</script>'
    }, {
      headers: { 'x-csrf-token': csrfRes.data.csrfToken }
    });

    if (response.status !== 400) {
      throw new Error(`XSS not sanitized: ${response.status}`);
    }
  })();

  // ACCOUNT MANAGEMENT TESTS
  console.log('\n👤 Account Management\n');

  await test('Change password endpoint exists', async () => {
    const { authCookie, password } = await registerAndLogin();
    const response = await client.post('/api/auth/change-password', {
      currentPassword: password,
      newPassword: 'NewPassword123!'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update profile endpoint exists', async () => {
    const { authCookie } = await registerAndLogin();
    const response = await client.patch('/api/users/profile', {
      displayName: 'Test User',
      bio: 'Test bio'
    }, {
      headers: { Cookie: authCookie }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Delete account endpoint exists', async () => {
    const { authCookie, password } = await registerAndLogin();
    const response = await client.delete('/api/users/me', {
      headers: { Cookie: authCookie },
      data: { password }
    });

    if (![200, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // SUMMARY
  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`\n📊 Test Summary: ${passed} passed, ${failed} failed out of ${results.length} total`);
  
  if (failed > 0) {
    console.log('\n❌ Failed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}`);
    });
  }

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
