import { Octokit } from '@octokit/rest';
import { storage } from '../storage';
import path from 'path';

interface GitHubImportOptions {
  projectId: number;
  userId: number;
  repoUrl: string;
  accessToken?: string;
  branch?: string;
  subdirectory?: string;
  includeLFS?: boolean;
}

interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch: string;
  isPrivate: boolean;
  size: number;
  language: string;
  description?: string;
  homepage?: string;
  topics: string[];
  hasLFS: boolean;
}

interface ImportProgress {
  phase: 'analyzing' | 'downloading' | 'processing' | 'storing' | 'completed';
  progress: number;
  message: string;
  filesProcessed: number;
  totalFiles: number;
  errors: string[];
}

interface FileEntry {
  path: string;
  content: string;
  size: number;
  type: 'file' | 'directory';
  isLFS: boolean;
  sha: string;
}

export class EnhancedGitHubImportService {
  private octokit: Octokit;
  private readonly maxFileSize = 50 * 1024 * 1024; // 50MB
  private readonly maxRepoSize = 500 * 1024 * 1024; // 500MB
  private readonly rateLimitBuffer = 100; // Keep 100 requests in reserve
  
  constructor() {
    this.octokit = new Octokit();
  }
  
  async importGitHubRepo(
    options: GitHubImportOptions,
    progressCallback?: (progress: ImportProgress) => void
  ): Promise<{
    importRecord: any;
    repoInfo: GitHubRepoInfo;
    filesImported: number;
    errors: string[];
  }> {
    const { projectId, userId, repoUrl, accessToken, branch = 'main', subdirectory, includeLFS = false } = options;
    
    // Initialize Octokit with token if provided
    if (accessToken) {
      this.octokit = new Octokit({ auth: accessToken });
    }
    
    // Create import record
    const importRecord = await storage.createProjectImport({
      projectId,
      userId,
      type: 'github',
      url: repoUrl,
      status: 'processing',
      metadata: { branch, subdirectory, includeLFS }
    });

    const progress: ImportProgress = {
      phase: 'analyzing',
      progress: 0,
      message: 'Analyzing repository...',
      filesProcessed: 0,
      totalFiles: 0,
      errors: []
    };

    try {
      progressCallback?.(progress);
      
      // Parse repository URL
      const { owner, repo } = this.parseRepoUrl(repoUrl);
      
      // Get repository information
      const repoInfo = await this.getRepoInfo(owner, repo, branch);
      
      // Check repository size limits
      if (repoInfo.size > this.maxRepoSize) {
        throw new Error(`Repository too large (${Math.round(repoInfo.size / 1024 / 1024)}MB). Maximum allowed: ${Math.round(this.maxRepoSize / 1024 / 1024)}MB`);
      }
      
      // Check rate limits
      await this.checkRateLimit();
      
      progress.phase = 'downloading';
      progress.message = 'Downloading repository contents...';
      progress.progress = 10;
      progressCallback?.(progress);
      
      // Get repository tree
      const tree = await this.getRepoTree(owner, repo, branch, subdirectory);
      progress.totalFiles = tree.length;
      
      progress.phase = 'processing';
      progress.message = 'Processing files...';
      progress.progress = 30;
      progressCallback?.(progress);
      
      // Download and process files
      const files: FileEntry[] = [];
      const batchSize = 10; // Process files in batches to avoid rate limits
      
      for (let i = 0; i < tree.length; i += batchSize) {
        const batch = tree.slice(i, i + batchSize);
        const batchFiles = await this.processBatch(owner, repo, batch, progress, progressCallback);
        files.push(...batchFiles);
        
        // Update progress
        progress.filesProcessed = files.length;
        progress.progress = 30 + (files.length / tree.length) * 50;
        progressCallback?.(progress);
        
        // Rate limit safety delay
        await this.sleep(100);
      }
      
      progress.phase = 'storing';
      progress.message = 'Storing files in project...';
      progress.progress = 80;
      progressCallback?.(progress);
      
      // Store files in project
      let filesStored = 0;
      for (const file of files) {
        if (file.type === 'file') {
          try {
            await storage.createProjectFile({
              projectId,
              userId,
              name: path.basename(file.path),
              content: file.content,
              path: file.path,
              type: 'file',
              size: file.size,
            });
            filesStored++;
          } catch (error) {
            progress.errors.push(`Failed to store file ${file.path}: ${error}`);
          }
        }
      }
      
      progress.phase = 'completed';
      progress.message = 'Import completed successfully';
      progress.progress = 100;
      progressCallback?.(progress);
      
      // Update import record
      await storage.updateProjectImport(importRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          branch,
          subdirectory,
          includeLFS,
          repoInfo,
          filesImported: filesStored,
          errors: progress.errors
        }
      });
      
