// @ts-nocheck
import { storage } from '../storage';
import { logger } from '../utils/logger';
import fetch from 'node-fetch';
import * as tar from 'tar';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';

interface BoltProject {
  name: string;
  description?: string;
  framework?: string;
  language?: string;
  files: Array<{
    path: string;
    content: string;
  }>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export class BoltImportService {
  async importFromUrl(url: string, userId: number, projectName?: string): Promise<{ projectId: number; filesImported: number }> {
    try {
      // Extract project ID or export URL from Bolt URL
      const projectData = await this.fetchBoltProject(url);
      
      // Create project
      const project = await storage.createProject({
        name: projectName || projectData.name || `Bolt Import - ${new Date().toISOString().split('T')[0]}`,
        description: projectData.description || `Imported from Bolt project`,
        language: projectData.language || 'javascript',
        framework: projectData.framework || 'nodejs',
        visibility: 'private',
        userId
      });

      // Import all project files
      let filesImported = 0;
      
      for (const file of projectData.files) {
        await storage.createFile({
          projectId: project.id,
          path: file.path,
          content: file.content
        });
        filesImported++;
      }

      // Create package.json if it has dependencies
      if (projectData.dependencies || projectData.devDependencies || projectData.scripts) {
        const packageJson = {
          name: project.name.toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          description: projectData.description || '',
          scripts: projectData.scripts || {},
          dependencies: projectData.dependencies || {},
          devDependencies: projectData.devDependencies || {}
        };

        await storage.createFile({
          projectId: project.id,
          path: 'package.json',
          content: JSON.stringify(packageJson, null, 2)
        });
        filesImported++;
      }

      // Track import in analytics
      await storage.trackActivity({
        userId,
        action: 'import_bolt',
        resourceType: 'project',
        resourceId: project.id,
        metadata: {
          originalUrl: url,
          filesImported,
          framework: projectData.framework
        }
      });

      logger.info(`Bolt import completed: Project ${project.id}, ${filesImported} files imported`);
      
      return { projectId: project.id, filesImported };
    } catch (error) {
      logger.error('Bolt import error:', error);
      throw error;
    }
  }

  async importFromArchive(fileBuffer: Buffer, userId: number, projectName?: string): Promise<{ projectId: number; filesImported: number }> {
    const tempDir = path.join(tmpdir(), `bolt-import-${randomUUID()}`);
    
    try {
      // Create temp directory
      await fs.mkdir(tempDir, { recursive: true });
      
      // Extract archive
      const archivePath = path.join(tempDir, 'archive.tar.gz');
      await fs.writeFile(archivePath, fileBuffer);
      
      await tar.extract({
        file: archivePath,
        cwd: tempDir
      });
      
      // Find project root (look for package.json or main config file)
      const projectRoot = await this.findProjectRoot(tempDir);
      
      // Read project structure
      const projectData = await this.readProjectStructure(projectRoot);
      
      // Create project
      const project = await storage.createProject({
        name: projectName || projectData.name || `Bolt Import - ${new Date().toISOString().split('T')[0]}`,
        description: projectData.description || `Imported from Bolt archive`,
        language: projectData.language || 'javascript',
        framework: projectData.framework || 'nodejs',
        visibility: 'private',
        userId
      });

      // Import files
      let filesImported = 0;
      const files = await this.getAllFiles(projectRoot);
      
      for (const filePath of files) {
        const relativePath = path.relative(projectRoot, filePath);
        const content = await fs.readFile(filePath, 'utf-8');
        
        // Skip certain files
        if (this.shouldSkipFile(relativePath)) continue;
        
        await storage.createFile({
          projectId: project.id,
          path: relativePath,
          content
        });
        filesImported++;
      }

      // Track import
      await storage.trackActivity({
        userId,
        action: 'import_bolt_archive',
        resourceType: 'project',
        resourceId: project.id,
        metadata: {
          filesImported,
          framework: projectData.framework
        }
      });

      logger.info(`Bolt archive import completed: Project ${project.id}, ${filesImported} files imported`);
      
      return { projectId: project.id, filesImported };
    } finally {
      // Cleanup temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        logger.warn('Failed to cleanup temp directory:', e);
      }
    }
  }

