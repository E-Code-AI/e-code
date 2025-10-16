// @ts-nocheck
/**
 * Simple executor for running projects without Docker
 * This is a lightweight alternative that runs projects directly on the host
 */

import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { Project, File } from '@shared/schema';
import { storage } from './storage';
import { resourceMonitor } from './services/resource-monitor';

// Map of active project processes
const activeProjects = new Map<number, {
  process: ChildProcess;
  logs: string[];
  status: 'starting' | 'running' | 'stopped' | 'error';
  url?: string;
  port?: number;
}>();

// Available ports for projects
const availablePorts: number[] = [];
for (let port = 3000; port <= 4000; port++) {
  availablePorts.push(port);
}

// Ports in use
const portsInUse = new Set<number>();

function getNextAvailablePort(): number | null {
  for (const port of availablePorts) {
    if (!portsInUse.has(port)) {
      portsInUse.add(port);
      return port;
    }
  }
  return null;
}

function releasePort(port: number) {
  portsInUse.delete(port);
}

/**
 * Write project files to temporary directory
 */
async function writeProjectFiles(projectId: number, files: File[]): Promise<string> {
  const tempDir = path.join(process.cwd(), 'temp', `project-${projectId}`);
  
  // Create temp directory if it doesn't exist
  await fs.promises.mkdir(tempDir, { recursive: true });
  
  // Write each file
  for (const file of files) {
    const filePath = path.join(tempDir, file.name);
    const fileDir = path.dirname(filePath);
    
    // Create directory if needed
    await fs.promises.mkdir(fileDir, { recursive: true });
    
    // Write file content
    await fs.promises.writeFile(filePath, file.content || '');
  }
  
  return tempDir;
}

/**
 * Detect project type and get run command
 */
function getRunCommand(files: File[]): { command: string; args: string[]; isWebProject: boolean } {
  // Check for package.json
  const packageJson = files.find(f => f.name === 'package.json');
  if (packageJson) {
    try {
      const pkg = JSON.parse(packageJson.content || '{}');
      if (pkg.scripts?.dev) {
        return { command: 'npm', args: ['run', 'dev'], isWebProject: true };
      }
      if (pkg.scripts?.start) {
        return { command: 'npm', args: ['start'], isWebProject: true };
      }
    } catch {}
  }
  
  // Check for main entry files
  const hasIndexHtml = files.some(f => f.name === 'index.html');
  const hasIndexJs = files.some(f => f.name === 'index.js');
  const hasServerJs = files.some(f => f.name === 'server.js');
  const hasAppPy = files.some(f => f.name === 'app.py');
  const hasMainPy = files.some(f => f.name === 'main.py');
  
  if (hasIndexHtml) {
    // For HTML projects, we'll return a special marker
    return { command: 'static', args: [], isWebProject: true };
  }
  
  if (hasServerJs) {
    return { command: 'node', args: ['server.js'], isWebProject: true };
  }
  
  if (hasIndexJs) {
    return { command: 'node', args: ['index.js'], isWebProject: true };
  }
  
  if (hasAppPy) {
    return { command: 'python', args: ['app.py'], isWebProject: true };
  }
  
  if (hasMainPy) {
    return { command: 'python', args: ['main.py'], isWebProject: false };
  }
  
  // Default to node
  return { command: 'node', args: ['index.js'], isWebProject: false };
}

/**
 * Start a project
 */
