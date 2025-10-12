import express from 'express';
import * as path from 'path';
import { storage } from '../storage';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { createLogger } from '../utils/logger';
import { previewEvents } from './preview-websocket';
import fetch from 'node-fetch';

const logger = createLogger('preview-service');

interface PreviewInstance {
  projectId: number;
  runId: string;
  ports: number[];  // Support multiple ports
  primaryPort: number;
  processes: Map<number, any>;  // Map port to process
  url: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  logs: string[];
  healthChecks: Map<number, boolean>;  // Port health status
  lastHealthCheck: Date;
  frameworkType?: 'react' | 'vue' | 'angular' | 'static' | 'node' | 'python';
  exposedServices: Array<{
    port: number;
    name: string;
    path?: string;
    description?: string;
  }>;
}

export class PreviewService {
  private previews: Map<number, PreviewInstance> = new Map();
  private basePort = 8000;
  private healthCheckInterval: NodeJS.Timeout;

  constructor() {
    this.startHealthChecks();
  }

  // Register preview routes on the main Express app
  registerRoutes(app: express.Application) {
    // Multi-port proxy requests to preview instances
    app.use('/preview/:projectId/:port/*', async (req, res, next) => {
      const projectId = parseInt(req.params.projectId);
      const port = parseInt(req.params.port);
      const preview = this.previews.get(projectId);
      
      if (!preview || preview.status !== 'running') {
        return res.status(404).json({ error: 'Preview not available' });
      }
      
      // Check if requested port is exposed
      if (!preview.ports.includes(port)) {
        return res.status(404).json({ error: `Port ${port} not exposed by this preview` });
      }
      
      // Health check for the specific port
      if (!preview.healthChecks.get(port)) {
        return res.status(503).json({ error: `Service on port ${port} is not healthy` });
      }
      
      // Proxy to the specific port
      const proxy = createProxyMiddleware({
        target: `http://127.0.0.1:${port}`,
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
        pathRewrite: {
          [`^/preview/${projectId}/${port}`]: ''
        },
        onError: (err: any, req: any, res: any) => {
          logger.error(`Preview proxy error for project ${projectId} port ${port}:`, err);
          res.status(502).json({ error: 'Preview server error' });
        }
      });
      
      proxy(req, res, next);
    });

    // Default port proxy (backwards compatibility)
    app.use('/preview/:projectId/*', async (req, res, next) => {
      const projectId = parseInt(req.params.projectId);
      const preview = this.previews.get(projectId);
      
      if (!preview || preview.status !== 'running') {
        return res.status(404).json({ error: 'Preview not available' });
      }
      
      // Proxy to primary port
      const proxy = createProxyMiddleware({
        target: `http://127.0.0.1:${preview.primaryPort}`,
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
        pathRewrite: {
          [`^/preview/${projectId}`]: ''
        },
        onError: (err: any, req: any, res: any) => {
          logger.error(`Preview proxy error for project ${projectId}:`, err);
          res.status(502).json({ error: 'Preview server error' });
        }
      });
      
      proxy(req, res, next);
    });
  }

