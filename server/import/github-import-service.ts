import { storage } from '../storage';
import { BaseImportAdapter } from './base-adapter';
import { GitHubImportOptions, ImportOptions, ImportResult } from './types';
import { Octokit } from '@octokit/rest';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs/promises';

const execAsync = promisify(exec);

interface GitHubRepo {
  owner: string;
  repo: string;
  branch: string;
  subdirectory?: string;
}

interface RepoFile {
  path: string;
  content: string;
  size: number;
  isLFS?: boolean;
}

class GitHubImportService extends BaseImportAdapter {
  private octokit: Octokit | null = null;
  
  constructor() {
    super('github');
  }

  async prepare(options: ImportOptions): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const githubOptions = options as GitHubImportOptions;
    
    if (!githubOptions.githubUrl) {
      errors.push('GitHub URL is required');
    }
    
    // Initialize Octokit if token is provided
    if (githubOptions.token) {
      this.octokit = new Octokit({ auth: githubOptions.token });
    } else if (process.env.GITHUB_TOKEN) {
      this.octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    }
    
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async validate(options: ImportOptions): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const githubOptions = options as GitHubImportOptions;
    
    try {
      const repoInfo = this.parseGitHubUrl(githubOptions.githubUrl);
      if (!repoInfo) {
        errors.push('Invalid GitHub URL format');
        return { valid: false, errors };
      }
      
      // Test repository access
      if (this.octokit) {
        try {
          await this.octokit.repos.get({
            owner: repoInfo.owner,
            repo: repoInfo.repo
          });
        } catch (error: any) {
          if (error.status === 404) {
            errors.push('Repository not found or access denied');
          } else if (error.status === 401) {
            errors.push('Invalid GitHub token');
          } else {
            errors.push(`GitHub API error: ${error.message}`);
          }
        }
      }
      
      // Validate subdirectory if specified
      if (githubOptions.subdirectory && this.octokit) {
        try {
          await this.octokit.repos.getContent({
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            path: githubOptions.subdirectory,
            ref: repoInfo.branch
          });
        } catch (error: any) {
          if (error.status === 404) {
            errors.push(`Subdirectory '${githubOptions.subdirectory}' not found`);
          }
        }
      }
    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
    }
    
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async import(options: ImportOptions): Promise<ImportResult> {
    const githubOptions = options as GitHubImportOptions;
    const startTime = Date.now();
    
    // Create import record
    const importRecord = await this.createImportRecord(options);
    let filesCreated = 0;

    try {
      const stages = this.generateProgressStages([
        'parsing_url',
        'fetching_repository_info',
        'detecting_monorepo',
        'downloading_files',
        'processing_lfs',
        'creating_files'
      ]);

      // Stage 1: Parse URL
      await this.reportProgress(importRecord.id, {
        stage: 'parsing_url',
        progress: stages.parsing_url,
        message: 'Parsing GitHub URL...',
        timestamp: new Date()
      });

      const repoInfo = this.parseGitHubUrl(githubOptions.githubUrl);
      if (!repoInfo) {
        throw new Error('Invalid GitHub URL format');
      }

      // Stage 2: Fetch repository info
      await this.reportProgress(importRecord.id, {
        stage: 'fetching_repository_info',
        progress: stages.fetching_repository_info,
        message: 'Fetching repository information...',
        timestamp: new Date()
      });

      let repoData: any = null;
      if (this.octokit) {
        repoData = await this.octokit.repos.get({
          owner: repoInfo.owner,
          repo: repoInfo.repo
        });
      }

      // Stage 3: Detect monorepo structure
      await this.reportProgress(importRecord.id, {
        stage: 'detecting_monorepo',
        progress: stages.detecting_monorepo,
        message: 'Detecting monorepo structure...',
        timestamp: new Date()
      });

      const isMonorepo = await this.detectMonorepo(repoInfo);
      const targetPath = githubOptions.subdirectory || (isMonorepo ? await this.selectSubproject(repoInfo) : '');

      // Stage 4: Download files
      await this.reportProgress(importRecord.id, {
        stage: 'downloading_files',
        progress: stages.downloading_files,
        message: 'Downloading repository files...',
        timestamp: new Date()
      });

      const files = await this.downloadRepositoryFiles(repoInfo, targetPath);

      // Stage 5: Process LFS files
      let lfsFiles: RepoFile[] = [];
      if (githubOptions.handleLFS) {
        await this.reportProgress(importRecord.id, {
          stage: 'processing_lfs',
          progress: stages.processing_lfs,
          message: 'Processing Git LFS files...',
          timestamp: new Date()
        });

        lfsFiles = await this.processLFSFiles(files, repoInfo);
      }

      // Stage 6: Create files
      await this.reportProgress(importRecord.id, {
        stage: 'creating_files',
        progress: stages.creating_files,
        message: 'Creating project files...',
        timestamp: new Date()
      });

      // Create repository files
      const allFiles = [...files, ...lfsFiles];
      for (const file of allFiles) {
        await storage.createFile({
          projectId: options.projectId,
          name: path.basename(file.path),
          path: file.path,
          content: file.content,
          userId: options.userId
        });
        filesCreated++;
      }

      // Create GitHub metadata file
      await storage.createFile({
        projectId: options.projectId,
        name: '.github-import.json',
        path: '/.github-import.json',
        content: JSON.stringify({
          originalUrl: githubOptions.githubUrl,
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          branch: repoInfo.branch,
          subdirectory: targetPath,
          isMonorepo,
          importedAt: new Date().toISOString(),
          stats: {
            filesImported: filesCreated,
            lfsFilesProcessed: lfsFiles.length,
            totalSize: allFiles.reduce((sum, f) => sum + f.size, 0)
          },
          repoInfo: repoData?.data ? {
            description: repoData.data.description,
            language: repoData.data.language,
            stargazers_count: repoData.data.stargazers_count,
            forks_count: repoData.data.forks_count
          } : null
        }, null, 2),
        userId: options.userId
      });
      filesCreated++;

      // Update import record
      await this.updateImportRecord(importRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          branch: repoInfo.branch,
          subdirectory: targetPath,
          filesCreated,
          isMonorepo,
          lfsFilesProcessed: lfsFiles.length
        }
      });

