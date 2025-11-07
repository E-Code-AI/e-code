import { Router, Request, Response } from 'express';
import { execa } from 'execa';
import path from 'path';
import { ensureAuthenticated } from '../middleware/auth';

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

router.post('/stage', ensureAuthenticated, async (req: Request, res: Response) => {
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

router.post('/unstage', ensureAuthenticated, async (req: Request, res: Response) => {
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

router.post('/commit', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Commit message required' });
    }

    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }

    const { stdout } = await execa('git', ['commit', '-m', message], { cwd: PROJECT_ROOT });

    res.json({ success: true, output: stdout });
  } catch (error: any) {
    console.error('[Git] Commit error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/push', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }

    const { stdout, stderr } = await execa('git', ['push'], { cwd: PROJECT_ROOT });

    res.json({ success: true, output: stdout || stderr });
  } catch (error: any) {
    console.error('[Git] Push error:', error);
    res.status(500).json({ error: error.message || error.stderr });
  }
});

router.post('/pull', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const isRepo = await ensureGitRepo();
    if (!isRepo) {
      return res.status(400).json({ error: 'Not a git repository' });
    }

    const { stdout } = await execa('git', ['pull'], { cwd: PROJECT_ROOT });

    res.json({ success: true, output: stdout });
  } catch (error: any) {
    console.error('[Git] Pull error:', error);
    res.status(500).json({ error: error.message });
  }
});

export const GitRouter = router;
