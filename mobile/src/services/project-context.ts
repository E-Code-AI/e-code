import { File, Language, Project } from '../../../shared/mobile-types';
import { StorageService } from './storage';
import { API_BASE_URL } from './config';

export interface FileTreeNode {
  id: number;
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileTreeNode[];
}

export interface RecentChange {
  fileId: number;
  filePath: string;
  timestamp: Date;
  changeType: 'created' | 'modified' | 'deleted';
}

export interface ProjectContext {
  projectId: number;
  projectName: string;
  language: Language | string;
  framework?: string;
  fileTree: FileTreeNode[];
  fileCount: number;
  openFiles: File[];
  activeFile?: File;
  recentChanges: RecentChange[];
  lastSynced: Date;
  version: number;
}

export interface ContextSummary {
  fileCount: number;
  projectType: string;
  hasActiveFile: boolean;
  activeFileName?: string;
  recentChangeCount: number;
}

interface CachedContext {
  context: ProjectContext;
  cachedAt: number;
}

const CACHE_KEY_PREFIX = 'project_context_';
const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CONTEXT_TOKENS = 8000;
const APPROX_CHARS_PER_TOKEN = 4;
const MAX_CONTEXT_CHARS = MAX_CONTEXT_TOKENS * APPROX_CHARS_PER_TOKEN;

const MAX_FILES_IN_TREE = 100;
const MAX_FILE_CONTENT_LENGTH = 2000;
const MAX_OPEN_FILES_CONTEXT = 5;
const MAX_RECENT_CHANGES = 10;

export class ProjectContextService {
  private projectId: number;
  private token: string;
  private context: ProjectContext | null = null;
  private openFiles: File[] = [];
  private activeFile: File | null = null;
  private cursorPosition: { line: number; column: number } | null = null;
  private recentChanges: RecentChange[] = [];

  constructor(projectId: number, token: string) {
    this.projectId = projectId;
    this.token = token;
  }

  async initialize(): Promise<ProjectContext> {
    const cached = await this.loadFromCache();
    if (cached && this.isCacheValid(cached)) {
      this.context = cached.context;
      return this.context;
    }

    return await this.syncFromBackend();
  }

  async syncFromBackend(): Promise<ProjectContext> {
    try {
      const [projectData, filesData] = await Promise.all([
        this.fetchProject(),
        this.fetchProjectFiles(),
      ]);

      const fileTree = this.buildFileTree(filesData);
      
      this.context = {
        projectId: this.projectId,
        projectName: projectData.name,
        language: projectData.language || 'other',
        framework: this.detectFramework(filesData),
        fileTree,
        fileCount: filesData.length,
        openFiles: this.openFiles,
        activeFile: this.activeFile ?? undefined,
        recentChanges: this.recentChanges.slice(0, MAX_RECENT_CHANGES),
        lastSynced: new Date(),
        version: 1,
      };

      await this.saveToCache(this.context);
      return this.context;
    } catch (error) {
      console.error('[ProjectContextService] Sync failed:', error);
      
      const cached = await this.loadFromCache();
      if (cached) {
        this.context = cached.context;
        return this.context;
      }
      
      throw error;
    }
  }

  private async fetchProject(): Promise<Project> {
    const response = await fetch(`${API_BASE_URL}/mobile/projects/${this.projectId}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch project: ${response.status}`);
    }

