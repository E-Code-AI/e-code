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

/**
 * SECURITY FIX: Whitelist of safe environment variables for preview processes
 * Only these variables will be passed to child processes to prevent API key exposure
 * IMPORTANT: Never include DATABASE_URL, API keys, or secrets in this list
 */
const SAFE_ENV_WHITELIST = [
  // System paths and shell
  'PATH',
  'HOME',
  'USER',
  'SHELL',
  'LANG',
  'LC_ALL',
  'TERM',
  'TMPDIR',
  'TMP',
  'TEMP',
  // Node.js configuration
  'NODE_ENV',
  'NODE_PATH',
  'NPM_CONFIG_PREFIX',
  'npm_config_prefix',
  'npm_config_cache',
  // Preview-specific (safe, non-secret)
  'REPLIT_DB_URL',  // Public Replit DB for user code (not our admin DB)
  'REPL_ID',
  'REPL_SLUG',
  'REPL_OWNER',
  // Python paths
  'PYTHONPATH',
  'PYTHONHOME',
  // Go paths
  'GOPATH',
  'GOROOT',
  // Rust paths
  'CARGO_HOME',
  'RUSTUP_HOME',
];

/**
 * Creates a safe environment object with only whitelisted variables
 * Prevents accidental exposure of API keys, database credentials, etc.
 */
function createSafeEnv(additionalVars: Record<string, string> = {}): Record<string, string> {
  const safeEnv: Record<string, string> = {};
  
  for (const key of SAFE_ENV_WHITELIST) {
    if (globalThis.process.env[key]) {
      safeEnv[key] = globalThis.process.env[key]!;
    }
  }
  
  // Preserve NODE_ENV from parent but default to development for previews
  safeEnv['NODE_ENV'] = globalThis.process.env['NODE_ENV'] || 'development';
  
  // Merge additional safe variables (PORT, VITE_PORT, etc.)
  return { ...safeEnv, ...additionalVars };
}

interface PreviewInstance {
  projectId: string;
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
  private previews: Map<string, PreviewInstance> = new Map();
  private basePort = 8000;
  public healthCheckInterval: NodeJS.Timeout | null = null;
  private allocatedPorts: Set<number> = new Set();

  constructor() {
    this.startHealthChecks();
  }

  private hashProjectId(projectId: string): number {
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      const char = projectId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 10000;
  }

  private allocatePort(projectId: string): number {
    // Start from hash to maintain some consistency
    const hash = this.hashProjectId(projectId);
    const originalPort = this.basePort + (hash % 10000);
    let port = originalPort;
    
    // Probe for next available port if collision
    while (this.allocatedPorts.has(port)) {
      port++;
      if (port >= this.basePort + 10000) {
        port = this.basePort; // Wrap around
      }
    }
    
    this.allocatedPorts.add(port);
    
    // Log port allocation
    if (port !== originalPort) {
      logger.warn(`Port ${originalPort} collision, using ${port} for project ${projectId}`);
    }
    logger.info(`Allocated port ${port} for project ${projectId}`);
    
    return port;
  }

  private ensurePreviewAuth(req: any, res: any, next: any) {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  }

