import { execa } from 'execa';
import { Request,Response,Router } from 'express';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import path from 'path';
import { githubOAuth } from '../services/github-oauth';
import { storage } from '../storage';
import { createLogger } from '../utils/logger';
import { ensureProjectDirectory,getProjectWorkspacePath } from '../utils/project-fs-sync';
import { getJwtSecret } from '../utils/secrets-manager';

const logger = createLogger('git-project-router');
const router = Router();

async function ensureGitProjectAccess(req: Request, res: Response, next: any) {
  const projectId = String(req.params.projectId || '').trim();
  const bootstrapToken = req.query.bootstrap || req.headers['x-bootstrap-token'];
  const sessionUserId = (req as any).user?.id;

  if (!projectId) {
    return res.status(400).json({ error: 'Project ID is required' });
  }

  const project = await storage.getProject(projectId);
  if (!project) {
    return res.status(404).json({ error: 'Project not found' });
  }

  if (bootstrapToken) {
    try {
      const decoded = jwt.verify(String(bootstrapToken), getJwtSecret()) as { projectId: string | number; userId?: number };
      if (String(decoded.projectId) !== String(project.id)) {
        return res.status(403).json({ error: 'Bootstrap token invalid for this project' });
      }
      (req as any).bootstrapAuth = decoded;
      req.params.projectId = String(project.id);
      return next();
    } catch (error: any) {
      return res.status(401).json({ error: error?.message || 'Invalid or expired bootstrap token' });
    }
  }

  if (!sessionUserId) {
    return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
  }

  if (project.ownerId === sessionUserId) {
    req.params.projectId = String(project.id);
    return next();
  }

  const collaborators = await storage.getProjectCollaborators(String(project.id));
  const isCollaborator = collaborators.some((c: any) => c.userId === sessionUserId);
  if (!isCollaborator) {
    return res.status(403).json({ error: 'Access denied' });
  }

  req.params.projectId = String(project.id);
  return next();
}

router.use('/:projectId', ensureGitProjectAccess);

async function getAuthenticatedRemoteUrl(remoteUrl: string, userId: number): Promise<string> {
  try {
    const credentials = await githubOAuth.getGitCredentials(userId);
    if (!credentials) return remoteUrl;
    const url = new URL(remoteUrl);
    url.username = credentials.username;
    url.password = credentials.password;
    return url.toString();
  } catch {
    return remoteUrl;
  }
}

async function getProjectRemoteUrl(projectDir: string): Promise<string | null> {
  try {
    const { stdout } = await execa('git', ['remote', 'get-url', 'origin'], { cwd: projectDir });
    return stdout.trim() || null;
  } catch {
    return null;
  }
}

async function syncDiskToDb(projectId: string, projectDir: string): Promise<void> {
  try {
    async function walk(dir: string): Promise<string[]> {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...await walk(fullPath));
        } else {
          files.push(fullPath);
        }
      }
      return files;
    }
    const allFiles = await walk(projectDir);
    const diskRelativePaths = new Set(allFiles.map((absPath) => path.relative(projectDir, absPath)));

    for (const absPath of allFiles) {
      const relPath = path.relative(projectDir, absPath);
      const content = await fs.readFile(absPath, 'utf8').catch(() => null);
      if (content === null) continue;
      const existing = await storage.getFileByPath(projectId, relPath).catch(() => null);
      if (existing) {
        await storage.updateFile(existing.id, { content }).catch(() => null);
      } else {
        await storage.createFile({ projectId, path: relPath, content }).catch(() => null);
      }
    }

    const existingFiles = await storage.getFilesByProjectId(projectId).catch(() => []);
    for (const file of existingFiles) {
      if (file.isDirectory) continue;
      const relPath = file.path || file.name;
      if (!relPath || relPath.startsWith('.git/') || relPath.startsWith('node_modules/')) continue;
      if (!diskRelativePaths.has(relPath)) {
        await storage.deleteFile(file.id).catch(() => null);
      }
    }

    logger.info(`[git-project] synced ${allFiles.length} files from disk to DB for project ${projectId}`);
  } catch (err) {
    logger.error('[git-project] syncDiskToDb error:', err);
  }
}

