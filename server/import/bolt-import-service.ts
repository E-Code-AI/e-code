import { createLogger } from '../utils/logger';
import { storage } from '../storage';
import { ProjectImport } from '@shared/schema/imports';

const logger = createLogger('bolt-import-service');

export interface BoltProject {
  id: string;
  name: string;
  framework: string;
  files: BoltFile[];
  dependencies: Record<string, string>;
  settings: BoltSettings;
}

export interface BoltFile {
  path: string;
  content: string;
  type: 'file' | 'directory';
}

export interface BoltSettings {
  buildCommand?: string;
  startCommand?: string;
  port?: number;
  env?: Record<string, string>;
}

export class BoltImportService {
  async importFromBolt(importData: {
    projectId: number;
    userId: number;
    boltUrl: string;
    boltProjectData?: any; // For direct project data import
  }): Promise<ProjectImport> {
    logger.info(`Starting Bolt import for project ${importData.projectId}`);
    
    // Create import record
    const importRecord = await storage.createProjectImport({
      projectId: importData.projectId,
      userId: importData.userId,
      importType: 'bolt',
      sourceUrl: importData.boltUrl,
      status: 'processing'
    });

    try {
      // Fetch or parse Bolt project
      const boltProject = importData.boltProjectData 
        ? importData.boltProjectData
        : await this.fetchBoltProject(importData.boltUrl);
      
      // Validate project structure
      this.validateBoltProject(boltProject);
      
      // Import project files
      await this.importProjectFiles(importData.projectId, boltProject);
      
      // Set up dependencies
      await this.setupDependencies(importData.projectId, boltProject);
      
      // Configure project settings
      await this.configureProject(importData.projectId, boltProject);
      
      // Update import status
      await storage.updateProjectImport(importRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          framework: boltProject.framework,
          filesImported: boltProject.files.length,
          projectName: boltProject.name
        }
      });
      
      logger.info(`Bolt import completed for project ${importData.projectId}`);
      return importRecord;
    } catch (error: any) {
      logger.error('Bolt import error:', error);
      
      await storage.updateProjectImport(importRecord.id, {
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  private async fetchBoltProject(boltUrl: string): Promise<BoltProject> {
    // Extract project ID from Bolt URL
    const projectId = this.extractProjectId(boltUrl);
    if (!projectId) {
      throw new Error('Invalid Bolt URL');
    }

    // In production, this would fetch from Bolt API or scrape the page
    // For now, return a sample project structure
    return {
      id: projectId,
      name: 'Imported Bolt Project',
      framework: 'react',
      files: [
        {
          path: '/src/App.tsx',
          type: 'file',
          content: `import React from 'react';

function App() {
  return (
    <div className="App">
      <h1>Welcome to Your Bolt Project</h1>
      <p>This project was imported from Bolt.</p>
    </div>
  );
}

export default App;`
        },
        {
          path: '/src/index.tsx',
          type: 'file',
          content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`
        },
        {
          path: '/src/index.css',
          type: 'file',
          content: `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.App {
  text-align: center;
  padding: 2rem;
}`
        }
      ],
      dependencies: {
        "react": "^18.2.0",
        "react-dom": "^18.2.0",
        "typescript": "^5.0.0"
      },
      settings: {
        buildCommand: "npm run build",
        startCommand: "npm start",
        port: 3000
      }
    };
  }

  private extractProjectId(boltUrl: string): string | null {
    // Extract project ID from various Bolt URL formats
    const patterns = [
      /bolt\.new\/(?:project\/)?([a-zA-Z0-9-]+)/,
      /stackblitz\.com\/edit\/([a-zA-Z0-9-]+)/,
      /bolt-([a-zA-Z0-9-]+)/
    ];

    for (const pattern of patterns) {
      const match = boltUrl.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  private validateBoltProject(project: BoltProject): void {
    if (!project.files || project.files.length === 0) {
      throw new Error('No files found in Bolt project');
    }

    if (!project.framework) {
      throw new Error('Framework not specified in Bolt project');
    }

    // Validate required files based on framework
    const requiredFiles = this.getRequiredFiles(project.framework);
    for (const required of requiredFiles) {
      const hasFile = project.files.some(f => f.path === required);
      if (!hasFile) {
        logger.warn(`Missing required file: ${required}`);
      }
    }
  }

  private getRequiredFiles(framework: string): string[] {
    const requirements: Record<string, string[]> = {
      react: ['/src/App.tsx', '/src/index.tsx'],
      vue: ['/src/App.vue', '/src/main.ts'],
      angular: ['/src/app/app.component.ts', '/src/main.ts'],
      svelte: ['/src/App.svelte', '/src/main.ts'],
      vanilla: ['/index.html', '/script.js']
    };

    return requirements[framework] || [];
  }

  private async importProjectFiles(projectId: number, boltProject: BoltProject): Promise<void> {
    // Create all directories first
    const directories = boltProject.files
      .filter(f => f.type === 'directory')
      .sort((a, b) => a.path.split('/').length - b.path.split('/').length);

    for (const dir of directories) {
      await storage.createFile({
        projectId,
        name: dir.path.split('/').pop() || 'folder',
        path: dir.path,
        type: 'folder'
      });
    }

    // Create all files
    const files = boltProject.files.filter(f => f.type === 'file');
    for (const file of files) {
      const fileName = file.path.split('/').pop() || 'file';
      await storage.createFile({
        projectId,
        name: fileName,
        path: file.path,
        type: 'file',
        content: file.content
      });
    }
  }

  private async setupDependencies(projectId: number, boltProject: BoltProject): Promise<void> {
    // Create package.json
    const packageJson = {
      name: boltProject.name.toLowerCase().replace(/\s+/g, '-'),
      version: "1.0.0",
      description: `Imported from Bolt: ${boltProject.name}`,
      scripts: {
        start: boltProject.settings.startCommand || "npm run dev",
        build: boltProject.settings.buildCommand || "npm run build",
        dev: "vite",
        preview: "vite preview"
      },
      dependencies: boltProject.dependencies,
      devDependencies: {
        "@vitejs/plugin-react": "^4.0.0",
        "vite": "^4.4.0"
      }
    };

    await storage.createFile({
      projectId,
      name: 'package.json',
      path: '/package.json',
      type: 'file',
      content: JSON.stringify(packageJson, null, 2)
    });
  }

  private async configureProject(projectId: number, boltProject: BoltProject): Promise<void> {
    // Create Vite config for React projects
    if (boltProject.framework === 'react') {
      const viteConfig = `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: ${boltProject.settings.port || 3000},
    host: '0.0.0.0'
  }
});`;

      await storage.createFile({
        projectId,
        name: 'vite.config.ts',
        path: '/vite.config.ts',
        type: 'file',
        content: viteConfig
      });
    }

    // Create .env file if environment variables exist
    if (boltProject.settings.env) {
      const envContent = Object.entries(boltProject.settings.env)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');

      await storage.createFile({
        projectId,
        name: '.env',
        path: '/.env',
        type: 'file',
        content: envContent
      });
    }
  }
}

export const boltImportService = new BoltImportService();