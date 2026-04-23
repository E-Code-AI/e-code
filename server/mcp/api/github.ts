import { Router, Request, Response, NextFunction } from 'express';
import fetch, { type RequestInit } from 'node-fetch';
import { ensureAuthenticated } from '../../middleware/auth';
import { githubOAuth } from '../../services/github-oauth';
import { storage } from '../../storage';

const router = Router();

interface GithubRequestContext extends Request {
  githubToken?: string;
}

const mapRepository = (repo: any) => ({
  id: repo.id,
  name: repo.name,
  fullName: repo.full_name ?? (repo.owner?.login ? `${repo.owner.login}/${repo.name}` : repo.name),
  description: repo.description ?? null,
  url: repo.html_url ?? null,
  sshUrl: repo.ssh_url ?? null,
  cloneUrl: repo.clone_url ?? null,
  private: Boolean(repo.private),
  stars: repo.stargazers_count ?? 0,
  forks: repo.forks_count ?? 0,
  watchers: repo.watchers_count ?? 0,
  language: repo.language ?? null,
  updatedAt: repo.updated_at ?? null,
  defaultBranch: repo.default_branch ?? 'main',
  owner: repo.owner?.login ?? null,
});

const mapIssue = (issue: any) => ({
  number: issue.number,
  title: issue.title,
  body: issue.body ?? '',
  labels: (issue.labels ?? [])
    .map((label: any) => (typeof label === 'string' ? label : label?.name))
    .filter(Boolean),
  state: issue.state,
  url: issue.html_url,
  createdAt: issue.created_at,
  updatedAt: issue.updated_at,
  author: issue.user?.login ?? null,
  repository: issue.repository_url?.split('/').slice(-2).join('/') ?? null,
});

const mapPullRequest = (pr: any) => ({
  number: pr.number,
  title: pr.title,
  body: pr.body ?? '',
  state: pr.state,
  url: pr.html_url,
  head: pr.head?.ref ?? null,
  base: pr.base?.ref ?? null,
  createdAt: pr.created_at,
  updatedAt: pr.updated_at,
  mergedAt: pr.merged_at ?? null,
  author: pr.user?.login ?? null,
});

const requireGithubToken = async (
  req: GithubRequestContext,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  try {
    const token = await githubOAuth.getUserToken(req.user.id);
    if (!token) {
      return res.status(401).json({
        error: 'GitHub not connected',
        requiresAuth: true,
      });
    }
    req.githubToken = token;
    next();
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to resolve GitHub token', message: error.message });
  }
};

const resolveRepoCoordinates = async (userId: number, repo: string) => {
  if (repo.includes('/')) {
    const [owner, name] = repo.split('/');
    return { owner, repo: name };
  }
  const user = await storage.getUser(String(userId));
  if (!user?.githubUsername) return null;
  return { owner: user.githubUsername, repo };
};

interface GithubResult<T> {
  data?: T;
  error?: { status: number; message: string };
}

const githubRequest = async <T = any>(
  token: string,
  url: string,
  options: RequestInit = {},
): Promise<GithubResult<T>> => {
  const response = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({})) as any;
    return {
      error: {
        status: response.status,
        message: errorBody?.message || 'GitHub request failed',
      },
    };
  }

  return { data: (await response.json()) as T };
};

router.use(ensureAuthenticated);

// Get user repositories
router.get('/repositories', requireGithubToken, async (req: GithubRequestContext, res) => {
  try {
    const page = Math.max(parseInt(req.query.page as string, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(req.query.perPage as string, 10) || 30, 1), 100);

    const repos = await githubOAuth.getUserRepos(req.githubToken!, page, perPage);
    res.json(repos.map(mapRepository));
  } catch (error: any) {
    console.error('GitHub MCP repositories error:', error);
    res.status(500).json({
      error: 'Failed to fetch repositories',
      message: error.message,
    });
  }
});

// Create repository
router.post('/repositories', requireGithubToken, async (req: GithubRequestContext, res) => {
  try {
    const { name, description, isPrivate } = req.body ?? {};
    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Repository name is required' });
    }

    const result = await githubRequest<any>(req.githubToken!, 'https://api.github.com/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name,
        description,
        private: Boolean(isPrivate),
        auto_init: true,
      }),
    });

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    res.status(201).json(mapRepository(result.data));
  } catch (error: any) {
    console.error('GitHub MCP create repository error:', error);
    res.status(500).json({ error: 'Failed to create repository', message: error.message });
  }
});

