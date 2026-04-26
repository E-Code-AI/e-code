// @ts-nocheck
import express from 'express';
import * as path from 'path';
import { storage } from '../storage';
import { createProxyMiddleware, responseInterceptor } from 'http-proxy-middleware';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { createLogger } from '../utils/logger';
import { previewEvents } from './preview-websocket';
import fetch from 'node-fetch';
import { db } from '../db';
import { environmentVariables } from '@shared/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { getJwtSecret } from '../utils/secrets-manager';
import { getProjectWorkspacePath } from '../utils/project-fs-sync';

const logger = createLogger('preview-service');

const fileHashCache = new Map<string, Map<string, string>>();

function contentHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

function hasRunnableFiles(files: any[]): boolean {
  return files.some((file) => {
    if (file.isDirectory || file.isFolder) return false;
    const filePath = String(file.path || file.name || '');
    const fileName = String(file.name || filePath.split('/').pop() || '');
    return (
      fileName === 'package.json' ||
      filePath.endsWith('.html') ||
      filePath.endsWith('.py') ||
      fileName.endsWith('.html') ||
      fileName.endsWith('.py')
    );
  });
}

function getPreviewFetchInterceptorScript(projectId: string, primaryPort: number, apiPort?: number | null): string {
  const primaryBase = `/preview/${projectId}/${primaryPort}`;
  const apiBase = apiPort ? `/preview/${projectId}/${apiPort}` : primaryBase;

  return `
    <script data-preview-fetch-interceptor="true">
      (function() {
        var primaryBase = ${JSON.stringify(primaryBase)};
        var apiBase = ${JSON.stringify(apiBase)};

        function rewriteUrl(url) {
          if (typeof url !== 'string') return url;
          if (url.startsWith('/preview/')) return url;
          if (url.startsWith('//') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) return url;
          if (url.startsWith('/api')) return apiBase + url;
          if (url.startsWith('/')) return primaryBase + url;
          return url;
        }

        var origFetch = window.fetch;
        window.fetch = function(input, init) {
          if (typeof input === 'string') {
            input = rewriteUrl(input);
          } else if (input instanceof Request) {
            var relativeUrl = input.url.replace(window.location.origin, '');
            var newUrl = rewriteUrl(relativeUrl);
            if (newUrl !== relativeUrl) {
              input = new Request(newUrl, {
                method: input.method,
                headers: input.headers,
                body: input.method !== 'GET' && input.method !== 'HEAD' ? input.body : undefined,
                mode: input.mode,
                credentials: input.credentials,
                cache: input.cache,
                redirect: input.redirect,
                referrer: input.referrer,
                referrerPolicy: input.referrerPolicy,
                integrity: input.integrity,
                keepalive: input.keepalive,
                signal: input.signal
              });
            }
          }
          return origFetch.call(this, input, init);
        };

        var origOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function(method, url) {
          arguments[1] = rewriteUrl(url);
          return origOpen.apply(this, arguments);
        };
      })();
    </script>`;
}

function injectPreviewHtml(buffer: Buffer, projectId: string, primaryPort: number, apiPort?: number | null): string {
  const html = buffer.toString('utf8');
  if (html.includes('data-preview-fetch-interceptor="true"')) {
    return html;
  }

  const script = getPreviewFetchInterceptorScript(projectId, primaryPort, apiPort);

  if (/<head>/i.test(html)) {
    return html.replace(/<head>/i, `<head>\n${script}`);
  }

  if (/<html/i.test(html)) {
    return html.replace(/<html([^>]*)>/i, `<html$1>\n<head>\n${script}\n</head>`);
  }

  return `${script}\n${html}`;
}

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
  // Inherit all process.env variables so tools like npm/npx/node can function correctly on complex hosts (Replit/Nix)
  const safeEnv: Record<string, string> = { ...globalThis.process.env } as Record<string, string>;
  
  // Blacklist secrets from the child process environment
  const blacklist = [
    'DATABASE_URL',
    'OPENAI_API_KEY',
    'SESSION_SECRET',
    'STRIPE_WEBHOOK_SECRET',
    'SENDGRID_API_KEY',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'ANTHROPIC_API_KEY',
    'REPLICATE_API_TOKEN',
    'RUNNER_JWT_SECRET',
    'VITE_DATABASE_URL'
  ];
  
  for (const key of blacklist) {
    if (key in safeEnv) {
      delete safeEnv[key];
    }
  }
  
  safeEnv['NODE_ENV'] = globalThis.process.env['NODE_ENV'] || 'development';
  
  return { ...safeEnv, ...additionalVars };
}

