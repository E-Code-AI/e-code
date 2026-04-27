// 100-session load test for E-code release certification.
//
// Exercises a realistic session lifecycle (csrf → login → projects → readiness
// → logout) against a running server. Designed to satisfy the "k6 100 sessions"
// release blocker tracked in CLAUDE.md.
//
// Usage:
//   BASE_URL=http://localhost:5000 k6 run test/load/sessions-100.k6.js
//   BASE_URL=https://staging.example.com USERS_FILE=./test/load/fixtures/users.json k6 run test/load/sessions-100.k6.js
//
// Auth is optional. If USERS_FILE is unset, the script runs in unauthenticated
// mode and only exercises the public surface (csrf, explore, readiness, static).
// In auth mode, USERS_FILE must be a JSON array of {email, password} entries
// (>=10 recommended; reused across the 100 VUs round-robin).
//
// Thresholds reflect the release-readiness contract: p95 < 800ms on the
// session-critical endpoints, error rate < 1%, readiness < 200ms.

import http from 'k6/http';
import { check, sleep, group, fail } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { SharedArray } from 'k6/data';

const errorRate = new Rate('errors');
const loginLatency = new Trend('login_latency');
const projectsLatency = new Trend('projects_latency');
const readinessLatency = new Trend('readiness_latency');
const sessionDuration = new Trend('session_duration');
const sessionsCompleted = new Counter('sessions_completed');
const sessionsFailed = new Counter('sessions_failed');

const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
const USERS_FILE = __ENV.USERS_FILE || '';
const AUTH_MODE = USERS_FILE !== '';
const RAMP_UP = __ENV.RAMP_UP || '30s';
const HOLD = __ENV.HOLD || '5m';
const RAMP_DOWN = __ENV.RAMP_DOWN || '30s';
const TARGET_VUS = parseInt(__ENV.TARGET_VUS || '100', 10);

const users = new SharedArray('users', function loadUsers() {
  if (!AUTH_MODE) return [];
  const raw = open(USERS_FILE);
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(`USERS_FILE ${USERS_FILE} must contain a non-empty JSON array`);
  }
  return parsed;
});