  private async ensureProjectAccess(req: any, res: any, next: any) {
    try {
      const projectId = parseInt(req.params.projectId);
      if (isNaN(projectId)) {
        return res.status(400).json({ error: 'Invalid project ID' });
      }
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      if (project.ownerId !== req.user?.id) {
        const collaborators = await storage.getProjectCollaborators?.(String(projectId));
        const isCollaborator = collaborators?.some((c: any) => c.userId === req.user?.id);
        if (!isCollaborator) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Failed to verify project access' });
    }
  }

  registerRoutes(app: express.Application) {
    app.use('/preview/:projectId/:port/*', this.ensurePreviewAuth, this.ensureProjectAccess.bind(this), async (req, res, next) => {
      const projectId = req.params.projectId;
      const port = parseInt(req.params.port);
      const preview = this.previews.get(projectId);
      
      if (!preview || preview.status !== 'running') {
        return res.status(404).json({ error: 'Preview not available' });
      }
      
      if (!preview.ports.includes(port)) {
        return res.status(404).json({ error: `Port ${port} not exposed by this preview` });
      }
      
      if (!preview.healthChecks.get(port)) {
        return res.status(503).json({ error: `Service on port ${port} is not healthy` });
      }
      
      const proxy = createProxyMiddleware({
        target: `http://127.0.0.1:${port}`,
        changeOrigin: true,
        ws: true,
        pathRewrite: {
          [`^/preview/${projectId}/${port}`]: ''
        },
        on: {
          error: (err: any, _req: any, res: any) => {
            logger.error(`Preview proxy error for project ${projectId} port ${port}:`, err);
            if (res && typeof res.status === 'function') {
              res.status(502).json({ error: 'Preview server error' });
            }
          }
        }
      });
      
      proxy(req, res, next);
    });

    app.use('/preview/:projectId/*', this.ensurePreviewAuth, this.ensureProjectAccess.bind(this), async (req, res, next) => {
      const projectId = req.params.projectId;
      const preview = this.previews.get(projectId);
      
      if (!preview || preview.status !== 'running') {
        return res.status(404).json({ error: 'Preview not available' });
      }
      
      const proxy = createProxyMiddleware({
        target: `http://127.0.0.1:${preview.primaryPort}`,
        changeOrigin: true,
        ws: true,
        pathRewrite: {
          [`^/preview/${projectId}`]: ''
        },
        on: {
          error: (err: any, _req: any, res: any) => {
            logger.error(`Preview proxy error for project ${projectId}:`, err);
            if (res && typeof res.status === 'function') {
              res.status(502).json({ error: 'Preview server error' });
            }
          }
        }
      });
      
      proxy(req, res, next);
    });
  }

  async startPreview(projectId: string, options?: { port?: number; runId?: string }): Promise<PreviewInstance> {
    await this.stopPreview(projectId);
    
    const runtimePort = options?.port;
    const runId = options?.runId || `run-${projectId}-${Date.now()}`;

    if (!runtimePort) {
      logger.warn(`No runtime port provided for project ${projectId}, preview cannot proxy`);
      const errorPreview: PreviewInstance = {
        projectId,
        runId,
        ports: [],
        primaryPort: 0,
        processes: new Map(),
        url: '',
        status: 'error',
        logs: ['No runtime port available'],
        healthChecks: new Map(),
        lastHealthCheck: new Date(),
        exposedServices: []
      };
      this.previews.set(projectId, errorPreview);
      previewEvents.emit('preview:error', { projectId, runId, error: 'No runtime port available' });
      return errorPreview;
    }

    const preview: PreviewInstance = {
      projectId,
      runId,
      ports: [runtimePort],
      primaryPort: runtimePort,
      processes: new Map(),
      url: `/preview/${projectId}/`,
      status: 'starting',
      logs: [],
      healthChecks: new Map(),
      lastHealthCheck: new Date(),
      exposedServices: [{ port: runtimePort, name: 'runtime' }]
    };
    
    this.previews.set(projectId, preview);
    previewEvents.emit('preview:start', { projectId, runId, port: runtimePort });
    
    this.pollPortReady(projectId, runtimePort, preview);
    
    return preview;
  }

  private async pollPortReady(projectId: string, port: number, preview: PreviewInstance) {
    const maxAttempts = 30;
    const intervalMs = 1000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const current = this.previews.get(projectId);
      if (!current || current.runId !== preview.runId || current.status === 'stopped') {
        return;
      }

      const healthy = await this.checkPortHealth(port);
      if (healthy) {
        preview.status = 'running';
        preview.healthChecks.set(port, true);
        logger.info(`Port ${port} ready for project ${projectId} after ${attempt + 1} attempts`);
        previewEvents.emit('preview:ready', {
          projectId,
          runId: preview.runId,
          ports: preview.ports,
          primaryPort: preview.primaryPort,
          services: preview.exposedServices
        });
        return;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
    }

    preview.status = 'error';
    preview.logs.push(`Port ${port} did not become ready within ${maxAttempts}s`);
    logger.error(`Port ${port} readiness timeout for project ${projectId}`);
    previewEvents.emit('preview:error', {
      projectId,
      runId: preview.runId,
      error: `Port ${port} did not become ready`
    });
  }

  /**
   * Start a preview by reading project files from the database, writing them to
   * disk, detecting the framework, and spawning the appropriate server process.
   * This is the primary path used when the user opens a project — no port needed.
   */
  async startPreviewFromProject(projectId: string): Promise<PreviewInstance> {
    await this.stopPreview(projectId);

    const runId = `run-${projectId}-${Date.now()}`;

    // Get project files from the database
    let files: any[];
    try {
      files = await storage.getFilesByProject(projectId);
    } catch (err: any) {
      logger.error(`Failed to read files for project ${projectId}: ${err.message}`);
      const errInstance = this.makeErrorInstance(projectId, runId, `Failed to read project files: ${err.message}`);
      this.previews.set(projectId, errInstance);
      return errInstance;
    }

    if (!files || files.length === 0) {
      const errInstance = this.makeErrorInstance(projectId, runId, 'No files found in project');
      this.previews.set(projectId, errInstance);
      return errInstance;
    }

    // Write files to a temp directory
    const previewPath = path.join('/tmp', `preview-${projectId}`);
    try {
      await fs.rm(previewPath, { recursive: true, force: true });
      await fs.mkdir(previewPath, { recursive: true });

      for (const file of files) {
        if (file.isDirectory || file.isFolder) continue;
        const filePath = path.join(previewPath, file.path || file.name);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content || '', 'utf-8');
      }
    } catch (err: any) {
      logger.error(`Failed to write files for project ${projectId}: ${err.message}`);
      const errInstance = this.makeErrorInstance(projectId, runId, `Failed to prepare preview directory: ${err.message}`);
      this.previews.set(projectId, errInstance);
      return errInstance;
    }

    // Allocate a port and create the preview instance
    const port = this.allocatePort(projectId);

    const preview: PreviewInstance = {
      projectId,
      runId,
      ports: [],
      primaryPort: port,
      processes: new Map(),
      url: `/preview/${projectId}/`,
      status: 'starting',
      logs: [],
      healthChecks: new Map(),
      lastHealthCheck: new Date(),
      exposedServices: []
    };

    this.previews.set(projectId, preview);
    previewEvents.emit('preview:start', { projectId, runId, port });

    // Detect framework and start the right server — runs async so we return immediately
    this.bootPreviewServer(preview, files, previewPath, port).catch((err: any) => {
      logger.error(`Preview boot failed for project ${projectId}: ${err.message}`);
      preview.status = 'error';
      preview.logs.push(`ERROR: ${err.message}`);
      previewEvents.emit('preview:error', { projectId, runId, error: err.message });
    });

    return preview;
  }

