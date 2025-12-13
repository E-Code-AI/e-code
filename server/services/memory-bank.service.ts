/**
 * Memory Bank Service
 * Inspired by Kilocode's Memory Bank feature
 * 
 * Provides persistent project context across agent sessions to prevent "AI amnesia"
 * Stores project-specific documentation that is automatically injected into agent prompts
 * 
 * Storage location: .ecode/memory-bank/ in each project
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface MemoryBankFile {
  name: string;
  content: string;
  lastUpdated: Date;
  size: number;
}

export interface MemoryBank {
  projectId: number;
  files: MemoryBankFile[];
  totalSize: number;
  initialized: boolean;
  lastUpdated: Date;
}

export interface MemoryBankContext {
  brief: string;
  architecture: string;
  dependencies: string;
  patterns: string;
  recentChanges: string;
  custom: Record<string, string>;
}

const MEMORY_BANK_DIR = '.ecode/memory-bank';
const MAX_CONTEXT_TOKENS = 8000; // ~32KB of text for context injection

// Security: Allowed characters for memory bank filenames
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_-]+\.md$/;

/**
 * Validate and sanitize filename to prevent path traversal attacks
 * Only allows alphanumeric, underscore, hyphen, and .md extension
 */
function sanitizeFilename(filename: string): string | null {
  // Get just the basename, stripping any path components
  const basename = path.basename(filename);
  
  // Ensure it ends with .md
  const safeName = basename.endsWith('.md') ? basename : `${basename}.md`;
  
  // Validate against safe pattern
  if (!SAFE_FILENAME_REGEX.test(safeName)) {
    return null;
  }
  
  return safeName;
}

/**
 * Validate that resolved path is within the memory bank directory
 */
function isPathWithinDirectory(filePath: string, directory: string): boolean {
  const resolvedPath = path.resolve(filePath);
  const resolvedDir = path.resolve(directory);
  return resolvedPath.startsWith(resolvedDir + path.sep) || resolvedPath === resolvedDir;
}

const DEFAULT_FILES: Record<string, { template: string; description: string }> = {
  'project-brief.md': {
    description: 'High-level project description and goals',
    template: `# Project Brief

## Purpose
[Describe what this project does]

## Target Users
[Who will use this application]

## Key Features
- Feature 1
- Feature 2
- Feature 3

## Success Criteria
[How do we know the project is complete]
`
  },
  'architecture.md': {
    description: 'Technical architecture and design decisions',
    template: `# Architecture

## Tech Stack
- Frontend: 
- Backend: 
- Database: 
- Hosting: 

## Project Structure
\`\`\`
/
├── client/          # Frontend React app
├── server/          # Backend Express API
├── shared/          # Shared types and schemas
└── ...
\`\`\`

## Key Design Decisions
1. Decision 1: [Reason]
2. Decision 2: [Reason]

## API Design
[Describe key API endpoints]
`
  },
  'dependencies.md': {
    description: 'External dependencies and integrations',
    template: `# Dependencies

## Core Dependencies
| Package | Purpose | Version |
|---------|---------|---------|
| react | UI framework | ^18.x |
| express | API server | ^4.x |

## External Services
- Database: [Provider]
- Auth: [Provider]
- Payments: [Provider]
- Email: [Provider]

## Environment Variables Required
- \`DATABASE_URL\`: Database connection string
- \`API_KEY\`: External API key
`
  },
  'patterns.md': {
    description: 'Code patterns and conventions',
    template: `# Code Patterns & Conventions

## Naming Conventions
- Components: PascalCase (e.g., \`UserProfile.tsx\`)
- Hooks: camelCase with 'use' prefix (e.g., \`useAuth.ts\`)
- Utils: camelCase (e.g., \`formatDate.ts\`)
- Constants: SCREAMING_SNAKE_CASE

## File Organization
- One component per file
- Co-locate tests with source files
- Group by feature, not by type

## TypeScript Rules
- Strict mode enabled
- No \`any\` types - use \`unknown\` or proper types
- Export interfaces alongside implementations

## React Patterns
- Functional components only
- Custom hooks for shared logic
- TanStack Query for server state
- Zustand for client state

## Testing
- data-testid pattern: \`{action}-{target}\`
- E2E with Playwright
- Unit tests with Vitest
`
  },
  'recent-changes.md': {
    description: 'Log of recent significant changes',
    template: `# Recent Changes

## Latest Updates

### [Date]
- Change description
- Files affected: \`file1.ts\`, \`file2.ts\`
- Reason: [Why this change was made]

---

*This file is auto-updated by the agent after significant changes*
`
  }
};

