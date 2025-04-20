import { spawn, ChildProcess } from 'child_process';
import { log } from './vite';
import { Project, File, InsertDeployment } from '@shared/schema';
import { storage } from './storage';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { startProject, stopProject } from './runtime';

// Map to store active deployments
const activeDeployments = new Map<number, {
  process: ChildProcess;
  url: string;
  port: number;
  projectId: number;
  deploymentId: number;
  status: 'deploying' | 'running' | 'failed' | 'stopped';
  logs: string[];
}>();

// Create a deployment directory
async function createDeploymentDir(projectId: number, deploymentId: number): Promise<string> {
  const deployDir = path.join(os.tmpdir(), `plot-deployment-${projectId}-${deploymentId}`);
  
  try {
    // Create project directory
    await fs.promises.mkdir(deployDir, { recursive: true });
    return deployDir;
  } catch (error) {
    log(`Error creating deployment directory: ${error}`, 'deployment');
    throw error;
  }
}

// Copy project files to deployment directory
async function copyProjectFiles(projectId: number, deployDir: string): Promise<void> {
  try {
    // Get all project files
    const files = await storage.getFilesByProject(projectId);
    
    // Create directory structure and write files
    for (const file of files) {
      const filePath = path.join(deployDir, file.name);
      
      if (file.isFolder) {
        await fs.promises.mkdir(filePath, { recursive: true });
      } else {
        await fs.promises.writeFile(filePath, file.content || '', 'utf8');
      }
    }
  } catch (error) {
    log(`Error copying project files: ${error}`, 'deployment');
    throw error;
  }
}

// Deploy a project
export async function deployProject(projectId: number): Promise<{
  success: boolean;
  deploymentId?: number;
  url?: string;
  error?: string;
}> {
  try {
    // Get project details
    const project = await storage.getProject(projectId);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }
    
    // Create deployment record
    const deploymentData: InsertDeployment = {
      projectId,
      status: 'deploying',
      url: '',
      logs: '',
      version: `v${Date.now()}`,
    };
    
    const deployment = await storage.createDeployment(deploymentData);
    
    // Create deployment directory
    const deployDir = await createDeploymentDir(projectId, deployment.id);
    
    // Copy project files
    await copyProjectFiles(projectId, deployDir);
    
    // Generate a random port in the 8000-8999 range
    const port = 8000 + Math.floor(Math.random() * 1000);
    
    // Generate deployment URL (in a real system, this would be a real domain)
    const url = `https://${project.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${projectId}.plot.replit.app`;
    
    // Try to stop any existing deployment
    if (activeDeployments.has(projectId)) {
      const existing = activeDeployments.get(projectId);
      if (existing) {
        existing.process.kill();
        activeDeployments.delete(projectId);
      }
    }
    
    // Detect project type and start appropriate server
    const startResult = await startDeploymentServer(project, deployDir, port);
    
    if (!startResult.success) {
      // Update deployment status to failed
      await storage.updateDeployment(deployment.id, {
        status: 'failed',
        logs: JSON.stringify([`Deployment failed: ${startResult.error}`]),
      });
      
      return { success: false, error: startResult.error, deploymentId: deployment.id };
    }
    
    // Store active deployment
    activeDeployments.set(projectId, {
      process: startResult.process!,
      url,
      port,
      projectId,
      deploymentId: deployment.id,
      status: 'running',
      logs: [`Deployment started successfully on port ${port}`],
    });
    
    // Update deployment record
    await storage.updateDeployment(deployment.id, {
      status: 'running',
      url,
    });
    
    // Handle process exit
    startResult.process!.on('exit', async (code) => {
      if (activeDeployments.has(projectId)) {
        const deployInfo = activeDeployments.get(projectId);
        if (deployInfo && deployInfo.deploymentId === deployment.id) {
          deployInfo.status = code === 0 ? 'stopped' : 'failed';
          deployInfo.logs.push(`Process exited with code ${code}`);
          
          // Update deployment record
          await storage.updateDeployment(deployment.id, {
            status: code === 0 ? 'stopped' : 'failed',
            logs: JSON.stringify(deployInfo.logs),
          });
          
          // Remove from active deployments if failed or stopped
          activeDeployments.delete(projectId);
        }
      }
    });
    
    return {
      success: true,
      deploymentId: deployment.id,
      url,
    };
  } catch (error) {
    log(`Error deploying project: ${error}`, 'deployment');
    return { success: false, error: String(error) };
  }
}

