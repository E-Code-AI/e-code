import { storage } from '../storage';
import archiver from 'archiver';
import extractZip from 'extract-zip';
import fs from 'fs/promises';
import path from 'path';

interface BoltMigrationOptions {
  projectId: number;
  userId: number;
  source: string; // ZIP file path or repo URL
  sourceType: 'zip' | 'url';
}

interface BoltProjectStructure {
  name: string;
  description?: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts: Record<string, string>;
  files: Array<{
    path: string;
    content: string;
    type: 'file' | 'directory';
  }>;
  framework?: 'react' | 'vue' | 'svelte' | 'vanilla';
  buildTool?: 'vite' | 'webpack' | 'rollup';
}

interface MigrationReport {
  filesProcessed: number;
  filesSkipped: number;
  dependenciesConverted: number;
  configsGenerated: string[];
  warnings: string[];
  errors: string[];
}

export class BoltMigrationService {
  private readonly tempDir = path.join(process.cwd(), 'temp', 'bolt-migrations');
  private readonly supportedExtensions = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte',
    '.css', '.scss', '.sass', '.less',
    '.html', '.json', '.md', '.txt'
  ]);
  
  async migrateBoltProject(options: BoltMigrationOptions): Promise<{
    importRecord: any;
    migrationReport: MigrationReport;
  }> {
    const { projectId, userId, source, sourceType } = options;
    
    // Create import record
    const importRecord = await storage.createProjectImport({
      projectId,
      userId,
      type: 'bolt',
      url: sourceType === 'url' ? source : 'local-zip',
      status: 'processing',
      metadata: { sourceType }
    });

    try {
      // Ensure temp directory exists
      await fs.mkdir(this.tempDir, { recursive: true });
      
      // Extract project
      const extractPath = await this.extractProject(source, sourceType);
      
      // Analyze project structure
      const projectStructure = await this.analyzeProjectStructure(extractPath);
      
      // Generate migration report
      const migrationReport = await this.generateMigrationReport(projectStructure);
      
      // Convert and migrate files
      await this.migrateProjectFiles(projectStructure, projectId, userId);
      
      // Generate E-Code specific configs
      await this.generateECodeConfigs(projectStructure, projectId, userId);
      
      // Update import record
      await storage.updateProjectImport(importRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          sourceType,
          framework: projectStructure.framework,
          filesProcessed: migrationReport.filesProcessed,
          migrationReport
        }
      });
      
      // Cleanup temp files
      await this.cleanup(extractPath);
      
      return { importRecord, migrationReport };
    } catch (error: any) {
      // Update import record with error
      await storage.updateProjectImport(importRecord.id, {
        status: 'failed',
        error: error.message,
        completedAt: new Date()
      });
      
      throw error;
    }
  }
  
  private async extractProject(source: string, sourceType: 'zip' | 'url'): Promise<string> {
    const extractPath = path.join(this.tempDir, `migration_${Date.now()}`);
    await fs.mkdir(extractPath, { recursive: true });
    
    if (sourceType === 'zip') {
      // Extract ZIP file
      await extractZip(source, { dir: extractPath });
    } else if (sourceType === 'url') {
      // Download and extract from URL
      const zipPath = path.join(this.tempDir, 'temp.zip');
      await this.downloadFile(source, zipPath);
      await extractZip(zipPath, { dir: extractPath });
      await fs.unlink(zipPath);
    }
    
    return extractPath;
  }
  
  private async downloadFile(url: string, outputPath: string): Promise<void> {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    await fs.writeFile(outputPath, buffer);
  }
  
  private async analyzeProjectStructure(extractPath: string): Promise<BoltProjectStructure> {
    const structure: BoltProjectStructure = {
      name: path.basename(extractPath),
      dependencies: {},
      scripts: {},
      files: [],
    };
    
    // Look for package.json
    const packageJsonPath = path.join(extractPath, 'package.json');
    try {
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      structure.name = packageJson.name || structure.name;
      structure.description = packageJson.description;
      structure.dependencies = packageJson.dependencies || {};
      structure.devDependencies = packageJson.devDependencies || {};
      structure.scripts = packageJson.scripts || {};
    } catch (error) {
      // No package.json or invalid JSON
    }
    
    // Detect framework and build tool
    structure.framework = this.detectFramework(structure.dependencies, structure.devDependencies);
    structure.buildTool = this.detectBuildTool(structure.dependencies, structure.devDependencies);
    
    // Scan all files
    structure.files = await this.scanFiles(extractPath);
    
    return structure;
  }
  
  private detectFramework(deps: Record<string, string>, devDeps: Record<string, string> = {}): string {
    const allDeps = { ...deps, ...devDeps };
    
    if (allDeps.react) return 'react';
    if (allDeps.vue) return 'vue';
    if (allDeps.svelte) return 'svelte';
    
    return 'vanilla';
  }
  
  private detectBuildTool(deps: Record<string, string>, devDeps: Record<string, string> = {}): string {
    const allDeps = { ...deps, ...devDeps };
    
    if (allDeps.vite) return 'vite';
    if (allDeps.webpack) return 'webpack';
    if (allDeps.rollup) return 'rollup';
    
    return 'vite'; // Default
  }
  
  private async scanFiles(dirPath: string, relativePath = ''): Promise<Array<{ path: string; content: string; type: 'file' | 'directory' }>> {
    const files: Array<{ path: string; content: string; type: 'file' | 'directory' }> = [];
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      const relPath = path.join(relativePath, entry.name);
      
      // Skip common directories that shouldn't be migrated
      if (this.shouldSkipPath(relPath)) {
        continue;
      }
      
      if (entry.isDirectory()) {
        files.push({ path: relPath, content: '', type: 'directory' });
        const subFiles = await this.scanFiles(fullPath, relPath);
        files.push(...subFiles);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (this.supportedExtensions.has(ext) || this.isConfigFile(entry.name)) {
          try {
            const content = await fs.readFile(fullPath, 'utf-8');
            files.push({ path: relPath, content, type: 'file' });
          } catch (error) {
            // Skip files that can't be read
            console.warn(`Could not read file ${fullPath}:`, error);
          }
        }
      }
    }
    
    return files;
  }
  
  private shouldSkipPath(path: string): boolean {
    const skipPatterns = [
      'node_modules',
      '.git',
      '.svn',
      'dist',
      'build',
      '.next',
      '.nuxt',
      'coverage',
      '.nyc_output',
      'logs',
      '*.log',
    ];
    
    return skipPatterns.some(pattern => {
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace('*', '.*'));
        return regex.test(path);
      }
      return path.includes(pattern);
    });
  }
  
  private isConfigFile(filename: string): boolean {
    const configFiles = [
      'package.json',
      'tsconfig.json',
      'vite.config.js',
      'vite.config.ts',
      'webpack.config.js',
      'rollup.config.js',
      '.babelrc',
      '.eslintrc',
      'tailwind.config.js',
      'postcss.config.js',
    ];
    
    return configFiles.includes(filename) || filename.startsWith('.env');
  }
  
  private async generateMigrationReport(structure: BoltProjectStructure): Promise<MigrationReport> {
    const report: MigrationReport = {
      filesProcessed: 0,
      filesSkipped: 0,
      dependenciesConverted: 0,
      configsGenerated: [],
      warnings: [],
      errors: [],
    };
    
    // Count files
    report.filesProcessed = structure.files.filter(f => f.type === 'file').length;
    
    // Count dependencies
    report.dependenciesConverted = Object.keys(structure.dependencies).length;
    
    // Check for potential issues
    if (!structure.dependencies.react && structure.framework === 'react') {
      report.warnings.push('React framework detected but no React dependency found');
    }
    
    if (Object.keys(structure.scripts).length === 0) {
      report.warnings.push('No npm scripts found in package.json');
    }
    
    // Check for unsupported features
    const unsupportedDeps = ['electron', 'cordova', 'capacitor'];
    unsupportedDeps.forEach(dep => {
      if (structure.dependencies[dep] || structure.devDependencies?.[dep]) {
        report.warnings.push(`Dependency '${dep}' may not be fully compatible with E-Code`);
      }
    });
    
    return report;
  }
  
  private async migrateProjectFiles(structure: BoltProjectStructure, projectId: number, userId: number): Promise<void> {
    // Create directories first
    const directories = structure.files.filter(f => f.type === 'directory');
    for (const dir of directories) {
      // Directories are created implicitly when files are created
    }
    
    // Migrate files
    const files = structure.files.filter(f => f.type === 'file');
    for (const file of files) {
      let content = file.content;
      
      // Apply transformations based on file type
      content = await this.transformFileContent(file.path, content, structure);
      
      await storage.createProjectFile({
        projectId,
        userId,
        name: path.basename(file.path),
        content,
        path: file.path,
        type: 'file',
        size: content.length,
      });
    }
  }
  
  private async transformFileContent(filePath: string, content: string, structure: BoltProjectStructure): Promise<string> {
    const ext = path.extname(filePath);
    
    // Transform based on file type
    switch (ext) {
      case '.js':
      case '.jsx':
      case '.ts':
      case '.tsx':
        return this.transformJavaScriptFile(content, structure);
      case '.json':
        return this.transformJsonFile(filePath, content, structure);
      case '.md':
        return this.transformMarkdownFile(content, structure);
      default:
        return content;
    }
  }
  
  private transformJavaScriptFile(content: string, structure: BoltProjectStructure): string {
    let transformed = content;
    
    // Replace Bolt.new specific imports with E-Code equivalents
    transformed = transformed.replace(
      /import.*from ['"]@bolt\/([^'"]+)['"]/g,
      'import $1 from "@ecode/$1"'
    );
    
    // Update common import paths
    transformed = transformed.replace(
      /from ['"]\.\.\/\.\.\/([^'"]+)['"]/g,
      'from "@/$1"'
    );
    
    return transformed;
  }
  
  private transformJsonFile(filePath: string, content: string, structure: BoltProjectStructure): string {
    if (path.basename(filePath) === 'package.json') {
      try {
        const packageJson = JSON.parse(content);
        
        // Update package name to avoid conflicts
        packageJson.name = `ecode-${packageJson.name || 'project'}`;
        
        // Add E-Code specific scripts
        packageJson.scripts = {
          ...packageJson.scripts,
          'dev': 'vite',
          'build': 'vite build',
          'preview': 'vite preview',
        };
        
        // Add E-Code dependencies if not present
        if (structure.framework === 'react' && !packageJson.dependencies.react) {
          packageJson.dependencies.react = '^18.2.0';
          packageJson.dependencies['react-dom'] = '^18.2.0';
        }
        
        return JSON.stringify(packageJson, null, 2);
      } catch (error) {
        return content;
      }
    }
    
    return content;
  }
  
  private transformMarkdownFile(content: string, structure: BoltProjectStructure): string {
    // Add migration notice to README
    if (content.toLowerCase().includes('readme')) {
      const migrationNotice = `
## Migration Notice

This project has been migrated from Bolt.new to E-Code.

### Original Project
- Framework: ${structure.framework}
- Build Tool: ${structure.buildTool}
- Migration Date: ${new Date().toLocaleDateString()}

### Changes Made
- Updated import paths for E-Code compatibility
- Modified package.json scripts
- Added E-Code specific configurations

`;
      return migrationNotice + content;
    }
    
    return content;
  }
  
  private async generateECodeConfigs(structure: BoltProjectStructure, projectId: number, userId: number): Promise<void> {
    const configs = [];
    
    // Generate vite.config.ts
    configs.push({
      name: 'vite.config.ts',
      path: '/vite.config.ts',
      content: this.generateViteConfig(structure),
    });
    
    // Generate tsconfig.json if TypeScript files exist
    const hasTypeScript = structure.files.some(f => f.path.endsWith('.ts') || f.path.endsWith('.tsx'));
    if (hasTypeScript) {
      configs.push({
        name: 'tsconfig.json',
        path: '/tsconfig.json',
        content: this.generateTsConfig(structure),
      });
    }
    
    // Generate .gitignore
    configs.push({
      name: '.gitignore',
      path: '/.gitignore',
      content: this.generateGitignore(),
    });
    
    // Store config files
    for (const config of configs) {
      await storage.createProjectFile({
        projectId,
        userId,
        name: config.name,
        content: config.content,
        path: config.path,
        type: 'file',
        size: config.content.length,
      });
    }
  }
  
  private generateViteConfig(structure: BoltProjectStructure): string {
    const plugins = [];
    
    if (structure.framework === 'react') {
      plugins.push('@vitejs/plugin-react');
    } else if (structure.framework === 'vue') {
      plugins.push('@vitejs/plugin-vue');
    } else if (structure.framework === 'svelte') {
      plugins.push('@sveltejs/vite-plugin-svelte');
    }
    
    return `import { defineConfig } from 'vite';
${plugins.map(plugin => `import ${plugin.replace('@vitejs/plugin-', '').replace('@sveltejs/vite-plugin-', '')} from '${plugin}';`).join('\n')}

export default defineConfig({
  plugins: [${plugins.map(plugin => plugin.replace('@vitejs/plugin-', '').replace('@sveltejs/vite-plugin-', '') + '()').join(', ')}],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
`;
  }
  
  private generateTsConfig(structure: BoltProjectStructure): string {
    return `{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    ${structure.framework === 'react' ? '"jsx": "react-jsx",' : ''}
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
`;
  }
  
  private generateGitignore(): string {
    return `# Dependencies
node_modules/
.pnp
.pnp.js

# Production
/dist
/build

# Generated files
.docusaurus
.cache
.parcel-cache

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
lerna-debug.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Temporary folders
tmp/
temp/
`;
  }
  
  private async cleanup(dirPath: string): Promise<void> {
    try {
      await fs.rm(dirPath, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  }
}

export const boltMigrationService = new BoltMigrationService();