export class MemoryBankService extends EventEmitter {
  private projectBasePaths: Map<number, string> = new Map();
  private memoryCache: Map<number, MemoryBank> = new Map();
  
  constructor() {
    super();
  }

  /**
   * Set the base path for a project's files
   */
  setProjectBasePath(projectId: number, basePath: string): void {
    this.projectBasePaths.set(projectId, basePath);
  }

  /**
   * Get the memory bank directory path for a project
   */
  private getMemoryBankPath(projectId: number): string {
    const basePath = this.projectBasePaths.get(projectId) || process.cwd();
    return path.join(basePath, MEMORY_BANK_DIR);
  }

  /**
   * Check if memory bank is initialized for a project
   */
  async isInitialized(projectId: number): Promise<boolean> {
    try {
      const mbPath = this.getMemoryBankPath(projectId);
      await fs.access(mbPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Initialize memory bank with default files
   */
  async initialize(projectId: number, projectDescription?: string): Promise<MemoryBank> {
    const mbPath = this.getMemoryBankPath(projectId);
    
    // Create directory
    await fs.mkdir(mbPath, { recursive: true });
    
    // Create default files
    const files: MemoryBankFile[] = [];
    
    for (const [filename, config] of Object.entries(DEFAULT_FILES)) {
      let content = config.template;
      
      // If project description provided, enhance the brief
      if (filename === 'project-brief.md' && projectDescription) {
        content = `# Project Brief

## Purpose
${projectDescription}

## Target Users
[To be defined]

## Key Features
[To be extracted from requirements]

## Success Criteria
[To be defined]
`;
      }
      
      const filePath = path.join(mbPath, filename);
      await fs.writeFile(filePath, content, 'utf-8');
      
      files.push({
        name: filename,
        content,
        lastUpdated: new Date(),
        size: Buffer.byteLength(content, 'utf-8')
      });
    }
    
    const memoryBank: MemoryBank = {
      projectId,
      files,
      totalSize: files.reduce((sum, f) => sum + f.size, 0),
      initialized: true,
      lastUpdated: new Date()
    };
    
    this.memoryCache.set(projectId, memoryBank);
    this.emit('initialized', { projectId, memoryBank });
    
    console.log(`[MemoryBank] Initialized for project ${projectId} with ${files.length} files`);
    
    return memoryBank;
  }

  /**
   * Get all memory bank files for a project
   */
  async getMemoryBank(projectId: number): Promise<MemoryBank | null> {
    // Check cache first
    if (this.memoryCache.has(projectId)) {
      return this.memoryCache.get(projectId)!;
    }
    
    const mbPath = this.getMemoryBankPath(projectId);
    
    try {
      await fs.access(mbPath);
    } catch {
      return null;
    }
    
    try {
      const entries = await fs.readdir(mbPath);
      const files: MemoryBankFile[] = [];
      
      for (const entry of entries) {
        if (entry.endsWith('.md')) {
          const filePath = path.join(mbPath, entry);
          const stats = await fs.stat(filePath);
          const content = await fs.readFile(filePath, 'utf-8');
          
          files.push({
            name: entry,
            content,
            lastUpdated: stats.mtime,
            size: stats.size
          });
        }
      }
      
      const memoryBank: MemoryBank = {
        projectId,
        files,
        totalSize: files.reduce((sum, f) => sum + f.size, 0),
        initialized: true,
        lastUpdated: new Date(Math.max(...files.map(f => f.lastUpdated.getTime())))
      };
      
      this.memoryCache.set(projectId, memoryBank);
      return memoryBank;
    } catch (error) {
      console.error(`[MemoryBank] Error reading memory bank for project ${projectId}:`, error);
      return null;
    }
  }

  /**
   * Get a specific memory file
   */
  async getFile(projectId: number, filename: string): Promise<MemoryBankFile | null> {
    // Security: Sanitize filename to prevent path traversal
    const safeFilename = sanitizeFilename(filename);
    if (!safeFilename) {
      console.warn(`[MemoryBank] Rejected unsafe filename: ${filename}`);
      return null;
    }
    
    const mbPath = this.getMemoryBankPath(projectId);
    const filePath = path.join(mbPath, safeFilename);
    
    // Security: Verify path is within memory bank directory
    if (!isPathWithinDirectory(filePath, mbPath)) {
      console.warn(`[MemoryBank] Path traversal attempt blocked: ${filename}`);
      return null;
    }
    
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf-8');
      
      return {
        name: safeFilename,
        content,
        lastUpdated: stats.mtime,
        size: stats.size
      };
    } catch {
      return null;
    }
  }

  /**
   * Update or create a memory file
   */
  async updateFile(projectId: number, filename: string, content: string): Promise<MemoryBankFile | null> {
    // Security: Sanitize filename to prevent path traversal
    const safeFilename = sanitizeFilename(filename);
    if (!safeFilename) {
      console.warn(`[MemoryBank] Rejected unsafe filename for update: ${filename}`);
      return null;
    }
    
    const mbPath = this.getMemoryBankPath(projectId);
    
    // Ensure directory exists
    await fs.mkdir(mbPath, { recursive: true });
    
    const filePath = path.join(mbPath, safeFilename);
    
    // Security: Verify path is within memory bank directory
    if (!isPathWithinDirectory(filePath, mbPath)) {
      console.warn(`[MemoryBank] Path traversal attempt blocked on update: ${filename}`);
      return null;
    }
    
    await fs.writeFile(filePath, content, 'utf-8');
    
    const file: MemoryBankFile = {
      name: safeFilename,
      content,
      lastUpdated: new Date(),
      size: Buffer.byteLength(content, 'utf-8')
    };
    
    // Invalidate cache
    this.memoryCache.delete(projectId);
    
    this.emit('fileUpdated', { projectId, file });
    console.log(`[MemoryBank] Updated ${safeFilename} for project ${projectId}`);
    
    return file;
  }

  /**
   * Delete a memory file
   */
  async deleteFile(projectId: number, filename: string): Promise<boolean> {
    // Security: Sanitize filename to prevent path traversal
    const safeFilename = sanitizeFilename(filename);
    if (!safeFilename) {
      console.warn(`[MemoryBank] Rejected unsafe filename for delete: ${filename}`);
      return false;
    }
    
    const mbPath = this.getMemoryBankPath(projectId);
    const filePath = path.join(mbPath, safeFilename);
    
    // Security: Verify path is within memory bank directory
    if (!isPathWithinDirectory(filePath, mbPath)) {
      console.warn(`[MemoryBank] Path traversal attempt blocked on delete: ${filename}`);
      return false;
    }
    
    try {
      await fs.unlink(filePath);
      this.memoryCache.delete(projectId);
      this.emit('fileDeleted', { projectId, filename: safeFilename });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get memory bank context formatted for agent prompt injection
   * Optimized for token efficiency
   */
  async getContextForAgent(projectId: number): Promise<string> {
    const memoryBank = await this.getMemoryBank(projectId);
    
    if (!memoryBank || memoryBank.files.length === 0) {
      return '';
    }
    
    // Priority order for context injection (most important first)
    const priorityOrder = [
      'project-brief.md',
      'architecture.md',
      'patterns.md',
      'dependencies.md',
      'recent-changes.md'
    ];
    
    const sections: string[] = [];
    let totalLength = 0;
    const maxLength = MAX_CONTEXT_TOKENS * 4; // ~4 chars per token
    
    // Add files in priority order
    for (const filename of priorityOrder) {
      const file = memoryBank.files.find(f => f.name === filename);
      if (file && file.content.trim()) {
        const section = `### ${file.name.replace('.md', '').replace(/-/g, ' ').toUpperCase()}\n${file.content.trim()}`;
        
        if (totalLength + section.length <= maxLength) {
          sections.push(section);
          totalLength += section.length;
        }
      }
    }
    
    // Add any custom files not in priority list
    for (const file of memoryBank.files) {
      if (!priorityOrder.includes(file.name) && file.content.trim()) {
        const section = `### ${file.name.replace('.md', '').replace(/-/g, ' ').toUpperCase()}\n${file.content.trim()}`;
        
        if (totalLength + section.length <= maxLength) {
          sections.push(section);
          totalLength += section.length;
        }
      }
    }
    
    if (sections.length === 0) {
      return '';
    }
    
    return `<memory_bank>
## Project Memory Bank
The following is persistent context about this project. Use this information to maintain consistency across sessions.

${sections.join('\n\n---\n\n')}
</memory_bank>`;
  }

  /**
   * Auto-update recent changes after agent makes modifications
   */
  async logRecentChange(
    projectId: number, 
    description: string, 
    filesAffected: string[], 
    reason?: string
  ): Promise<void> {
    const existingFile = await this.getFile(projectId, 'recent-changes.md');
    const date = new Date().toISOString().split('T')[0];
    
    const newEntry = `### ${date}
- ${description}
- Files affected: ${filesAffected.map(f => `\`${f}\``).join(', ')}
${reason ? `- Reason: ${reason}` : ''}
`;
    
    let content: string;
    if (existingFile) {
      // Insert new entry after "## Latest Updates" header
      const lines = existingFile.content.split('\n');
      const headerIndex = lines.findIndex(l => l.includes('## Latest Updates'));
      
      if (headerIndex !== -1) {
        lines.splice(headerIndex + 2, 0, newEntry);
        content = lines.join('\n');
      } else {
        content = `# Recent Changes\n\n## Latest Updates\n\n${newEntry}\n${existingFile.content}`;
      }
      
      // Keep only last 20 entries to prevent file from growing too large
      const entries = content.split('###').slice(0, 21);
      content = entries.join('###');
    } else {
      content = `# Recent Changes\n\n## Latest Updates\n\n${newEntry}`;
    }
    
    await this.updateFile(projectId, 'recent-changes.md', content);
  }

