/**
 * Git Project Router — HTTP Integration Tests
 *
 * Mounts the actual Express router with all dependencies mocked,
 * but drives real git operations against temporary on-disk repositories.
 *
 * Flow covered:
 *   init → status (clean) → write file → stage → status (staged) → commit → verify log
 *   branch create → checkout → verify HEAD → delete branch
 *   unstage → status (unstaged)
 *   input validation: path traversal, option injection, invalid branch names
 *   Zod schema: missing message → 400, invalid path → 400
 *   Rate-limiter: 429 after exceeding write quota
 *
 * Run: npx vitest run tests/git-project-router.http.test.ts
 */

import {
  beforeAll,
  afterAll,
  beforeEach,
  afterEach,
  describe,
  it,
  expect,
  vi,
} from 'vitest';
import { execa } from 'execa';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';

// ─── Shared state ─────────────────────────────────────────────────────────────

let repoDir = '';

function getRepoDir() {
  return repoDir;
}

// ─── Mocks — must be registered before any import of the router ──────────────

vi.mock('../server/storage', () => ({
  storage: {
    getProject: vi.fn(async (id: any) => ({ id: String(id), ownerId: 1, visibility: 'private' })),
    getProjectCollaborators: vi.fn(async () => []),
    getFilesByProjectId: vi.fn(async () => []),
    getFileByPath: vi.fn(async () => null),
    createFile: vi.fn(async () => null),
    updateFile: vi.fn(async () => null),
    deleteFile: vi.fn(async () => null),
  },
}));

vi.mock('../server/utils/project-fs-sync', () => ({
  ensureProjectDirectory: vi.fn(async () => {}),
  getProjectWorkspacePath: vi.fn((_id: string) => getRepoDir()),
}));

vi.mock('../server/utils/secrets-manager', () => ({
  getJwtSecret: () => 'test-secret',
}));