    return response.json();
  }

  private async fetchProjectFiles(): Promise<File[]> {
    const response = await fetch(`${API_BASE_URL}/mobile/projects/${this.projectId}/files`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch files: ${response.status}`);
    }

    return response.json();
  }

  private buildFileTree(files: File[]): FileTreeNode[] {
    const nodeMap = new Map<string, FileTreeNode>();
    const rootNodes: FileTreeNode[] = [];

    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    for (const file of sortedFiles.slice(0, MAX_FILES_IN_TREE)) {
      const node: FileTreeNode = {
        id: file.id,
        name: file.name,
        path: file.path,
        isDirectory: file.isDirectory,
        children: file.isDirectory ? [] : undefined,
      };

      nodeMap.set(file.path, node);

      const parentPath = file.path.split('/').slice(0, -1).join('/');
      if (parentPath && nodeMap.has(parentPath)) {
        const parent = nodeMap.get(parentPath)!;
        if (parent.children) {
          parent.children.push(node);
        }
      } else if (!parentPath || parentPath === '') {
        rootNodes.push(node);
      }
    }

    return rootNodes;
  }

  private detectFramework(files: File[]): string | undefined {
    const fileNames = files.map(f => f.name.toLowerCase());
    const filePaths = files.map(f => f.path.toLowerCase());

    if (fileNames.includes('package.json')) {
      if (filePaths.some(p => p.includes('next.config'))) return 'Next.js';
      if (filePaths.some(p => p.includes('vite.config'))) return 'Vite';
      if (filePaths.some(p => p.includes('angular.json'))) return 'Angular';
      if (filePaths.some(p => p.includes('vue.config'))) return 'Vue';
      if (fileNames.some(n => n.includes('react'))) return 'React';
      return 'Node.js';
    }

    if (fileNames.includes('requirements.txt') || fileNames.includes('pyproject.toml')) {
      if (filePaths.some(p => p.includes('django'))) return 'Django';
      if (filePaths.some(p => p.includes('flask'))) return 'Flask';
      if (filePaths.some(p => p.includes('fastapi'))) return 'FastAPI';
      return 'Python';
    }

    if (fileNames.includes('cargo.toml')) return 'Rust';
    if (fileNames.includes('go.mod')) return 'Go';
    if (fileNames.includes('pom.xml')) return 'Java/Maven';
    if (fileNames.includes('build.gradle')) return 'Java/Gradle';

    return undefined;
  }

  setActiveFile(file: File | null, cursorPosition?: { line: number; column: number }): void {
    this.activeFile = file;
    this.cursorPosition = cursorPosition || null;

    if (file && !this.openFiles.find(f => f.id === file.id)) {
      this.openFiles = [file, ...this.openFiles.slice(0, MAX_OPEN_FILES_CONTEXT - 1)];
    }

    if (this.context) {
      this.context.activeFile = file ?? undefined;
      this.context.openFiles = this.openFiles;
    }
  }

  recordChange(fileId: number, filePath: string, changeType: 'created' | 'modified' | 'deleted'): void {
    const change: RecentChange = {
      fileId,
      filePath,
      timestamp: new Date(),
      changeType,
    };

    this.recentChanges = [change, ...this.recentChanges.filter(c => c.fileId !== fileId)]
      .slice(0, MAX_RECENT_CHANGES);

    if (this.context) {
      this.context.recentChanges = this.recentChanges;
    }
  }

  getContext(): ProjectContext | null {
    return this.context;
  }

  getSummary(): ContextSummary | null {
    if (!this.context) return null;

    return {
      fileCount: this.context.fileCount,
      projectType: this.context.framework || this.context.language,
      hasActiveFile: !!this.context.activeFile,
      activeFileName: this.context.activeFile?.name,
      recentChangeCount: this.context.recentChanges.length,
    };
  }

  getContextBlock(): string {
    if (!this.context) return '';

    const parts: string[] = [];

    parts.push(`<project_context>`);
    parts.push(`Project: ${this.context.projectName}`);
    parts.push(`Language: ${this.context.language}`);
    if (this.context.framework) {
      parts.push(`Framework: ${this.context.framework}`);
    }
    parts.push(`Files: ${this.context.fileCount}`);

    if (this.activeFile) {
      parts.push('');
      parts.push(`<active_file>`);
      parts.push(`Path: ${this.activeFile.path}`);
      if (this.cursorPosition) {
        parts.push(`Cursor: Line ${this.cursorPosition.line}, Column ${this.cursorPosition.column}`);
      }
      if (this.activeFile.content) {
        const truncatedContent = this.truncateContent(this.activeFile.content, MAX_FILE_CONTENT_LENGTH);
        parts.push(`\`\`\`${this.getFileExtension(this.activeFile.name)}`);
        parts.push(truncatedContent);
        parts.push('```');
      }
      parts.push(`</active_file>`);
    }

    if (this.openFiles.length > 0) {
      parts.push('');
      parts.push(`<open_files>`);
      for (const file of this.openFiles.slice(0, MAX_OPEN_FILES_CONTEXT)) {
        if (file.id !== this.activeFile?.id) {
          parts.push(`- ${file.path}`);
        }
      }
      parts.push(`</open_files>`);
    }

    if (this.context.fileTree.length > 0) {
      parts.push('');
      parts.push(`<file_structure>`);
      parts.push(this.renderFileTree(this.context.fileTree, '', 0, 20));
      parts.push(`</file_structure>`);
    }

    if (this.context.recentChanges.length > 0) {
      parts.push('');
      parts.push(`<recent_changes>`);
      for (const change of this.context.recentChanges.slice(0, 5)) {
        parts.push(`- ${change.changeType}: ${change.filePath}`);
      }
      parts.push(`</recent_changes>`);
    }

    parts.push(`</project_context>`);

    let contextBlock = parts.join('\n');
    
    if (contextBlock.length > MAX_CONTEXT_CHARS) {
      contextBlock = this.compressContext(parts);
    }

    return contextBlock;
  }

  private renderFileTree(nodes: FileTreeNode[], prefix: string, depth: number, maxDepth: number): string {
    if (depth >= maxDepth) return prefix + '...';

    const lines: string[] = [];
    const sortedNodes = [...nodes].sort((a, b) => {
      if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    for (let i = 0; i < sortedNodes.length && lines.length < 30; i++) {
      const node = sortedNodes[i];
      const isLast = i === sortedNodes.length - 1;
      const connector = isLast ? '└── ' : '├── ';
      const icon = node.isDirectory ? '📁 ' : '';

      lines.push(`${prefix}${connector}${icon}${node.name}`);

      if (node.isDirectory && node.children && node.children.length > 0) {
        const childPrefix = prefix + (isLast ? '    ' : '│   ');
        const childLines = this.renderFileTree(node.children, childPrefix, depth + 1, maxDepth);
        if (childLines) lines.push(childLines);
      }
    }

    return lines.join('\n');
  }

  private truncateContent(content: string, maxLength: number): string {
    if (content.length <= maxLength) return content;
    
    const halfLength = Math.floor(maxLength / 2) - 20;
    return `${content.slice(0, halfLength)}\n... [${content.length - maxLength} chars truncated] ...\n${content.slice(-halfLength)}`;
  }

  private compressContext(parts: string[]): string {
    const essential = parts.filter(p => 
      p.includes('<project_context>') ||
      p.includes('</project_context>') ||
      p.startsWith('Project:') ||
      p.startsWith('Language:') ||
      p.startsWith('Framework:') ||
      p.startsWith('Files:') ||
      p.includes('<active_file>') ||
      p.includes('</active_file>') ||
      p.startsWith('Path:')
    );

    return essential.join('\n');
  }

  private getFileExtension(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const langMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'tsx',
      'js': 'javascript',
      'jsx': 'jsx',
      'py': 'python',
      'rs': 'rust',
      'go': 'go',
      'java': 'java',
      'css': 'css',
      'html': 'html',
      'json': 'json',
      'md': 'markdown',
      'sql': 'sql',
      'sh': 'bash',
      'yml': 'yaml',
      'yaml': 'yaml',
    };
    return langMap[ext] || ext;
  }

  private getCacheKey(): string {
    return `${CACHE_KEY_PREFIX}${this.projectId}`;
  }

  private async loadFromCache(): Promise<CachedContext | null> {
    try {
      return await StorageService.get<CachedContext>(this.getCacheKey());
    } catch (error) {
      console.error('[ProjectContextService] Cache load error:', error);
      return null;
    }
  }

  private async saveToCache(context: ProjectContext): Promise<void> {
    try {
      const cached: CachedContext = {
        context,
        cachedAt: Date.now(),
      };
      await StorageService.set(this.getCacheKey(), cached);
    } catch (error) {
      console.error('[ProjectContextService] Cache save error:', error);
    }
  }

  private isCacheValid(cached: CachedContext): boolean {
    return Date.now() - cached.cachedAt < CACHE_TTL_MS;
  }

  async clearCache(): Promise<void> {
    await StorageService.remove(this.getCacheKey());
  }
}

export default ProjectContextService;