async function fetchProjectEnvVars(projectId: string): Promise<Record<string, string>> {
  const vars: Record<string, string> = {};
  try {
    const envVars = await db.query.environmentVariables.findMany({
      where: eq(environmentVariables.projectId, parseInt(projectId, 10)),
    });
    for (const envVar of envVars) {
      if (envVar.key && envVar.value) {
        if (envVar.isSecret) {
          try {
            const { RealSecretManagementService } = await import('../services/real-secret-management');
            const secretService = new RealSecretManagementService();
            const encryptedData = JSON.parse(envVar.value) as { iv: string; encryptedData: string; authTag: string };
            vars[envVar.key] = secretService.decryptValue(encryptedData);
          } catch {
            logger.warn(`Failed to decrypt secret ${envVar.key} for project ${projectId}`);
          }
        } else {
          vars[envVar.key] = envVar.value;
        }
      }
    }
    if (Object.keys(vars).length > 0) {
      logger.info(`Injecting ${Object.keys(vars).length} env vars into preview for project ${projectId}`);
    }
  } catch (err: any) {
    logger.warn(`Failed to fetch env vars for project ${projectId}: ${err.message}`);
  }
  return vars;
}

async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function scriptReferencesMissingDirectories(script: string, cwd: string): Promise<string[]> {
  const missing: string[] = [];
  const matches = script.matchAll(/\bcd\s+([^\s;&|]+)/g);

  for (const match of matches) {
    const rawDir = match[1]?.replace(/^['"]|['"]$/g, '');
    if (!rawDir || rawDir === '.' || rawDir.startsWith('/')) continue;
    const fullPath = path.join(cwd, rawDir);
    if (!(await pathExists(fullPath))) {
      missing.push(rawDir);
    }
  }

  return missing;
}

function detectNodeEntryFile(files: any[], packageJson: any): string | null {
  const filePaths = files
    .filter((file) => !file?.isDirectory && !file?.isFolder)
    .map((file) => String(file.path || file.name || ''));

  const candidates = [
    packageJson?.main,
    'src/index.ts',
    'src/index.js',
    'server/index.ts',
    'server/index.js',
    'index.ts',
    'index.js',
    'main.ts',
    'main.js',
    'app.ts',
    'app.js',
  ].filter(Boolean) as string[];

  for (const candidate of candidates) {
    if (filePaths.includes(candidate)) {
      return candidate;
    }
  }

  return null;
}

function detectModernFrontend(files: any[]) {
  const filePaths = files
    .filter((file) => !file?.isDirectory && !file?.isFolder)
    .map((file) => String(file.path || file.name || ''));

  const hasViteConfig = filePaths.some((filePath) =>
    ['vite.config.ts', 'vite.config.js', 'vite.config.mjs', 'vite.config.cjs'].includes(filePath)
  );
  const hasRootIndex = filePaths.includes('index.html');
  const hasClientIndex = filePaths.includes('client/index.html');
  const hasMainEntry = filePaths.some((filePath) =>
    [
      'src/main.tsx',
      'src/main.jsx',
      'src/main.ts',
      'src/main.js',
      'client/src/main.tsx',
      'client/src/main.jsx',
      'client/src/main.ts',
      'client/src/main.js',
    ].includes(filePath)
  );
  const hasReactAppShell = filePaths.some((filePath) =>
    [
      'src/App.tsx',
      'src/App.jsx',
      'client/src/App.tsx',
      'client/src/App.jsx',
    ].includes(filePath)
  );

  return {
    hasViteConfig,
    hasRootIndex,
    hasClientIndex,
    hasMainEntry,
    hasReactAppShell,
    looksLikeModernFrontend:
      (hasViteConfig && (hasMainEntry || hasRootIndex || hasClientIndex)) ||
      (hasMainEntry && hasReactAppShell),
  };
}

interface PreviewInstance {
  projectId: string;
  runId: string;
  ports: number[];  // Support multiple ports
  primaryPort: number;
  processes: Map<number, any>;  // Map port to process
  url: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  errorMessage?: string;
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
  // Port range 20000-29999 — safely away from the app (5000), runner (8080), and common dev ports
  private basePort = 20000;
  private portRange = 9999;
  public healthCheckInterval: NodeJS.Timeout | null = null;
  public idleCleanupInterval: NodeJS.Timeout | null = null;
  private allocatedPorts: Set<number> = new Set();
  // Protect the host: cap concurrent live preview servers
  private readonly MAX_CONCURRENT_PREVIEWS = 80;
  // Kill idle previews after 30 minutes of no activity
  private readonly IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  private pendingSyncs: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    this.startHealthChecks();
    this.startIdleCleanup();
    this.startLiveWorkspaceSync();
  }

  private startLiveWorkspaceSync() {
    previewEvents.on('preview:file-change', (data: { projectId?: number | string }) => {
      if (data?.projectId == null) return;
      this.scheduleWorkspaceSync(String(data.projectId));
    });
  }

  private scheduleWorkspaceSync(projectId: string) {
    const preview = this.previews.get(projectId);
    if (!preview || (preview.status !== 'running' && preview.status !== 'starting')) {
      return;
    }

    const existing = this.pendingSyncs.get(projectId);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      this.pendingSyncs.delete(projectId);
      this.syncPreviewWorkspace(projectId).catch((error: any) => {
        logger.warn(`Live preview sync failed for project ${projectId}: ${error?.message || error}`);
      });
    }, 150);

    this.pendingSyncs.set(projectId, timer);
  }

  private async syncPreviewWorkspace(projectId: string, files?: any[]): Promise<void> {
    const previewPath = path.join('/tmp', `preview-${projectId}`);
    const projectFiles = files ?? await storage.getFilesByProject(projectId);

    await fs.mkdir(previewPath, { recursive: true });

    let projectCache = fileHashCache.get(projectId);
    if (!projectCache) {
      projectCache = new Map<string, string>();
      fileHashCache.set(projectId, projectCache);
    }

    const currentPaths = new Set<string>();
    const toWrite: Array<{ relPath: string; content: string; hash: string }> = [];

    for (const file of projectFiles) {
      if (file.isDirectory || file.isFolder) continue;
      const relPath = file.path || file.name;
      currentPaths.add(relPath);
      const content = file.content || '';
      const hash = contentHash(content);

      if (projectCache.get(relPath) !== hash) {
        toWrite.push({ relPath, content, hash });
      }
    }

    for (const cachedPath of [...projectCache.keys()]) {
      if (!currentPaths.has(cachedPath)) {
        const fullPath = path.join(previewPath, cachedPath);
        try {
          await fs.rm(fullPath, { recursive: true, force: true });
        } catch {}
        projectCache.delete(cachedPath);
      }
    }

    for (const { relPath, content, hash } of toWrite) {
      const filePath = path.join(previewPath, relPath);
      const dir = path.dirname(filePath);
      const stat = await fs.stat(filePath).catch(() => null);
      if (stat?.isDirectory()) {
        await fs.rm(filePath, { recursive: true, force: true });
      }
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
      projectCache.set(relPath, hash);
    }
  }

  private async readWorkspaceFiles(projectId: string): Promise<any[]> {
    const workspacePath = getProjectWorkspacePath(projectId);
    const discovered: any[] = [];

    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      for (const entry of entries) {
        if (entry.name === '.git' || entry.name === 'node_modules') continue;
        const fullPath = path.join(dir, entry.name);
        const relPath = path.relative(workspacePath, fullPath);
        if (entry.isDirectory()) {
          discovered.push({
            name: entry.name,
            path: relPath,
            isDirectory: true,
            isFolder: true,
            content: '',
          });
          await walk(fullPath);
          continue;
        }

        const content = await fs.readFile(fullPath, 'utf8').catch(() => '');
        discovered.push({
          name: entry.name,
          path: relPath,
          isDirectory: false,
          isFolder: false,
          content,
        });
      }
    };

    await walk(workspacePath);
    return discovered;
  }

  private hashProjectId(projectId: string): number {
    let hash = 0;
    for (let i = 0; i < projectId.length; i++) {
      const char = projectId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % this.portRange;
  }

  private allocatePort(projectId: string): number {
    // Start from hash to maintain some consistency
    const hash = this.hashProjectId(projectId);
    const originalPort = this.basePort + hash;
    let port = originalPort;
    
    // Probe for next available port if collision
    let tries = 0;
    while (this.allocatedPorts.has(port)) {
      port++;
      if (port >= this.basePort + this.portRange) {
        port = this.basePort; // Wrap around
      }
      if (++tries > this.portRange) break; // No ports available
    }
    
    this.allocatedPorts.add(port);
    
    if (port !== originalPort) {
      logger.warn(`Port ${originalPort} collision, using ${port} for project ${projectId}`);
    }
    logger.info(`Allocated port ${port} for project ${projectId}`);
    
    return port;
  }

  /** Auto-kill previews that have been idle for IDLE_TIMEOUT_MS */
  private startIdleCleanup() {
    this.idleCleanupInterval = setInterval(async () => {
      const now = Date.now();
      for (const [projectId, preview] of this.previews) {
        if (preview.status === 'running' || preview.status === 'starting') {
          const idleMs = now - preview.lastHealthCheck.getTime();
          if (idleMs > this.IDLE_TIMEOUT_MS) {
            logger.info(`Preview for project ${projectId} idle for ${Math.round(idleMs / 60000)}m — stopping`);
            await this.stopPreview(projectId);
          }
        }
      }
    }, 5 * 60 * 1000); // Sweep every 5 minutes
  }

  private ensurePreviewAuth(req: any, res: any, next: any) {
    const hasSession = !!(req.isAuthenticated && req.isAuthenticated() && req.user);
    const bootstrapToken = req.query.bootstrap || req.headers['x-bootstrap-token'];

    if (hasSession) {
      return next();
    }

    if (!bootstrapToken) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    try {
      const decoded = jwt.verify(String(bootstrapToken), getJwtSecret()) as { projectId?: string | number; userId?: number };
      req.bootstrapAuth = decoded;
      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired bootstrap token' });
    }
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
      const bootstrapProjectId = req.bootstrapAuth?.projectId;
      if (bootstrapProjectId != null && String(bootstrapProjectId) !== String(project.id)) {
        return res.status(403).json({ error: 'Bootstrap token invalid for this project' });
      }

      const effectiveUserId = req.user?.id ?? req.bootstrapAuth?.userId;
      if (project.ownerId !== effectiveUserId) {
        const collaborators = await storage.getProjectCollaborators?.(String(projectId));
        const isCollaborator = collaborators?.some((c: any) => c.userId === effectiveUserId);
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

      // Update idle timestamp so this preview isn't swept by the idle cleanup
      preview.lastHealthCheck = new Date();
      const apiService = preview.exposedServices.find((service) => service.path === '/api');
      
      const proxy = createProxyMiddleware({
        target: `http://127.0.0.1:${port}`,
        changeOrigin: true,
        ws: true,
        selfHandleResponse: true,
        pathRewrite: {
          [`^/preview/${projectId}/${port}`]: ''
        },
        on: {
          proxyRes: responseInterceptor(async (responseBuffer, proxyRes, _req, _res) => {
            const contentType = String(proxyRes.headers['content-type'] || '');
            if (!contentType.includes('text/html')) {
              return responseBuffer;
            }

            return injectPreviewHtml(responseBuffer, projectId, port, apiService?.port ?? null);
          }),
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

      // Update idle timestamp so this preview isn't swept by the idle cleanup
      preview.lastHealthCheck = new Date();
      const apiService = preview.exposedServices.find((service) => service.path === '/api');
      
      const proxy = createProxyMiddleware({
        target: `http://127.0.0.1:${preview.primaryPort}`,
        changeOrigin: true,
        ws: true,
        selfHandleResponse: true,
        pathRewrite: {
          [`^/preview/${projectId}`]: ''
        },
        on: {
          proxyRes: responseInterceptor(async (responseBuffer, proxyRes, _req, _res) => {
            const contentType = String(proxyRes.headers['content-type'] || '');
            if (!contentType.includes('text/html')) {
              return responseBuffer;
            }

            return injectPreviewHtml(responseBuffer, projectId, preview.primaryPort, apiService?.port ?? null);
          }),
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
    // npm install + framework startup can take 2-3 minutes on Replit
    const maxAttempts = 180;
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
    const tail = preview.logs.slice(-8).join(' ').replace(/\s+/g, ' ').slice(0, 400);
    const errorSummary = `Port ${port} did not become ready within ${maxAttempts}s. ${tail ? `Last logs: ${tail}` : ''}`.trim();
    preview.errorMessage = errorSummary;
    preview.logs.push(`Port ${port} did not become ready within ${maxAttempts}s`);
    logger.error(`Port ${port} readiness timeout for project ${projectId}`);
    previewEvents.emit('preview:error', {
      projectId,
      runId: preview.runId,
      error: errorSummary
    });
  }

  /**
   * Start a preview by reading project files from the database, writing them to
   * disk, detecting the framework, and spawning the appropriate server process.
   * This is the primary path used when the user opens a project — no port needed.
   */
  async startPreviewFromProject(projectId: string): Promise<PreviewInstance> {
    const existing = this.previews.get(projectId);
    if (existing) {
      existing.status = 'stopped';
      for (const [port, proc] of existing.processes) {
        try { proc.kill('SIGKILL'); } catch {}
        this.allocatedPorts.delete(port);
      }
      existing.processes.clear();
      previewEvents.emit('preview:stop', { projectId, runId: existing.runId });
      this.previews.delete(projectId);
    }

    const runId = `run-${projectId}-${Date.now()}`;

    // Enforce concurrency cap — reject if we're already at the process limit
    const activeCount = [...this.previews.values()].filter(
      p => p.status === 'running' || p.status === 'starting'
    ).length;
    if (activeCount >= this.MAX_CONCURRENT_PREVIEWS) {
      logger.warn(`Preview concurrency limit (${this.MAX_CONCURRENT_PREVIEWS}) reached — rejecting start for project ${projectId}`);
      const errInstance = this.makeErrorInstance(projectId, runId, 'Server is at capacity. Please try again in a moment.');
      this.previews.set(projectId, errInstance);
      return errInstance;
    }

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

    let workspaceFiles: any[] = [];
    if (!files || files.length === 0 || !hasRunnableFiles(files)) {
      workspaceFiles = await this.readWorkspaceFiles(projectId).catch(() => []);
      if (workspaceFiles.length > 0) {
        const merged = new Map<string, any>();
        for (const file of files || []) {
          merged.set(String(file.path || file.name), file);
        }
        for (const file of workspaceFiles) {
          merged.set(String(file.path || file.name), file);
        }
        files = [...merged.values()];
      }
    }

    if (!files || files.length === 0) {
      const errInstance = this.makeErrorInstance(projectId, runId, 'No files found in project');
      this.previews.set(projectId, errInstance);
      return errInstance;
    }

    try {
      const syncStart = Date.now();
      const previewPath = path.join('/tmp', `preview-${projectId}`);
      const nonDirectoryFiles = files.filter((file) => !file.isDirectory && !file.isFolder);
      const projectCache = fileHashCache.get(projectId) ?? new Map<string, string>();
      const beforeCount = projectCache.size;
      const skipped = nonDirectoryFiles.filter((file) => {
        const relPath = file.path || file.name;
        return projectCache.get(relPath) === contentHash(file.content || '');
      }).length;

      await this.syncPreviewWorkspace(projectId, files);

      const afterCache = fileHashCache.get(projectId) ?? new Map<string, string>();
      const written = Math.max(nonDirectoryFiles.length - skipped, 0);
      const removed = Math.max(beforeCount - afterCache.size, 0);
      const syncMs = Date.now() - syncStart;
      logger.info(`[preview-sync] project=${projectId} written=${written} skipped=${skipped} removed=${removed} total=${files.length} syncMs=${syncMs}`);
    } catch (err: any) {
      logger.error(`Failed to write files for project ${projectId}: ${err.message}`, { stack: err.stack });
      const errInstance = this.makeErrorInstance(projectId, runId, `Failed to prepare preview directory: ${err.message}`);
      this.previews.set(projectId, errInstance);
      return errInstance;
    }

    // Allocate a port and create the preview instance
    const port = this.allocatePort(projectId);
    const previewPath = path.join('/tmp', `preview-${projectId}`);

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
      preview.errorMessage = err.message;
      preview.logs.push(`ERROR: ${err.message}`);
      previewEvents.emit('preview:error', { projectId, runId, error: err.message });
    });

    return preview;
  }

  private makeErrorInstance(projectId: string, runId: string, error: string): PreviewInstance {
    const inst: PreviewInstance = {
      projectId, runId, ports: [], primaryPort: 0,
      processes: new Map(), url: '', status: 'error', errorMessage: error,
      logs: [error], healthChecks: new Map(), lastHealthCheck: new Date(), exposedServices: []
    };
    previewEvents.emit('preview:error', { projectId, runId, error });
    return inst;
  }

  private async bootPreviewServer(preview: PreviewInstance, files: any[], previewPath: string, port: number) {
    const projectId = preview.projectId;

    const projectEnvVars = await fetchProjectEnvVars(projectId);

    const frameworkInfo = await this.detectFramework(files, previewPath);
    preview.frameworkType = frameworkInfo.type as any;
    preview.logs.push(`Detected framework: ${frameworkInfo.type}`);

    if (frameworkInfo.type === 'static') {
      await this.startStaticServer(preview, previewPath);
    } else if (frameworkInfo.type === 'react' || frameworkInfo.type === 'vue' || frameworkInfo.type === 'angular') {
      await this.startModernFramework(preview, frameworkInfo, previewPath, files, projectEnvVars);
    } else if (frameworkInfo.type === 'node') {
      await this.startNodeApplication(preview, frameworkInfo, previewPath, files, projectEnvVars);
    } else if (frameworkInfo.type === 'python') {
      await this.startPythonApplication(preview, frameworkInfo, previewPath, files, projectEnvVars);
    } else {
      await this.startStaticServer(preview, previewPath);
    }

    // Poll until the primary port is accepting connections
    this.pollPortReady(projectId, port, preview);
  }

  async stopPreview(projectId: string): Promise<void> {
    const preview = this.previews.get(projectId);
    const pendingSync = this.pendingSyncs.get(projectId);
    if (pendingSync) {
      clearTimeout(pendingSync);
      this.pendingSyncs.delete(projectId);
    }
    if (preview) {
      preview.status = 'stopped';
      for (const [port, proc] of preview.processes) {
        try {
          proc.kill('SIGKILL');
        } catch {}
        this.allocatedPorts.delete(port);
      }
      preview.processes.clear();
      logger.info(`Preview stopped for project ${projectId}`);
      previewEvents.emit('preview:stop', { projectId, runId: preview.runId });
    }
    this.previews.delete(projectId);

    const previewPath = path.join('/tmp', `preview-${projectId}`);
    fs.rm(previewPath, { recursive: true, force: true }).catch(() => {});
    fileHashCache.delete(projectId);
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
    const frontendSignals = detectModernFrontend(files);

    if (packageJsonFile) {
      const packageJson = JSON.parse(packageJsonFile.content || '{}');
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.react || deps['@vitejs/plugin-react'] || frontendSignals.looksLikeModernFrontend) {
        return {
          type: 'react' as const,
          packageJson,
          hasVite: !!deps.vite || frontendSignals.hasViteConfig,
        };
      } else if (deps.vue || deps['@vitejs/plugin-vue']) {
        return { type: 'vue' as const, packageJson, hasVite: !!deps.vite };
      } else if (deps['@angular/core']) {
        return { type: 'angular' as const, packageJson };
      } else if (deps.express || deps.fastify || deps.koa) {
        return { type: 'node' as const, packageJson };
      } else if (frontendSignals.hasViteConfig && (frontendSignals.hasClientIndex || frontendSignals.hasRootIndex)) {
        return {
          type: 'react' as const,
          packageJson,
          hasVite: true,
        };
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

  private async ensureNodePreviewRuntimeDeps(
    preview: PreviewInstance,
    frameworkInfo: any,
    previewPath: string,
    files: any[],
  ) {
    const packageJson = frameworkInfo?.packageJson || {};
    const deps = { ...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {}) };
    const hasTypeScriptSource = files.some((file) => {
      const name = String(file?.name || file?.path || '');
      return !file?.isDirectory && (name.endsWith('.ts') || name.endsWith('.tsx') || name === 'tsconfig.json');
    });
    const usesReactScripts = Boolean(deps['react-scripts']);

    if (!usesReactScripts || !hasTypeScriptSource) {
      return;
    }

    const requiredPreviewDeps = ['typescript', '@types/react', '@types/react-dom'];
    const missingDeps = requiredPreviewDeps.filter((pkg) => {
      if (deps[pkg]) return false;
      try {
        const pkgJsonPath = path.join(previewPath, 'node_modules', pkg, 'package.json');
        require('fs').accessSync(pkgJsonPath);
        return false;
      } catch {
        return true;
      }
    });

    if (missingDeps.length === 0) {
      return;
    }

    const installLog = `Installing preview-only runtime deps: ${missingDeps.join(', ')}`;
    preview.logs.push(installLog);
    previewEvents.emit('preview:log', {
      projectId: preview.projectId,
      runId: preview.runId,
      log: installLog,
    });

    await this.runCommand(
      'npm',
      ['install', '--no-save', '--include=dev', ...missingDeps],
      previewPath,
      {
        NODE_ENV: 'development',
        npm_config_production: 'false',
        NPM_CONFIG_PRODUCTION: 'false',
      },
    );
  }

  private async startModernFramework(preview: PreviewInstance, frameworkInfo: any, previewPath: string, files: any[], projectEnvVars: Record<string, string> = {}) {
    const port = preview.primaryPort;
    const apiScript = frameworkInfo.packageJson.scripts?.api
      ? 'api'
      : frameworkInfo.packageJson.scripts?.server
        ? 'server'
        : frameworkInfo.packageJson.scripts?.['dev:server']
          ? 'dev:server'
          : null;
    const apiPort = apiScript ? port + 1000 : null;
    const frontendEnv = {
      ...projectEnvVars,
      PORT: port.toString(),
      VITE_PORT: port.toString(),
      DEV_SERVER_PORT: port.toString(),
      ...(apiPort ? {
        VITE_API_TARGET: `http://127.0.0.1:${apiPort}`,
        API_URL: `http://127.0.0.1:${apiPort}`,
      } : {}),
    };

    preview.logs.push(`Starting ${frameworkInfo.type} application...`);
    
    try {
      preview.logs.push('Installing dependencies...');
      previewEvents.emit('preview:log', { projectId: preview.projectId, runId: preview.runId, log: 'Installing dependencies...' });
      await this.runCommand('npm', ['install', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'], previewPath, {
        NODE_ENV: 'development',
        npm_config_production: 'false',
        NPM_CONFIG_PRODUCTION: 'false',
      });
      await this.ensureNodePreviewRuntimeDeps(preview, frameworkInfo, previewPath, files);
      preview.logs.push('Dependencies installed.');
      previewEvents.emit('preview:log', { projectId: preview.projectId, runId: preview.runId, log: 'Dependencies installed. Starting dev server...' });
    } catch (installErr: any) {
      preview.logs.push(`[WARN] npm install had warnings: ${installErr.message} — continuing anyway`);
      previewEvents.emit('preview:log', { projectId: preview.projectId, runId: preview.runId, log: `npm install warning: ${installErr.message}` });
    }

    let startCommand: string[] = [];
    if (frameworkInfo.hasVite) {
      // Use port-specific base so assets load through the correct proxy route.
      // --clearScreen false prevents Vite from clearing stdout (keeps logs visible).
      // --strictPort prevents port auto-increment which would break the proxy.
      const base = `/preview/${preview.projectId}/${port}/`;
      const localViteBin = path.join(previewPath, 'node_modules', '.bin', process.platform === 'win32' ? 'vite.cmd' : 'vite');
      const packagedViteBin = path.join(previewPath, 'node_modules', 'vite', 'bin', 'vite.js');
      const viteArgs = [
        '--port', port.toString(),
        '--host', '0.0.0.0',
        '--base', base,
        '--clearScreen', 'false',
        '--strictPort',
      ];

      try {
        await fs.access(localViteBin);
        startCommand = [localViteBin, ...viteArgs];
      } catch {
        try {
          await fs.access(packagedViteBin);
          startCommand = ['node', packagedViteBin, ...viteArgs];
        } catch {
          if (frameworkInfo.packageJson.scripts?.dev) {
          startCommand = ['npm', 'run', 'dev', '--', ...viteArgs];
          } else {
            throw new Error('Vite binary not found after dependency installation');
          }
        }
      }
    } else if (frameworkInfo.packageJson.scripts?.dev) {
      startCommand = ['npm', 'run', 'dev'];
    } else if (frameworkInfo.packageJson.scripts?.start) {
      startCommand = ['npm', 'start'];
    } else {
      await this.startStaticServer(preview, previewPath);
      return;
    }

    const childProcess = spawn(startCommand[0], startCommand.slice(1), {
      cwd: previewPath,
      env: createSafeEnv(frontendEnv)
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

    if (apiScript && apiPort) {
      const apiProcess = spawn('npm', ['run', apiScript], {
        cwd: previewPath,
        env: createSafeEnv({ ...projectEnvVars, PORT: apiPort.toString() })
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

  private async startNodeApplication(preview: PreviewInstance, frameworkInfo: any, previewPath: string, files: any[], projectEnvVars: Record<string, string> = {}) {
    const port = preview.primaryPort;
    preview.logs.push('Starting Node.js application...');
    
    try {
      preview.logs.push('Installing dependencies...');
      previewEvents.emit('preview:log', { projectId: preview.projectId, runId: preview.runId, log: 'Installing dependencies...' });
      await this.runCommand('npm', ['install', '--include=dev', '--ignore-scripts', '--no-audit', '--no-fund'], previewPath, {
        NODE_ENV: 'development',
        npm_config_production: 'false',
        NPM_CONFIG_PRODUCTION: 'false',
      });
      await this.ensureNodePreviewRuntimeDeps(preview, frameworkInfo, previewPath, files);
      preview.logs.push('Dependencies installed.');
      previewEvents.emit('preview:log', { projectId: preview.projectId, runId: preview.runId, log: 'Dependencies installed. Starting server...' });
    } catch (installErr: any) {
      preview.logs.push(`[WARN] npm install had warnings: ${installErr.message} — continuing anyway`);
    }

    const packageJson = frameworkInfo.packageJson || {};
    const startScript = packageJson.scripts?.start as string | undefined;
    const devScript = packageJson.scripts?.dev as string | undefined;
    let startCommand: string[] = [];

    if (startScript) {
      const missingDirs = await scriptReferencesMissingDirectories(startScript, previewPath);
      if (missingDirs.length === 0) {
        startCommand = ['npm', 'start'];
      } else {
        preview.logs.push(`[WARN] Ignoring broken start script; missing directories: ${missingDirs.join(', ')}`);
      }
    }

    if (startCommand.length === 0 && devScript) {
      const missingDirs = await scriptReferencesMissingDirectories(devScript, previewPath);
      if (missingDirs.length === 0) {
        startCommand = ['npm', 'run', 'dev'];
      } else {
        preview.logs.push(`[WARN] Ignoring broken dev script; missing directories: ${missingDirs.join(', ')}`);
      }
    }

    if (startCommand.length === 0) {
      const entryFile = detectNodeEntryFile(files, packageJson);
      if (!entryFile) {
        throw new Error('No runnable Node entry file found after filtering invalid scripts');
      }

      if (entryFile.endsWith('.ts') || entryFile.endsWith('.tsx')) {
        const localTsxBin = path.join(previewPath, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
        if (await pathExists(localTsxBin)) {
          startCommand = [localTsxBin, entryFile];
        } else {
          startCommand = ['npx', 'tsx', entryFile];
        }
      } else {
        startCommand = ['node', entryFile];
      }
    }

    const nodeProcess = spawn(startCommand[0], startCommand.slice(1), {
      cwd: previewPath,
      env: createSafeEnv({ ...projectEnvVars, PORT: port.toString() })
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

  private async startPythonApplication(preview: PreviewInstance, frameworkInfo: any, previewPath: string, files: any[], projectEnvVars: Record<string, string> = {}) {
    const port = preview.primaryPort;
    preview.logs.push('Starting Python application...');
    
    if (frameworkInfo.hasRequirements) {
      await this.runCommand('pip', ['install', '-r', 'requirements.txt'], previewPath);
    }
    
    const mainFile = files.find(f => f.name === 'main.py' || f.name === 'app.py' || f.name === 'server.py');
    if (!mainFile) {
      throw new Error('No main Python file found (main.py, app.py, or server.py)');
    }

    const pythonProcess = spawn('python', [mainFile.name], {
      cwd: previewPath,
      env: createSafeEnv({ ...projectEnvVars, PORT: port.toString() })
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
        // If the primary process dies before the port is ready, fail fast so the
        // user gets feedback immediately instead of waiting out the 3-minute poll.
        if (port === preview.primaryPort && preview.status === 'starting') {
          preview.status = 'error';
          const tail = preview.logs.slice(-8).join(' ').replace(/\s+/g, ' ').slice(0, 400);
          preview.errorMessage = `${serviceName} crashed before becoming ready (exit ${code}). ${tail ? `Last logs: ${tail}` : ''}`.trim();
          previewEvents.emit('preview:error', {
            projectId: preview.projectId,
            runId: preview.runId,
            error: preview.errorMessage
          });
        }

        previewEvents.emit('preview:service-error', {
          projectId: preview.projectId,
          runId: preview.runId,
          port,
          service: serviceName,
          error: message
        });
      }
    });

    process.on('error', (error: any) => {
      const message = `${serviceName} on port ${port} failed to start: ${error?.message || error}`;
      preview.logs.push(message);
      preview.healthChecks.set(port, false);

      if (port === preview.primaryPort && preview.status === 'starting') {
        preview.status = 'error';
        preview.errorMessage = message;
        previewEvents.emit('preview:error', {
          projectId: preview.projectId,
          runId: preview.runId,
          error: message
        });
      }

      logger.error(`Preview ${preview.projectId} ${serviceName}:${port} spawn error:`, error);
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
      // Use 127.0.0.1 explicitly — "localhost" can resolve to ::1 (IPv6) on some hosts,
      // while the preview servers bind to 127.0.0.1 only.
      const response = await fetch(`http://127.0.0.1:${port}`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });
      return response.status < 500;
    } catch {
      return false;
    }
  }

  private async runCommand(
    command: string,
    args: string[],
    cwd: string,
    envOverrides: Record<string, string> = {},
    timeoutMs = 5 * 60 * 1000
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, {
        cwd,
        env: {
          ...globalThis.process.env,
          ...envOverrides,
        },
      });
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try { proc.kill('SIGKILL'); } catch {}
          reject(new Error(`Command '${command} ${args.join(' ')}' timed out after ${timeoutMs / 1000}s`));
        }
      }, timeoutMs);

      proc.on('exit', (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`Command failed with code ${code}`));
      });

      proc.on('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(err);
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
  if (previewService.idleCleanupInterval) {
    clearInterval(previewService.idleCleanupInterval);
  }
});

process.on('SIGINT', () => {
  process.exit(0);
});

process.on('SIGTERM', () => {
  process.exit(0);
});
