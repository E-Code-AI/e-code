// @ts-nocheck
import { Router } from 'express';
import { Octokit } from '@octokit/rest';
import { ensureAuthenticated } from '../../middleware/auth';
import { storage } from '../../storage';

const createGitHubClient = async (userId: number) => {
  const githubToken = await storage.getGitHubToken(userId);

  if (!githubToken) {
    return { error: { status: 401, message: 'GitHub not connected. Please connect your GitHub account.' } };
  }

  const octokit = new Octokit({ auth: githubToken.accessToken });
  const { data: currentUser } = await octokit.users.getAuthenticated();

  return { octokit, currentUser };
};
import fetch from 'node-fetch';
import { ensureAuthenticated } from '../../middleware/auth';
import { githubOAuth } from '../../services/github-oauth';
import { storage } from '../../storage';

const router = Router();

// Get user repositories
router.get('/repositories', ensureAuthenticated, githubOAuth.requireGitHubAuth, async (req, res) => {
  try {
    const { octokit, currentUser, error } = await createGitHubClient(req.user!.id);

    if (error) {
      return res.status(error.status).json({
        error: 'GitHub not connected',
        message: error.message,
      });
    }

    const { data: repos } = await octokit.repos.listForAuthenticatedUser({
      per_page: 100,
      sort: 'updated',
      direction: 'desc',
    });

    res.json(
      repos.map((repo) => ({
        id: repo.id,
        name: repo.name,
        description: repo.description,
        url: repo.html_url,
        private: repo.private,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        language: repo.language,
        updatedAt: repo.updated_at,
        defaultBranch: repo.default_branch,
        owner: currentUser?.login ?? repo.owner?.login,
    const page = Math.max(parseInt(req.query.page as string) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(req.query.perPage as string) || 30, 1), 100);
    const repos = await githubOAuth.getUserRepos(req.githubToken, page, perPage);

    res.json(
      repos.map(repo => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        description: repo.description,
        url: repo.html_url,
        sshUrl: repo.ssh_url,
        cloneUrl: repo.clone_url,
        private: repo.private,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        watchers: repo.watchers_count,
        language: repo.language,
        updatedAt: repo.updated_at,
        defaultBranch: repo.default_branch,
      }))
    );
  } catch (error: any) {
    console.error('GitHub MCP repositories error:', error);
    res.status(500).json({
      error: 'Failed to fetch repositories',
      message: error.message
    });
  }
});

// Create repository
router.post('/repositories', ensureAuthenticated, githubOAuth.requireGitHubAuth, async (req, res) => {
  try {
    const { name, description, isPrivate } = req.body;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({
        error: 'Repository name is required',
        message: 'Please provide a valid repository name.',
      });
    }

    const { octokit, error } = await createGitHubClient(req.user!.id);

    if (error) {
      return res.status(error.status).json({
        error: 'GitHub not connected',
        message: error.message,
      });
    }

    const { data } = await octokit.repos.createForAuthenticatedUser({
      name,
      description,
      private: Boolean(isPrivate),
      auto_init: true,
    });

    res.status(201).json({
      id: data.id,
      name: data.name,
      description: data.description,
      url: data.html_url,
      private: data.private,
      stars: data.stargazers_count,
      forks: data.forks_count,
      language: data.language,
      updatedAt: data.updated_at,
      defaultBranch: data.default_branch,
      owner: data.owner?.login,
    });
      return res.status(400).json({ error: 'Repository name is required' });
    }

    const response = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.githubToken}`,
      },
      body: JSON.stringify({
        name,
        description,
        private: Boolean(isPrivate),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody?.message || 'GitHub rejected the repository request';
      return res.status(response.status).json({ error: message });
    }

    const repo = await response.json();
    res.status(201).json(repo);
  } catch (error: any) {
    console.error('GitHub MCP create repository error:', error);
    res.status(500).json({
      error: 'Failed to create repository',
      message: error.message
    });
  }
});

// Create issue
router.post('/issues', ensureAuthenticated, githubOAuth.requireGitHubAuth, async (req, res) => {
  try {
    const { repo, title, body, labels, owner: providedOwner } = req.body;

    if (!repo || typeof repo !== 'string') {
      return res.status(400).json({
        error: 'Repository name is required',
        message: 'Please provide the repository to create an issue in.',
      });
    }

    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        error: 'Issue title is required',
        message: 'Please provide a valid issue title.',
      });
    }

    const { octokit, currentUser, error } = await createGitHubClient(req.user!.id);

    if (error) {
      return res.status(error.status).json({
        error: 'GitHub not connected',
        message: error.message,
      });
    }

    const owner = providedOwner || currentUser?.login;

    if (!owner) {
      return res.status(400).json({
        error: 'Owner not resolved',
        message: 'Unable to resolve a GitHub owner for this issue.',
      });
    }

    const { data } = await octokit.issues.create({
      owner,
      repo,
      title,
      body,
      labels,
    });

    res.status(201).json({
      number: data.number,
      title: data.title,
      body: data.body,
      labels: data.labels?.map((label: any) => (typeof label === 'string' ? label : label?.name)).filter(Boolean),
      state: data.state,
      url: data.html_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      author: data.user?.login,
    });
    const { repo, title, body, labels } = req.body;

    if (!repo || !title) {
      return res.status(400).json({ error: 'Repository and title are required' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const githubToken = await storage.getGitHubToken(userId);
    const owner = repo.includes('/') ? repo.split('/')[0] : githubToken?.githubUsername;
    const repoName = repo.includes('/') ? repo.split('/')[1] : repo;

    if (!owner) {
      return res.status(400).json({ error: 'Unable to resolve GitHub repository owner' });
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/issues`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.githubToken}`,
      },
      body: JSON.stringify({
        title,
        body,
        labels,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody?.message || 'GitHub rejected the issue request';
      return res.status(response.status).json({ error: message });
    }

    const issue = await response.json();
    res.status(201).json(issue);
  } catch (error: any) {
    console.error('GitHub MCP create issue error:', error);
    res.status(500).json({
      error: 'Failed to create issue',
      message: error.message
    });
  }
});

// Create pull request
router.post('/pull-requests', ensureAuthenticated, githubOAuth.requireGitHubAuth, async (req, res) => {
  try {
    const { repo, title, body, head, base, owner: providedOwner } = req.body;

    if (!repo || typeof repo !== 'string') {
      return res.status(400).json({
        error: 'Repository name is required',
        message: 'Please provide the repository to create a pull request in.',
      });
    }

    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        error: 'Pull request title is required',
        message: 'Please provide a valid pull request title.',
      });
    }

    if (!head || !base) {
      return res.status(400).json({
        error: 'Branch information missing',
        message: 'Both head and base branches are required to create a pull request.',
      });
    }

    const { octokit, currentUser, error } = await createGitHubClient(req.user!.id);

    if (error) {
      return res.status(error.status).json({
        error: 'GitHub not connected',
        message: error.message,
      });
    }

    const owner = providedOwner || currentUser?.login;

    if (!owner) {
      return res.status(400).json({
        error: 'Owner not resolved',
        message: 'Unable to resolve a GitHub owner for this pull request.',
      });
    }

    const { data } = await octokit.pulls.create({
      owner,
      repo,
      title,
      head,
      base,
      body,
    });

    res.status(201).json({
      number: data.number,
      title: data.title,
      body: data.body,
      head,
      base,
      state: data.state,
      url: data.html_url,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      author: data.user?.login,
    });
    const { repo, title, body, head, base } = req.body;

    if (!repo || !title || !head || !base) {
      return res.status(400).json({ error: 'Repository, title, head, and base are required' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const githubToken = await storage.getGitHubToken(userId);
    const owner = repo.includes('/') ? repo.split('/')[0] : githubToken?.githubUsername;
    const repoName = repo.includes('/') ? repo.split('/')[1] : repo;

    if (!owner) {
      return res.status(400).json({ error: 'Unable to resolve GitHub repository owner' });
    }

    const response = await fetch(`https://api.github.com/repos/${owner}/${repoName}/pulls`, {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${req.githubToken}`,
      },
      body: JSON.stringify({
        title,
        body,
        head,
        base,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      const message = errorBody?.message || 'GitHub rejected the pull request';
      return res.status(response.status).json({ error: message });
    }

    const pullRequest = await response.json();
    res.status(201).json(pullRequest);
  } catch (error: any) {
    console.error('GitHub MCP create PR error:', error);
    res.status(500).json({
      error: 'Failed to create pull request',
      message: error.message
    });
  }
});

export default router;