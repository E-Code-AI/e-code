import { Request, Response, NextFunction } from 'express';
import fetch from 'node-fetch';
import { storage } from '../storage';
import jwt from 'jsonwebtoken';

interface GitHubUser {
  id: number;
  login: string;
  name: string;
  email: string;
  avatar_url: string;
  html_url: string;
}

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  private: boolean;
  fork: boolean;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  language: string;
  stargazers_count: number;
  watchers_count: number;
  forks_count: number;
  default_branch: string;
  owner: {
    login: string;
    avatar_url: string;
  };
}

export class GitHubOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    // These would typically come from environment variables
    // For development, we'll use placeholder values that need to be configured
    this.clientId = process.env.GITHUB_CLIENT_ID || 'your_github_client_id';
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET || 'your_github_client_secret';
    this.redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:5000/api/auth/github/callback';
  }

  // Generate OAuth authorization URL
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'repo user:email',
      state: state,
      allow_signup: 'true'
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<string> {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: code,
        redirect_uri: this.redirectUri
      })
    });

    const data = await response.json() as any;

    if (data.error) {
      throw new Error(data.error_description || 'Failed to exchange code for token');
    }

    return data.access_token;
  }

  // Get GitHub user information
  async getUser(accessToken: string): Promise<GitHubUser> {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub user');
    }

    return await response.json() as GitHubUser;
  }

  // Get user's repositories
  async getUserRepos(accessToken: string, page: number = 1, perPage: number = 30): Promise<GitHubRepo[]> {
    const response = await fetch(`https://api.github.com/user/repos?page=${page}&per_page=${perPage}&sort=updated`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }

    return await response.json() as GitHubRepo[];
  }

  // Get a specific repository
  async getRepository(accessToken: string, owner: string, repo: string): Promise<GitHubRepo> {
    const response = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch repository');
    }

    return await response.json() as GitHubRepo;
  }

  // Clone repository contents
  async cloneRepository(accessToken: string, owner: string, repo: string, branch?: string): Promise<any> {
    // First, get the repository info
    const repoInfo = await this.getRepository(accessToken, owner, repo);
    const defaultBranch = branch || repoInfo.default_branch;

    // Get the tree for the repository
    const treeResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!treeResponse.ok) {
      throw new Error('Failed to fetch repository tree');
    }

    const tree = await treeResponse.json() as any;
    const files: Array<{ path: string; content: string }> = [];

    // Fetch content for each file (excluding directories)
    for (const item of tree.tree) {
      if (item.type === 'blob' && item.size < 1000000) { // Skip files larger than 1MB
        try {
          const contentResponse = await fetch(item.url, {
            headers: {
              'Accept': 'application/vnd.github.v3+json',
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (contentResponse.ok) {
            const contentData = await contentResponse.json() as any;
            if (contentData.encoding === 'base64' && contentData.content) {
              const content = Buffer.from(contentData.content, 'base64').toString('utf-8');
              files.push({
                path: item.path,
                content: content
              });
            }
          }
        } catch (error) {
          console.error(`Failed to fetch content for ${item.path}:`, error);
        }
      }
    }

    return {
      repository: repoInfo,
      files: files,
      branch: defaultBranch
    };
  }

  // Store GitHub token for user
  async storeUserToken(userId: number, accessToken: string, githubUser: GitHubUser): Promise<void> {
    await storage.storeGitHubToken(userId, {
      accessToken: accessToken,
      githubId: githubUser.id,
      githubUsername: githubUser.login,
      githubEmail: githubUser.email || '',
      githubAvatarUrl: githubUser.avatar_url,
      connectedAt: new Date()
    });
  }

  // Get stored GitHub token
  async getUserToken(userId: number): Promise<string | null> {
    const tokenData = await storage.getGitHubToken(userId);
    return tokenData?.accessToken || null;
  }

  // Remove GitHub connection
  async disconnectUser(userId: number): Promise<void> {
    await storage.removeGitHubToken(userId);
  }

  // Middleware to check GitHub authentication
  requireGitHubAuth = async (req: any, res: Response, next: NextFunction) => {
    if (!req.user?.id) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const token = await this.getUserToken(req.user.id);
    if (!token) {
      return res.status(401).json({ error: 'GitHub not connected' });
    }

    // Attach token to request for use in route handlers
    req.githubToken = token;
    next();
  };
}

export const githubOAuth = new GitHubOAuthService();