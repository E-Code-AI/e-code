/**
 * k6 Load Test Suite - Fortune 500 Standard
 * Comprehensive API Load Testing
 *
 * Test Scenarios:
 * - Authentication load
 * - Project CRUD operations
 * - AI agent requests
 * - Real-time collaboration
 * - Database stress test
 *
 * Usage:
 *   k6 run test/load/api-comprehensive-load.test.js
 *
 * Thresholds:
 * - p95 response time < 500ms
 * - p99 response time < 1000ms
 * - Error rate < 1%
 * - Successful requests > 99%
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.2.0/index.js';

// Custom metrics
const authSuccessRate = new Rate('auth_success_rate');
const projectCreationTime = new Trend('project_creation_time');
const aiRequestTime = new Trend('ai_request_time');
const errorCounter = new Counter('errors');

// Test configuration
export const options = {
  stages: [
    // Warm up
    { duration: '2m', target: 50 },   // Ramp up to 50 users

    // Normal load
    { duration: '5m', target: 100 },  // Stay at 100 users for 5 minutes

    // Peak load
    { duration: '3m', target: 200 },  // Spike to 200 users

    // Sustained peak
    { duration: '5m', target: 200 },  // Maintain 200 users

    // Stress test
    { duration: '2m', target: 500 },  // Spike to 500 users (stress)

    // Cool down
    { duration: '3m', target: 0 },    // Ramp down to 0
  ],

  thresholds: {
    // HTTP-specific thresholds
    'http_req_duration': [
      'p(95)<500',   // 95% of requests should be below 500ms
      'p(99)<1000',  // 99% of requests should be below 1s
      'avg<300'      // Average should be below 300ms
    ],
    'http_req_failed': ['rate<0.01'], // Error rate should be less than 1%

    // Custom metrics thresholds
    'auth_success_rate': ['rate>0.99'], // 99% auth success rate
    'project_creation_time': ['p(95)<2000'], // 95% of project creations < 2s
    'ai_request_time': ['p(95)<5000'], // 95% of AI requests < 5s

    // Iteration thresholds
    'iteration_duration': ['p(95)<10000'], // 95% of iterations < 10s
    'iterations': ['count>1000'], // At least 1000 iterations
  },

  // Resource limits
  noConnectionReuse: false,
  userAgent: 'k6-load-test/1.0',
  insecureSkipTLSVerify: false,

  // Tags for result filtering
  tags: {
    test_type: 'load',
    environment: __ENV.ENVIRONMENT || 'staging'
  }
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'https://staging.e-code.ai';

/**
 * Test setup - runs once per VU
 */
export function setup() {
  // Create test users for the load test
  const adminToken = __ENV.ADMIN_TOKEN;

  if (!adminToken) {
    console.warn('ADMIN_TOKEN not set. Some tests may fail.');
  }

  return {
    adminToken,
    baseUrl: BASE_URL
  };
}

/**
 * Main test function - runs for each VU iteration
 */
export default function (data) {
  const baseUrl = data.baseUrl;

  // Test 1: User Registration and Authentication
  testAuthentication(baseUrl);

  sleep(randomIntBetween(1, 3));

  // Test 2: Project Management
  const authToken = testLogin(baseUrl);
  if (authToken) {
    testProjectCRUD(baseUrl, authToken);
    sleep(randomIntBetween(1, 2));

    // Test 3: AI Agent Requests
    testAIAgent(baseUrl, authToken);
    sleep(randomIntBetween(2, 4));

    // Test 4: File Operations
    testFileOperations(baseUrl, authToken);
    sleep(randomIntBetween(1, 2));
  }

  sleep(1);
}

/**
 * Test Authentication Flow
 */
function testAuthentication(baseUrl) {
  const testUser = {
    username: `loadtest_${randomString(8)}`,
    email: `loadtest_${randomString(8)}@example.com`,
    password: `Test${randomString(12)}!`,
    displayName: `Load Test User ${randomString(4)}`
  };

  // Register new user
  const registerRes = http.post(
    `${baseUrl}/api/auth/register`,
    JSON.stringify(testUser),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'RegisterUser' }
    }
  );

  const registerSuccess = check(registerRes, {
    'registration status is 201': (r) => r.status === 201,
    'registration returns user object': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.user && body.user.id;
      } catch {
        return false;
      }
    }
  });

  authSuccessRate.add(registerSuccess);

  if (!registerSuccess) {
    errorCounter.add(1);
  }
}

