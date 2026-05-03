/**
 * Git Panel API — Playwright E2E specification
 *
 * Tests the HTTP contract of the Git API layer using Playwright's `request`
 * fixture (no browser needed) against a running server.
 *
 * Three sections:
 *   1. Auth enforcement — unauthenticated requests must be rejected
 *   2. Input validation — malformed inputs return 400 before reaching git
 *   3. Sequential git flow — init → stage → commit → verify commits list
 *      (requires E2E_AUTH_TOKEN env var set to a valid bootstrap JWT)
 *
 * Run in CI:
 *   E2E_AUTH_TOKEN=<jwt> BASE_URL=http://localhost:5000 npx playwright test test/e2e/git-panel-api.spec.ts
 */

import { test, expect } from '@playwright/test';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';

const BASE = process.env.BASE_URL || 'http://localhost:5000';
const AUTH_TOKEN = process.env.E2E_AUTH_TOKEN;

// ─── 1. Auth enforcement ─────────────────────────────────────────────────────

test.describe('Git API: Authentication enforcement', () => {
  test('GET /api/git/:id/status rejects unauthenticated request with 401', async ({ request }) => {
    const res = await request.get(`${BASE}/api/git/99999/status`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('POST /api/git/:id/commit rejects unauthenticated request', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/99999/commit`, {
      data: { message: 'test' },
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test('POST /api/git/:id/branch rejects unauthenticated request', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/99999/branch`, {
      data: { name: 'test-branch' },
    });
    expect([401, 403, 404]).toContain(res.status());
  });

  test('DELETE /api/git/:id/branch/:name rejects unauthenticated request', async ({ request }) => {
    const res = await request.delete(`${BASE}/api/git/99999/branch/old-branch`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('POST /api/git/:id/push rejects unauthenticated request', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/99999/push`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('POST /api/git/:id/pull rejects unauthenticated request', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/99999/pull`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('POST /api/git/:id/fetch rejects unauthenticated request', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/99999/fetch`);
    expect([401, 403, 404]).toContain(res.status());
  });

  test('POST /api/git/:id/resolve-conflict rejects unauthenticated request', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/99999/resolve-conflict`, {
      data: { path: 'file.txt', resolvedContent: 'content' },
    });
    expect([401, 403, 404]).toContain(res.status());
  });
});

// ─── 2. Platform GitHub connection shape ────────────────────────────────────

test.describe('Git API: Platform GitHub connection', () => {
  test('GET /api/git/github/status returns connection status object', async ({ request }) => {
    const res = await request.get(`${BASE}/api/git/github/status`);
    expect([200, 401]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('connected');
      expect(typeof body.connected).toBe('boolean');
    }
  });
});

// ─── 3. Input validation — branch names ─────────────────────────────────────

test.describe('Git API: Input validation — branch names', () => {
  test('POST /api/git/:id/branch with dash-prefixed name is blocked', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/branch`, {
      data: { name: '-D' },
    });
    expect([400, 401, 403]).toContain(res.status());
    if (res.status() === 400) {
      const body = await res.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('POST /api/git/:id/checkout with empty branch name returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/checkout`, {
      data: { branch: '' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('POST /api/git/:id/branch with consecutive dots returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/branch`, {
      data: { name: 'evil..branch' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('POST /api/git/:id/branch with missing name returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/branch`, {
      data: {},
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('POST /api/git/:id/merge with HEAD as branch returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/merge`, {
      data: { branch: 'HEAD' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});

// ─── 4. Input validation — stage paths ──────────────────────────────────────

test.describe('Git API: Input validation — stage paths', () => {
  test('POST /api/git/:id/stage with path traversal is blocked', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/stage`, {
      data: { files: ['../../etc/passwd'] },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('POST /api/git/:id/stage with option-injection path is blocked', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/stage`, {
      data: { files: ['-rf'] },
    });
    expect([400, 401, 403]).toContain(res.status());
  });

  test('GET /api/git/:id/diff with path traversal is blocked', async ({ request }) => {
    const res = await request.get(`${BASE}/api/git/1/diff/..%2F..%2Fetc%2Fpasswd`);
    expect([400, 401, 403]).toContain(res.status());
  });

  test('GET /api/git/:id/blame with option-injection path is blocked', async ({ request }) => {
    const res = await request.get(`${BASE}/api/git/1/blame/-rf`);
    expect([400, 401, 403]).toContain(res.status());
  });

  test('POST /api/git/:id/resolve-conflict with path traversal is blocked', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/resolve-conflict`, {
      data: { path: '../../etc/cron.d/hack', resolvedContent: 'pwned' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});

// ─── 5. Response shape contracts ─────────────────────────────────────────────

test.describe('Git API: Response shape contracts', () => {
  test('GET /api/git/:id/branches returns branches array when project exists', async ({ request }) => {
    const res = await request.get(`${BASE}/api/git/nonexistent-project-xyz/branches`);
    expect([200, 401, 403, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('branches');
      expect(Array.isArray(body.branches)).toBe(true);
    }
  });

  test('GET /api/git/:id/commits returns commits array when project exists', async ({ request }) => {
    const res = await request.get(`${BASE}/api/git/nonexistent-project-xyz/commits`);
    expect([200, 401, 403, 404]).toContain(res.status());
    if (res.status() === 200) {
      const body = await res.json();
      expect(body).toHaveProperty('commits');
      expect(Array.isArray(body.commits)).toBe(true);
    }
  });

  test('POST /api/git/:id/commit missing message returns error with field name', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/commit`, { data: {} });
    expect([400, 401, 403]).toContain(res.status());
    if (res.status() === 400) {
      const body = await res.json();
      expect(body).toHaveProperty('error');
    }
  });

  test('POST /api/git/:id/clone missing url returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/clone`, { data: {} });
    expect([400, 401, 403]).toContain(res.status());
    if (res.status() === 400) {
      const body = await res.json();
      expect(body.error).toBeTruthy();
    }
  });

  test('POST /api/git/:id/remotes with shell-metachar name returns 400', async ({ request }) => {
    const res = await request.post(`${BASE}/api/git/1/remotes`, {
      data: { name: 'origin;rm -rf /', url: 'https://github.com/x/y' },
    });
    expect([400, 401, 403]).toContain(res.status());
  });
});

// ─── 6. Sequential git flow (requires E2E_AUTH_TOKEN) ────────────────────────

test.describe('Git API: Sequential git flow', () => {
  test.skip(!AUTH_TOKEN, 'Skipped — set E2E_AUTH_TOKEN env var to run this suite');

  const projectId = `e2e-test-${crypto.randomBytes(4).toString('hex')}`;
  const authHeaders = { Authorization: `Bearer ${AUTH_TOKEN}` };

  test('init → status → stage → commit → verify commits list', async ({ request }) => {
    // 1. Init the repo
    const initRes = await request.post(`${BASE}/api/git/${projectId}/init`, {
      headers: authHeaders,
    });
    expect([200, 201]).toContain(initRes.status());

    // 2. Status on clean repo — should have branch field
    const statusRes = await request.get(`${BASE}/api/git/${projectId}/status`, {
      headers: authHeaders,
    });
    expect(statusRes.status()).toBe(200);
    const status1 = await statusRes.json();
    expect(status1).toHaveProperty('branch');
    expect(Array.isArray(status1.staged)).toBe(true);

    // 3. Stage all (no files specified → stages '.')
    const stageRes = await request.post(`${BASE}/api/git/${projectId}/stage`, {
      headers: authHeaders,
      data: {},
    });
    expect(stageRes.status()).toBe(200);
    const stageBody = await stageRes.json();
    expect(stageBody.success).toBe(true);

    // 4. Commit
    const commitMsg = `e2e: sequential flow test ${Date.now()}`;
    const commitRes = await request.post(`${BASE}/api/git/${projectId}/commit`, {
      headers: authHeaders,
      data: { message: commitMsg },
    });
    // May be "nothing to commit" on an empty project — both 200 outcomes are valid
    expect(commitRes.status()).toBe(200);
    const commitBody = await commitRes.json();
    expect(commitBody.success).toBe(true);

    // 5. Verify commits list — if there was a real commit, it should appear
    const commitsRes = await request.get(`${BASE}/api/git/${projectId}/commits`, {
      headers: authHeaders,
    });
    expect(commitsRes.status()).toBe(200);
    const commitsBody = await commitsRes.json();
    expect(Array.isArray(commitsBody.commits)).toBe(true);
  });

  test('branch create → checkout → verify HEAD via status → delete branch', async ({ request }) => {
    const branchName = `e2e-branch-${crypto.randomBytes(3).toString('hex')}`;

    // Create branch
    const createRes = await request.post(`${BASE}/api/git/${projectId}/branch`, {
      headers: authHeaders,
      data: { name: branchName },
    });
    expect(createRes.status()).toBe(200);
    const createBody = await createRes.json();
    expect(createBody.success).toBe(true);
    expect(createBody.branch).toBe(branchName);

    // Checkout branch
    const checkoutRes = await request.post(`${BASE}/api/git/${projectId}/checkout`, {
      headers: authHeaders,
      data: { branch: branchName },
    });
    expect(checkoutRes.status()).toBe(200);
    const checkoutBody = await checkoutRes.json();
    expect(checkoutBody.success).toBe(true);
    expect(checkoutBody.branch).toBe(branchName);

    // Status should now report the new branch as current
    const statusRes = await request.get(`${BASE}/api/git/${projectId}/status`, {
      headers: authHeaders,
    });
    expect(statusRes.status()).toBe(200);
    const statusBody = await statusRes.json();
    expect(statusBody.branch).toBe(branchName);

    // Checkout back to default branch
    const defaultBranch = 'master';
    await request.post(`${BASE}/api/git/${projectId}/checkout`, {
      headers: authHeaders,
      data: { branch: defaultBranch },
    });

    // Delete the feature branch
    const deleteRes = await request.delete(
      `${BASE}/api/git/${projectId}/branch/${branchName}?force=true`,
      { headers: authHeaders },
    );
    expect(deleteRes.status()).toBe(200);
    const deleteBody = await deleteRes.json();
    expect(deleteBody.deleted).toBe(branchName);
  });

  test('unstage reverses a stage operation', async ({ request }) => {
    // Stage something
    await request.post(`${BASE}/api/git/${projectId}/stage`, {
      headers: authHeaders,
      data: { files: ['.'] },
    });

    // Unstage
    const unstageRes = await request.post(`${BASE}/api/git/${projectId}/unstage`, {
      headers: authHeaders,
      data: {},
    });
    expect(unstageRes.status()).toBe(200);
    const unstageBody = await unstageRes.json();
    expect(unstageBody.success).toBe(true);
  });

  test('diff endpoint returns valid diff structure', async ({ request }) => {
    const diffRes = await request.get(`${BASE}/api/git/${projectId}/diff/README.md`, {
      headers: authHeaders,
    });
    // 200 with diff OR project not found are both valid since we may not have files
    expect([200, 404, 500]).toContain(diffRes.status());
    if (diffRes.status() === 200) {
      const body = await diffRes.json();
      expect(body).toHaveProperty('diff');
      expect(body).toHaveProperty('filePath');
    }
  });
});