async function getProjectDir(projectId: string): Promise<string> {
  await ensureProjectDirectory(projectId);
  return getProjectWorkspacePath(projectId);
}

async function syncProjectFiles(projectId: string, projectDir: string): Promise<void> {
  try {
    const files = await storage.getFilesByProjectId(projectId);
    if (!files || files.length === 0) return;
    for (const file of files) {
      if (file.isDirectory || !file.content) continue;
      const filePath = path.join(projectDir, file.path || file.name);
      const fileDir = path.dirname(filePath);
      await fs.mkdir(fileDir, { recursive: true });
      await fs.writeFile(filePath, file.content || '', 'utf8');
    }
  } catch (err) {
    logger.error('Failed to sync project files:', err);
  }
}

async function ensureGitInitialized(projectDir: string): Promise<void> {
  try {
    await fs.access(path.join(projectDir, '.git'));
    return;
  } catch {
    await execa('git', ['init'], { cwd: projectDir });
    await execa('git', ['config', 'user.name', 'E-Code User'], { cwd: projectDir });
    await execa('git', ['config', 'user.email', 'user@e-code.ai'], { cwd: projectDir });
  }
}

function parseStatusOutput(stdout: string) {
  const staged: string[] = [];
  const unstaged: string[] = [];
  const untracked: string[] = [];
  stdout.split('\n').forEach((line) => {
    if (!line) return;
    const xy = line.substring(0, 2);
    const file = line.substring(3);
    if (xy === '??') {
      untracked.push(file);
      return;
    }
    if (xy[0] !== ' ' && xy[0] !== '?') staged.push(file);
    if (xy[1] !== ' ' && xy[1] !== '?') unstaged.push(file);
  });
  return { staged, unstaged, untracked };
}

// GET /:projectId/status
router.get('/:projectId/status', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const projectDir = await getProjectDir(projectId);
    await syncProjectFiles(projectId, projectDir);
    await ensureGitInitialized(projectDir);

    const [branchRes, statusRes, aheadBehindRes] = await Promise.all([
      execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: projectDir }).catch(() => ({ stdout: 'main' })),
      execa('git', ['status', '--porcelain'], { cwd: projectDir }).catch(() => ({ stdout: '' })),
      execa('git', ['rev-list', '--left-right', '--count', 'HEAD...@{u}'], { cwd: projectDir }).catch(() => ({ stdout: '0\t0' })),
    ]);

    const branch = (branchRes.stdout || 'main').trim();
    const [ahead = 0, behind = 0] = (aheadBehindRes.stdout || '0\t0').split('\t').map(Number);
    const { staged, unstaged, untracked } = parseStatusOutput(statusRes.stdout || '');

    const changes = [
      ...staged.map((f: string) => ({ path: f, status: 'staged' as const })),
      ...unstaged.map((f: string) => ({ path: f, status: 'modified' as const })),
      ...untracked.map((f: string) => ({ path: f, status: 'untracked' as const })),
    ];

    res.json({ branch, ahead, behind, staged, unstaged, untracked, changes });
  } catch (error: any) {
    logger.error(`[git-project] status error for ${projectId}:`, error);
    res.status(500).json({ error: error.message });
  }
});

// GET /:projectId/branches
router.get('/:projectId/branches', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    const { stdout } = await execa('git', ['branch', '--format=%(refname:short)'], { cwd: projectDir }).catch(() => ({ stdout: 'main' }));
    const currentRes = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: projectDir }).catch(() => ({ stdout: 'main' }));
    const current = currentRes.stdout.trim();
    const branches = stdout.split('\n').filter(Boolean).map((name: string) => ({
      name,
      current: name === current,
      isRemote: name.startsWith('origin/'),
      lastCommit: {
        hash: '',
        message: '',
        author: '',
        date: '',
      },
      ahead: 0,
      behind: 0,
      trackingBranch: undefined,
    }));
    if (branches.length === 0) {
      branches.push({
        name: current || 'main',
        current: true,
        isRemote: false,
        lastCommit: {
          hash: '',
          message: '',
          author: '',
          date: '',
        },
        ahead: 0,
        behind: 0,
        trackingBranch: undefined,
      });
    }
    res.json({ branches });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:projectId/commits