      return {
        importRecord,
        repoInfo,
        filesImported: filesStored,
        errors: progress.errors
      };
    } catch (error: any) {
      progress.errors.push(error.message);
      
      // Update import record with error
      await storage.updateProjectImport(importRecord.id, {
        status: 'failed',
        error: error.message,
        completedAt: new Date(),
        metadata: { errors: progress.errors }
      });
      
      throw error;
    }
  }
  
  private parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
    const patterns = [
      /github\.com\/([^\/]+)\/([^\/\?#]+)/,
      /^([^\/]+)\/([^\/\?#]+)$/,
    ];
    
    for (const pattern of patterns) {
      const match = repoUrl.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, '')
        };
      }
    }
    
    throw new Error('Invalid GitHub repository URL');
  }
  
  private async getRepoInfo(owner: string, repo: string, branch: string): Promise<GitHubRepoInfo> {
    try {
      const { data: repoData } = await this.octokit.repos.get({ owner, repo });
      
      // Check if repository has LFS
      const hasLFS = await this.checkLFSSupport(owner, repo);
      
      return {
        owner,
        repo,
        branch,
        isPrivate: repoData.private,
        size: repoData.size * 1024, // Convert KB to bytes
        language: repoData.language || 'Unknown',
        description: repoData.description || undefined,
        homepage: repoData.homepage || undefined,
        topics: repoData.topics || [],
        hasLFS
      };
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error('Repository not found or not accessible');
      } else if (error.status === 403) {
        throw new Error('Access denied. Please check your token permissions.');
      }
      throw new Error(`Failed to fetch repository info: ${error.message}`);
    }
  }
  
  private async checkLFSSupport(owner: string, repo: string): Promise<boolean> {
    try {
      // Look for .gitattributes file which typically contains LFS configuration
      await this.octokit.repos.getContent({
        owner,
        repo,
        path: '.gitattributes'
      });
      return true;
    } catch {
      return false;
    }
  }
  
  private async getRepoTree(owner: string, repo: string, branch: string, subdirectory?: string): Promise<any[]> {
    try {
      const { data: branchData } = await this.octokit.repos.getBranch({ owner, repo, branch });
      const treeSha = branchData.commit.sha;
      
      const { data: treeData } = await this.octokit.git.getTree({
        owner,
        repo,
        tree_sha: treeSha,
        recursive: 'true'
      });
      
      let files = treeData.tree;
      
      // Filter by subdirectory if specified
      if (subdirectory) {
        const normalizedSubdir = subdirectory.replace(/^\/+|\/+$/g, '');
        files = files.filter(file => 
          file.path?.startsWith(normalizedSubdir + '/') || file.path === normalizedSubdir
        );
      }
      
      // Filter out unsupported files
      files = files.filter(file => {
        if (file.type === 'tree') return false; // Skip directories in tree view
        if (!file.path) return false;
        
        const ext = path.extname(file.path);
        const supportedExtensions = [
          '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
          '.css', '.scss', '.sass', '.less', '.html',
          '.json', '.md', '.txt', '.yml', '.yaml',
          '.toml', '.ini', '.env', '.gitignore',
          '.py', '.rb', '.php', '.java', '.c', '.cpp',
          '.cs', '.go', '.rs', '.swift', '.kt'
        ];
        
        return supportedExtensions.includes(ext) || 
               this.isConfigFile(path.basename(file.path)) ||
               file.size! < this.maxFileSize;
      });
      
      return files;
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Branch '${branch}' not found`);
      }
      throw new Error(`Failed to fetch repository tree: ${error.message}`);
    }
  }
  
  private async processBatch(
    owner: string, 
    repo: string, 
    batch: any[], 
    progress: ImportProgress,
    progressCallback?: (progress: ImportProgress) => void
  ): Promise<FileEntry[]> {
    const files: FileEntry[] = [];
    
    for (const item of batch) {
      try {
        const file = await this.downloadFile(owner, repo, item);
        if (file) {
          files.push(file);
        }
      } catch (error: any) {
        progress.errors.push(`Failed to download ${item.path}: ${error.message}`);
        console.warn(`Failed to download ${item.path}:`, error);
      }
    }
    
    return files;
  }
  
  private async downloadFile(owner: string, repo: string, item: any): Promise<FileEntry | null> {
    if (item.type !== 'blob' || !item.path) {
      return null;
    }
    
    // Check file size
    if (item.size > this.maxFileSize) {
      throw new Error(`File too large: ${Math.round(item.size / 1024 / 1024)}MB`);
    }
    
    try {
      const { data: fileData } = await this.octokit.repos.getContent({
        owner,
        repo,
        path: item.path
      });
      
      if ('content' in fileData && fileData.content) {
        // Decode base64 content
        const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
        
        return {
          path: item.path,
          content,
          size: item.size,
          type: 'file',
          isLFS: this.isLFSFile(content),
          sha: item.sha
        };
      }
    } catch (error: any) {
      if (error.status === 403 && error.message.includes('too_large')) {
        // Try to handle LFS files
        return await this.handleLFSFile(owner, repo, item);
      }
      throw error;
    }
    
    return null;
  }
  
  private isLFSFile(content: string): boolean {
    return content.startsWith('version https://git-lfs.github.com/spec/');
  }
  
  private async handleLFSFile(owner: string, repo: string, item: any): Promise<FileEntry | null> {
    // For LFS files, we'll create a placeholder
    const placeholderContent = `# LFS File: ${item.path}

This file is stored using Git LFS and cannot be directly imported.
- File size: ${Math.round(item.size / 1024)}KB
- SHA: ${item.sha}

To access this file, you'll need to:
1. Clone the repository with LFS support
2. Use the GitHub API to download the LFS content
3. Upload the file manually to your project
`;

    return {
      path: item.path + '.lfs-placeholder.md',
      content: placeholderContent,
      size: placeholderContent.length,
      type: 'file',
      isLFS: true,
      sha: item.sha
    };
  }
  
  private isConfigFile(filename: string): boolean {
    const configFiles = [
      'package.json', 'package-lock.json', 'yarn.lock',
      'tsconfig.json', 'jsconfig.json',
      'vite.config.js', 'vite.config.ts',
      'webpack.config.js', 'rollup.config.js',
      '.babelrc', '.eslintrc', '.prettierrc',
      'tailwind.config.js', 'postcss.config.js',
      'docker-compose.yml', 'Dockerfile',
      'README.md', 'LICENSE', 'CHANGELOG.md'
    ];
    
    return configFiles.includes(filename) || 
           filename.startsWith('.env') ||
           filename.startsWith('.git');
  }
  
  private async checkRateLimit(): Promise<void> {
    try {
      const { data: rateLimit } = await this.octokit.rateLimit.get();
      
      if (rateLimit.rate.remaining < this.rateLimitBuffer) {
        const resetTime = new Date(rateLimit.rate.reset * 1000);
        const waitTime = Math.max(0, resetTime.getTime() - Date.now());
        
        if (waitTime > 0) {
          throw new Error(`Rate limit exceeded. Please wait ${Math.round(waitTime / 1000 / 60)} minutes.`);
        }
      }
    } catch (error: any) {
      if (error.status !== 404) { // Some tokens might not have rate limit access
        console.warn('Could not check rate limit:', error.message);
      }
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async validateGitHubToken(token: string): Promise<{
    valid: boolean;
    user?: any;
    scopes?: string[];
  }> {
    try {
      const testOctokit = new Octokit({ auth: token });
      const { data: user } = await testOctokit.users.getAuthenticated();
      
      // Get token scopes from headers
      const response = await testOctokit.request('GET /user');
      const scopes = response.headers['x-oauth-scopes']?.split(', ') || [];
      
      return {
        valid: true,
        user,
        scopes
      };
    } catch (error) {
      return { valid: false };
    }
  }
  
  async searchRepositories(query: string, options: {
    sort?: 'stars' | 'forks' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<any> {
    try {
      const { data } = await this.octokit.search.repos({
        q: query,
        sort: options.sort,
        order: options.order,
        per_page: options.per_page || 30,
        page: options.page || 1
      });
      
      return data;
    } catch (error: any) {
      throw new Error(`Failed to search repositories: ${error.message}`);
    }
  }
  
  async listUserRepositories(username: string): Promise<any[]> {
    try {
      const { data } = await this.octokit.repos.listForUser({
        username,
        type: 'public',
        sort: 'updated',
        per_page: 100
      });
      
      return data;
    } catch (error: any) {
      throw new Error(`Failed to list user repositories: ${error.message}`);
    }
  }
}

export const enhancedGitHubImportService = new EnhancedGitHubImportService();