  private makeErrorInstance(projectId: string, runId: string, error: string): PreviewInstance {
    const inst: PreviewInstance = {
      projectId, runId, ports: [], primaryPort: 0,
      processes: new Map(), url: '', status: 'error',
      logs: [error], healthChecks: new Map(), lastHealthCheck: new Date(), exposedServices: []
    };
    previewEvents.emit('preview:error', { projectId, runId, error });
    return inst;
  }

  private async bootPreviewServer(preview: PreviewInstance, files: any[], previewPath: string, port: number) {
    const projectId = preview.projectId;

    const frameworkInfo = await this.detectFramework(files, previewPath);
    preview.frameworkType = frameworkInfo.type as any;
    preview.logs.push(`Detected framework: ${frameworkInfo.type}`);

    if (frameworkInfo.type === 'static') {
      await this.startStaticServer(preview, previewPath);
    } else if (frameworkInfo.type === 'react' || frameworkInfo.type === 'vue' || frameworkInfo.type === 'angular') {
      await this.startModernFramework(preview, frameworkInfo, previewPath, files);
    } else if (frameworkInfo.type === 'node') {
      await this.startNodeApplication(preview, frameworkInfo, previewPath, files);
    } else if (frameworkInfo.type === 'python') {
      await this.startPythonApplication(preview, frameworkInfo, previewPath, files);
    } else {
      await this.startStaticServer(preview, previewPath);
    }

    // Poll until the primary port is accepting connections
    this.pollPortReady(projectId, port, preview);
  }

  async stopPreview(projectId: string): Promise<void> {
    const preview = this.previews.get(projectId);
    if (preview) {
      preview.status = 'stopped';
      logger.info(`Preview stopped for project ${projectId}`);
      previewEvents.emit('preview:stop', { projectId, runId: preview.runId });
    }
    this.previews.delete(projectId);
  }

  getPreview(projectId: string): PreviewInstance | undefined {
    return this.previews.get(projectId);
  }

  getPreviewUrl(projectId: string, port?: number): string {
    const preview = this.previews.get(projectId);
    if (!preview) return '';
    
    if (port && preview.ports.includes(port)) {
      return `/preview/${projectId}/${port}/`;
    }
    return preview.url || '';
  }