export async function startProject(projectId: number, userId?: number): Promise<{
  success: boolean;
  url?: string;
  error?: string;
}> {
  try {
    // Check if already running
    if (activeProjects.has(projectId)) {
      const project = activeProjects.get(projectId)!;
      if (project.status === 'running') {
        return {
          success: true,
          url: project.url
        };
      }
    }
    
    // Get project files
    const files = await storage.getFilesByProject(projectId);
    if (!files.length) {
      return {
        success: false,
        error: 'No files found in project'
      };
    }
    
    // Get project owner if not provided
    if (!userId) {
      const project = await storage.getProject(projectId);
      userId = project?.ownerId;
    }
    
    // Start resource monitoring if userId is available
    if (userId) {
      await resourceMonitor.startProjectMonitoring(projectId, userId);
    }
    
    // Write files to temp directory
    const projectDir = await writeProjectFiles(projectId, files);
    
    // Get run command
    const { command, args, isWebProject } = getRunCommand(files);
    
    // Handle static HTML projects
    if (command === 'static') {
      // For static projects, just return the preview URL
      activeProjects.set(projectId, {
        process: null as any,
        logs: ['Static HTML project ready'],
        status: 'running',
        url: `/preview/${projectId}/index.html`
      });
      
      return {
        success: true,
        url: `/preview/${projectId}/index.html`
      };
    }
    
    // Get available port
    const port = getNextAvailablePort();
    if (!port) {
      return {
        success: false,
        error: 'No available ports'
      };
    }
    
    // Set up environment
    const processEnv = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'development'
    };
    
    // Check if npm install is needed
    const packageJson = files.find(f => f.name === 'package.json');
    if (packageJson && !fs.existsSync(path.join(projectDir, 'node_modules'))) {
      // Run npm install first
      console.log(`Installing dependencies for project ${projectId}...`);
      const installProcess = spawn('npm', ['install'], {
        cwd: projectDir,
        env: processEnv
      });
      
      await new Promise((resolve, reject) => {
        installProcess.on('exit', (code) => {
          if (code === 0) {
            resolve(true);
          } else {
            reject(new Error('Failed to install dependencies'));
          }
        });
      });
    }
    
    // Start the process
    console.log(`Starting project ${projectId} with command: ${command} ${args.join(' ')}`);
    const childProcess = spawn(command, args, {
      cwd: projectDir,
      env: processEnv,
      shell: true
    });
    
    const projectData: {
      process: ChildProcess;
      logs: string[];
      status: 'starting' | 'running' | 'stopped' | 'error';
      port?: number;
      url?: string;
    } = {
      process: childProcess,
      logs: [],
      status: 'starting',
      port,
      url: isWebProject ? `http://localhost:${port}` : undefined
    };
    
    // Capture output
    childProcess.stdout.on('data', (data: Buffer) => {
      const log = data.toString();
      console.log(`[Project ${projectId}]`, log);
      projectData.logs.push(log);
    });
    
    childProcess.stderr.on('data', (data: Buffer) => {
      const log = data.toString();
      console.error(`[Project ${projectId}]`, log);
      projectData.logs.push(`ERROR: ${log}`);
    });
    
    childProcess.on('exit', async (code: number | null) => {
      console.log(`Project ${projectId} exited with code ${code}`);
      projectData.status = 'stopped';
      releasePort(port);
      // Stop resource monitoring when project exits
      await resourceMonitor.stopProjectMonitoring(projectId);
    });
    
    childProcess.on('error', (error: Error) => {
      console.error(`Project ${projectId} error:`, error);
      projectData.status = 'error';
      projectData.logs.push(`Error: ${error.message}`);
      releasePort(port);
    });
    
    // Mark as running after a short delay
    setTimeout(() => {
      if (projectData.status === 'starting') {
        projectData.status = 'running';
      }
    }, 2000);
    
    activeProjects.set(projectId, projectData);
    
    return {
      success: true,
      url: projectData.url
    };
  } catch (error) {
    console.error('Error starting project:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Stop a project
 */
export async function stopProject(projectId: number): Promise<{ success: boolean; error?: string }> {
  const project = activeProjects.get(projectId);
  if (!project) {
    return {
      success: false,
      error: 'Project not running'
    };
  }
  
  if (project.process) {
    project.process.kill();
  }
  
  if (project.port) {
    releasePort(project.port);
  }
  
  activeProjects.delete(projectId);
  
  // Stop resource monitoring
  await resourceMonitor.stopProjectMonitoring(projectId);
  
  return { success: true };
}

/**
 * Get project status
 */
export function getProjectStatus(projectId: number) {
  const project = activeProjects.get(projectId);
  if (!project) {
    return {
      isRunning: false,
      status: 'stopped' as const,
      logs: []
    };
  }
  
  return {
    isRunning: project.status === 'running',
    status: project.status,
    logs: project.logs,
    url: project.url,
    port: project.port
  };
}

/**
 * Get project logs
 */
export function getProjectLogs(projectId: number): string[] {
  const project = activeProjects.get(projectId);
  return project?.logs || [];
}

/**
 * SimpleCodeExecutor class for education auto-grading
 */
export class SimpleCodeExecutor {
  async executeCode(code: string, language: string, testInput?: string): Promise<{
    success: boolean;
    output?: string;
    error?: string;
    executionTime?: number;
  }> {
    const startTime = Date.now();
    
    try {
      // Create temporary file for code execution
      const tempDir = path.join(process.cwd(), 'temp', 'grading');
      await fs.promises.mkdir(tempDir, { recursive: true });
      
      let fileName: string;
      let command: string;
      let args: string[];
      
      // Determine file extension and execution command based on language
      switch (language.toLowerCase()) {
        case 'javascript':
        case 'js':
          fileName = `code-${Date.now()}.js`;
          command = 'node';
          args = [fileName];
          break;
        case 'python':
        case 'py':
          fileName = `code-${Date.now()}.py`;
          command = 'python';
          args = [fileName];
          break;
        case 'java':
          fileName = `Code${Date.now()}.java`;
          command = 'javac';
          args = [fileName];
          break;
        default:
          throw new Error(`Unsupported language: ${language}`);
      }
      
      const filePath = path.join(tempDir, fileName);
      await fs.promises.writeFile(filePath, code);
      
      return await new Promise((resolve) => {
        const childProcess = spawn(command, args, {
          cwd: tempDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let output = '';
        let error = '';
        
        // Send test input if provided
        if (testInput) {
          childProcess.stdin.write(testInput);
          childProcess.stdin.end();
        }
        
        childProcess.stdout.on('data', (data: Buffer) => {
          output += data.toString();
        });
        
        childProcess.stderr.on('data', (data: Buffer) => {
          error += data.toString();
        });
        
        childProcess.on('exit', async (code: number | null) => {
          const executionTime = Date.now() - startTime;
          
          // Clean up temporary file
          try {
            await fs.promises.unlink(filePath);
          } catch {}
          
          if (code === 0) {
            resolve({
              success: true,
              output: output.trim(),
              executionTime
            });
          } else {
            resolve({
              success: false,
              error: error.trim() || `Process exited with code ${code}`,
              executionTime
            });
          }
        });
        
        childProcess.on('error', async (err: Error) => {
          const executionTime = Date.now() - startTime;
          
          // Clean up temporary file
          try {
            await fs.promises.unlink(filePath);
          } catch {}
          
          resolve({
            success: false,
            error: err.message,
            executionTime
          });
        });
        
        // Set timeout for execution (10 seconds)
        setTimeout(() => {
          childProcess.kill();
          resolve({
            success: false,
            error: 'Execution timeout',
            executionTime: Date.now() - startTime
          });
        }, 10000);
      });
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        executionTime: Date.now() - startTime
      };
    }
  }
}