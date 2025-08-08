import express from 'express';
import * as path from 'path';
import { storage } from '../storage';
import { createProxyMiddleware } from 'http-proxy-middleware';
import * as fs from 'fs/promises';
import { spawn } from 'child_process';
import { createLogger } from '../utils/logger';

const logger = createLogger('preview-service');

interface PreviewInstance {
  projectId: number;
  port: number;
  process?: any;
  url: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  logs: string[];
}

export class PreviewService {
  private previews: Map<number, PreviewInstance> = new Map();
  private basePort = 8000;
  private app: express.Application;

  constructor() {
    this.app = express();
    this.setupRoutes();
  }

  private setupRoutes() {
    // Proxy requests to preview instances
    this.app.use('/:projectId/*', async (req, res, next) => {
      const projectId = parseInt(req.params.projectId);
      const preview = this.previews.get(projectId);
      
      if (!preview || preview.status !== 'running') {
        return res.status(404).json({ error: 'Preview not available' });
      }
      
      // Proxy to the running preview
      const proxy = createProxyMiddleware({
        target: `http://localhost:${preview.port}`,
        changeOrigin: true,
        pathRewrite: {
          [`^/${projectId}`]: ''
        },
        onError: (err: any, req: any, res: any) => {
          logger.error(`Preview proxy error for project ${projectId}:`, err);
          res.status(502).json({ error: 'Preview server error' });
        }
      });
      
      proxy(req, res, next);
    });
  }

  async startPreview(projectId: number): Promise<PreviewInstance> {
    // Stop existing preview if running
    await this.stopPreview(projectId);
    
    const port = this.basePort + projectId;
    const preview: PreviewInstance = {
      projectId,
      port,
      url: `/preview/${projectId}/`,
      status: 'starting',
      logs: []
    };
    
    this.previews.set(projectId, preview);
    
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
      
      // Detect project type and start appropriate server
      const hasPackageJson = files.some(f => f.name === 'package.json');
      const hasIndexHtml = files.some(f => f.name === 'index.html');
      const hasPythonFiles = files.some(f => f.name.endsWith('.py'));
      
      if (hasPackageJson) {
        // Node.js project
        preview.logs.push('Installing dependencies...');
        await this.runCommand('npm', ['install'], previewPath);
        
        // Check for start script
        const packageJson = JSON.parse(files.find(f => f.name === 'package.json')?.content || '{}');
        if (packageJson.scripts?.start) {
          preview.process = spawn('npm', ['start'], {
            cwd: previewPath,
            env: { ...process.env, PORT: port.toString() }
          });
        } else if (packageJson.scripts?.dev) {
          preview.process = spawn('npm', ['run', 'dev'], {
            cwd: previewPath,
            env: { ...process.env, PORT: port.toString() }
          });
        } else {
          // Fallback to simple HTTP server
          preview.process = spawn('npx', ['http-server', '-p', port.toString()], {
            cwd: previewPath
          });
        }
      } else if (hasPythonFiles) {
        // Python project
        const mainPy = files.find(f => f.name === 'main.py' || f.name === 'app.py');
        if (mainPy) {
          preview.process = spawn('python', [mainPy.name], {
            cwd: previewPath,
            env: { ...process.env, PORT: port.toString() }
          });
        }
      } else if (hasIndexHtml) {
        // Static HTML project
        preview.process = spawn('npx', ['http-server', '-p', port.toString()], {
          cwd: previewPath
        });
      }
      
      if (preview.process) {
        preview.process.stdout.on('data', (data: Buffer) => {
          const log = data.toString();
          preview.logs.push(log);
          logger.info(`Preview ${projectId}: ${log}`);
        });
        
        preview.process.stderr.on('data', (data: Buffer) => {
          const log = data.toString();
          preview.logs.push(log);
          logger.error(`Preview ${projectId}: ${log}`);
        });
        
        preview.process.on('exit', (code: number) => {
          preview.status = code === 0 ? 'stopped' : 'error';
          preview.logs.push(`Process exited with code ${code}`);
        });
        
        // Wait a bit for server to start
        await new Promise(resolve => setTimeout(resolve, 2000));
        preview.status = 'running';
      } else {
        preview.status = 'error';
        preview.logs.push('Could not determine how to start preview');
      }
      
    } catch (error: any) {
      preview.status = 'error';
      preview.logs.push(`Error: ${error.message}`);
      logger.error(`Failed to start preview for project ${projectId}:`, error);
    }
    
    return preview;
  }

  async stopPreview(projectId: number): Promise<void> {
    const preview = this.previews.get(projectId);
    if (preview?.process) {
      preview.process.kill();
      preview.status = 'stopped';
    }
    this.previews.delete(projectId);
  }

  getPreview(projectId: number): PreviewInstance | undefined {
    return this.previews.get(projectId);
  }

  getPreviewUrl(projectId: number): string {
    const preview = this.previews.get(projectId);
    return preview?.url || '';
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

// Start preview server on port 3100
export function startPreviewServer() {
  const PORT = 3100;
  const previewApp = express();
  
  // In development, proxy everything to the main Vite server on port 5000
  previewApp.use('/', createProxyMiddleware({
    target: 'http://localhost:5000',
    changeOrigin: true,
    ws: true // Enable WebSocket proxying for Vite HMR
  }));
  
  previewApp.listen(PORT, () => {
    logger.info(`Preview server running on port ${PORT} - proxying to main server on port 5000`);
  });
}