  getPreviewPorts(projectId: string): number[] {
    const preview = this.previews.get(projectId);
    return preview?.ports || [];
  }

  getPreviewServices(projectId: string) {
    const preview = this.previews.get(projectId);
    return preview?.exposedServices || [];
  }

  async switchPort(projectId: string, port: number): Promise<boolean> {
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
    
    // Install dependencies — use --ignore-scripts to prevent native postinstall failures (bcrypt, prisma, etc.)
    try {
      await this.runCommand('npm', ['install', '--ignore-scripts'], previewPath);
    } catch (installErr: any) {
      preview.logs.push(`[WARN] npm install had warnings: ${installErr.message} — continuing anyway`);
    }
    
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

    const childProcess = spawn(startCommand[0], startCommand.slice(1), {
      cwd: previewPath,
      env: createSafeEnv({ 
        PORT: port.toString(),
        VITE_PORT: port.toString(),
        DEV_SERVER_PORT: port.toString()
      })
    });

    this.setupProcessHandlers(preview, childProcess, port, `${frameworkInfo.type} dev server`);
    
    preview.ports.push(port);
    preview.processes.set(port, childProcess);
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
        env: createSafeEnv({ PORT: apiPort.toString() })
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
    
    // Install dependencies — use --ignore-scripts to prevent native postinstall failures
    try {
      await this.runCommand('npm', ['install', '--ignore-scripts'], previewPath);
    } catch (installErr: any) {
      preview.logs.push(`[WARN] npm install had warnings: ${installErr.message} — continuing anyway`);
    }
    
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

    const nodeProcess = spawn(startCommand[0], startCommand.slice(1), {
      cwd: previewPath,
      env: createSafeEnv({ PORT: port.toString() })
    });

    this.setupProcessHandlers(preview, nodeProcess, port, 'Node.js Server');
    
    preview.ports.push(port);
    preview.processes.set(port, nodeProcess);
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

    const pythonProcess = spawn('python', [mainFile.name], {
      cwd: previewPath,
      env: createSafeEnv({ PORT: port.toString() })
    });

    this.setupProcessHandlers(preview, pythonProcess, port, 'Python Server');
    
    preview.ports.push(port);
    preview.processes.set(port, pythonProcess);
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

    // Use a self-contained Node.js inline script so we don't need npx or any packages
    const serverScript = `
const http = require('http');
const fs = require('fs');
const path = require('path');
const root = ${JSON.stringify(previewPath)};
const mimeMap = {
  '.html':'text/html','.css':'text/css','.js':'application/javascript',
  '.json':'application/json','.png':'image/png','.jpg':'image/jpeg',
  '.jpeg':'image/jpeg','.gif':'image/gif','.svg':'image/svg+xml',
  '.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2',
  '.ttf':'font/ttf','.ts':'text/plain','.tsx':'text/plain','.jsx':'text/plain'
};
http.createServer((req, res) => {
  const safePath = path.normalize(req.url.split('?')[0]);
  let target = path.join(root, safePath);
  let stat;
  try { stat = fs.statSync(target); } catch {}
  if (!stat || stat.isDirectory()) { target = path.join(root, 'index.html'); }
  fs.readFile(target, (err, data) => {
    if (err) { res.writeHead(404,'Not Found',{'Content-Type':'text/plain'}); return res.end('404'); }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  });
}).listen(${port}, '127.0.0.1', () => { process.stdout.write('Static server ready on port ${port}\\n'); });
`;

    const staticProcess = spawn('node', ['-e', serverScript], {
      cwd: previewPath,
      env: createSafeEnv()
    });

    this.setupProcessHandlers(preview, staticProcess, port, 'Static Server');
    
    preview.ports.push(port);
    preview.processes.set(port, staticProcess);
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
      const wasHealthy = preview.healthChecks.get(port) ?? true;
      preview.healthChecks.set(port, isHealthy);
      
      if (!isHealthy && wasHealthy && port === preview.primaryPort) {
        preview.status = 'error';
        logger.warn(`Primary port ${port} became unhealthy for project ${preview.projectId}`);
        previewEvents.emit('preview:error', {
          projectId: preview.projectId,
          runId: preview.runId,
          error: `Runtime on port ${port} is no longer responding`
        });
      } else if (!isHealthy) {
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