/**
 * Test Login
 */
function testLogin(baseUrl) {
  const credentials = {
    username: __ENV.TEST_USER || 'testuser',
    password: __ENV.TEST_PASSWORD || 'TestPassword123!'
  };

  const loginRes = http.post(
    `${baseUrl}/api/auth/login`,
    JSON.stringify(credentials),
    {
      headers: { 'Content-Type': 'application/json' },
      tags: { name: 'LoginUser' }
    }
  );

  const loginSuccess = check(loginRes, {
    'login status is 200': (r) => r.status === 200,
    'login returns access token': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.accessToken;
      } catch {
        return false;
      }
    }
  });

  authSuccessRate.add(loginSuccess);

  if (loginSuccess) {
    try {
      const body = JSON.parse(loginRes.body);
      return body.accessToken;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Test Project CRUD Operations
 */
function testProjectCRUD(baseUrl, authToken) {
  const projectData = {
    name: `Load Test Project ${randomString(8)}`,
    description: 'Project created during load test',
    visibility: 'private',
    language: 'typescript'
  };

  // CREATE
  const createStart = Date.now();
  const createRes = http.post(
    `${baseUrl}/api/projects`,
    JSON.stringify(projectData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      tags: { name: 'CreateProject' }
    }
  );

  const createDuration = Date.now() - createStart;
  projectCreationTime.add(createDuration);

  const projectCreated = check(createRes, {
    'project creation status is 201': (r) => r.status === 201,
    'project creation returns project id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id;
      } catch {
        return false;
      }
    }
  });

  if (!projectCreated) {
    errorCounter.add(1);
    return;
  }

  let projectId;
  try {
    projectId = JSON.parse(createRes.body).id;
  } catch {
    return;
  }

  // READ
  const readRes = http.get(
    `${baseUrl}/api/projects/${projectId}`,
    {
      headers: { 'Authorization': `Bearer ${authToken}` },
      tags: { name: 'GetProject' }
    }
  );

  check(readRes, {
    'project read status is 200': (r) => r.status === 200,
    'project read returns correct id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id === projectId;
      } catch {
        return false;
      }
    }
  });

  // UPDATE
  const updateData = {
    description: 'Updated description during load test'
  };

  const updateRes = http.patch(
    `${baseUrl}/api/projects/${projectId}`,
    JSON.stringify(updateData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      tags: { name: 'UpdateProject' }
    }
  );

  check(updateRes, {
    'project update status is 200': (r) => r.status === 200
  });

  // LIST
  const listRes = http.get(
    `${baseUrl}/api/projects?page=1&limit=20`,
    {
      headers: { 'Authorization': `Bearer ${authToken}` },
      tags: { name: 'ListProjects' }
    }
  );

  check(listRes, {
    'project list status is 200': (r) => r.status === 200,
    'project list returns array': (r) => {
      try {
        const body = JSON.parse(r.body);
        return Array.isArray(body.projects);
      } catch {
        return false;
      }
    }
  });
}

/**
 * Test AI Agent Requests
 */
function testAIAgent(baseUrl, authToken) {
  const aiRequest = {
    prompt: 'Create a simple React counter component with increment and decrement buttons',
    model: 'claude-3-5-sonnet',
    projectContext: {
      framework: 'React',
      language: 'TypeScript'
    }
  };

  const aiStart = Date.now();
  const aiRes = http.post(
    `${baseUrl}/api/agent/plan`,
    JSON.stringify(aiRequest),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      tags: { name: 'AIGeneratePlan' },
      timeout: '30s' // AI requests can take longer
    }
  );

  const aiDuration = Date.now() - aiStart;
  aiRequestTime.add(aiDuration);

  const aiSuccess = check(aiRes, {
    'AI request status is 200 or 201': (r) => [200, 201].includes(r.status),
    'AI request returns plan': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.steps && Array.isArray(body.steps);
      } catch {
        return false;
      }
    },
    'AI request completes in reasonable time': () => aiDuration < 10000
  });

  if (!aiSuccess) {
    errorCounter.add(1);
  }
}

/**
 * Test File Operations
 */