  /**
   * Auto-generate architecture doc from project analysis
   */
  async generateArchitectureDoc(
    projectId: number,
    techStack: {
      frontend?: string[];
      backend?: string[];
      database?: string;
      hosting?: string;
    },
    structure?: string
  ): Promise<void> {
    const content = `# Architecture

## Tech Stack
- Frontend: ${techStack.frontend?.join(', ') || 'Not specified'}
- Backend: ${techStack.backend?.join(', ') || 'Not specified'}
- Database: ${techStack.database || 'Not specified'}
- Hosting: ${techStack.hosting || 'Not specified'}

## Project Structure
\`\`\`
${structure || 'Structure to be analyzed'}
\`\`\`

## Key Design Decisions
*Auto-generated - update with specific decisions*

## API Design
*Document key API endpoints here*

---
*Generated by E-Code Memory Bank*
`;
    
    await this.updateFile(projectId, 'architecture.md', content);
  }

  /**
   * Get list of available default templates
   */
  getDefaultTemplates(): Record<string, { description: string }> {
    const templates: Record<string, { description: string }> = {};
    for (const [name, config] of Object.entries(DEFAULT_FILES)) {
      templates[name] = { description: config.description };
    }
    return templates;
  }

  /**
   * Clear cache for a project
   */
  clearCache(projectId: number): void {
    this.memoryCache.delete(projectId);
  }
}

// Singleton instance
export const memoryBankService = new MemoryBankService();
