import { Router, Request, Response } from 'express';
import { execa } from 'execa';
import path from 'path';
import { ensureAuthenticated } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrf';

const router = Router();

const PROJECT_ROOT = process.cwd();

interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

interface GitDiff {
  filePath: string;
  diff: string;
  staged: boolean;
}

async function ensureGitRepo(): Promise<boolean> {
  try {
    await execa('git', ['rev-parse', '--git-dir'], { cwd: PROJECT_ROOT });
    return true;
  } catch {
    return false;
  }
}

async function initGitRepo(): Promise<void> {
  try {
    await execa('git', ['init'], { cwd: PROJECT_ROOT });
    await execa('git', ['config', 'user.name', 'E-Code Platform'], { cwd: PROJECT_ROOT });
    await execa('git', ['config', 'user.email', 'noreply@e-code.ai'], { cwd: PROJECT_ROOT });
  } catch (error: any) {
    throw new Error(`Failed to initialize git repository: ${error.message}`);
  }
}

router.get('/status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      await initGitRepo();
    }

    const [branchResult, statusResult, aheadBehind] = await Promise.all([
      execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: PROJECT_ROOT }),
      execa('git', ['status', '--porcelain'], { cwd: PROJECT_ROOT }),
      execa('git', ['rev-list', '--left-right', '--count', 'HEAD...@{u}'], { cwd: PROJECT_ROOT }).catch(() => ({ stdout: '0\t0' })),
    ]);

    const branch = branchResult.stdout || 'main';
    const [ahead = 0, behind = 0] = aheadBehind.stdout.split('\t').map(Number);

    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    statusResult.stdout.split('\n').forEach((line) => {
      if (!line) return;
      const status = line.substring(0, 2);
      const filePath = line.substring(3);

      if (status[0] !== ' ' && status[0] !== '?') {
        staged.push(filePath);
      }
      if (status[1] !== ' ' && status[1] !== '?') {
        unstaged.push(filePath);
      }
      if (status === '??') {
        untracked.push(filePath);
      }
    });

    const gitStatus: GitStatus = {
      branch,
      ahead,
      behind,
      staged,
      unstaged,
      untracked,
    };

    res.json(gitStatus);
  } catch (error: any) {
    console.error('[Git] Status error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/diff/:filePath(*)', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { filePath } = req.params;
    const { staged } = req.query;

    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }

    const args = staged === 'true' 
      ? ['diff', '--cached', '--', filePath]
      : ['diff', '--', filePath];

    const { stdout } = await execa('git', args, { cwd: PROJECT_ROOT });

    const diff: GitDiff = {
      filePath,
      diff: stdout,
      staged: staged === 'true',
    };

    res.json(diff);
  } catch (error: any) {
    console.error('[Git] Diff error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/stage', ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array required' });
    }

    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }

    await execa('git', ['add', ...files], { cwd: PROJECT_ROOT });

    res.json({ success: true, staged: files });
  } catch (error: any) {
    console.error('[Git] Stage error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/unstage', ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
  try {
    const { files } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array required' });
    }

    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }

    await execa('git', ['reset', 'HEAD', ...files], { cwd: PROJECT_ROOT });

    res.json({ success: true, unstaged: files });
  } catch (error: any) {
    console.error('[Git] Unstage error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/commit', ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({ error: 'Commit message required' });
    }

    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }

    // Check if there are staged changes
    const { stdout: statusCheck } = await execa('git', ['diff', '--cached', '--name-only'], { cwd: PROJECT_ROOT });
    if (!statusCheck.trim()) {
      return res.status(422).json({ error: 'No staged changes to commit' });
    }

    const { stdout } = await execa('git', ['commit', '-m', message], { cwd: PROJECT_ROOT });

    res.json({ success: true, output: stdout });
  } catch (error: any) {
    console.error('[Git] Commit error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/push', ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
  try {
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }

    // Check if remote is configured
    const { stdout: remoteCheck } = await execa('git', ['remote', '-v'], { cwd: PROJECT_ROOT });
    if (!remoteCheck.trim()) {
      return res.status(422).json({ error: 'No remote repository configured' });
    }

    // Use timeout to prevent hanging on credential prompts
    const { stdout, stderr } = await execa('git', ['push'], { 
      cwd: PROJECT_ROOT,
      timeout: 5000, // 5 second timeout
      reject: false
    });

    res.json({ success: true, output: stdout || stderr });
  } catch (error: any) {
    console.error('[Git] Push error:', error);
    if (error.timedOut) {
      return res.status(500).json({ error: 'Git push timed out - remote may require authentication' });
    }
    res.status(500).json({ error: error.message || error.stderr || 'Push failed' });
  }
});

