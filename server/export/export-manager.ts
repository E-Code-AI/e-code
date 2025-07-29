/**
 * Export Manager Service
 * Implements comprehensive project export capabilities for E-Code
 * - Docker containerization
 * - GitHub repository export
 * - ZIP archive export
 * - Template export
 */

import archiver from 'archiver';
import { promises as fs } from 'fs';
import path from 'path';

export interface ExportOptions {
  type: 'docker' | 'github' | 'zip' | 'template';
  includeFiles?: boolean;
  includeDependencies?: boolean;
  includeSecrets?: boolean;
  includeHistory?: boolean;
  dockerBaseImage?: string;
  customDockerfile?: string;
  gitHubRepo?: string;
  gitHubToken?: string;
  templateMetadata?: {
    name: string;
    description: string;
    category: string;
    tags: string[];
  };
}

export interface ExportResult {
  success: boolean;
  exportId: string;
  type: string;
  downloadUrl?: string;
  githubUrl?: string;
  dockerImage?: string;
  message?: string;
  error?: string;
  metadata?: {
    fileCount: number;
    totalSize: number;
    exportTime: number;
  };
}

export class ExportManager {
  private projectsDir = './projects';
  private exportsDir = './temp/exports';

  constructor() {
    // Ensure export directory exists
    this.ensureExportDir();
  }