  async startPreview(projectId: number, runId?: string): Promise<PreviewInstance> {
    // Stop existing preview if running
    await this.stopPreview(projectId);
    
    const basePort = this.basePort + projectId;
    const preview: PreviewInstance = {
      projectId,
      runId: runId || `run-${projectId}-${Date.now()}`,
      ports: [],
      primaryPort: basePort,
      processes: new Map(),
      url: `/preview/${projectId}/`,
      status: 'starting',
      logs: [],
      healthChecks: new Map(),
      lastHealthCheck: new Date(),
      exposedServices: []
    };
    
    this.previews.set(projectId, preview);
    
    // Emit WebSocket event for preview start
    previewEvents.emit('preview:start', { projectId, runId: preview.runId, port: basePort });
    
    try {
      // Create temporary directory for preview
      const previewPath = path.join(process.cwd(), 'previews', projectId.toString());
      await fs.mkdir(previewPath, { recursive: true });
      
      // Load project files from database
      const files = await storage.getFilesByProjectId(projectId);
      
      // Write files to preview directory
      for (const file of files) {
        if (!file.path || file.path === '/' || file.path.endsWith('/')) continue;
        
        const filePath = path.join(previewPath, file.path.startsWith('/') ? file.path.slice(1) : file.path);
        const fileDir = path.dirname(filePath);
        await fs.mkdir(fileDir, { recursive: true });
        await fs.writeFile(filePath, file.content || '');
      }
      
      // Enhanced framework detection and multi-port setup
      const frameworkInfo = await this.detectFramework(files, previewPath);
      preview.frameworkType = frameworkInfo.type;
      
      if (frameworkInfo.type === 'react' || frameworkInfo.type === 'vue' || frameworkInfo.type === 'angular') {
        // Modern frontend frameworks - may expose multiple services
        await this.startModernFramework(preview, frameworkInfo, previewPath, files);
      } else if (frameworkInfo.type === 'node') {
        // Node.js backend - may expose API + frontend
        await this.startNodeApplication(preview, frameworkInfo, previewPath, files);
      } else if (frameworkInfo.type === 'python') {
        // Python application
        await this.startPythonApplication(preview, frameworkInfo, previewPath, files);
      } else {
        // Static files
        await this.startStaticServer(preview, previewPath);
      }
      
      // Wait for services to start
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Perform initial health checks
      await this.performHealthChecks(preview);
      
      preview.status = preview.ports.length > 0 ? 'running' : 'error';
      
      if (preview.status === 'running') {
        previewEvents.emit('preview:ready', { 
          projectId, 
          runId: preview.runId,
          ports: preview.ports,
          primaryPort: preview.primaryPort,
          services: preview.exposedServices
        });
      } else {
        previewEvents.emit('preview:error', { 
          projectId, 
          runId: preview.runId,
          error: 'No services started successfully'
        });
      }
      
    } catch (error: any) {
      preview.status = 'error';
      preview.logs.push(`Error: ${error.message}`);
      logger.error(`Failed to start preview for project ${projectId}:`, error);
      previewEvents.emit('preview:error', { 
        projectId, 
        runId: preview.runId,
        error: error.message 
      });
    }
    
    return preview;
  }

  async stopPreview(projectId: number): Promise<void> {
    const preview = this.previews.get(projectId);
    if (preview) {
      // Stop all processes
      for (const [port, process] of preview.processes) {
        if (process) {
          process.kill();
          preview.logs.push(`Stopped service on port ${port}`);
        }
      }
      preview.status = 'stopped';
      // Emit stop event for WebSocket
      previewEvents.emit('preview:stop', { projectId, runId: preview.runId });
    }
    this.previews.delete(projectId);
  }

  getPreview(projectId: number): PreviewInstance | undefined {
    return this.previews.get(projectId);
  }

  getPreviewUrl(projectId: number, port?: number): string {
    const preview = this.previews.get(projectId);
    if (!preview) return '';
    
    if (port && preview.ports.includes(port)) {
      return `/preview/${projectId}/${port}/`;
    }
    return preview.url || '';
  }

  getPreviewPorts(projectId: number): number[] {
    const preview = this.previews.get(projectId);
    return preview?.ports || [];
  }

  getPreviewServices(projectId: number) {
    const preview = this.previews.get(projectId);
    return preview?.exposedServices || [];
  }

  async switchPort(projectId: number, port: number): Promise<boolean> {
    const preview = this.previews.get(projectId);
    if (!preview || !preview.ports.includes(port)) {
      return false;
    }

    // Perform health check on target port
    const isHealthy = await this.checkPortHealth(port);
    if (isHealthy) {
      preview.primaryPort = port;
      previewEvents.emit('preview:port-switch', { 
        projectId, 
        runId: preview.runId,
        port,
        url: this.getPreviewUrl(projectId, port)
      });
      return true;
    }
    return false;
  }

