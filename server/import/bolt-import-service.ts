import { storage } from '../storage';
import { BaseImportAdapter } from './base-adapter';
import { BoltImportOptions, ImportOptions, ImportResult } from './types';
import * as AdmZip from 'adm-zip';

interface BoltProjectStructure {
  name: string;
  framework: string;
  dependencies: Record<string, string>;
  devDependencies?: Record<string, string>;
  files: Array<{ path: string; content: string }>;
  env?: Record<string, string>;
  scripts?: Record<string, string>;
  description?: string;
}

class BoltImportService extends BaseImportAdapter {
  constructor() {
    super('bolt');
  }

  async prepare(options: ImportOptions): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const boltOptions = options as BoltImportOptions;
    
    if (!boltOptions.boltUrl && !boltOptions.boltProjectData && !boltOptions.zipFile) {
      errors.push('Either Bolt URL, project data, or zip file is required');
    }
    
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async validate(options: ImportOptions): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const boltOptions = options as BoltImportOptions;
    
    try {
      if (boltOptions.boltUrl) {
        // Validate Bolt URL format
        const urlPattern = /^https?:\/\/(bolt\.new|stackblitz\.com)/;
        if (!urlPattern.test(boltOptions.boltUrl)) {
          errors.push('Invalid Bolt.new URL format');
        }
      }
      
      if (boltOptions.zipFile) {
        // Validate zip file
        try {
          const zip = new AdmZip(boltOptions.zipFile);
          const entries = zip.getEntries();
          if (entries.length === 0) {
            errors.push('Zip file is empty');
          }
        } catch (zipError) {
          errors.push('Invalid zip file format');
        }
      }
      
      if (boltOptions.boltProjectData) {
        // Validate project data structure
        if (!boltOptions.boltProjectData.name) {
          errors.push('Project data must include a name');
        }
        if (!boltOptions.boltProjectData.framework) {
          errors.push('Project data must specify a framework');
        }
      }
    } catch (error: any) {
      errors.push(`Validation error: ${error.message}`);
    }
    
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  async import(options: ImportOptions): Promise<ImportResult> {
    const boltOptions = options as BoltImportOptions;
    const startTime = Date.now();
    
    // Create import record
    const importRecord = await this.createImportRecord(options);
    let filesCreated = 0;

    try {
      const stages = this.generateProgressStages([
        'processing_source',
        'extracting_data', 
        'analyzing_structure',
        'creating_files',
        'finalizing'
      ]);

      // Stage 1: Process source
      await this.reportProgress(importRecord.id, {
        stage: 'processing_source',
        progress: stages.processing_source,
        message: 'Processing Bolt project source...',
        timestamp: new Date()
      });

      let projectStructure: BoltProjectStructure;

      if (boltOptions.zipFile) {
        projectStructure = await this.processZipFile(boltOptions.zipFile);
      } else if (boltOptions.boltUrl) {
        projectStructure = await this.fetchFromBoltUrl(boltOptions.boltUrl);
      } else {
        projectStructure = this.processBoltProjectData(boltOptions.boltProjectData);
      }

      // Stage 2: Extract data
      await this.reportProgress(importRecord.id, {
        stage: 'extracting_data',
        progress: stages.extracting_data,
        message: 'Extracting project data...',
        timestamp: new Date()
      });

      // Stage 3: Analyze structure
      await this.reportProgress(importRecord.id, {
        stage: 'analyzing_structure',
        progress: stages.analyzing_structure,
        message: 'Analyzing project structure...',
        timestamp: new Date()
      });

      const detectedFramework = this.detectFramework(projectStructure);
      const enhancedStructure = this.enhanceProjectStructure(projectStructure, detectedFramework);

      // Stage 4: Create files
      await this.reportProgress(importRecord.id, {
        stage: 'creating_files',
        progress: stages.creating_files,
        message: 'Creating project files...',
        timestamp: new Date()
      });

      // Create project files
      for (const file of enhancedStructure.files) {
        await storage.createFile({
          projectId: options.projectId,
          name: file.path.split('/').pop()!,
          path: file.path,
          content: file.content,
          userId: options.userId
        });
        filesCreated++;
      }

      // Create package.json
      const packageJson = this.generatePackageJson(enhancedStructure);
      await storage.createFile({
        projectId: options.projectId,
        name: 'package.json',
        path: '/package.json',
        content: JSON.stringify(packageJson, null, 2),
        userId: options.userId
      });
      filesCreated++;

      // Create environment file if needed
      if (enhancedStructure.env && Object.keys(enhancedStructure.env).length > 0) {
        const envContent = Object.entries(enhancedStructure.env)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
          
        await storage.createFile({
          projectId: options.projectId,
          name: '.env',
          path: '/.env',
          content: envContent,
          userId: options.userId
        });
        filesCreated++;
      }

      // Create bolt metadata file
      await storage.createFile({
        projectId: options.projectId,
        name: 'bolt.json',
        path: '/bolt.json',
        content: JSON.stringify({
          originalUrl: boltOptions.boltUrl,
          framework: enhancedStructure.framework,
          importedAt: new Date().toISOString(),
          structure: {
            files: enhancedStructure.files.length,
            dependencies: Object.keys(enhancedStructure.dependencies).length,
            devDependencies: Object.keys(enhancedStructure.devDependencies || {}).length
          }
        }, null, 2),
        userId: options.userId
      });
      filesCreated++;

      // Stage 5: Finalize
      await this.reportProgress(importRecord.id, {
        stage: 'finalizing',
        progress: stages.finalizing,
        message: 'Finalizing import...',
        timestamp: new Date()
      });

      // Update import record
      await this.updateImportRecord(importRecord.id, {
        status: 'completed',
        completedAt: new Date(),
        metadata: {
          framework: enhancedStructure.framework,
          filesCreated,
          dependencies: Object.keys(enhancedStructure.dependencies).length,
          projectName: enhancedStructure.name
        }
      });

      // Track telemetry
      await this.trackTelemetry({
        importType: 'bolt',
        success: true,
        duration: Date.now() - startTime,
        artifactCounts: {
          files: filesCreated,
          assets: 0,
          components: this.countComponents(enhancedStructure.files)
        },
        metadata: {
          framework: enhancedStructure.framework,
          hasZipFile: !!boltOptions.zipFile
        }
      });

      return {
        id: importRecord.id,
        status: 'completed' as const,
        progress: [],
        metadata: {
          framework: enhancedStructure.framework,
          filesCreated,
          dependencies: Object.keys(enhancedStructure.dependencies).length,
          projectName: enhancedStructure.name
        },
        filesCreated
    } catch (error: any) {
      await this.handleImportError(importRecord.id, error);
      
      // Track failed telemetry
      await this.trackTelemetry({
        importType: 'bolt',
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

  private async processZipFile(zipBuffer: Buffer): Promise<BoltProjectStructure> {
    const zip = new AdmZip(zipBuffer);
    const entries = zip.getEntries();
    
    const files: Array<{ path: string; content: string }> = [];
    let packageJsonContent: any = null;
    
    for (const entry of entries) {
      if (!entry.isDirectory) {
        const content = entry.getData().toString('utf8');
        const path = `/${entry.entryName}`;
        
        if (entry.entryName === 'package.json') {
          try {
            packageJsonContent = JSON.parse(content);
          } catch (e) {
            console.warn('Failed to parse package.json from zip');
          }
        }
        
        files.push({ path, content });
      }
    }
    
    return {
      name: packageJsonContent?.name || 'Bolt Project from Zip',
      framework: this.detectFrameworkFromPackageJson(packageJsonContent) || 'react',
      dependencies: packageJsonContent?.dependencies || {},
      devDependencies: packageJsonContent?.devDependencies || {},
      files,
      scripts: packageJsonContent?.scripts || {},
      description: packageJsonContent?.description
    };
  }

  private async fetchFromBoltUrl(url: string): Promise<BoltProjectStructure> {
    // This would integrate with Bolt.new API in a real implementation
    // For now, return a simulated structure based on the URL
    
    console.log(`Fetching project from Bolt URL: ${url}`);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Return default structure (would be replaced with actual API call)
    return this.getDefaultProjectStructure('Bolt Project from URL');
  }

  private processBoltProjectData(data: any): BoltProjectStructure {
    if (!data) {
      return this.getDefaultProjectStructure('Bolt Project');
    }
    
    return {
      name: data.name || 'Bolt Project',
      framework: data.framework || 'react',
      dependencies: data.dependencies || {},
      devDependencies: data.devDependencies || {},
      files: data.files || this.getDefaultFiles(),
      env: data.env,
      scripts: data.scripts,
      description: data.description
    };
  }

  private detectFramework(structure: BoltProjectStructure): string {
    // Check dependencies for framework indicators
    const deps = { ...structure.dependencies, ...structure.devDependencies };
    
    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps.svelte) return 'svelte';
    if (deps.angular) return 'angular';
    if (deps.next) return 'nextjs';
    if (deps.nuxt) return 'nuxtjs';
    
    // Check file extensions
    const hasReactFiles = structure.files.some(f => 
      f.path.endsWith('.tsx') || f.path.endsWith('.jsx')
    );
    if (hasReactFiles) return 'react';
    
    const hasVueFiles = structure.files.some(f => f.path.endsWith('.vue'));
    if (hasVueFiles) return 'vue';
    
    return structure.framework || 'vanilla';
  }

  private detectFrameworkFromPackageJson(packageJson: any): string | null {
    if (!packageJson?.dependencies) return null;
    
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps.svelte) return 'svelte';
    if (deps.angular) return 'angular';
    if (deps.next) return 'nextjs';
    if (deps.nuxt) return 'nuxtjs';
    
    return null;
  }

  private enhanceProjectStructure(structure: BoltProjectStructure, framework: string): BoltProjectStructure {
    const enhanced = { ...structure };
    enhanced.framework = framework;
    
    // Add framework-specific dependencies if missing
    if (framework === 'react' && !enhanced.dependencies.react) {
      enhanced.dependencies = {
        'react': '^18.2.0',
        'react-dom': '^18.2.0',
        ...enhanced.dependencies
      };
    }
    
    // Add build tools if missing
    if (!enhanced.devDependencies) enhanced.devDependencies = {};
    
    if (framework === 'react' && !enhanced.devDependencies.vite && !enhanced.dependencies.vite) {
      enhanced.devDependencies.vite = '^4.5.0';
      enhanced.devDependencies['@types/react'] = '^18.2.0';
      enhanced.devDependencies['@types/react-dom'] = '^18.2.0';
      enhanced.devDependencies.typescript = '^5.2.0';
    }
    
    // Ensure essential files exist
    if (enhanced.files.length === 0) {
      enhanced.files = this.getDefaultFiles(framework);
    }
    
    return enhanced;
  }

  private generatePackageJson(structure: BoltProjectStructure): any {
    return {
      name: structure.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      version: '1.0.0',
      type: 'module',
      description: structure.description || `A ${structure.framework} project imported from Bolt.new`,
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview',
        ...structure.scripts
      },
      dependencies: structure.dependencies,
      devDependencies: structure.devDependencies
    };
  }

  private countComponents(files: Array<{ path: string; content: string }>): number {
    return files.filter(f => 
      f.path.includes('/components/') || 
      f.path.endsWith('.tsx') || 
      f.path.endsWith('.jsx') ||
      f.path.endsWith('.vue')
    ).length;
  }

  private getDefaultProjectStructure(name: string): BoltProjectStructure {
    return {
      name,
      framework: 'react',
      dependencies: {
        'react': '^18.2.0',
        'react-dom': '^18.2.0'
      },
      devDependencies: {
        'vite': '^4.5.0',
        '@types/react': '^18.2.0',
        '@types/react-dom': '^18.2.0',
        'typescript': '^5.2.0'
      },
      files: this.getDefaultFiles(),
      env: {
        VITE_API_URL: 'https://api.example.com'
      },
      scripts: {
        dev: 'vite',
        build: 'vite build',
        preview: 'vite preview'
      }
    };
  }

  private getDefaultFiles(framework = 'react'): Array<{ path: string; content: string }> {
    const files = [
      { path: '/index.html', content: this.getDefaultHtmlContent() }
    ];

    if (framework === 'react') {
      files.push(
        { path: '/src/App.tsx', content: this.getDefaultAppContent() },
        { path: '/src/main.tsx', content: this.getDefaultMainContent() },
        { path: '/src/App.css', content: this.getDefaultAppCssContent() },
        { path: '/src/index.css', content: this.getDefaultIndexCssContent() }
      );
    }

    return files;
  }
  
  private getDefaultAppContent(): string {
    return `import React from 'react';
import './App.css';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>Welcome to Your Bolt Project</h1>
        <p>This project was imported from Bolt.new</p>
        <p>Start editing to see changes!</p>
      </header>
    </div>
  );
}

export default App;`;
  }
  
  private getDefaultMainContent(): string {
    return `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
  }
  
  private getDefaultHtmlContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bolt Project</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`;
  }

  private getDefaultAppCssContent(): string {
    return `.App {
  text-align: center;
}

.App-header {
  background-color: #282c34;
  padding: 20px;
  color: white;
  min-height: 50vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: calc(10px + 2vmin);
}

.App-header h1 {
  margin-bottom: 1rem;
}

.App-header p {
  margin: 0.5rem 0;
}`;
  }

  private getDefaultIndexCssContent(): string {
    return `body {
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
}

#root {
  min-height: 100vh;
}`;
  }

  // Legacy method for backward compatibility
  async importFromBolt(options: BoltImportOptions) {
    return this.import(options);
  }
}

export const boltImportService = new BoltImportService();