// List issues — either for a specific repo or searched across the user
router.get('/issues', requireGithubToken, async (req: GithubRequestContext, res) => {
  try {
    const repoParam = typeof req.query.repo === 'string' ? req.query.repo : undefined;
    const state = (req.query.state as string) || 'open';
    const q = (req.query.q as string) || '';

    let url: string;
    if (repoParam) {
      const coords = await resolveRepoCoordinates(req.user!.id, repoParam);
      if (!coords) {
        return res.status(400).json({ error: 'Unable to resolve repository' });
      }
      const params = new URLSearchParams({ state, per_page: '50' });
      url = `https://api.github.com/repos/${coords.owner}/${coords.repo}/issues?${params.toString()}`;
    } else {
      const params = new URLSearchParams({
        q: `${q} is:issue state:${state} involves:@me`.trim(),
        per_page: '50',
      });
      url = `https://api.github.com/search/issues?${params.toString()}`;
    }

    const result = await githubRequest<any>(req.githubToken!, url, { method: 'GET' });
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }

    const items = Array.isArray(result.data) ? result.data : result.data?.items ?? [];
    // Filter out pull requests when hitting /repos/.../issues (GitHub returns both)
    const issues = items.filter((item: any) => !item.pull_request).map(mapIssue);
    res.json(issues);
  } catch (error: any) {
    console.error('GitHub MCP list issues error:', error);
    res.status(500).json({ error: 'Failed to fetch issues', message: error.message });
  }
});

// Create issue
router.post('/issues', requireGithubToken, async (req: GithubRequestContext, res) => {
  try {
    const { repo, title, body, labels } = req.body ?? {};
    if (!repo || typeof repo !== 'string') {
      return res.status(400).json({ error: 'Repository is required' });
    }
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Issue title is required' });
    }

    const coords = await resolveRepoCoordinates(req.user!.id, repo);
    if (!coords) {
      return res.status(400).json({
        error: 'Unable to resolve repository owner',
        message: 'Connect GitHub or provide the repository as "owner/name".',
      });
    }

    const result = await githubRequest<any>(
      req.githubToken!,
      `https://api.github.com/repos/${coords.owner}/${coords.repo}/issues`,
      {
        method: 'POST',
        body: JSON.stringify({
          title,
          body,
          labels: Array.isArray(labels) ? labels : undefined,
        }),
      },
    );

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }
    res.status(201).json(mapIssue(result.data));
  } catch (error: any) {
    console.error('GitHub MCP create issue error:', error);
    res.status(500).json({ error: 'Failed to create issue', message: error.message });
  }
});

// List pull requests for a repo
router.get('/pull-requests', requireGithubToken, async (req: GithubRequestContext, res) => {
  try {
    const repoParam = typeof req.query.repo === 'string' ? req.query.repo : undefined;
    if (!repoParam) {
      return res.status(400).json({ error: 'repo query parameter required (owner/name)' });
    }
    const state = ((req.query.state as string) || 'open').toLowerCase();
    if (!['open', 'closed', 'all'].includes(state)) {
      return res.status(400).json({ error: 'state must be open, closed, or all' });
    }

    const coords = await resolveRepoCoordinates(req.user!.id, repoParam);
    if (!coords) {
      return res.status(400).json({ error: 'Unable to resolve repository' });
    }

    const params = new URLSearchParams({ state, per_page: '50' });
    const url = `https://api.github.com/repos/${coords.owner}/${coords.repo}/pulls?${params.toString()}`;

    const result = await githubRequest<any[]>(req.githubToken!, url, { method: 'GET' });
    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }
    res.json((result.data ?? []).map(mapPullRequest));
  } catch (error: any) {
    console.error('GitHub MCP list PRs error:', error);
    res.status(500).json({ error: 'Failed to fetch pull requests', message: error.message });
  }
});

// Create pull request
router.post('/pull-requests', requireGithubToken, async (req: GithubRequestContext, res) => {
  try {
    const { repo, title, body, head, base } = req.body ?? {};
    if (!repo || typeof repo !== 'string') {
      return res.status(400).json({ error: 'Repository is required' });
    }
    if (!title || typeof title !== 'string') {
      return res.status(400).json({ error: 'Pull request title is required' });
    }
    if (!head || !base) {
      return res.status(400).json({ error: 'Both head and base branches are required' });
    }

    const coords = await resolveRepoCoordinates(req.user!.id, repo);
    if (!coords) {
      return res.status(400).json({ error: 'Unable to resolve repository' });
    }

    const result = await githubRequest<any>(
      req.githubToken!,
      `https://api.github.com/repos/${coords.owner}/${coords.repo}/pulls`,
      {
        method: 'POST',
        body: JSON.stringify({ title, body, head, base }),
      },
    );

    if (result.error) {
      return res.status(result.error.status).json({ error: result.error.message });
    }
    res.status(201).json(mapPullRequest(result.data));
  } catch (error: any) {
    console.error('GitHub MCP create PR error:', error);
    res.status(500).json({ error: 'Failed to create pull request', message: error.message });
  }
});

export default router;