  private async detectFramework(files: any[], previewPath: string) {
    const packageJsonFile = files.find(f => f.name === 'package.json');
    const hasIndexHtml = files.some(f => f.name === 'index.html');
    const hasPythonFiles = files.some(f => f.name.endsWith('.py'));
    const hasRequirementsTxt = files.some(f => f.name === 'requirements.txt');

    if (packageJsonFile) {
      const packageJson = JSON.parse(packageJsonFile.content || '{}');
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.react || deps['@vitejs/plugin-react']) {
        return { type: 'react' as const, packageJson, hasVite: !!deps.vite };
      } else if (deps.vue || deps['@vitejs/plugin-vue']) {
        return { type: 'vue' as const, packageJson, hasVite: !!deps.vite };
      } else if (deps['@angular/core']) {
        return { type: 'angular' as const, packageJson };
      } else if (deps.express || deps.fastify || deps.koa) {
        return { type: 'node' as const, packageJson };
      } else {
        return { type: 'node' as const, packageJson };
      }
    } else if (hasPythonFiles) {
      return { type: 'python' as const, hasRequirements: hasRequirementsTxt };
    } else if (hasIndexHtml) {
      return { type: 'static' as const };
    }

    return { type: 'static' as const };
  }

  private async startModernFramework(preview: PreviewInstance, frameworkInfo: any, previewPath: string, files: any[]) {
    const port = preview.primaryPort;
    preview.logs.push(`Starting ${frameworkInfo.type} application...`);
    
    // Install dependencies
    await this.runCommand('npm', ['install'], previewPath);
    
    let startCommand: string[] = [];
    if (frameworkInfo.packageJson.scripts?.dev) {
      startCommand = ['npm', 'run', 'dev'];
    } else if (frameworkInfo.packageJson.scripts?.start) {
      startCommand = ['npm', 'start'];
    } else if (frameworkInfo.hasVite) {
      startCommand = ['npx', 'vite', '--port', port.toString(), '--host'];
    } else {
      // Fallback to static serving
      await this.startStaticServer(preview, previewPath);
      return;
    }

    const process = spawn(startCommand[0], startCommand.slice(1), {
      cwd: previewPath,
      env: { 
        ...process.env, 
        PORT: port.toString(),
        VITE_PORT: port.toString(),
        DEV_SERVER_PORT: port.toString()
      }
    });

    this.setupProcessHandlers(preview, process, port, `${frameworkInfo.type} dev server`);
    
    preview.ports.push(port);
    preview.processes.set(port, process);
    preview.healthChecks.set(port, false);
    preview.exposedServices.push({
      port,
      name: `${frameworkInfo.type} App`,
      description: `Main ${frameworkInfo.type} application`
    });

    // Check for additional services (like API server)
    if (frameworkInfo.packageJson.scripts?.api || frameworkInfo.packageJson.scripts?.server) {
      const apiPort = port + 1000; // API on different port
      const apiProcess = spawn('npm', ['run', frameworkInfo.packageJson.scripts?.api ? 'api' : 'server'], {
        cwd: previewPath,
        env: { ...process.env, PORT: apiPort.toString() }
      });

      this.setupProcessHandlers(preview, apiProcess, apiPort, 'API Server');
      preview.ports.push(apiPort);
      preview.processes.set(apiPort, apiProcess);
      preview.healthChecks.set(apiPort, false);
      preview.exposedServices.push({
        port: apiPort,
        name: 'API Server',
        path: '/api',
        description: 'Backend API endpoints'
      });
    }
  }

  private async startNodeApplication(preview: PreviewInstance, frameworkInfo: any, previewPath: string, files: any[]) {
    const port = preview.primaryPort;
    preview.logs.push('Starting Node.js application...');
    
    // Install dependencies
    await this.runCommand('npm', ['install'], previewPath);
    
    let startCommand: string[] = [];
    if (frameworkInfo.packageJson.scripts?.start) {
      startCommand = ['npm', 'start'];
    } else if (frameworkInfo.packageJson.scripts?.dev) {
      startCommand = ['npm', 'run', 'dev'];
    } else {
      // Try to find main file
      const mainFile = frameworkInfo.packageJson.main || 'index.js';
      startCommand = ['node', mainFile];
    }

    const process = spawn(startCommand[0], startCommand.slice(1), {
      cwd: previewPath,
      env: { ...process.env, PORT: port.toString() }
    });

    this.setupProcessHandlers(preview, process, port, 'Node.js Server');
    
    preview.ports.push(port);
    preview.processes.set(port, process);
    preview.healthChecks.set(port, false);
    preview.exposedServices.push({
      port,
      name: 'Node.js Server',
      description: 'Node.js application server'
    });
  }

  private async startPythonApplication(preview: PreviewInstance, frameworkInfo: any, previewPath: string, files: any[]) {
    const port = preview.primaryPort;
    preview.logs.push('Starting Python application...');
    
    // Install requirements if available
    if (frameworkInfo.hasRequirements) {
      await this.runCommand('pip', ['install', '-r', 'requirements.txt'], previewPath);
    }
    
    // Try to find main Python file
    const mainFile = files.find(f => f.name === 'main.py' || f.name === 'app.py' || f.name === 'server.py');
    if (!mainFile) {
      throw new Error('No main Python file found (main.py, app.py, or server.py)');
    }

    const process = spawn('python', [mainFile.name], {
      cwd: previewPath,
      env: { ...process.env, PORT: port.toString() }
    });

    this.setupProcessHandlers(preview, process, port, 'Python Server');
    
    preview.ports.push(port);
    preview.processes.set(port, process);
    preview.healthChecks.set(port, false);
    preview.exposedServices.push({
      port,
      name: 'Python App',
      description: 'Python application server'
    });
  }

  private async startStaticServer(preview: PreviewInstance, previewPath: string) {
    const port = preview.primaryPort;
    preview.logs.push('Starting static file server...');
    
    const process = spawn('npx', ['http-server', '-p', port.toString(), '-a', 'localhost', '--cors'], {
      cwd: previewPath
    });

    this.setupProcessHandlers(preview, process, port, 'Static Server');
    
    preview.ports.push(port);
    preview.processes.set(port, process);
    preview.healthChecks.set(port, false);
    preview.exposedServices.push({
      port,
      name: 'Static Files',
      description: 'Static file server'
    });
  }

  private setupProcessHandlers(preview: PreviewInstance, process: any, port: number, serviceName: string) {
    process.stdout?.on('data', (data: Buffer) => {
      const log = data.toString();
      preview.logs.push(`[${serviceName}:${port}] ${log}`);
      logger.info(`Preview ${preview.projectId} ${serviceName}:${port}: ${log}`);
      previewEvents.emit('preview:log', { 
        projectId: preview.projectId, 
        runId: preview.runId,
        port,
        service: serviceName,
        log 
      });
    });
    
    process.stderr?.on('data', (data: Buffer) => {
      const log = data.toString();
      preview.logs.push(`[${serviceName}:${port}] ERROR: ${log}`);
      logger.error(`Preview ${preview.projectId} ${serviceName}:${port}: ${log}`);
      previewEvents.emit('preview:log', { 
        projectId: preview.projectId, 
        runId: preview.runId,
        port,
        service: serviceName,
        log 
      });
    });
    
    process.on('exit', (code: number) => {
      const message = `${serviceName} on port ${port} exited with code ${code}`;
      preview.logs.push(message);
      preview.healthChecks.set(port, false);
      
      if (code !== 0) {
        previewEvents.emit('preview:service-error', { 
          projectId: preview.projectId, 
          runId: preview.runId,
          port,
          service: serviceName,
          error: message 
        });
      }
    });
  }

  private startHealthChecks() {
    this.healthCheckInterval = setInterval(async () => {
      for (const [projectId, preview] of this.previews) {
        if (preview.status === 'running') {
          await this.performHealthChecks(preview);
        }
      }
    }, 30000); // Check every 30 seconds
  }

  private async performHealthChecks(preview: PreviewInstance) {
    for (const port of preview.ports) {
      const isHealthy = await this.checkPortHealth(port);
      preview.healthChecks.set(port, isHealthy);
      
      if (!isHealthy) {
        previewEvents.emit('preview:health-check-failed', {
          projectId: preview.projectId,
          runId: preview.runId,
          port,
          timestamp: new Date()
        });
      }
    }
    preview.lastHealthCheck = new Date();
  }

  private async checkPortHealth(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${port}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      return response.status < 500;
    } catch {
      return false;
    }
  }

  private async runCommand(command: string, args: string[], cwd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { cwd });
      proc.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Command failed with code ${code}`));
      });
    });
  }
}

export const previewService = new PreviewService();

// Register preview routes on the main Express server
export function setupPreviewRoutes(app: express.Application) {
  logger.info('Setting up preview routes on main server');
  previewService.registerRoutes(app);
}

// Cleanup on process exit
process.on('exit', () => {
  if (previewService.healthCheckInterval) {
    clearInterval(previewService.healthCheckInterval);
  }
});

process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});