router.get('/:projectId/commits', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    const { stdout } = await execa(
      'git', ['log', '--format=%H|%an|%ae|%aI|%s', '--max-count=50'],
      { cwd: projectDir }
    ).catch(() => ({ stdout: '' }));
    const commits = stdout.split('\n').filter(Boolean).map((line: string) => {
      const [hash, author, email, date, ...msgParts] = line.split('|');
      return { hash, shortHash: hash.substring(0, 7), author, email, date, message: msgParts.join('|') };
    });
    res.json({ commits });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/init
router.post('/:projectId/init', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const projectDir = await getProjectDir(projectId);
    await syncProjectFiles(projectId, projectDir);
    await execa('git', ['init'], { cwd: projectDir });
    await execa('git', ['config', 'user.name', 'E-Code User'], { cwd: projectDir });
    await execa('git', ['config', 'user.email', 'user@e-code.ai'], { cwd: projectDir });
    const gitignore = 'node_modules/\ndist/\nbuild/\n.env\n.DS_Store\n';
    await fs.writeFile(path.join(projectDir, '.gitignore'), gitignore);
    res.json({ success: true, message: 'Git repository initialized' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/stage
router.post('/:projectId/stage', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { paths, files } = req.body;
  const filesToStage: string[] = paths || files || ['.'];
  try {
    const projectDir = await getProjectDir(projectId);
    await syncProjectFiles(projectId, projectDir);
    await ensureGitInitialized(projectDir);
    await execa('git', ['add', '--', ...filesToStage], { cwd: projectDir });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/unstage
router.post('/:projectId/unstage', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { paths, files } = req.body;
  const filesToUnstage: string[] = paths || files || [];
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    if (filesToUnstage.length > 0) {
      await execa('git', ['reset', 'HEAD', '--', ...filesToUnstage], { cwd: projectDir });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/commit
router.post('/:projectId/commit', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { message, files } = req.body;
  if (!message) {
    return res.status(400).json({ error: 'Commit message is required' });
  }
  try {
    const projectDir = await getProjectDir(projectId);
    await syncProjectFiles(projectId, projectDir);
    await ensureGitInitialized(projectDir);
    if (files && files.length > 0) {
      await execa('git', ['add', '--', ...files], { cwd: projectDir });
    } else {
      await execa('git', ['add', '.'], { cwd: projectDir });
    }
    const { stdout } = await execa('git', ['commit', '-m', message], { cwd: projectDir });
    const hashRes = await execa('git', ['rev-parse', 'HEAD'], { cwd: projectDir }).catch(() => ({ stdout: '' }));
    res.json({ success: true, hash: hashRes.stdout.trim().substring(0, 7), message: stdout });
  } catch (error: any) {
    if (error.message?.includes('nothing to commit')) {
      return res.json({ success: true, message: 'Nothing to commit' });
    }
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/push
router.post('/:projectId/push', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const userId = (req as any).user?.id ?? (req as any).bootstrapAuth?.userId;
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    const remoteUrl = await getProjectRemoteUrl(projectDir);
    if (!remoteUrl) {
      return res.status(400).json({ error: 'No remote configured. Add a GitHub remote URL first.' });
    }
    const pushUrl = userId ? await getAuthenticatedRemoteUrl(remoteUrl, userId) : remoteUrl;
    const branch = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: projectDir })
      .then(r => r.stdout.trim()).catch(() => 'main');

    try {
      const { stdout, stderr } = await execa('git', ['push', pushUrl, `${branch}:${branch}`], { cwd: projectDir });
      await syncDiskToDb(projectId, projectDir);
      res.json({ success: true, output: stdout || stderr });
    } catch (pushErr: any) {
      const msg = pushErr.stderr || pushErr.message || '';
      const isRejected = msg.includes('rejected') || msg.includes('non-fast-forward') || msg.includes('fetch first');
      if (isRejected) {
        // Remote has new commits — rebase local on top then retry push
        logger.info(`[git-project] push rejected for ${projectId}, attempting pull --rebase then retry`);
        await execa('git', ['pull', '--rebase', pushUrl, branch], { cwd: projectDir });
        const { stdout: stdout2, stderr: stderr2 } = await execa('git', ['push', pushUrl, `${branch}:${branch}`], { cwd: projectDir });
        await syncDiskToDb(projectId, projectDir);
        res.json({ success: true, output: stdout2 || stderr2, info: 'Remote had new commits — rebased and pushed.' });
      } else {
        throw pushErr;
      }
    }
  } catch (error: any) {
    const msg = (error.stderr || error.message || '').replace(/https?:\/\/[^@]+@/g, 'https://');
    res.status(500).json({ error: msg || 'Push failed. Make sure GitHub is connected.' });
  }
});

// POST /:projectId/pull
router.post('/:projectId/pull', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const userId = (req as any).user?.id ?? (req as any).bootstrapAuth?.userId;
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    const remoteUrl = await getProjectRemoteUrl(projectDir);
    if (!remoteUrl) {
      return res.status(400).json({ error: 'No remote configured. Add a GitHub remote URL first.' });
    }
    const pullUrl = userId ? await getAuthenticatedRemoteUrl(remoteUrl, userId) : remoteUrl;
    const branch = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: projectDir })
      .then(r => r.stdout.trim()).catch(() => 'main');

    // Check for uncommitted changes
    const { stdout: statusOut } = await execa('git', ['status', '--porcelain'], { cwd: projectDir }).catch(() => ({ stdout: '' }));
    const hasLocalChanges = statusOut.trim().length > 0;

    let _stashApplied = false;
    if (hasLocalChanges) {
      // Stash local changes so pull can proceed cleanly
      const { stdout: stashOut } = await execa('git', ['stash', 'push', '--include-untracked', '-m', 'e-code-auto-stash'], { cwd: projectDir }).catch(() => ({ stdout: '' }));
      _stashApplied = stashOut.includes('Saved') || stashOut.includes('No local changes');
      if (!stashOut.includes('No local changes')) _stashApplied = true;
    }

    const { stdout } = await execa('git', ['pull', pullUrl, branch], { cwd: projectDir });

    let stashConflict = false;
    if (hasLocalChanges) {
      try {
        await execa('git', ['stash', 'pop'], { cwd: projectDir });
      } catch (popErr: any) {
        stashConflict = true;
        logger.warn(`[git-project] stash pop had conflicts for ${projectId}:`, popErr.message);
      }
    }

    await syncDiskToDb(projectId, projectDir);

    const info = hasLocalChanges
      ? stashConflict
        ? 'Your local changes were stashed but may have conflicts with pulled changes. Check the file editor.'
        : 'Your local changes were stashed and re-applied after pulling.'
      : undefined;

    res.json({ success: true, output: stdout, ...(info ? { info } : {}) });
  } catch (error: any) {
    const msg = (error.stderr || error.message || '').replace(/https?:\/\/[^@]+@/g, 'https://');
    res.status(500).json({ error: msg || 'Pull failed. Make sure GitHub is connected.' });
  }
});

// POST /:projectId/fetch
router.post('/:projectId/fetch', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const userId = (req as any).user?.id ?? (req as any).bootstrapAuth?.userId;
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    const remoteUrl = await getProjectRemoteUrl(projectDir);
    const fetchUrl = remoteUrl && userId ? await getAuthenticatedRemoteUrl(remoteUrl, userId) : (remoteUrl || 'origin');
    const { stdout } = await execa('git', ['fetch', fetchUrl], { cwd: projectDir });
    res.json({ success: true, output: stdout });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Fetch failed. Make sure you have a remote configured.' });
  }
});