function testFileOperations(baseUrl, authToken) {
  // Get list of projects first
  const projectsRes = http.get(
    `${baseUrl}/api/projects?page=1&limit=1`,
    {
      headers: { 'Authorization': `Bearer ${authToken}` },
      tags: { name: 'GetProjectsForFiles' }
    }
  );

  if (projectsRes.status !== 200) {
    return;
  }

  let projectId;
  try {
    const body = JSON.parse(projectsRes.body);
    if (body.projects && body.projects.length > 0) {
      projectId = body.projects[0].id;
    } else {
      return;
    }
  } catch {
    return;
  }

  // Create file
  const fileData = {
    name: `test-file-${randomString(8)}.ts`,
    path: `/src/test-file-${randomString(8)}.ts`,
    content: `// Load test file\nconsole.log('Hello from load test ${randomString(4)}');\n`,
    projectId: projectId,
    isDirectory: false
  };

  const createFileRes = http.post(
    `${baseUrl}/api/files`,
    JSON.stringify(fileData),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      tags: { name: 'CreateFile' }
    }
  );

  check(createFileRes, {
    'file creation status is 201': (r) => r.status === 201,
    'file creation returns file id': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.id;
      } catch {
        return false;
      }
    }
  });
}

/**
 * Teardown - runs once after all VUs finish
 */
export function teardown(data) {
  console.log('Load test completed successfully');

  // Print summary
  console.log(`\nTest Summary:`);
  console.log(`Base URL: ${data.baseUrl}`);
  console.log(`Environment: ${__ENV.ENVIRONMENT || 'staging'}`);
}

/**
 * Handle summary - called after test completion
 */
export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'summary.json': JSON.stringify(data),
    'summary.html': htmlReport(data),
  };
}

/**
 * Generate text summary
 */
function textSummary(data, options = {}) {
  const indent = options.indent || '';
  let summary = '\n';

  summary += `${indent}Total Duration: ${(data.state.testRunDurationMs / 1000).toFixed(2)}s\n`;
  summary += `${indent}Total Iterations: ${data.metrics.iterations.values.count}\n`;
  summary += `${indent}Total VUs: ${data.root_group.checks}\n\n`;

  summary += `${indent}HTTP Metrics:\n`;
  summary += `${indent}  Requests: ${data.metrics.http_reqs.values.count}\n`;
  summary += `${indent}  Failed: ${data.metrics.http_req_failed.values.count}\n`;
  summary += `${indent}  Duration (avg): ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
  summary += `${indent}  Duration (p95): ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
  summary += `${indent}  Duration (p99): ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;

  return summary;
}

/**
 * Generate HTML report
 */
function htmlReport(data) {
  return `
<!DOCTYPE html>
<html>
<head>
  <title>k6 Load Test Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .success { color: green; }
    .warning { color: orange; }
    .error { color: red; }
  </style>
</head>
<body>
  <h1>k6 Load Test Report</h1>
  <p><strong>Date:</strong> ${new Date().toISOString()}</p>
  <p><strong>Duration:</strong> ${(data.state.testRunDurationMs / 1000).toFixed(2)}s</p>

  <h2>Summary</h2>
  <table>
    <tr><th>Metric</th><th>Value</th><th>Status</th></tr>
    <tr>
      <td>Total Requests</td>
      <td>${data.metrics.http_reqs.values.count}</td>
      <td class="success">✓</td>
    </tr>
    <tr>
      <td>Failed Requests</td>
      <td>${data.metrics.http_req_failed.values.count}</td>
      <td class="${data.metrics.http_req_failed.values.rate < 0.01 ? 'success' : 'error'}">
        ${data.metrics.http_req_failed.values.rate < 0.01 ? '✓' : '✗'}
      </td>
    </tr>
    <tr>
      <td>Avg Response Time</td>
      <td>${data.metrics.http_req_duration.values.avg.toFixed(2)}ms</td>
      <td class="${data.metrics.http_req_duration.values.avg < 300 ? 'success' : 'warning'}">
        ${data.metrics.http_req_duration.values.avg < 300 ? '✓' : '⚠'}
      </td>
    </tr>
    <tr>
      <td>P95 Response Time</td>
      <td>${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms</td>
      <td class="${data.metrics.http_req_duration.values['p(95)'] < 500 ? 'success' : 'warning'}">
        ${data.metrics.http_req_duration.values['p(95)'] < 500 ? '✓' : '⚠'}
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}