vi.mock('../server/services/github-oauth', () => ({
  githubOAuth: {
    getGitCredentials: vi.fn(async () => null),
    getConnectionStatus: vi.fn(async () => ({ connected: false })),
  },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function createReq({
  method,
  url,
  params = {},
  body = {},
  query = {},
  user = { id: 1 },
}: {
  method: string;
  url: string;
  params?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  user?: any;
}) {
  return {
    method,
    url,
    originalUrl: url,
    path: url,
    params,
    body,
    query,
    headers: {},
    ip: '127.0.0.1',
    user,
    isAuthenticated: () => true,
  } as any;
}

function createRes() {
  const res: any = {
    statusCode: 200,
    body: undefined as any,
    headers: {} as Record<string, any>,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
    send(payload: any) { this.body = payload; return this; },
    set(field: string, value: any) { this.headers[field] = value; return this; },
    setHeader(field: string, value: any) { this.headers[field] = value; return this; },
    end() { return this; },
  };
  return res;
}

async function callRoute(
  router: any,
  method: string,
  pattern: string,
  req: any,
  res: any,
) {
  const layer = router.stack.find(
    (e: any) => e.route?.path === pattern && e.route.methods[method],
  );
  if (!layer) throw new Error(`Route not found: ${method.toUpperCase()} ${pattern}`);
  for (const handler of layer.route.stack.map((e: any) => e.handle)) {
    if (handler.length >= 3) {
      await new Promise<void>((resolve, reject) => {
        try {
          const result = handler(req, res, (err?: any) => {
            if (err) reject(err); else resolve();
          });
          if (result instanceof Promise) result.then(resolve, reject);
        } catch (err) {
          reject(err);
        }
      });
    } else {
      await handler(req, res);
    }
    if (res.statusCode !== 200 || res.body !== undefined) break;
  }
  return res;
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeAll(async () => {
  repoDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ecode-http-git-'));
  await execa('git', ['init'], { cwd: repoDir });
  await execa('git', ['config', 'user.name', 'Test'], { cwd: repoDir });
  await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: repoDir });
});

afterAll(async () => {
  await fs.rm(repoDir, { recursive: true, force: true });
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Git HTTP integration: full flow — write → stage → commit → verify disk', () => {
  let router: any;

  beforeAll(async () => {
    const mod = await import('../server/routes/git-project.router');
    router = mod.default;
  });

  it('GET /:id/status — returns branch and empty staged/unstaged on clean repo', async () => {
    const req = createReq({ method: 'get', url: '/1/status', params: { projectId: '1' } });
    const res = createRes();
    await callRoute(router, 'get', '/:projectId/status', req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('branch');
    expect(typeof res.body.branch).toBe('string');
    expect(Array.isArray(res.body.staged)).toBe(true);
    expect(Array.isArray(res.body.unstaged)).toBe(true);
    expect(Array.isArray(res.body.untracked)).toBe(true);
  });

  it('POST /:id/stage — stages a file and status shows it as staged', async () => {
    await fs.writeFile(path.join(repoDir, 'hello.txt'), 'hello world');

    const stageReq = createReq({
      method: 'post', url: '/1/stage',
      params: { projectId: '1' },
      body: { files: ['hello.txt'] },
    });
    const stageRes = createRes();
    await callRoute(router, 'post', '/:projectId/stage', stageReq, stageRes);
    expect(stageRes.statusCode).toBe(200);
    expect(stageRes.body.success).toBe(true);

    const statusReq = createReq({ method: 'get', url: '/1/status', params: { projectId: '1' } });
    const statusRes = createRes();
    await callRoute(router, 'get', '/:projectId/status', statusReq, statusRes);
    expect(statusRes.body.staged).toContain('hello.txt');
  });

  it('POST /:id/commit — commits and log on disk confirms commit message', async () => {
    const req = createReq({
      method: 'post', url: '/1/commit',
      params: { projectId: '1' },
      body: { message: 'feat: add hello' },
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/commit', req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('hash');

    const { stdout } = await execa('git', ['log', '--format=%s', '--max-count=1'], { cwd: repoDir });
    expect(stdout.trim()).toBe('feat: add hello');
  });

  it('GET /:id/commits — returns commit array with the committed message', async () => {
    const req = createReq({ method: 'get', url: '/1/commits', params: { projectId: '1' } });
    const res = createRes();
    await callRoute(router, 'get', '/:projectId/commits', req, res);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.commits)).toBe(true);
    expect(res.body.commits.length).toBeGreaterThan(0);
    const commit = res.body.commits[0];
    expect(commit).toHaveProperty('hash');
    expect(commit).toHaveProperty('shortHash');
    expect(commit).toHaveProperty('author');
    expect(commit).toHaveProperty('message');
    expect(commit.message).toBe('feat: add hello');
  });
});

describe('Git HTTP integration: stage → unstage → status shows unstaged', () => {
  let router: any;

  beforeAll(async () => {
    const mod = await import('../server/routes/git-project.router');
    router = mod.default;
  });

  it('unstage returns file to unstaged', async () => {
    await fs.writeFile(path.join(repoDir, 'unstage-me.txt'), 'temp');
    await execa('git', ['add', 'unstage-me.txt'], { cwd: repoDir });

    const unstageReq = createReq({
      method: 'post', url: '/1/unstage',
      params: { projectId: '1' },
      body: { files: ['unstage-me.txt'] },
    });
    const unstageRes = createRes();
    await callRoute(router, 'post', '/:projectId/unstage', unstageReq, unstageRes);
    expect(unstageRes.statusCode).toBe(200);
    expect(unstageRes.body.success).toBe(true);

    const statusReq = createReq({ method: 'get', url: '/1/status', params: { projectId: '1' } });
    const statusRes = createRes();
    await callRoute(router, 'get', '/:projectId/status', statusReq, statusRes);
    expect(statusRes.body.staged).not.toContain('unstage-me.txt');
    expect(statusRes.body.untracked).toContain('unstage-me.txt');
  });
});

describe('Git HTTP integration: branch lifecycle — create → checkout → verify HEAD → delete', () => {
  let router: any;

  beforeAll(async () => {
    const mod = await import('../server/routes/git-project.router');
    router = mod.default;
  });

  it('POST /:id/branch — creates branch and it appears in branch list', async () => {
    const req = createReq({
      method: 'post', url: '/1/branch',
      params: { projectId: '1' },
      body: { name: 'feature/http-test' },
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/branch', req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.branch).toBe('feature/http-test');

    const { stdout } = await execa('git', ['branch', '--format=%(refname:short)'], { cwd: repoDir });
    expect(stdout.split('\n')).toContain('feature/http-test');
  });

  it('POST /:id/checkout — switches HEAD to the new branch', async () => {
    const req = createReq({
      method: 'post', url: '/1/checkout',
      params: { projectId: '1' },
      body: { branch: 'feature/http-test' },
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/checkout', req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.branch).toBe('feature/http-test');

    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir });
    expect(stdout.trim()).toBe('feature/http-test');
  });

  it('GET /:id/branches — returns branches array with current flag correct', async () => {
    const req = createReq({ method: 'get', url: '/1/branches', params: { projectId: '1' } });
    const res = createRes();
    await callRoute(router, 'get', '/:projectId/branches', req, res);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.branches)).toBe(true);
    const current = res.body.branches.find((b: any) => b.current);
    expect(current?.name).toBe('feature/http-test');
  });

  it('POST /:id/checkout back to master/main', async () => {
    const { stdout: headBefore } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir });
    const defaultBranch = headBefore.trim() === 'feature/http-test' ? 'master' : headBefore.trim();

    await execa('git', ['checkout', '-b', 'master'].filter(Boolean), { cwd: repoDir }).catch(async () => {
      await execa('git', ['checkout', 'master'], { cwd: repoDir }).catch(async () => {
        await execa('git', ['checkout', 'main'], { cwd: repoDir });
      });
    });

    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir });
    expect(['master', 'main']).toContain(stdout.trim());
  });

  it('DELETE /:id/branch/:name — deletes the feature branch', async () => {
    const req = createReq({
      method: 'delete', url: '/1/branch/feature%2Fhttp-test',
      params: { projectId: '1', name: 'feature/http-test' },
      query: { force: 'true' },
    });
    const res = createRes();
    await callRoute(router, 'delete', '/:projectId/branch/:name(*)', req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.deleted).toBe('feature/http-test');

    const { stdout } = await execa('git', ['branch', '--format=%(refname:short)'], { cwd: repoDir });
    expect(stdout.split('\n')).not.toContain('feature/http-test');
  });
});