router.post('/pull', ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
  try {
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }

    // Check if remote is configured
    const { stdout: remoteCheck } = await execa('git', ['remote', '-v'], { cwd: PROJECT_ROOT });
    if (!remoteCheck.trim()) {
      return res.status(422).json({ error: 'No remote repository configured' });
    }

    // Use timeout to prevent hanging on credential prompts
    const { stdout } = await execa('git', ['pull'], { 
      cwd: PROJECT_ROOT,
      timeout: 5000, // 5 second timeout
      reject: false
    });

    res.json({ success: true, output: stdout });
  } catch (error: any) {
    console.error('[Git] Pull error:', error);
    if (error.timedOut) {
      return res.status(500).json({ error: 'Git pull timed out - remote may require authentication' });
    }
    res.status(500).json({ error: error.message || 'Pull failed' });
  }
});

interface GitBranchInfo {
  name: string;
  current: boolean;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  ahead: number;
  behind: number;
  isRemote: boolean;
  trackingBranch?: string;
}

async function parseBranchInfo(branchLine: string, currentBranch: string): Promise<GitBranchInfo | null> {
  try {
    const isCurrent = branchLine.startsWith('*');
    const rawName = branchLine.replace(/^\*?\s+/, '').trim();
    
    if (!rawName || rawName.startsWith('(HEAD detached')) {
      return null;
    }
    
    const isRemote = rawName.startsWith('remotes/');
    const name = isRemote ? rawName.replace('remotes/', '') : rawName;
    
    // Get last commit info
    const logResult = await execa('git', ['log', '-1', '--format=%H|%s|%an|%aI', name], { 
      cwd: PROJECT_ROOT,
      reject: false
    });
    
    const [hash = '', message = '', author = '', dateStr = ''] = (logResult.stdout || '').split('|');
    
    // Get ahead/behind count relative to tracking branch
    let ahead = 0, behind = 0;
    try {
      const countResult = await execa('git', ['rev-list', '--left-right', '--count', `${name}...origin/${name}`], {
        cwd: PROJECT_ROOT,
        reject: false
      });
      if (countResult.stdout) {
        const parts = countResult.stdout.split('\t');
        ahead = parseInt(parts[0], 10) || 0;
        behind = parseInt(parts[1], 10) || 0;
      }
    } catch {
      // No tracking branch
    }
    
    return {
      name,
      current: name === currentBranch,
      lastCommit: {
        hash: hash.substring(0, 7),
        message,
        author,
        date: dateStr
      },
      ahead,
      behind,
      isRemote,
      trackingBranch: isRemote ? undefined : `origin/${name}`
    };
  } catch {
    return null;
  }
}

