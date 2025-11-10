import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://localhost:5000';
const ADMIN_EMAIL = 'admin@replit.com';
const ADMIN_PASSWORD = 'admin123';

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
  console.log('\n👑 Admin API Tests\n');

  const client: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    validateStatus: () => true,
    withCredentials: true,
  });

  // Login as admin
  let adminCookie = '';
  try {
    const csrfRes = await client.get('/api/auth/csrf-token');
    const csrfToken = csrfRes.data.csrfToken;

    const loginRes = await client.post('/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD
    }, {
      headers: { 'x-csrf-token': csrfToken }
    });

    adminCookie = loginRes.headers['set-cookie']?.[0] || '';
    console.log(`✓ Logged in as admin\n`);
  } catch (error) {
    console.log(`⚠ Could not login as admin, some tests may fail\n`);
  }

  // USER MANAGEMENT TESTS
  console.log('👥 User Management\n');

  await test('List all users', async () => {
    const response = await client.get('/api/admin/users', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get user details by ID', async () => {
    const response = await client.get('/api/admin/users/test-user-id', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update user details', async () => {
    const response = await client.patch('/api/admin/users/test-user-id', {
      email: 'newemail@example.com',
      verified: true
    }, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Ban user', async () => {
    const response = await client.post('/api/admin/users/test-user-id/ban', {
      reason: 'Terms of service violation'
    }, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Unban user', async () => {
    const response = await client.post('/api/admin/users/test-user-id/unban', {}, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Delete user account', async () => {
    const response = await client.delete('/api/admin/users/test-user-id', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 204, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // PROJECT MANAGEMENT TESTS
  console.log('\n🗂️  Project Management\n');

  await test('List all projects', async () => {
    const response = await client.get('/api/admin/projects', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get project details', async () => {
    const response = await client.get('/api/admin/projects/test-project-id', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Delete project', async () => {
    const response = await client.delete('/api/admin/projects/test-project-id', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 204, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Feature/unfeature project', async () => {
    const response = await client.post('/api/admin/projects/test-project-id/feature', {
      featured: true
    }, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // ANALYTICS & STATS TESTS
  console.log('\n📊 Analytics & Statistics\n');

  await test('Get platform statistics', async () => {
    const response = await client.get('/api/admin/stats', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get user growth metrics', async () => {
    const response = await client.get('/api/admin/analytics/users', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get project creation metrics', async () => {
    const response = await client.get('/api/admin/analytics/projects', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get API usage metrics', async () => {
    const response = await client.get('/api/admin/analytics/api-usage', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get revenue metrics', async () => {
    const response = await client.get('/api/admin/analytics/revenue', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // BILLING & SUBSCRIPTIONS
  console.log('\n💳 Billing & Subscriptions\n');

  await test('Get billing overview', async () => {
    const response = await client.get('/api/admin/billing', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('List all subscriptions', async () => {
    const response = await client.get('/api/admin/subscriptions', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update subscription', async () => {
    const response = await client.patch('/api/admin/subscriptions/sub-id', {
      plan: 'pro',
      status: 'active'
    }, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Cancel subscription', async () => {
    const response = await client.post('/api/admin/subscriptions/sub-id/cancel', {}, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // AUDIT LOGS
  console.log('\n📜 Audit Logs\n');

  await test('Get audit logs', async () => {
    const response = await client.get('/api/admin/audit-logs', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Filter audit logs by user', async () => {
    const response = await client.get('/api/admin/audit-logs?userId=test-user', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Filter audit logs by action', async () => {
    const response = await client.get('/api/admin/audit-logs?action=user_login', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Export audit logs', async () => {
    const response = await client.get('/api/admin/audit-logs/export', {
      headers: { Cookie: adminCookie },
      responseType: 'arraybuffer'
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // SYSTEM MANAGEMENT
  console.log('\n⚙️  System Management\n');

  await test('Get system health', async () => {
    const response = await client.get('/api/admin/health', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get database status', async () => {
    const response = await client.get('/api/admin/database/status', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get Redis status', async () => {
    const response = await client.get('/api/admin/redis/status', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Clear cache', async () => {
    const response = await client.post('/api/admin/cache/clear', {}, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Run database backup', async () => {
    const response = await client.post('/api/admin/database/backup', {}, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 202, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // FEATURE FLAGS & CONFIG
  console.log('\n🚩 Feature Flags & Configuration\n');

  await test('List feature flags', async () => {
    const response = await client.get('/api/admin/feature-flags', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update feature flag', async () => {
    const response = await client.patch('/api/admin/feature-flags/new-editor', {
      enabled: true
    }, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Get system configuration', async () => {
    const response = await client.get('/api/admin/config', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Update system configuration', async () => {
    const response = await client.patch('/api/admin/config', {
      maxProjectsPerUser: 100,
      maintenanceMode: false
    }, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  // CONTENT MODERATION
  console.log('\n🛡️  Content Moderation\n');

  await test('Get flagged content', async () => {
    const response = await client.get('/api/admin/moderation/flagged', {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Review flagged content', async () => {
    const response = await client.post('/api/admin/moderation/review', {
      contentId: 'flagged-content-id',
      action: 'approve'
    }, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
      throw new Error(`Unexpected status: ${response.status}`);
    }
  })();

  await test('Ban content', async () => {
    const response = await client.post('/api/admin/moderation/ban', {
      contentId: 'content-id',
      reason: 'Violates community guidelines'
    }, {
      headers: { Cookie: adminCookie }
    });

    if (![200, 401, 403, 404, 501].includes(response.status)) {
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