      // Track telemetry
      await this.trackTelemetry({
        importType: 'github',
        success: true,
        duration: Date.now() - startTime,
        artifactCounts: {
          files: filesCreated,
          assets: lfsFiles.length,
          components: this.countComponents(allFiles)
        },
        metadata: {
          isMonorepo,
          hasSubdirectory: !!targetPath,
          repoSize: repoData?.data?.size || 0,
          language: repoData?.data?.language
        }
      });

      return {
        id: importRecord.id,
        status: 'completed' as const,
        progress: [],
        metadata: {
          owner: repoInfo.owner,
          repo: repoInfo.repo,
          branch: repoInfo.branch,
          subdirectory: targetPath,
          filesCreated,
          isMonorepo
        },
        filesCreated
      };

    } catch (error: any) {
      await this.handleImportError(importRecord.id, error);
      
      // Track failed telemetry
      await this.trackTelemetry({
        importType: 'github',
        success: false,
        duration: Date.now() - startTime,
        artifactCounts: {
          files: filesCreated,
          assets: 0,
          components: 0
        },
        error: error.message
      });
      
      throw error;
    }
  }

  private parseGitHubUrl(url: string): GitHubRepo | null {
    const patterns = [
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)(?:\/tree\/([^\/]+)(?:\/(.+))?)?/,
      /^git@github\.com:([^\/]+)\/([^\/]+)\.git$/,
      /^https?:\/\/github\.com\/([^\/]+)\/([^\/]+)\.git$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return {
          owner: match[1],
          repo: match[2].replace(/\.git$/, ''),
          branch: match[3] || 'main',
          subdirectory: match[4]
        };
      }
    }

    return null;
  }

  private async detectMonorepo(repoInfo: GitHubRepo): Promise<boolean> {
    if (!this.octokit) return false;

    try {
      const { data: contents } = await this.octokit.repos.getContent({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        path: '',
        ref: repoInfo.branch
      });

      if (!Array.isArray(contents)) return false;

      // Look for monorepo indicators
      const monorepoIndicators = [
        'lerna.json',
        'nx.json',
        'rush.json',
        'pnpm-workspace.yaml',
        'workspaces'
      ];

      const hasMonorepoFile = contents.some(item => 
        monorepoIndicators.includes(item.name)
      );

      // Check for multiple package.json files in subdirectories
      const packageDirs = contents.filter(item => 
        item.type === 'dir' && 
        !['node_modules', '.git', '.github'].includes(item.name)
      );

      let packageJsonCount = 0;
      for (const dir of packageDirs.slice(0, 5)) { // Check first 5 dirs to avoid rate limits
        try {
          await this.octokit.repos.getContent({
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            path: `${dir.name}/package.json`,
            ref: repoInfo.branch
          });
          packageJsonCount++;
        } catch (e) {
          // Directory doesn't have package.json
        }
      }

      return hasMonorepoFile || packageJsonCount >= 2;
    } catch (error) {
      console.warn('Failed to detect monorepo structure:', error);
      return false;
    }
  }

  private async selectSubproject(repoInfo: GitHubRepo): Promise<string> {
    // In a real implementation, this would present options to the user
    // For now, return the first directory with a package.json
    
    if (!this.octokit) return '';

    try {
      const { data: contents } = await this.octokit.repos.getContent({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        path: '',
        ref: repoInfo.branch
      });

      if (!Array.isArray(contents)) return '';

      const dirs = contents.filter(item => 
        item.type === 'dir' && 
        !['node_modules', '.git', '.github'].includes(item.name)
      );

      for (const dir of dirs) {
        try {
          await this.octokit.repos.getContent({
            owner: repoInfo.owner,
            repo: repoInfo.repo,
            path: `${dir.name}/package.json`,
            ref: repoInfo.branch
          });
          return dir.name;
        } catch (e) {
          // Continue to next directory
        }
      }
    } catch (error) {
      console.warn('Failed to select subproject:', error);
    }

    return '';
  }

  private async downloadRepositoryFiles(repoInfo: GitHubRepo, subdirectory = ''): Promise<RepoFile[]> {
    const files: RepoFile[] = [];
    
    if (this.octokit) {
      // Use GitHub API for authenticated requests
      await this.downloadFilesRecursively(repoInfo, subdirectory, files);
    } else {
      // Fallback to git clone for public repositories
      await this.downloadWithGitClone(repoInfo, subdirectory, files);
    }

    return files;
  }

  private async downloadFilesRecursively(
    repoInfo: GitHubRepo, 
    path: string, 
    files: RepoFile[], 
    depth = 0
  ): Promise<void> {
    if (depth > 10) return; // Prevent infinite recursion
    
    if (!this.octokit) return;

    try {
      const { data: contents } = await this.octokit.repos.getContent({
        owner: repoInfo.owner,
        repo: repoInfo.repo,
        path,
        ref: repoInfo.branch
      });

      if (!Array.isArray(contents)) {
        // Single file
        if (contents.type === 'file' && contents.content) {
          const content = Buffer.from(contents.content, 'base64').toString('utf-8');
          files.push({
            path: `/${contents.path}`,
            content,
            size: contents.size
          });
        }
        return;
      }

      // Directory contents
      for (const item of contents) {
        if (item.type === 'file') {
          try {
            const { data: fileData } = await this.octokit.repos.getContent({
              owner: repoInfo.owner,
              repo: repoInfo.repo,
              path: item.path,
              ref: repoInfo.branch
            });

            if ('content' in fileData && fileData.content) {
              const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
              files.push({
                path: `/${item.path}`,
                content,
                size: item.size
              });
            }
          } catch (error) {
            console.warn(`Failed to download file ${item.path}:`, error);
          }
        } else if (item.type === 'dir' && !item.name.startsWith('.')) {
          await this.downloadFilesRecursively(repoInfo, item.path, files, depth + 1);
        }
      }
    } catch (error) {
      console.warn(`Failed to download directory ${path}:`, error);
    }
  }

  private async downloadWithGitClone(
    repoInfo: GitHubRepo, 
    subdirectory: string, 
    files: RepoFile[]
  ): Promise<void> {
    const tempDir = `/tmp/github-import-${Date.now()}`;
    const repoUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}.git`;
    
    try {
      // Clone repository
      await execAsync(`git clone --depth 1 --branch ${repoInfo.branch} ${repoUrl} ${tempDir}`);
      
      // Read files recursively
      const targetPath = subdirectory ? `${tempDir}/${subdirectory}` : tempDir;
      await this.readDirectoryRecursively(targetPath, files, subdirectory || '');
      
    } catch (error) {
      throw new Error(`Failed to clone repository: ${error}`);
    } finally {
      // Cleanup
      try {
        await execAsync(`rm -rf ${tempDir}`);
      } catch (e) {
        console.warn('Failed to cleanup temp directory:', e);
      }
    }
  }

  private async readDirectoryRecursively(
    dirPath: string, 
    files: RepoFile[], 
    relativePath: string
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.')) continue; // Skip hidden files
        
        const fullPath = path.join(dirPath, entry.name);
        const relativeFilePath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
        
        if (entry.isDirectory()) {
          await this.readDirectoryRecursively(fullPath, files, relativeFilePath);
        } else if (entry.isFile()) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            const stats = await fs.stat(fullPath);
            
            files.push({
              path: `/${relativeFilePath}`,
              content,
              size: stats.size
            });
          } catch (error) {
            console.warn(`Failed to read file ${fullPath}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to read directory ${dirPath}:`, error);
    }
  }

  private async processLFSFiles(files: RepoFile[], repoInfo: GitHubRepo): Promise<RepoFile[]> {
    const lfsFiles: RepoFile[] = [];
    
    // Detect LFS pointer files
    const lfsPointers = files.filter(file => 
      file.content.startsWith('version https://git-lfs.github.com/spec/v1')
    );

    for (const pointer of lfsPointers) {
      try {
        // Parse LFS pointer to get the actual file URL
        const oidMatch = pointer.content.match(/oid sha256:([a-f0-9]+)/);
        if (oidMatch) {
          const oid = oidMatch[1];
          
          // Construct LFS URL (simplified)
          const lfsUrl = `https://github.com/${repoInfo.owner}/${repoInfo.repo}/raw/${repoInfo.branch}/${pointer.path.substring(1)}`;
          
          try {
            const response = await fetch(lfsUrl);
            if (response.ok) {
              const content = await response.text();
              lfsFiles.push({
                path: pointer.path,
                content,
                size: content.length,
                isLFS: true
              });
            }
          } catch (fetchError) {
            console.warn(`Failed to fetch LFS file ${pointer.path}:`, fetchError);
          }
        }
      } catch (error) {
        console.warn(`Failed to process LFS pointer ${pointer.path}:`, error);
      }
    }

    return lfsFiles;
  }

  private countComponents(files: RepoFile[]): number {
    return files.filter(f => 
      f.path.includes('/components/') || 
      f.path.endsWith('.tsx') || 
      f.path.endsWith('.jsx') ||
      f.path.endsWith('.vue') ||
      f.path.endsWith('.svelte')
    ).length;
  }

  // Legacy method for backward compatibility  
  async cloneRepository(url: string, projectId: number, userId: number) {
    return this.import({
      projectId,
      userId,
      url,
      githubUrl: url
    } as GitHubImportOptions);
  }
}

export const githubImportService = new GitHubImportService();