export const options = {
  scenarios: {
    sessions: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: RAMP_UP, target: TARGET_VUS },
        { duration: HOLD, target: TARGET_VUS },
        { duration: RAMP_DOWN, target: 0 },
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
    login_latency: ['p(95)<1500'],
    projects_latency: ['p(95)<800'],
    readiness_latency: ['p(95)<200'],
    session_duration: ['p(95)<6000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

function jsonHeaders(csrf) {
  const h = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
  if (csrf) h['X-CSRF-Token'] = csrf;
  return h;
}

function pickUser() {
  if (users.length === 0) return null;
  return users[(__VU - 1) % users.length];
}

function fetchCsrf() {
  const res = http.get(`${BASE_URL}/api/csrf-token`, { tags: { name: 'csrf-token' } });
  const ok = check(res, { 'csrf 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  if (!ok) return null;
  try {
    const body = res.json();
    return (body && (body.csrfToken || body.token)) || null;
  } catch {
    return null;
  }
}

function login(user, csrf) {
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ email: user.email, password: user.password }),
    { headers: jsonHeaders(csrf), tags: { name: 'login' } },
  );
  loginLatency.add(Date.now() - start);
  const ok = check(res, {
    'login 200': (r) => r.status === 200,
    'login returns csrf': (r) => {
      try { return !!(r.json() || {}).csrfToken; } catch { return false; }
    },
  });
  errorRate.add(!ok);
  if (!ok) return null;
  let nextCsrf = csrf;
  try { nextCsrf = (res.json() || {}).csrfToken || csrf; } catch { /* keep prior */ }
  return nextCsrf;
}

function listProjects() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/api/projects`, { tags: { name: 'projects-list' } });
  projectsLatency.add(Date.now() - start);
  const ok = check(res, {
    'projects 200': (r) => r.status === 200,
    'projects is json array': (r) => {
      try { return Array.isArray(r.json()); } catch { return false; }
    },
  });
  errorRate.add(!ok);
  return ok;
}

function exploreProjects() {
  const res = http.get(`${BASE_URL}/api/projects/explore`, { tags: { name: 'projects-explore' } });
  const ok = check(res, { 'explore 200': (r) => r.status === 200 });
  errorRate.add(!ok);
  return ok;
}

function readiness() {
  const start = Date.now();
  const res = http.get(`${BASE_URL}/health/readiness`, { tags: { name: 'readiness' } });
  readinessLatency.add(Date.now() - start);
  // Readiness is allowed to be 200 or 503 — count only transport failures as errors.
  const ok = check(res, { 'readiness reachable': (r) => r.status === 200 || r.status === 503 });
  errorRate.add(!ok);
  return ok;
}

function logout(csrf) {
  const res = http.post(
    `${BASE_URL}/api/auth/logout`,
    '{}',
    { headers: jsonHeaders(csrf), tags: { name: 'logout' } },
  );
  const ok = check(res, { 'logout 2xx/3xx': (r) => r.status >= 200 && r.status < 400 });
  errorRate.add(!ok);
  return ok;
}

export function setup() {
  const res = http.get(`${BASE_URL}/health`);
  if (res.status !== 200) {
    fail(`server at ${BASE_URL}/health not reachable (status=${res.status}) — aborting`);
  }
  // eslint-disable-next-line no-console
  console.log(`Starting 100-session load: BASE_URL=${BASE_URL} AUTH=${AUTH_MODE} VUS=${TARGET_VUS}`);
  return { ts: Date.now() };
}

export default function () {
  const sessionStart = Date.now();
  let success = true;

  group('bootstrap', function () {
    readiness();
  });

  let csrf = null;
  if (AUTH_MODE) {
    group('auth', function () {
      csrf = fetchCsrf();
      if (!csrf) { success = false; return; }
      const user = pickUser();
      if (!user) { success = false; return; }
      const nextCsrf = login(user, csrf);
      if (!nextCsrf) { success = false; return; }
      csrf = nextCsrf;
    });

    if (success) {
      group('workspace', function () {
        if (!listProjects()) success = false;
        sleep(0.5 + Math.random());
        exploreProjects();
      });

      group('teardown', function () {
        logout(csrf);
      });
    }
  } else {
    group('public', function () {
      exploreProjects();
      sleep(0.3 + Math.random() * 0.7);
      readiness();
    });
  }

  sessionDuration.add(Date.now() - sessionStart);
  if (success) sessionsCompleted.add(1);
  else sessionsFailed.add(1);

  sleep(1 + Math.random());
}

export function handleSummary(data) {
  return {
    'test/load/results-sessions-100.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  const m = data.metrics || {};
  const fmt = (k) => {
    const v = (m[k] && (m[k].values || m[k])) || {};
    if (typeof v.rate === 'number') return `${(v.rate * 100).toFixed(2)}%`;
    if (typeof v.count === 'number' && typeof v.rate !== 'number') return String(v.count);
    if (typeof v['p(95)'] === 'number') return `p95=${v['p(95)'].toFixed(0)}ms`;
    return JSON.stringify(v);
  };
  const lines = [
    '',
    '── 100-session load summary ──',
    `sessions_completed       ${fmt('sessions_completed')}`,
    `sessions_failed          ${fmt('sessions_failed')}`,
    `errors                   ${fmt('errors')}`,
    `http_req_failed          ${fmt('http_req_failed')}`,
    `login_latency            ${fmt('login_latency')}`,
    `projects_latency         ${fmt('projects_latency')}`,
    `readiness_latency        ${fmt('readiness_latency')}`,
    `session_duration         ${fmt('session_duration')}`,
    '',
  ];
  return lines.join('\n');
}
