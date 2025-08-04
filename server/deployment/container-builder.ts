import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import crypto from 'crypto';

const execAsync = promisify(exec);

export interface BuildConfig {
  projectId: number;
  projectPath: string;
  language: string;
  buildCommand?: string;
  startCommand?: string;
  port?: number;
  environmentVars?: Record<string, string>;
}

export interface BuildResult {
  success: boolean;
  imageName: string;
  imageTag: string;
  buildLogs: string[];
  buildTime: number;
  size: string;
  error?: string;
}

export class ContainerBuilder {
  private buildPath: string;
  private registryUrl: string;
  
  constructor() {
    this.buildPath = path.join(process.cwd(), '.builds');
    this.registryUrl = process.env.CONTAINER_REGISTRY_URL || 'registry.e-code.app';
    this.initializeBuildDirectory();
  }

  private async initializeBuildDirectory() {
    try {
      await fs.mkdir(this.buildPath, { recursive: true });
    } catch (error) {
      console.error('[container-builder] Failed to initialize build directory:', error);
    }
  }

  async buildContainer(config: BuildConfig): Promise<BuildResult> {
    const startTime = Date.now();
    const buildId = crypto.randomUUID();
    const imageName = `project-${config.projectId}`;
    const imageTag = `build-${buildId.slice(0, 8)}`;
    const buildLogs: string[] = [];
    
    try {
      buildLogs.push(`[${new Date().toISOString()}] Starting container build for project ${config.projectId}`);
      
      // Create build directory
      const buildDir = path.join(this.buildPath, buildId);
      await fs.mkdir(buildDir, { recursive: true });
      buildLogs.push(`[${new Date().toISOString()}] Created build directory: ${buildDir}`);

      // Copy project files
      await this.copyProjectFiles(config.projectPath, buildDir);
      buildLogs.push(`[${new Date().toISOString()}] Copied project files`);

      // Generate Dockerfile
      const dockerfile = await this.generateDockerfile(config);
      await fs.writeFile(path.join(buildDir, 'Dockerfile'), dockerfile);
      buildLogs.push(`[${new Date().toISOString()}] Generated Dockerfile`);

      // Create .dockerignore
      const dockerignore = this.generateDockerignore();
      await fs.writeFile(path.join(buildDir, '.dockerignore'), dockerignore);

      // Write environment file if needed
      if (config.environmentVars && Object.keys(config.environmentVars).length > 0) {
        const envContent = Object.entries(config.environmentVars)
          .map(([key, value]) => `${key}=${value}`)
          .join('\n');
        await fs.writeFile(path.join(buildDir, '.env'), envContent);
        buildLogs.push(`[${new Date().toISOString()}] Created environment file`);
      }

      // Build Docker image
      buildLogs.push(`[${new Date().toISOString()}] Building Docker image...`);
      const buildCommand = `docker build -t ${this.registryUrl}/${imageName}:${imageTag} ${buildDir}`;
      const { stdout, stderr } = await execAsync(buildCommand);
      
      if (stdout) buildLogs.push(stdout);
      if (stderr) buildLogs.push(`[WARN] ${stderr}`);

      // Get image size
      const sizeCommand = `docker image inspect ${this.registryUrl}/${imageName}:${imageTag} --format='{{.Size}}'`;
      const { stdout: sizeOutput } = await execAsync(sizeCommand);
      const sizeInBytes = parseInt(sizeOutput.trim());
      const size = this.formatBytes(sizeInBytes);

      // Push to registry
      buildLogs.push(`[${new Date().toISOString()}] Pushing image to registry...`);
      const pushCommand = `docker push ${this.registryUrl}/${imageName}:${imageTag}`;
      await execAsync(pushCommand);
      buildLogs.push(`[${new Date().toISOString()}] Image pushed successfully`);

      // Clean up build directory
      await fs.rm(buildDir, { recursive: true, force: true });

      const buildTime = Date.now() - startTime;
      buildLogs.push(`[${new Date().toISOString()}] Build completed in ${buildTime}ms`);

      return {
        success: true,
        imageName: `${this.registryUrl}/${imageName}`,
        imageTag,
        buildLogs,
        buildTime,
        size
      };

    } catch (error: any) {
      buildLogs.push(`[${new Date().toISOString()}] Build failed: ${error.message}`);
      return {
        success: false,
        imageName: '',
        imageTag: '',
        buildLogs,
        buildTime: Date.now() - startTime,
        size: '0',
        error: error.message
      };
    }
  }

  private async copyProjectFiles(sourcePath: string, destinationPath: string) {
    const entries = await fs.readdir(sourcePath, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(sourcePath, entry.name);
      const destPath = path.join(destinationPath, entry.name);
      
      if (entry.isDirectory()) {
        // Skip node_modules and other build artifacts
        if (!['node_modules', '.git', 'dist', 'build', '.next'].includes(entry.name)) {
          await fs.mkdir(destPath, { recursive: true });
          await this.copyProjectFiles(srcPath, destPath);
        }
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  private async generateDockerfile(config: BuildConfig): Promise<string> {
    const baseImages: Record<string, string> = {
      'nodejs': 'node:18-alpine',
      'python': 'python:3.11-slim',
      'go': 'golang:1.21-alpine',
      'ruby': 'ruby:3.2-alpine',
      'java': 'openjdk:17-alpine',
      'rust': 'rust:1.73-alpine',
      'php': 'php:8.2-apache',
      'dotnet': 'mcr.microsoft.com/dotnet/sdk:7.0'
    };

    const baseImage = baseImages[config.language] || 'node:18-alpine';
    const port = config.port || 3000;

    let dockerfile = `# Auto-generated Dockerfile for E-Code deployment
FROM ${baseImage}

WORKDIR /app

`;

    // Language-specific setup
    switch (config.language) {
      case 'nodejs':
        dockerfile += `# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application files
COPY . .

# Build if needed
${config.buildCommand ? `RUN ${config.buildCommand}` : ''}

# Expose port
EXPOSE ${port}

# Start command
CMD ${config.startCommand ? `["${config.startCommand}"]` : '["npm", "start"]'}
`;
        break;

      case 'python':
        dockerfile += `# Install dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application files
COPY . .

# Expose port
EXPOSE ${port}

# Start command
CMD ${config.startCommand ? `["${config.startCommand}"]` : '["python", "app.py"]'}
`;
        break;

      case 'go':
        dockerfile += `# Copy go mod files
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build
RUN go build -o main .

# Expose port
EXPOSE ${port}

# Start command
CMD ["./main"]
`;
        break;

      default:
        dockerfile += `# Copy application files
COPY . .

# Install dependencies and build
${config.buildCommand ? `RUN ${config.buildCommand}` : ''}

# Expose port
EXPOSE ${port}

# Start command
CMD ${config.startCommand ? `["${config.startCommand}"]` : '["npm", "start"]'}
`;
    }

    return dockerfile;
  }

  private generateDockerignore(): string {
    return `node_modules
npm-debug.log
.git
.gitignore
.DS_Store
.env.local
.env.development.local
.env.test.local
.env.production.local
.next
dist
build
*.log
.vscode
.idea
*.swp
*.swo
coverage
.nyc_output
`;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

export const containerBuilder = new ContainerBuilder();