router.get('/branches', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      await initGitRepo();
    }

    // Get current branch
    const { stdout: currentBranch } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: PROJECT_ROOT });
    
    // Get all branches (local and remote)
    const { stdout: branchOutput } = await execa('git', ['branch', '-a'], { cwd: PROJECT_ROOT });
    
    const branchLines = branchOutput.split('\n').filter(Boolean);
    const branches: GitBranchInfo[] = [];
    
    for (const line of branchLines) {
      const info = await parseBranchInfo(line, currentBranch.trim());
      if (info) {
        branches.push(info);
      }
    }
    
    res.json({ branches });
  } catch (error: any) {
    console.error('[Git] Branches error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/branches', ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
  try {
    const { name, startPoint } = req.body;
    
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return res.status(400).json({ error: 'Branch name required' });
    }
    
    // Validate branch name (no spaces, special chars)
    if (!/^[a-zA-Z0-9_\-\/]+$/.test(name)) {
      return res.status(400).json({ error: 'Invalid branch name' });
    }
    
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }
    
    const args = ['checkout', '-b', name];
    if (startPoint) {
      args.push(startPoint);
    }
    
    await execa('git', args, { cwd: PROJECT_ROOT });
    
    res.json({ success: true, branch: name });
  } catch (error: any) {
    console.error('[Git] Create branch error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/branches/:name(*)', ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { force } = req.query;
    
    if (!name) {
      return res.status(400).json({ error: 'Branch name required' });
    }
    
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }
    
    // Prevent deleting current branch
    const { stdout: currentBranch } = await execa('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd: PROJECT_ROOT });
    if (name === currentBranch.trim()) {
      return res.status(400).json({ error: 'Cannot delete current branch' });
    }
    
    const args = ['branch', force === 'true' ? '-D' : '-d', name];
    await execa('git', args, { cwd: PROJECT_ROOT });
    
    res.json({ success: true, deleted: name });
  } catch (error: any) {
    console.error('[Git] Delete branch error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/checkout', ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
  try {
    const { branch } = req.body;
    
    if (!branch || typeof branch !== 'string') {
      return res.status(400).json({ error: 'Branch name required' });
    }
    
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }
    
    await execa('git', ['checkout', branch], { cwd: PROJECT_ROOT });
    
    res.json({ success: true, branch });
  } catch (error: any) {
    console.error('[Git] Checkout error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/merge', ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
  try {
    const { branch, message } = req.body;
    
    if (!branch || typeof branch !== 'string') {
      return res.status(400).json({ error: 'Branch name required' });
    }
    
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }
    
    const args = ['merge', branch];
    if (message) {
      args.push('-m', message);
    }
    
    const { stdout } = await execa('git', args, { cwd: PROJECT_ROOT });
    
    res.json({ success: true, output: stdout });
  } catch (error: any) {
    console.error('[Git] Merge error:', error);
    // Check for merge conflicts
    if (error.message?.includes('CONFLICT')) {
      return res.status(409).json({ 
        error: 'Merge conflict', 
        conflicts: error.stdout?.match(/CONFLICT.*/g) || [],
        output: error.stdout 
      });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/log', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { limit = '20', branch } = req.query;
    
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }
    
    const args = ['log', '--format=%H|%s|%an|%aI', `-${limit}`];
    if (branch && typeof branch === 'string') {
      args.push(branch);
    }
    
    const { stdout } = await execa('git', args, { cwd: PROJECT_ROOT });
    
    const commits = stdout.split('\n').filter(Boolean).map(line => {
      const [hash, message, author, date] = line.split('|');
      return {
        hash,
        shortHash: hash.substring(0, 7),
        message,
        author,
        date
      };
    });
    
    res.json({ commits });
  } catch (error: any) {
    console.error('[Git] Log error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/remotes', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }
    
    const { stdout } = await execa('git', ['remote', '-v'], { cwd: PROJECT_ROOT });
    
    const remotes: { name: string; url: string; type: 'fetch' | 'push' }[] = [];
    stdout.split('\n').filter(Boolean).forEach(line => {
      const match = line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/);
      if (match) {
        remotes.push({
          name: match[1],
          url: match[2],
          type: match[3] as 'fetch' | 'push'
        });
      }
    });
    
    res.json({ remotes });
  } catch (error: any) {
    console.error('[Git] Remotes error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/remotes', ensureAuthenticated, csrfProtection, async (req: Request, res: Response) => {
  try {
    const { name, url } = req.body;
    
    if (!name || !url) {
      return res.status(400).json({ error: 'Remote name and URL required' });
    }
    
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }
    
    await execa('git', ['remote', 'add', name, url], { cwd: PROJECT_ROOT });
    
    res.json({ success: true, remote: { name, url } });
  } catch (error: any) {
    console.error('[Git] Add remote error:', error);
    res.status(500).json({ error: error.message });
  }
});

export const GitRouter = router;