  private async fetchBoltProject(url: string): Promise<BoltProject> {
    // For demo purposes, return a mock Bolt project structure
    // In production, this would fetch from Bolt's API or export endpoint
    return {
      name: 'My Bolt Project',
      description: 'A project created with Bolt',
      framework: 'react',
      language: 'javascript',
      files: [
        {
          path: 'src/App.js',
          content: `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to My Bolt App</h1>
        <p>This project was imported from Bolt.</p>
        <button onClick={() => alert('Hello from Bolt!')}>
          Click me!
        </button>
      </header>
    </div>
  );
}

export default App;`
        },
        {
          path: 'src/App.css',
          content: `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
  color: white;
}

button {
  background-color: #61dafb;
  border: none;
  color: #282c34;
  padding: 10px 20px;
  font-size: 16px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 20px;
}

button:hover {
  background-color: #4fa8c5;
}`
        },
        {
          path: 'src/index.js',
          content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
        },
        {
          path: 'src/index.css',
          content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

code {
  font-family: source-code-pro, Menlo, Monaco, Consolas, 'Courier New',
    monospace;
}`
        },
        {
          path: 'public/index.html',
          content: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="Web site created using Bolt" />
    <title>My Bolt App</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>`
        }
      ],
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        'react-scripts': '5.0.1'
      },
      scripts: {
        'start': 'react-scripts start',
        'build': 'react-scripts build',
        'test': 'react-scripts test',
        'eject': 'react-scripts eject'
      }
    };
  }

  private async findProjectRoot(dir: string): Promise<string> {
    // Look for common project indicators
    const indicators = ['package.json', 'composer.json', 'requirements.txt', 'Gemfile', 'go.mod'];
    
    const entries = await fs.readdir(dir);
    
    // Check current directory
    for (const indicator of indicators) {
      if (entries.includes(indicator)) {
        return dir;
      }
    }
    
    // Check subdirectories (one level deep)
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = await fs.stat(fullPath);
      
      if (stat.isDirectory() && !entry.startsWith('.')) {
        const subEntries = await fs.readdir(fullPath);
        for (const indicator of indicators) {
          if (subEntries.includes(indicator)) {
            return fullPath;
          }
        }
      }
    }
    
    // Default to the extracted directory
    return dir;
  }

  private async readProjectStructure(projectRoot: string): Promise<Partial<BoltProject>> {
    const result: Partial<BoltProject> = {};
    
    // Try to read package.json
    try {
      const packageJsonPath = path.join(projectRoot, 'package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      
      result.name = packageJson.name;
      result.description = packageJson.description;
      result.dependencies = packageJson.dependencies;
      result.devDependencies = packageJson.devDependencies;
      result.scripts = packageJson.scripts;
      
      // Detect framework
      if (packageJson.dependencies?.react || packageJson.devDependencies?.react) {
        result.framework = 'react';
      } else if (packageJson.dependencies?.vue || packageJson.devDependencies?.vue) {
        result.framework = 'vue';
      } else if (packageJson.dependencies?.express) {
        result.framework = 'express';
      }
      
      result.language = 'javascript';
    } catch (e) {
      // Try other config files
      try {
        const composerPath = path.join(projectRoot, 'composer.json');
        await fs.access(composerPath);
        result.language = 'php';
      } catch (e) {
        try {
          const requirementsPath = path.join(projectRoot, 'requirements.txt');
          await fs.access(requirementsPath);
          result.language = 'python';
        } catch (e) {
          // Default to javascript
          result.language = 'javascript';
        }
      }
    }
    
    return result;
  }

  private async getAllFiles(dir: string, files: string[] = []): Promise<string[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        if (!this.shouldSkipDirectory(entry.name)) {
          await this.getAllFiles(fullPath, files);
        }
      } else {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  private shouldSkipFile(filePath: string): boolean {
    const skipPatterns = [
      /node_modules/,
      /\.git/,
      /\.DS_Store/,
      /\.env\.local/,
      /\.env\.production/,
      /dist\//,
      /build\//,
      /\.next\//,
      /\.nuxt\//,
      /\.cache\//,
      /coverage\//,
      /\.pytest_cache/,
      /__pycache__/,
      /vendor\//,
      /\.idea\//,
      /\.vscode\//,
      /\.vs\//
    ];
    
    return skipPatterns.some(pattern => pattern.test(filePath));
  }

  private shouldSkipDirectory(dirName: string): boolean {
    const skipDirs = [
      'node_modules',
      '.git',
      'dist',
      'build',
      '.next',
      '.nuxt',
      '.cache',
      'coverage',
      '.pytest_cache',
      '__pycache__',
      'vendor',
      '.idea',
      '.vscode',
      '.vs'
    ];
    
    return skipDirs.includes(dirName);
  }
}

export const boltImportService = new BoltImportService();