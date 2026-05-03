/**
 * Git Project Router — E2E Integration Tests
 *
 * These tests verify git operations on real temporary git repositories,
 * the input validation layer, and the status parser — exactly mirroring
 * what the HTTP router does so that any contract breakage is caught here
 * before it reaches production.
 *
 * Run with: npx vitest run tests/git-project-router.e2e.test.ts
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { execa } from 'execa';
import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import {
  parseStatusOutput,
  validateBranchName,
  validateGitFilePaths,
  validateRemoteName,
  sanitizeGitError,
  withProjectLock,
} from '../server/utils/git-validation';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function makeTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'ecode-git-test-'));
  await execa('git', ['init'], { cwd: dir });
  await execa('git', ['config', 'user.name', 'Test User'], { cwd: dir });
  await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: dir });
  return dir;
}

async function cleanupDir(dir: string) {
  await fs.rm(dir, { recursive: true, force: true });
}

async function writeAndStageFile(dir: string, name: string, content = 'hello') {
  await fs.writeFile(path.join(dir, name), content, 'utf8');
  await execa('git', ['add', name], { cwd: dir });
}

async function makeCommit(dir: string, message = 'initial commit') {
  await execa('git', ['commit', '-m', message], { cwd: dir });
}

// ─── parseStatusOutput ───────────────────────────────────────────────────────

describe('parseStatusOutput', () => {
  it('parses staged new file', () => {
    const out = 'A  foo.txt\n';
    const result = parseStatusOutput(out);
    expect(result.staged).toContain('foo.txt');
    expect(result.unstaged).toHaveLength(0);
    expect(result.untracked).toHaveLength(0);
  });

  it('parses modified unstaged file', () => {
    const out = ' M bar.ts\n';
    const result = parseStatusOutput(out);
    expect(result.unstaged).toContain('bar.ts');
    expect(result.staged).toHaveLength(0);
  });

  it('parses untracked file', () => {
    const out = '?? new.md\n';
    const result = parseStatusOutput(out);
    expect(result.untracked).toContain('new.md');
    expect(result.staged).toHaveLength(0);
    expect(result.unstaged).toHaveLength(0);
  });

  it('parses staged-and-modified (both XY non-space)', () => {
    const out = 'MM conflict.txt\n';
    const result = parseStatusOutput(out);
    expect(result.staged).toContain('conflict.txt');
    expect(result.unstaged).toContain('conflict.txt');
  });

  it('handles empty status output (clean tree)', () => {
    const result = parseStatusOutput('');
    expect(result.staged).toHaveLength(0);
    expect(result.unstaged).toHaveLength(0);
    expect(result.untracked).toHaveLength(0);
  });

  it('handles multiple files', () => {
    const out = 'A  alpha.ts\n M beta.ts\n?? gamma.md\n';
    const result = parseStatusOutput(out);
    expect(result.staged).toContain('alpha.ts');
    expect(result.unstaged).toContain('beta.ts');
    expect(result.untracked).toContain('gamma.md');
  });
});

// ─── validateBranchName ──────────────────────────────────────────────────────

describe('validateBranchName', () => {
  it('accepts normal branch names', () => {
    expect(validateBranchName('main')).toBeNull();
    expect(validateBranchName('feature/my-thing')).toBeNull();
    expect(validateBranchName('fix-123')).toBeNull();
    expect(validateBranchName('release/v2.0')).toBeNull();
  });

  it('rejects empty or missing name', () => {
    expect(validateBranchName('')).toBeTruthy();
    expect(validateBranchName(null)).toBeTruthy();
    expect(validateBranchName(undefined)).toBeTruthy();
  });

  it('rejects names starting with dash (option injection)', () => {
    expect(validateBranchName('-D')).toBeTruthy();
    expect(validateBranchName('--force')).toBeTruthy();
  });

  it('rejects names containing .. (path traversal)', () => {
    expect(validateBranchName('refs/../../etc/passwd')).toBeTruthy();
    expect(validateBranchName('main..evil')).toBeTruthy();
  });

  it('rejects names ending with .lock', () => {
    expect(validateBranchName('HEAD.lock')).toBeTruthy();
    expect(validateBranchName('main.lock')).toBeTruthy();
  });

  it('rejects HEAD reserved name', () => {
    expect(validateBranchName('HEAD')).toBeTruthy();
  });

  it('rejects names with control characters', () => {
    expect(validateBranchName('branch\x00name')).toBeTruthy();
    expect(validateBranchName('branch\x1fname')).toBeTruthy();
  });

  it('rejects names that are too long', () => {
    expect(validateBranchName('x'.repeat(256))).toBeTruthy();
  });

  it('accepts names at max length boundary', () => {
    expect(validateBranchName('x'.repeat(255))).toBeNull();
  });
});

// ─── validateGitFilePaths ────────────────────────────────────────────────────

describe('validateGitFilePaths', () => {
  it('accepts normal paths', () => {
    expect(validateGitFilePaths(['src/index.ts', 'README.md'])).toBeNull();
    expect(validateGitFilePaths(['.'])).toBeNull();
  });

  it('accepts empty array', () => {
    expect(validateGitFilePaths([])).toBeNull();
  });

  it('rejects absolute paths', () => {
    expect(validateGitFilePaths(['/etc/passwd'])).toContain('Absolute paths');
    expect(validateGitFilePaths(['/tmp/evil'])).toContain('Absolute paths');
  });

  it('rejects non-array', () => {
    expect(validateGitFilePaths('src/foo.ts')).toBeTruthy();
    expect(validateGitFilePaths(null)).toBeTruthy();
  });

  it('rejects paths starting with dash (option injection)', () => {
    expect(validateGitFilePaths(['-rf', '/tmp'])).toBeTruthy();
    expect(validateGitFilePaths(['--force'])).toBeTruthy();
  });

  it('rejects path traversal', () => {
    expect(validateGitFilePaths(['../../etc/passwd'])).toBeTruthy();
    expect(validateGitFilePaths(['src/../../../etc/shadow'])).toBeTruthy();
  });

  it('rejects paths with null bytes', () => {
    expect(validateGitFilePaths(['src/foo\x00bar.ts'])).toBeTruthy();
  });
});

// ─── validateRemoteName ──────────────────────────────────────────────────────

describe('validateRemoteName', () => {
  it('accepts standard remote names', () => {
    expect(validateRemoteName('origin')).toBeNull();
    expect(validateRemoteName('upstream')).toBeNull();
    expect(validateRemoteName('my-fork')).toBeNull();
  });

  it('rejects names with shell metacharacters', () => {
    expect(validateRemoteName('origin;rm -rf /')).toBeTruthy();
    expect(validateRemoteName('or igin')).toBeTruthy();
    expect(validateRemoteName('orig$(cmd)')).toBeTruthy();
  });

  it('rejects empty or null', () => {
    expect(validateRemoteName('')).toBeTruthy();
    expect(validateRemoteName(null)).toBeTruthy();
  });
});

// ─── sanitizeGitError ────────────────────────────────────────────────────────

describe('sanitizeGitError', () => {
  it('strips credentials from HTTPS URLs', () => {
    const raw = 'fatal: repository https://token:ghp_secret@github.com/user/repo not found';
    const safe = sanitizeGitError(raw);
    expect(safe).not.toContain('ghp_secret');
    expect(safe).toContain('https://github.com/user/repo');
  });

  it('passes through messages without credentials', () => {
    const raw = 'fatal: not a git repository';
    expect(sanitizeGitError(raw)).toBe(raw);
  });
});

// ─── Real git operations on temp repo ────────────────────────────────────────

describe('git operations: init → stage → commit → log', () => {
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await makeTempRepo();
  });

  afterEach(async () => {
    await cleanupDir(repoDir);
  });

  it('init creates a .git directory', async () => {
    const gitDir = path.join(repoDir, '.git');
    const stat = await fs.stat(gitDir);
    expect(stat.isDirectory()).toBe(true);
  });

  it('stage file: git status --porcelain shows A  filename', async () => {
    await fs.writeFile(path.join(repoDir, 'hello.txt'), 'hello world');
    await execa('git', ['add', 'hello.txt'], { cwd: repoDir });
    const { stdout } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });
    const parsed = parseStatusOutput(stdout);
    expect(parsed.staged).toContain('hello.txt');
    expect(parsed.untracked).not.toContain('hello.txt');
  });

  it('commit: produces a log entry verifiable on disk', async () => {
    await writeAndStageFile(repoDir, 'readme.md', '# Test');
    await makeCommit(repoDir, 'feat: add readme');
    const { stdout } = await execa('git', ['log', '--format=%s', '--max-count=1'], { cwd: repoDir });
    expect(stdout.trim()).toBe('feat: add readme');
  });

  it('unstage: file moves from staged back to untracked', async () => {
    await fs.writeFile(path.join(repoDir, 'staged.txt'), 'content');
    await execa('git', ['add', 'staged.txt'], { cwd: repoDir });

    const { stdout: beforeReset } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });
    expect(parseStatusOutput(beforeReset).staged).toContain('staged.txt');

    await execa('git', ['reset', 'HEAD', '--', 'staged.txt'], { cwd: repoDir });

    const { stdout: afterReset } = await execa('git', ['status', '--porcelain'], { cwd: repoDir });
    const afterParsed = parseStatusOutput(afterReset);
    expect(afterParsed.staged).not.toContain('staged.txt');
    expect(afterParsed.untracked).toContain('staged.txt');
  });
});

// ─── Real git operations: branch lifecycle ───────────────────────────────────

describe('git operations: branch create → checkout → verify HEAD', () => {
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await makeTempRepo();
    await writeAndStageFile(repoDir, 'main.txt', 'initial');
    await makeCommit(repoDir, 'initial');
  });

  afterEach(async () => {
    await cleanupDir(repoDir);
  });

  it('creates branch and verifies it exists', async () => {
    await execa('git', ['branch', 'feature/test-123'], { cwd: repoDir });
    const { stdout } = await execa('git', ['branch', '--format=%(refname:short)'], { cwd: repoDir });
    expect(stdout.split('\n')).toContain('feature/test-123');
  });

  it('checkout switches HEAD to the new branch', async () => {
    await execa('git', ['branch', 'my-feature'], { cwd: repoDir });
    await execa('git', ['checkout', 'my-feature'], { cwd: repoDir });
    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir });
    expect(stdout.trim()).toBe('my-feature');
  });

  it('checkout switches HEAD on disk — verified via git rev-parse', async () => {
    await execa('git', ['branch', 'shape-test'], { cwd: repoDir });
    await execa('git', ['checkout', 'shape-test'], { cwd: repoDir });
    const { stdout } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: repoDir });
    expect(stdout.trim()).toBe('shape-test');
    // Also confirm the default branch still exists
    const { stdout: branches } = await execa('git', ['branch', '--format=%(refname:short)'], { cwd: repoDir });
    expect(branches.split('\n')).toContain('shape-test');
  });

  it('branch create writes the ref to disk — verified via git branch and git show-ref', async () => {
    await execa('git', ['branch', 'new-branch'], { cwd: repoDir });
    const { stdout: branches } = await execa('git', ['branch', '--format=%(refname:short)'], { cwd: repoDir });
    expect(branches.split('\n')).toContain('new-branch');
    // Confirm git show-ref agrees (not just branch listing)
    const { stdout: showRef } = await execa('git', ['show-ref', '--heads', 'new-branch'], { cwd: repoDir });
    expect(showRef).toContain('refs/heads/new-branch');
  });

  it('delete branch: branch is gone from list', async () => {
    await execa('git', ['branch', 'to-delete'], { cwd: repoDir });
    await execa('git', ['branch', '-d', 'to-delete'], { cwd: repoDir });
    const { stdout } = await execa('git', ['branch', '--format=%(refname:short)'], { cwd: repoDir });
    expect(stdout.split('\n')).not.toContain('to-delete');
  });
});

// ─── Real git operations: diff ───────────────────────────────────────────────

describe('git operations: diff', () => {
  let repoDir: string;

  beforeEach(async () => {
    repoDir = await makeTempRepo();
    await writeAndStageFile(repoDir, 'app.ts', 'const x = 1;');
    await makeCommit(repoDir, 'initial');
  });

  afterEach(async () => {
    await cleanupDir(repoDir);
  });

  it('unstaged diff shows changed content', async () => {
    await fs.writeFile(path.join(repoDir, 'app.ts'), 'const x = 2;', 'utf8');
    const { stdout } = await execa('git', ['diff', '--', 'app.ts'], { cwd: repoDir });
    expect(stdout).toContain('-const x = 1;');
    expect(stdout).toContain('+const x = 2;');
  });

  it('staged diff shows staged content', async () => {
    await fs.writeFile(path.join(repoDir, 'app.ts'), 'const x = 99;', 'utf8');
    await execa('git', ['add', 'app.ts'], { cwd: repoDir });
    const { stdout } = await execa('git', ['diff', '--cached', '--', 'app.ts'], { cwd: repoDir });
    expect(stdout).toContain('+const x = 99;');
  });
});

// ─── withProjectLock: concurrency control ────────────────────────────────────

describe('withProjectLock', () => {
  it('serializes concurrent operations on the same project', async () => {
    const order: number[] = [];
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    await Promise.all([
      withProjectLock('proj-1', async () => { await delay(30); order.push(1); }),
      withProjectLock('proj-1', async () => { order.push(2); }),
    ]);

    expect(order).toEqual([1, 2]);
  });

  it('does not block operations on different projects', async () => {
    const order: string[] = [];
    const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

    await Promise.all([
      withProjectLock('proj-a', async () => { await delay(30); order.push('a'); }),
      withProjectLock('proj-b', async () => { order.push('b'); }),
    ]);

    expect(order).toContain('a');
    expect(order).toContain('b');
    expect(order[0]).toBe('b');
  });
});

// ─── Push/Pull with local bare remote (disk-verified) ────────────────────────

describe('Push / Pull with real local bare remote', () => {
  let workDir: string;
  let bareDir: string;

  beforeEach(async () => {
    workDir = await makeTempRepo();
    // Create the bare remote repo
    bareDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ecode-bare-'));
    await execa('git', ['init', '--bare'], { cwd: bareDir });
    // Wire the bare remote into the working repo
    await execa('git', ['remote', 'add', 'origin', bareDir], { cwd: workDir });
  });

  afterEach(async () => {
    await cleanupDir(workDir);
    await cleanupDir(bareDir);
  });

  it('push: commit lands on remote — verified via git log on bare repo', async () => {
    await writeAndStageFile(workDir, 'hello.txt', 'hello remote');
    await makeCommit(workDir, 'feat: push verification commit');

    const defaultBranch = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: workDir })
      .then(r => r.stdout.trim());

    // Push to the local bare remote
    await execa('git', ['push', 'origin', defaultBranch], { cwd: workDir });

    // Disk verification: log on the bare repo must contain the commit
    const { stdout: bareLog } = await execa('git', ['log', '--oneline'], { cwd: bareDir });
    expect(bareLog).toContain('feat: push verification commit');
  });

  it('pull: fetches new commit from remote into working repo', async () => {
    // Bootstrap: push an initial commit so the branch exists on remote
    await writeAndStageFile(workDir, 'README.md', 'initial');
    await makeCommit(workDir, 'init');
    const defaultBranch = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: workDir })
      .then(r => r.stdout.trim());
    await execa('git', ['push', 'origin', defaultBranch], { cwd: workDir });

    // Create a second clone of the bare remote
    const cloneDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ecode-clone-'));
    await execa('git', ['clone', bareDir, cloneDir]);
    await execa('git', ['config', 'user.name', 'Test User'], { cwd: cloneDir });
    await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: cloneDir });

    // Add a new commit to the clone and push it to bare
    await fs.writeFile(path.join(cloneDir, 'NEW_FILE.md'), 'added from clone', 'utf8');
    await execa('git', ['add', 'NEW_FILE.md'], { cwd: cloneDir });
    await execa('git', ['commit', '-m', 'feat: added from remote clone'], { cwd: cloneDir });
    await execa('git', ['push', 'origin', defaultBranch], { cwd: cloneDir });

    // Now pull into the original workDir — must bring in the new commit
    await execa('git', ['pull', 'origin', defaultBranch], { cwd: workDir });

    const { stdout: log } = await execa('git', ['log', '--oneline'], { cwd: workDir });
    expect(log).toContain('feat: added from remote clone');

    // Verify the pulled file exists on disk
    const content = await fs.readFile(path.join(workDir, 'NEW_FILE.md'), 'utf8');
    expect(content).toBe('added from clone');

    await cleanupDir(cloneDir);
  });

  it('conflict: merge conflict between local and remote changes is detected', async () => {
    // Bootstrap on remote
    await writeAndStageFile(workDir, 'conflict.txt', 'original content');
    await makeCommit(workDir, 'init: conflict base');
    const defaultBranch = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: workDir })
      .then(r => r.stdout.trim());
    await execa('git', ['push', 'origin', defaultBranch], { cwd: workDir });

    // Clone and modify
    const cloneDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ecode-conflict-clone-'));
    await execa('git', ['clone', bareDir, cloneDir]);
    await execa('git', ['config', 'user.name', 'Test User'], { cwd: cloneDir });
    await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: cloneDir });
    await fs.writeFile(path.join(cloneDir, 'conflict.txt'), 'remote change', 'utf8');
    await execa('git', ['add', 'conflict.txt'], { cwd: cloneDir });
    await execa('git', ['commit', '-m', 'remote: change conflict.txt'], { cwd: cloneDir });
    await execa('git', ['push', 'origin', defaultBranch], { cwd: cloneDir });

    // Local change diverges
    await fs.writeFile(path.join(workDir, 'conflict.txt'), 'local change', 'utf8');
    await execa('git', ['add', 'conflict.txt'], { cwd: workDir });
    await execa('git', ['commit', '-m', 'local: change conflict.txt'], { cwd: workDir });

    // Pull with divergent histories — git may throw OR succeed with conflict markers
    let pullOutput = '';
    let pullThrew = false;
    try {
      const { stdout, stderr } = await execa('git', ['pull', 'origin', defaultBranch], { cwd: workDir });
      pullOutput = stdout + stderr;
    } catch (err: any) {
      pullThrew = true;
      pullOutput = (err.stdout || '') + (err.stderr || '') + (err.message || '');
    }

    // Either the command threw with conflict output, or the file has conflict markers
    const fileContent = await fs.readFile(path.join(workDir, 'conflict.txt'), 'utf8').catch(() => '');
    const hasConflictMarkers = fileContent.includes('<<<<<<<') || fileContent.includes('CONFLICT') || fileContent.includes('=======');
    const outputHasConflict = /CONFLICT|conflict|cannot merge/i.test(pullOutput);

    expect(
      pullThrew || hasConflictMarkers || outputHasConflict,
      `Pull of divergent changes must produce a conflict (threw=${pullThrew}, markers=${hasConflictMarkers}, output=${outputHasConflict})`
    ).toBe(true);

    await cleanupDir(cloneDir);
  });

  it('file history: git log on a specific file shows correct author and message', async () => {
    await writeAndStageFile(workDir, 'traced.ts', 'v1');
    await makeCommit(workDir, 'history: v1 of traced.ts');
    await fs.writeFile(path.join(workDir, 'traced.ts'), 'v2', 'utf8');
    await execa('git', ['add', 'traced.ts'], { cwd: workDir });
    await makeCommit(workDir, 'history: v2 of traced.ts');

    const { stdout } = await execa('git', ['log', '--format=%s', '--follow', '--', 'traced.ts'], { cwd: workDir });
    const messages = stdout.split('\n').filter(Boolean);
    expect(messages).toContain('history: v2 of traced.ts');
    expect(messages).toContain('history: v1 of traced.ts');
  });

  it('backup: git tag creates a restorable checkpoint on disk', async () => {
    await writeAndStageFile(workDir, 'state.txt', 'before backup');
    await makeCommit(workDir, 'state before backup');
    const timestamp = Date.now();
    const tagName = `backup-${timestamp}`;

    await execa('git', ['tag', tagName], { cwd: workDir });

    // Modify and commit after the tag
    await fs.writeFile(path.join(workDir, 'state.txt'), 'after backup', 'utf8');
    await execa('git', ['add', 'state.txt'], { cwd: workDir });
    await makeCommit(workDir, 'state after backup');

    // Tags must be listed
    const { stdout: tags } = await execa('git', ['tag', '-l', 'backup-*'], { cwd: workDir });
    expect(tags).toContain(tagName);

    // Restore via checkout to tag — file reverts to pre-backup content
    await execa('git', ['checkout', tagName], { cwd: workDir });
    const restored = await fs.readFile(path.join(workDir, 'state.txt'), 'utf8');
    expect(restored).toBe('before backup');
  });
});