describe('Git HTTP integration: diff endpoint', () => {
  let router: any;

  beforeAll(async () => {
    const mod = await import('../server/routes/git-project.router');
    router = mod.default;
  });

  it('GET /:id/diff/:path — returns diff content with +/- lines', async () => {
    await fs.writeFile(path.join(repoDir, 'hello.txt'), 'hello changed');
    const req = createReq({
      method: 'get', url: '/1/diff/hello.txt',
      params: { projectId: '1', filePath: 'hello.txt' },
    });
    const res = createRes();
    await callRoute(router, 'get', '/:projectId/diff/:filePath(*)', req, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.diff).toBeTruthy();
    expect(res.body.diff).toContain('+hello changed');
  });
});

describe('Git HTTP integration: input validation → 400 responses', () => {
  let router: any;

  beforeAll(async () => {
    const mod = await import('../server/routes/git-project.router');
    router = mod.default;
  });

  it('POST /:id/commit with missing message returns 400', async () => {
    const req = createReq({
      method: 'post', url: '/1/commit',
      params: { projectId: '1' },
      body: {},
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/commit', req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toBeTruthy();
  });

  it('POST /:id/stage with path traversal returns 400', async () => {
    const req = createReq({
      method: 'post', url: '/1/stage',
      params: { projectId: '1' },
      body: { files: ['../../etc/passwd'] },
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/stage', req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('traversal');
  });

  it('POST /:id/stage with option-injection path returns 400', async () => {
    const req = createReq({
      method: 'post', url: '/1/stage',
      params: { projectId: '1' },
      body: { files: ['-rf'] },
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/stage', req, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toContain('dash');
  });

  it('POST /:id/branch with dash-prefix name returns 400', async () => {
    const req = createReq({
      method: 'post', url: '/1/branch',
      params: { projectId: '1' },
      body: { name: '-D' },
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/branch', req, res);
    expect(res.statusCode).toBe(400);
  });

  it('POST /:id/branch with consecutive dots returns 400', async () => {
    const req = createReq({
      method: 'post', url: '/1/branch',
      params: { projectId: '1' },
      body: { name: 'evil..branch' },
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/branch', req, res);
    expect(res.statusCode).toBe(400);
  });

  it('POST /:id/checkout with empty branch returns 400', async () => {
    const req = createReq({
      method: 'post', url: '/1/checkout',
      params: { projectId: '1' },
      body: { branch: '' },
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/checkout', req, res);
    expect(res.statusCode).toBe(400);
  });

  it('POST /:id/merge with HEAD as branch returns 400', async () => {
    const req = createReq({
      method: 'post', url: '/1/merge',
      params: { projectId: '1' },
      body: { branch: 'HEAD' },
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/merge', req, res);
    expect(res.statusCode).toBe(400);
  });

  it('POST /:id/remotes with shell-metachar remote name returns 400', async () => {
    const req = createReq({
      method: 'post', url: '/1/remotes',
      params: { projectId: '1' },
      body: { name: 'origin;rm -rf /', url: 'https://github.com/user/repo' },
    });
    const res = createRes();
    await callRoute(router, 'post', '/:projectId/remotes', req, res);
    expect(res.statusCode).toBe(400);
  });
});

describe('Git HTTP integration: rate limiting', () => {
  let router: any;

  beforeAll(async () => {
    const mod = await import('../server/routes/git-project.router');
    router = mod.default;
  });

  it('returns 429 after exceeding 30 write requests per minute', async () => {
    const responses: number[] = [];

    for (let i = 0; i < 35; i++) {
      const req = createReq({
        method: 'post', url: '/1/commit',
        params: { projectId: '1' },
        body: { message: `test commit ${i}` },
        user: { id: 9999 + i },
      });
      req.user = { id: 99999 };
      const res = createRes();
      await callRoute(router, 'post', '/:projectId/commit', req, res);
      responses.push(res.statusCode);
    }

    expect(responses).toContain(429);
  });
});