// GET /:projectId/remotes
router.get('/:projectId/remotes', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    const { stdout } = await execa('git', ['remote', '-v'], { cwd: projectDir }).catch(() => ({ stdout: '' }));
    
    // Parse 'origin  https://github.com/... (fetch)'
    const remotes = stdout.split('\n').filter(Boolean).map((line: string) => {
      const parts = line.split(/\s+/);
      return {
        name: parts[0],
        url: parts[1],
        type: parts[2] ? parts[2].replace(/[()]/g, '') : 'fetch'
      };
    });
    
    // Return unique remotes by name/type
    const uniqueRemotes = remotes.filter((v, i, a) => a.findIndex(t => (t.name === v.name && t.type === v.type)) === i);
    res.json({ remotes: uniqueRemotes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/remotes
router.post('/:projectId/remotes', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { name = 'origin', url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'Remote URL is required' });
  }
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    
    // Check if remote exists
    try {
      await execa('git', ['remote', 'remove', name], { cwd: projectDir });
    } catch (e) {
      // Ignore if it doesn't exist
    }
    
    await execa('git', ['remote', 'add', name, url], { cwd: projectDir });
    res.json({ success: true, message: `Remote '${name}' added` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/clone
router.post('/:projectId/clone', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { url } = req.body;
  const userId = (req as any).user?.id ?? (req as any).bootstrapAuth?.userId;
  if (!url) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }
  try {
    const projectDir = await getProjectDir(projectId);
    const cloneUrl = userId ? await getAuthenticatedRemoteUrl(url, userId) : url;
    await fs.rm(projectDir, { recursive: true, force: true });
    await fs.mkdir(projectDir, { recursive: true });
    await execa('git', ['clone', cloneUrl, '.'], { cwd: projectDir });
    if (cloneUrl !== url) {
      await execa('git', ['remote', 'set-url', 'origin', url], { cwd: projectDir }).catch(() => null);
    }
    await syncDiskToDb(projectId, projectDir);
    res.json({ success: true, message: 'Repository cloned successfully' });
  } catch (error: any) {
    const msg = (error.stderr || error.message || '').replace(/https?:\/\/[^@]+@/g, 'https://');
    res.status(500).json({ error: msg || 'Clone failed. Make sure GitHub is connected.' });
  }
});

// POST /:projectId/branch (create branch)
router.post('/:projectId/branch', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { name, startPoint } = req.body;
  if (!name) {
    return res.status(400).json({ error: 'Branch name is required' });
  }
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    const args = startPoint ? ['branch', name, startPoint] : ['branch', name];
    await execa('git', args, { cwd: projectDir });
    res.json({ success: true, message: `Branch '${name}' created` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/checkout
router.post('/:projectId/checkout', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { branch } = req.body;
  if (!branch) {
    return res.status(400).json({ error: 'Branch name is required' });
  }
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    await execa('git', ['checkout', branch], { cwd: projectDir });
    res.json({ success: true, message: `Switched to branch '${branch}'` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:projectId/diff/:filePath
router.get('/:projectId/diff/:filePath(*)', async (req: Request, res: Response) => {
  const { projectId, filePath } = req.params;
  const { staged } = req.query;
  try {
    const projectDir = await getProjectDir(projectId);
    await ensureGitInitialized(projectDir);
    const args = staged === 'true'
      ? ['diff', '--cached', '--', filePath]
      : ['diff', '--', filePath];
    const { stdout } = await execa('git', args, { cwd: projectDir }).catch(() => ({ stdout: '' }));
    res.json({ diff: stdout, filePath });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// Merge Conflict Resolution APIs
// =====================================

// POST /:projectId/resolve-conflict
router.post('/:projectId/resolve-conflict', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { path: filePath, resolvedContent } = req.body;
  
  if (!filePath || typeof resolvedContent !== 'string') {
    return res.status(400).json({ error: 'path and resolvedContent are required' });
  }
  
  try {
    const projectDir = await getProjectDir(projectId);
    const fullPath = path.join(projectDir, filePath);
    
    // Write resolved content and add to staging
    await fs.writeFile(fullPath, resolvedContent, 'utf8');
    await execa('git', ['add', filePath], { cwd: projectDir });
    
    res.json({ success: true, message: 'Conflict resolved successfully' });
  } catch (error: any) {
    logger.error('Failed to resolve conflict:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/complete-merge
router.post('/:projectId/complete-merge', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const projectDir = await getProjectDir(projectId);
    // Completes an ongoing merge
    await execa('git', ['commit', '--no-edit'], { cwd: projectDir });
    res.json({ success: true, message: 'Merge completed' });
  } catch (error: any) {
    logger.error('Failed to complete merge:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/abort-merge
router.post('/:projectId/abort-merge', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const projectDir = await getProjectDir(projectId);
    await execa('git', ['merge', '--abort'], { cwd: projectDir });
    res.json({ success: true, message: 'Merge aborted' });
  } catch (error: any) {
    logger.error('Failed to abort merge:', error);
    res.status(500).json({ error: error.message });
  }
});

// =====================================
// Backup & Recovery APIs
// =====================================

// GET /:projectId/backup-status
router.get('/:projectId/backup-status', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const projectDir = await getProjectDir(projectId);
    let backupCount = 0;
    let lastBackupAt = null;
    
    try {
      const { stdout: tagStdout } = await execa('git', ['tag', '-l', 'backup-*'], { cwd: projectDir });
      const tags = tagStdout.split('\n').filter(Boolean);
      backupCount = tags.length;
      if (backupCount > 0) {
        // Get the date of the most recent backup tag
        const { stdout: dateStdout } = await execa('git', [
          'for-each-ref', '--sort=-creatordate', '--format=%(creatordate:iso-strict)',
          '--count=1', 'refs/tags/backup-*'
        ], { cwd: projectDir });
        lastBackupAt = dateStdout.trim() || new Date().toISOString();
      }
    } catch {
      // Ignored
    }

    // Get actual git object size
    let totalSizeBytes = 1024 * 50; // fallback
    try {
      const { stdout: sizeStdout } = await execa('git', ['count-objects', '-v'], { cwd: projectDir });
      const sizePackMatch = sizeStdout.match(/size-pack:\s+(\d+)/);
      if (sizePackMatch) totalSizeBytes = parseInt(sizePackMatch[1]) * 1024;
    } catch { /* ignored */ }

    res.json({
      lastBackupAt,
      backupCount,
      totalSizeBytes,
      health: backupCount > 0 ? "green" : "red"
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET /:projectId/backups
router.get('/:projectId/backups', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const projectDir = await getProjectDir(projectId);
    let backups: any[] = [];
    try {
      const { stdout } = await execa('git', ['tag', '-l', 'backup-*', '--sort=-creatordate'], { cwd: projectDir });
      const tags = stdout.split('\\n').filter(Boolean);
      backups = tags.map((t, idx) => ({
        id: t,
        version: tags.length - idx,
        sizeBytes: 1024 * 50,
        trigger: 'manual',
        createdAt: new Date().toISOString()
      }));
    } catch {
      // No backups
    }
    res.json(backups);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/backup
router.post('/:projectId/backup', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  try {
    const projectDir = await getProjectDir(projectId);
    const timestamp = Date.now();
    await execa('git', ['tag', `backup-${timestamp}`], { cwd: projectDir });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// POST /:projectId/backup/restore
router.post('/:projectId/backup/restore', async (req: Request, res: Response) => {
  const { projectId } = req.params;
  const { version: _version } = req.body; // or id
  try {
    const projectDir = await getProjectDir(projectId);
    // Find latest tag if no version specified
    const { stdout } = await execa('git', ['tag', '-l', 'backup-*', '--sort=-creatordate'], { cwd: projectDir });
    const tags = stdout.split('\\n').filter(Boolean);
    const targetTag = tags[0]; 
    if (targetTag) {
      await execa('git', ['checkout', targetTag], { cwd: projectDir });
      res.json({ success: true, restoredTo: targetTag });
    } else {
      res.status(404).json({ error: 'No backups found to restore' });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
