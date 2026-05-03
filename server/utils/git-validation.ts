import path from 'path';

export function parseStatusOutput(stdout: string) {
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  stdout.split('\n').forEach((line) => {
    if (!line) return;
    const xy = line.substring(0, 2);
    const file = line.substring(3);
    if (xy === '??') { untracked.push(file); return; }
    if (xy[0] !== ' ' && xy[0] !== '?') staged.push(file);
    if (xy[1] !== ' ' && xy[1] !== '?') unstaged.push(file);
  });
  return { staged, unstaged, untracked };
}

export function validateBranchName(name: unknown): string | null {
  if (!name || typeof name !== 'string') return 'Branch name is required';
  if (name.trim() === '') return 'Branch name must not be empty';
  if (name.length > 255) return 'Branch name too long (max 255 characters)';
  if (name.startsWith('-')) return 'Branch name must not start with a dash';
  if (name.startsWith('.')) return 'Branch name must not start with a dot';
  if (name.endsWith('.')) return 'Branch name must not end with a dot';
  if (name.endsWith('.lock')) return 'Branch name must not end with .lock';
  if (name.includes('..')) return 'Branch name must not contain consecutive dots';
  if (name.includes('@{')) return 'Branch name must not contain @{';
  if (/[\x00-\x1f\x7f ~^:?*\\[\]]/.test(name)) return 'Branch name contains invalid characters';
  if (name === 'HEAD') return 'HEAD is a reserved name';
  return null;
}

export function validateGitFilePaths(rawPaths: unknown): string | null {
  if (!Array.isArray(rawPaths)) return 'paths must be an array';
  if (rawPaths.length === 0) return null;
  for (const p of rawPaths) {
    if (typeof p !== 'string') return 'Each path must be a string';
    if (p.includes('\0')) return 'Path contains null byte';
    if (p.startsWith('-')) return 'Path must not start with a dash (option injection prevented)';
    if (path.isAbsolute(p)) return `Absolute paths are not allowed: ${p}`;
    const normalized = path.normalize(p);
    if (normalized.startsWith('..') || p.includes('../')) {
      return `Path traversal not allowed: ${p}`;
    }
  }
  return null;
}

/**
 * Verify that a resolved file path is safely contained within the project root.
 * Returns an error message if the path escapes the root, null if safe.
 */
export function assertPathWithinRoot(projectDir: string, filePath: string): string | null {
  const resolved = path.resolve(projectDir, filePath);
  const root = path.resolve(projectDir);
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return `Path escapes project root: ${filePath}`;
  }
  return null;
}

export function validateRemoteName(name: unknown): string | null {
  if (!name || typeof name !== 'string') return 'Remote name is required';
  if (name.length > 100) return 'Remote name too long';
  if (!/^[a-zA-Z0-9_\-]+$/.test(name)) {
    return 'Remote name must be alphanumeric (dashes and underscores allowed)';
  }
  return null;
}

export function sanitizeGitError(msg: string): string {
  return msg.replace(/https?:\/\/[^@\s]+@/g, 'https://');
}

const _projectLocks = new Map<string, Promise<void>>();

/**
 * Serializes concurrent git operations on the same project.
 * Each call enqueues `fn` after the previous operation for the same projectId
 * completes (whether it resolved or rejected).
 *
 * Map entries are cleaned up in `finally` to prevent unbounded memory growth
 * in long-running multi-tenant deployments: once a project's promise chain
 * drains to an idle state (i.e., the stored shield IS the current promise),
 * the entry is removed so the Map stays proportional to actively-locked projects.
 */
export function withProjectLock<T>(projectId: string, fn: () => Promise<T>): Promise<T> {
  const current = _projectLocks.get(projectId) ?? Promise.resolve();
  const next = current.then(fn, () => fn());
  const shield = next.then(
    () => undefined,
    () => undefined,
  ) as Promise<void>;
  _projectLocks.set(projectId, shield);
  // Evict once this shield resolves (i.e., no other operation enqueued after us)
  shield.finally(() => {
    if (_projectLocks.get(projectId) === shield) {
      _projectLocks.delete(projectId);
    }
  });
  return next;
}
