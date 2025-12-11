/**
 * Speculative Scaffold Service
 * 
 * Creates a minimal project structure in parallel with AI plan generation.
 * This reduces perceived latency by starting project setup immediately.
 * 
 * The scaffolding creates:
 * - Project directory structure
 * - Basic config files (package.json, tsconfig.json, etc.)
 * - Entry point files based on detected framework
 * 
 * @author E-Code Platform
 * @version 1.0.0
 * @since December 2025
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { createLogger } from '../utils/logger';

const logger = createLogger('speculative-scaffold');

export interface ScaffoldOptions {
  projectId: string;
  language?: string;
  framework?: string;
  prompt?: string;
}

export interface ScaffoldResult {
  success: boolean;
  filesCreated: string[];
  durationMs: number;
  error?: string;
}

const FRAMEWORK_TEMPLATES: Record<string, {
  directories: string[];
  files: Record<string, string>;
}> = {
  'react': {
    directories: ['src', 'src/components', 'src/hooks', 'src/lib', 'public'],
    files: {
      'package.json': JSON.stringify({
        name: 'project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'vite',
          build: 'vite build',
          preview: 'vite preview'
        },
        dependencies: {},
        devDependencies: {}
      }, null, 2),
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          useDefineForClassFields: true,
          lib: ['ES2020', 'DOM', 'DOM.Iterable'],
          module: 'ESNext',
          skipLibCheck: true,
          moduleResolution: 'bundler',
          allowImportingTsExtensions: true,
          resolveJsonModule: true,
          isolatedModules: true,
          noEmit: true,
          jsx: 'react-jsx',
          strict: true,
          noUnusedLocals: true,
          noUnusedParameters: true,
          noFallthroughCasesInSwitch: true
        },
        include: ['src']
      }, null, 2),
      '.gitignore': 'node_modules\ndist\n.env\n.env.local\n'
    }
  },
  'express': {
    directories: ['src', 'src/routes', 'src/middleware', 'src/utils'],
    files: {
      'package.json': JSON.stringify({
        name: 'project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          dev: 'tsx watch src/index.ts',
          start: 'node dist/index.js',
          build: 'tsc'
        },
        dependencies: {},
        devDependencies: {}
      }, null, 2),
      'tsconfig.json': JSON.stringify({
        compilerOptions: {
          target: 'ES2020',
          module: 'ESNext',
          moduleResolution: 'bundler',
          outDir: './dist',
          rootDir: './src',
          strict: true,
          esModuleInterop: true,
          skipLibCheck: true
        },
        include: ['src/**/*']
      }, null, 2),
      '.gitignore': 'node_modules\ndist\n.env\n'
    }
  },
  'default': {
    directories: ['src'],
    files: {
      'package.json': JSON.stringify({
        name: 'project',
        version: '1.0.0',
        type: 'module',
        scripts: {
          start: 'node src/index.js'
        },
        dependencies: {},
        devDependencies: {}
      }, null, 2),
      '.gitignore': 'node_modules\n.env\n'
    }
  }
};

export class SpeculativeScaffoldService {
  private projectsRoot: string;

  constructor(projectsRoot: string = path.join(process.cwd(), 'projects')) {
    this.projectsRoot = projectsRoot;
  }

  /**
   * Detect framework from prompt keywords
   */
  private detectFramework(prompt?: string, framework?: string): string {
    if (framework) return framework.toLowerCase();
    if (!prompt) return 'default';

    const promptLower = prompt.toLowerCase();
    
    if (promptLower.includes('react') || promptLower.includes('frontend') || promptLower.includes('ui')) {
      return 'react';
    }
    if (promptLower.includes('express') || promptLower.includes('api') || promptLower.includes('backend') || promptLower.includes('server')) {
      return 'express';
    }
    if (promptLower.includes('next') || promptLower.includes('nextjs')) {
      return 'react'; // Use React template as base for Next.js
    }

    return 'default';
  }

  /**
   * Create speculative scaffold for a project
   * This runs in parallel with AI plan generation
   */
  async createScaffold(options: ScaffoldOptions): Promise<ScaffoldResult> {
    const startTime = Date.now();
    const filesCreated: string[] = [];

    try {
      const { projectId, language, framework, prompt } = options;
      const projectDir = path.join(this.projectsRoot, projectId);
      
      logger.info(`[Scaffold] Starting speculative scaffolding for project ${projectId}`, { 
        framework, 
        language,
        prompt: prompt?.substring(0, 50) 
      });

      // Detect framework from prompt
      const detectedFramework = this.detectFramework(prompt, framework);
      const template = FRAMEWORK_TEMPLATES[detectedFramework] || FRAMEWORK_TEMPLATES['default'];

      logger.info(`[Scaffold] Detected framework: ${detectedFramework}`);

      // Create project directory if it doesn't exist
      await fs.mkdir(projectDir, { recursive: true });

      // Create subdirectories
      for (const dir of template.directories) {
        const dirPath = path.join(projectDir, dir);
        await fs.mkdir(dirPath, { recursive: true });
        logger.debug(`[Scaffold] Created directory: ${dir}`);
      }

      // Create template files (only if they don't exist - don't overwrite)
      for (const [filePath, content] of Object.entries(template.files)) {
        const fullPath = path.join(projectDir, filePath);
        
        try {
          await fs.access(fullPath);
          // File exists, skip
          logger.debug(`[Scaffold] Skipping existing file: ${filePath}`);
        } catch {
          // File doesn't exist, create it
          await fs.writeFile(fullPath, content, 'utf-8');
          filesCreated.push(filePath);
          logger.debug(`[Scaffold] Created file: ${filePath}`);
        }
      }

      const durationMs = Date.now() - startTime;
      logger.info(`[Scaffold] Scaffolding completed in ${durationMs}ms`, {
        filesCreated: filesCreated.length,
        projectId
      });

      return {
        success: true,
        filesCreated,
        durationMs
      };

    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      logger.error(`[Scaffold] Scaffolding failed:`, { error: error.message });
      
      return {
        success: false,
        filesCreated,
        durationMs,
        error: error.message
      };
    }
  }

  /**
   * Check if a project already has scaffold files
   */
  async hasExistingScaffold(projectId: string): Promise<boolean> {
    const projectDir = path.join(this.projectsRoot, projectId);
    
    try {
      const packageJson = path.join(projectDir, 'package.json');
      await fs.access(packageJson);
      return true;
    } catch {
      return false;
    }
  }
}

export const speculativeScaffold = new SpeculativeScaffoldService();