// Start the appropriate server based on project type
async function startDeploymentServer(
  project: Project,
  deployDir: string,
  port: number
): Promise<{
  success: boolean;
  process?: ChildProcess;
  error?: string;
}> {
  try {
    // Detect project type based on files
    const files = await fs.promises.readdir(deployDir);
    
    // Set up environment variables
    const env = {
      ...process.env,
      PORT: port.toString(),
      NODE_ENV: 'production',
    };
    
    let command: string;
    let args: string[];
    
    // Check for package.json to detect Node.js projects
    if (files.includes('package.json')) {
      try {
        const packageJson = JSON.parse(
          await fs.promises.readFile(path.join(deployDir, 'package.json'), 'utf8')
        );
        
        // Install dependencies
        log(`Installing dependencies for project ${project.id}`, 'deployment');
        const npmInstall = spawn('npm', ['install', '--production'], {
          cwd: deployDir,
          env,
        });
        
        // Wait for npm install to complete
        await new Promise<void>((resolve, reject) => {
          npmInstall.on('exit', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`npm install failed with code ${code}`));
            }
          });
        });
        
        // Check for build script
        if (packageJson.scripts && packageJson.scripts.build) {
          log(`Building project ${project.id}`, 'deployment');
          const npmBuild = spawn('npm', ['run', 'build'], {
            cwd: deployDir,
            env,
          });
          
          // Wait for npm build to complete
          await new Promise<void>((resolve, reject) => {
            npmBuild.on('exit', (code) => {
              if (code === 0) {
                resolve();
              } else {
                reject(new Error(`npm build failed with code ${code}`));
              }
            });
          });
        }
        
        // Start the server
        if (packageJson.scripts && packageJson.scripts.start) {
          command = 'npm';
          args = ['run', 'start'];
        } else if (files.includes('server.js')) {
          command = 'node';
          args = ['server.js'];
        } else if (files.includes('index.js')) {
          command = 'node';
          args = ['index.js'];
        } else {
          // If no start script or entry file, use a static file server for frontend projects
          command = 'npx';
          args = ['serve', '-s', '.'];
        }
      } catch (error) {
        log(`Error processing package.json: ${error}`, 'deployment');
        return { success: false, error: `Failed to process package.json: ${error}` };
      }
    } 
    // Check for requirements.txt to detect Python projects
    else if (files.includes('requirements.txt')) {
      // Install dependencies
      log(`Installing Python dependencies for project ${project.id}`, 'deployment');
      const pipInstall = spawn('pip', ['install', '-r', 'requirements.txt'], {
        cwd: deployDir,
        env,
      });
      
      // Wait for pip install to complete
      await new Promise<void>((resolve, reject) => {
        pipInstall.on('exit', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`pip install failed with code ${code}`));
          }
        });
      });
      
      // Check for common Python entry points
      if (files.includes('app.py')) {
        command = 'python';
        args = ['app.py'];
      } else if (files.includes('main.py')) {
        command = 'python';
        args = ['main.py'];
      } else if (files.includes('wsgi.py')) {
        command = 'gunicorn';
        args = ['wsgi:app'];
      } else {
        return { success: false, error: 'Could not determine Python entry point' };
      }
    }
    // Default to static file serving for HTML/CSS/JS projects
    else if (files.includes('index.html')) {
      command = 'npx';
      args = ['serve', '.'];
    } 
    // Fallback option
    else {
      return { success: false, error: 'Could not determine project type' };
    }
    
    // Start the server
    log(`Starting deployment server for project ${project.id} with command: ${command} ${args.join(' ')}`, 'deployment');
    
    const proc = spawn(command, args, {
      cwd: deployDir,
      env,
      stdio: 'pipe',
    });
    
    // Capture output for logs
    proc.stdout.on('data', (data) => {
      const logMsg = data.toString();
      log(`[Deployment ${project.id}] ${logMsg}`, 'deployment');
      
      // Add to deployment logs
      if (activeDeployments.has(project.id)) {
        const deployInfo = activeDeployments.get(project.id);
        if (deployInfo) {
          deployInfo.logs.push(logMsg);
        }
      }
    });
    
    proc.stderr.on('data', (data) => {
      const logMsg = data.toString();
      log(`[Deployment ${project.id}] ERROR: ${logMsg}`, 'deployment');
      
      // Add to deployment logs
      if (activeDeployments.has(project.id)) {
        const deployInfo = activeDeployments.get(project.id);
        if (deployInfo) {
          deployInfo.logs.push(`ERROR: ${logMsg}`);
        }
      }
    });
    
    return {
      success: true,
      process: proc,
    };
  } catch (error) {
    log(`Error starting deployment server: ${error}`, 'deployment');
    return { success: false, error: String(error) };
  }
}

// Stop a deployment
export async function stopDeployment(deploymentId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get deployment details
    const deployment = await storage.getDeployment(deploymentId);
    if (!deployment) {
      return { success: false, error: 'Deployment not found' };
    }
    
    // Check if deployment is active
    const projectId = deployment.projectId;
    if (!activeDeployments.has(projectId)) {
      // Update deployment status to stopped
      await storage.updateDeployment(deploymentId, {
        status: 'stopped',
      });
      
      return { success: true };
    }
    
    // Get active deployment info
    const deployInfo = activeDeployments.get(projectId);
    if (deployInfo && deployInfo.deploymentId === deploymentId) {
      // Kill the process
      deployInfo.process.kill();
      
      // Update deployment status
      await storage.updateDeployment(deploymentId, {
        status: 'stopped',
        logs: JSON.stringify([...deployInfo.logs, 'Deployment stopped by user']),
      });
      
      // Remove from active deployments
      activeDeployments.delete(projectId);
      
      return { success: true };
    } else {
      return { success: false, error: 'Deployment is not active' };
    }
  } catch (error) {
    log(`Error stopping deployment: ${error}`, 'deployment');
    return { success: false, error: String(error) };
  }
}

// Get deployment status
export function getDeploymentStatus(deploymentId: number): {
  isActive: boolean;
  status?: 'deploying' | 'running' | 'failed' | 'stopped';
  url?: string;
  port?: number;
  logs?: string[];
} {
  // Find the deployment in active deployments
  for (const [, deployInfo] of activeDeployments.entries()) {
    if (deployInfo.deploymentId === deploymentId) {
      return {
        isActive: true,
        status: deployInfo.status,
        url: deployInfo.url,
        port: deployInfo.port,
        logs: deployInfo.logs,
      };
    }
  }
  
  return { isActive: false };
}

// Get deployment logs
export function getDeploymentLogs(deploymentId: number): string[] {
  // Find the deployment in active deployments
  for (const [, deployInfo] of activeDeployments.entries()) {
    if (deployInfo.deploymentId === deploymentId) {
      return deployInfo.logs;
    }
  }
  
  return ['Deployment is not active, logs not available'];
}