  private async ensureExportDir() {
    try {
      await fs.mkdir(this.exportsDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }
  }

  async exportProject(projectId: number, options: ExportOptions): Promise<ExportResult> {
    const exportId = `export_${projectId}_${Date.now()}`;
    const startTime = Date.now();

    try {
      switch (options.type) {
        case 'docker':
          return await this.exportAsDocker(projectId, exportId, options);
        case 'github':
          return await this.exportToGitHub(projectId, exportId, options);
        case 'zip':
          return await this.exportAsZip(projectId, exportId, options);
        case 'template':
          return await this.exportAsTemplate(projectId, exportId, options);
        default:
          throw new Error(`Unsupported export type: ${options.type}`);
      }
    } catch (error) {
      const exportTime = Date.now() - startTime;
      return {
        success: false,
        exportId,
        type: options.type,
        error: error instanceof Error ? error.message : 'Unknown export error',
        metadata: {
          fileCount: 0,
          totalSize: 0,
          exportTime
        }
      };
    }
  }

  private async exportAsDocker(projectId: number, exportId: string, options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const projectPath = path.join(this.projectsDir, projectId.toString());
    
    // Get project files
    const files = await this.getProjectFiles(projectPath);
    
    // Detect project type and language
    const projectInfo = await this.detectProjectType(files);
    
    // Generate Dockerfile
    const dockerfile = options.customDockerfile || this.generateDockerfile(projectInfo, options.dockerBaseImage);
    
    // Create export directory
    const exportPath = path.join(this.exportsDir, exportId);
    await fs.mkdir(exportPath, { recursive: true });
    
    // Copy project files
    await this.copyProjectFiles(projectPath, exportPath, options);
    
    // Write Dockerfile
    await fs.writeFile(path.join(exportPath, 'Dockerfile'), dockerfile);
    
    // Generate docker-compose.yml if needed
    if (projectInfo.requiresDatabase || projectInfo.requiresRedis) {
      const dockerCompose = this.generateDockerCompose(projectInfo);
      await fs.writeFile(path.join(exportPath, 'docker-compose.yml'), dockerCompose);
    }
    
    // Generate .dockerignore
    const dockerignore = this.generateDockerignore();
    await fs.writeFile(path.join(exportPath, '.dockerignore'), dockerignore);
    
    // Generate README with Docker instructions
    const dockerReadme = this.generateDockerReadme(projectInfo);
    await fs.writeFile(path.join(exportPath, 'README.Docker.md'), dockerReadme);
    
    // Create ZIP archive
    const zipPath = path.join(this.exportsDir, `${exportId}.zip`);
    await this.createZipArchive(exportPath, zipPath);
    
    const stats = await this.getExportStats(exportPath);
    const exportTime = Date.now() - startTime;
    
    return {
      success: true,
      exportId,
      type: 'docker',
      downloadUrl: `/api/exports/${exportId}.zip`,
      dockerImage: `e-code-project-${projectId}`,
      message: 'Docker export completed successfully',
      metadata: {
        fileCount: stats.fileCount,
        totalSize: stats.totalSize,
        exportTime
      }
    };
  }

  private async exportToGitHub(projectId: number, exportId: string, options: ExportOptions): Promise<ExportResult> {
    // Note: This would require GitHub API integration
    // For now, we'll create a GitHub-ready export
    
    const startTime = Date.now();
    const projectPath = path.join(this.projectsDir, projectId.toString());
    const exportPath = path.join(this.exportsDir, exportId);
    
    await fs.mkdir(exportPath, { recursive: true });
    
    // Copy project files
    await this.copyProjectFiles(projectPath, exportPath, options);
    
    // Generate GitHub-specific files
    const files = await this.getProjectFiles(projectPath);
    const projectInfo = await this.detectProjectType(files);
    
    // Generate README.md
    const readme = this.generateGitHubReadme(projectInfo);
    await fs.writeFile(path.join(exportPath, 'README.md'), readme);
    
    // Generate .gitignore
    const gitignore = this.generateGitignore(projectInfo);
    await fs.writeFile(path.join(exportPath, '.gitignore'), gitignore);
    
    // Generate LICENSE (MIT by default)
    const license = this.generateLicense();
    await fs.writeFile(path.join(exportPath, 'LICENSE'), license);
    
    // Generate GitHub workflows (CI/CD)
    const workflowsDir = path.join(exportPath, '.github', 'workflows');
    await fs.mkdir(workflowsDir, { recursive: true });
    
    const workflow = this.generateGitHubWorkflow(projectInfo);
    await fs.writeFile(path.join(workflowsDir, 'ci.yml'), workflow);
    
    // Create ZIP for download
    const zipPath = path.join(this.exportsDir, `${exportId}.zip`);
    await this.createZipArchive(exportPath, zipPath);
    
    const stats = await this.getExportStats(exportPath);
    const exportTime = Date.now() - startTime;
    
    return {
      success: true,
      exportId,
      type: 'github',
      downloadUrl: `/api/exports/${exportId}.zip`,
      message: 'GitHub export completed successfully. Contains all necessary files for GitHub repository.',
      metadata: {
        fileCount: stats.fileCount,
        totalSize: stats.totalSize,
        exportTime
      }
    };
  }

  private async exportAsZip(projectId: number, exportId: string, options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const projectPath = path.join(this.projectsDir, projectId.toString());
    const zipPath = path.join(this.exportsDir, `${exportId}.zip`);
    
    const stats = await this.createZipArchive(projectPath, zipPath, options);
    const exportTime = Date.now() - startTime;
    
    return {
      success: true,
      exportId,
      type: 'zip',
      downloadUrl: `/api/exports/${exportId}.zip`,
      message: 'ZIP export completed successfully',
      metadata: {
        fileCount: stats.fileCount,
        totalSize: stats.totalSize,
        exportTime
      }
    };
  }

  private async exportAsTemplate(projectId: number, exportId: string, options: ExportOptions): Promise<ExportResult> {
    const startTime = Date.now();
    const projectPath = path.join(this.projectsDir, projectId.toString());
    const exportPath = path.join(this.exportsDir, exportId);
    
    await fs.mkdir(exportPath, { recursive: true });
    
    // Copy project files (excluding user-specific data)
    await this.copyProjectFiles(projectPath, exportPath, {
      ...options,
      includeSecrets: false, // Never include secrets in templates
      includeHistory: false
    });
    
    // Generate template metadata
    const templateMeta = {
      name: options.templateMetadata?.name || `Project Template ${projectId}`,
      description: options.templateMetadata?.description || 'Exported from E-Code project',
      category: options.templateMetadata?.category || 'General',
      tags: options.templateMetadata?.tags || [],
      version: '1.0.0',
      author: 'E-Code User',
      created: new Date().toISOString(),
      ...options.templateMetadata
    };
    
    await fs.writeFile(
      path.join(exportPath, 'template.json'),
      JSON.stringify(templateMeta, null, 2)
    );
    
    // Generate template README
    const templateReadme = this.generateTemplateReadme(templateMeta);
    await fs.writeFile(path.join(exportPath, 'README.template.md'), templateReadme);
    
    // Create ZIP
    const zipPath = path.join(this.exportsDir, `${exportId}.zip`);
    await this.createZipArchive(exportPath, zipPath);
    
    const stats = await this.getExportStats(exportPath);
    const exportTime = Date.now() - startTime;
    
    return {
      success: true,
      exportId,
      type: 'template',
      downloadUrl: `/api/exports/${exportId}.zip`,
      message: 'Template export completed successfully',
      metadata: {
        fileCount: stats.fileCount,
        totalSize: stats.totalSize,
        exportTime
      }
    };
  }

  private async getProjectFiles(projectPath: string): Promise<string[]> {
    try {
      const files: string[] = [];
      const items = await fs.readdir(projectPath, { withFileTypes: true });
      
      for (const item of items) {
        if (item.isFile()) {
          files.push(item.name);
        }
      }
      
      return files;
    } catch (error) {
      return [];
    }
  }

  private async detectProjectType(files: string[]): Promise<any> {
    const hasFile = (name: string) => files.includes(name);
    const hasExtension = (ext: string) => files.some(f => f.endsWith(ext));
    
    return {
      language: hasFile('package.json') ? 'javascript' : 
                hasFile('requirements.txt') ? 'python' :
                hasFile('Cargo.toml') ? 'rust' :
                hasFile('go.mod') ? 'go' :
                hasExtension('.java') ? 'java' : 'general',
      framework: hasFile('next.config.js') ? 'nextjs' :
                 hasFile('nuxt.config.js') ? 'nuxtjs' :
                 hasFile('vite.config.js') ? 'vite' :
                 hasFile('webpack.config.js') ? 'webpack' : 'none',
      requiresDatabase: hasFile('prisma') || hasFile('database.sql') || files.some(f => f.includes('db')),
      requiresRedis: files.some(f => f.includes('redis') || f.includes('cache')),
      isWebApp: hasExtension('.html') || hasExtension('.css') || hasFile('public'),
      isAPI: hasFile('api') || files.some(f => f.includes('server') || f.includes('route'))
    };
  }

  private generateDockerfile(projectInfo: any, baseImage?: string): string {
    const base = baseImage || this.getDefaultBaseImage(projectInfo.language);
    
    let dockerfile = `FROM ${base}\n\nWORKDIR /app\n\n`;
    
    // Copy dependency files first for better caching
    if (projectInfo.language === 'javascript') {
      dockerfile += 'COPY package*.json ./\nRUN npm ci --only=production\n\n';
    } else if (projectInfo.language === 'python') {
      dockerfile += 'COPY requirements.txt ./\nRUN pip install -r requirements.txt\n\n';
    }
    
    dockerfile += 'COPY . .\n\n';
    
    // Add build step if needed
    if (projectInfo.framework === 'nextjs') {
      dockerfile += 'RUN npm run build\n\n';
    }
    
    // Expose port
    dockerfile += 'EXPOSE 3000\n\n';
    
    // Start command
    const startCmd = this.getStartCommand(projectInfo);
    dockerfile += `CMD ${JSON.stringify(startCmd.split(' '))}`;
    
    return dockerfile;
  }

  private getDefaultBaseImage(language: string): string {
    const images: Record<string, string> = {
      javascript: 'node:18-alpine',
      python: 'python:3.11-slim',
      rust: 'rust:1.70-slim',
      go: 'golang:1.21-alpine',
      java: 'openjdk:17-jre-slim',
      general: 'alpine:latest'
    };
    
    return images[language] || images.general;
  }

  private getStartCommand(projectInfo: any): string {
    if (projectInfo.language === 'javascript') {
      return projectInfo.framework === 'nextjs' ? 'npm start' : 'npm run start';
    } else if (projectInfo.language === 'python') {
      return 'python main.py';
    }
    
    return 'echo "Please configure start command"';
  }

  private generateDockerCompose(projectInfo: any): string {
    let compose = `version: '3.8'\n\nservices:\n  app:\n    build: .\n    ports:\n      - "3000:3000"\n    environment:\n      - NODE_ENV=production\n`;
    
    if (projectInfo.requiresDatabase) {
      compose += `\n  db:\n    image: postgres:15\n    environment:\n      POSTGRES_DB: app\n      POSTGRES_USER: user\n      POSTGRES_PASSWORD: password\n    volumes:\n      - postgres_data:/var/lib/postgresql/data\n`;
    }
    
    if (projectInfo.requiresRedis) {
      compose += `\n  redis:\n    image: redis:7-alpine\n    volumes:\n      - redis_data:/data\n`;
    }
    
    if (projectInfo.requiresDatabase || projectInfo.requiresRedis) {
      compose += `\nvolumes:\n`;
      if (projectInfo.requiresDatabase) compose += `  postgres_data:\n`;
      if (projectInfo.requiresRedis) compose += `  redis_data:\n`;
    }
    
    return compose;
  }

  private generateDockerignore(): string {
    return `node_modules
.git
.env
*.log
.DS_Store
coverage
dist
build
.next
.nuxt
.vscode
.idea
*.tmp
*.temp`;
  }

  private generateDockerReadme(projectInfo: any): string {
    return `# Docker Deployment Guide

This project has been exported with Docker support.

## Quick Start

1. Build the Docker image:
   \`\`\`bash
   docker build -t my-e-code-app .
   \`\`\`

2. Run the container:
   \`\`\`bash
   docker run -p 3000:3000 my-e-code-app
   \`\`\`

## Using Docker Compose

If your project requires additional services (database, cache, etc.):

\`\`\`bash
docker-compose up -d
\`\`\`

## Environment Variables

Make sure to set the required environment variables in production:

- Copy \`.env.example\` to \`.env\`
- Update the values for your production environment
- Use \`--env-file .env\` when running the container

## Production Deployment

For production deployment, consider:

1. Using a reverse proxy (nginx)
2. Setting up SSL certificates
3. Implementing proper logging
4. Setting up health checks
5. Using container orchestration (Kubernetes, Docker Swarm)

Generated from E-Code project on ${new Date().toISOString()}`;
  }

  private generateGitHubReadme(projectInfo: any): string {
    return `# E-Code Project

This project was exported from E-Code platform.

## Getting Started

### Prerequisites

- ${projectInfo.language === 'javascript' ? 'Node.js 18+' : projectInfo.language.charAt(0).toUpperCase() + projectInfo.language.slice(1)}
- ${projectInfo.language === 'javascript' ? 'npm or yarn' : 'Package manager for ' + projectInfo.language}

### Installation

1. Clone the repository:
   \`\`\`bash
   git clone <repository-url>
   cd <repository-name>
   \`\`\`

2. Install dependencies:
   \`\`\`bash
   ${projectInfo.language === 'javascript' ? 'npm install' : 'pip install -r requirements.txt'}
   \`\`\`

3. Start the development server:
   \`\`\`bash
   ${projectInfo.language === 'javascript' ? 'npm run dev' : 'python main.py'}
   \`\`\`

## Features

- Modern ${projectInfo.language} application
- ${projectInfo.framework !== 'none' ? `Built with ${projectInfo.framework}` : 'Custom framework'}
- ${projectInfo.isWebApp ? 'Web application' : 'API service'}
- Ready for deployment

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Generated from E-Code platform on ${new Date().toISOString()}`;
  }

  private generateGitignore(projectInfo: any): string {
    let gitignore = `.env
.DS_Store
*.log
*.tmp
*.temp
.vscode/
.idea/`;

    if (projectInfo.language === 'javascript') {
      gitignore += `
node_modules/
dist/
build/
.next/
.nuxt/
coverage/`;
    } else if (projectInfo.language === 'python') {
      gitignore += `
__pycache__/
*.pyc
*.pyo
.pytest_cache/
venv/
env/`;
    }

    return gitignore;
  }

  private generateLicense(): string {
    const year = new Date().getFullYear();
    return `MIT License

Copyright (c) ${year} E-Code User

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
  }

  private generateGitHubWorkflow(projectInfo: any): string {
    return `name: CI/CD

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup ${projectInfo.language}
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
      
    - name: Install dependencies
      run: ${projectInfo.language === 'javascript' ? 'npm ci' : 'pip install -r requirements.txt'}
      
    - name: Run tests
      run: ${projectInfo.language === 'javascript' ? 'npm test' : 'python -m pytest'}
      
    - name: Build
      run: ${projectInfo.language === 'javascript' ? 'npm run build' : 'echo "Build step"'}

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to production
      run: echo "Deploy to your preferred platform"`;
  }

  private generateTemplateReadme(templateMeta: any): string {
    return `# ${templateMeta.name}

${templateMeta.description}

## Template Information

- **Category**: ${templateMeta.category}
- **Tags**: ${templateMeta.tags.join(', ')}
- **Version**: ${templateMeta.version}
- **Created**: ${templateMeta.created}

## Usage

This template can be used to quickly start a new project with the following features:

- Pre-configured project structure
- Ready-to-use dependencies
- Best practices implementation

## Customization

After creating a project from this template:

1. Update package.json with your project details
2. Modify the README.md
3. Customize the code to fit your needs
4. Add your own features and functionality

## Support

For support and questions, visit the E-Code platform.

---

Template exported from E-Code platform`;
  }

  private async copyProjectFiles(source: string, destination: string, options: ExportOptions): Promise<void> {
    try {
      const items = await fs.readdir(source, { withFileTypes: true });
      
      for (const item of items) {
        const sourcePath = path.join(source, item.name);
        const destPath = path.join(destination, item.name);
        
        // Skip certain files based on options
        if (!options.includeSecrets && (item.name === '.env' || item.name.includes('secret'))) {
          continue;
        }
        
        if (!options.includeHistory && (item.name === '.git' || item.name.includes('history'))) {
          continue;
        }
        
        if (item.isFile()) {
          await fs.copyFile(sourcePath, destPath);
        } else if (item.isDirectory()) {
          await fs.mkdir(destPath, { recursive: true });
          await this.copyProjectFiles(sourcePath, destPath, options);
        }
      }
    } catch (error) {
      // Handle copy errors
    }
  }

  private async createZipArchive(sourcePath: string, zipPath: string, options?: ExportOptions): Promise<{fileCount: number, totalSize: number}> {
    return new Promise((resolve, reject) => {
      const output = require('fs').createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      let fileCount = 0;
      let totalSize = 0;
      
      output.on('close', () => {
        resolve({ fileCount, totalSize: archive.pointer() });
      });
      
      archive.on('error', reject);
      archive.on('entry', () => fileCount++);
      
      archive.pipe(output);
      archive.directory(sourcePath, false);
      archive.finalize();
    });
  }

  private async getExportStats(exportPath: string): Promise<{fileCount: number, totalSize: number}> {
    let fileCount = 0;
    let totalSize = 0;
    
    const calculateStats = async (dirPath: string): Promise<void> => {
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        
        if (item.isFile()) {
          fileCount++;
          const stats = await fs.stat(itemPath);
          totalSize += stats.size;
        } else if (item.isDirectory()) {
          await calculateStats(itemPath);
        }
      }
    };
    
    await calculateStats(exportPath);
    return { fileCount, totalSize };
  }

  async getExportStatus(exportId: string): Promise<ExportResult | null> {
    // Check if export exists
    const zipPath = path.join(this.exportsDir, `${exportId}.zip`);
    
    try {
      const stats = await fs.stat(zipPath);
      return {
        success: true,
        exportId,
        type: 'unknown',
        downloadUrl: `/api/exports/${exportId}.zip`,
        metadata: {
          fileCount: 0,
          totalSize: stats.size,
          exportTime: 0
        }
      };
    } catch (error) {
      return null;
    }
  }

  async deleteExport(exportId: string): Promise<boolean> {
    try {
      const zipPath = path.join(this.exportsDir, `${exportId}.zip`);
      await fs.unlink(zipPath);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export const exportManager = new ExportManager();