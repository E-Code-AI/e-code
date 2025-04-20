/**
 * Deployment service for PLOT projects
 * This module handles project deployment, management, and monitoring
 */
import { mkdir, copyFile, readdir, stat } from 'fs/promises';
import { join, basename } from 'path';
import { existsSync } from 'fs';
import { spawn, type ChildProcess } from 'child_process';
import { InsertDeployment, Deployment, Project, File } from '@shared/schema';
import { storage } from './storage';

// Map to store deployment processes and their logs
const deployments = new Map<number, {
  process: ChildProcess;
  logs: string[];
  url: string | null;
  status: string;
  port: number;
}>();

/**
 * Create deployment directory structure
 */
async function createDeploymentDir(projectId: number, deploymentId: number): Promise<string> {
  const deployDir = join(process.cwd(), 'deployments', `${projectId}_${deploymentId}`);
  
  // Create deployment directory if it doesn't exist
  if (!existsSync(deployDir)) {
    await mkdir(deployDir, { recursive: true });
  }
  
  return deployDir;
}

/**
 * Copy project files to deployment directory
 */
async function copyProjectFiles(projectId: number, deployDir: string): Promise<void> {
  // Get all project files
  const files = await storage.getFilesByProject(projectId);
  
  // Create directory structure and copy files
  for (const file of files) {
    // Skip directories, they'll be created as needed
    if (file.isFolder) continue;
    
    let filePath: string;
    if (file.parentId) {
      // Find parent path by traversing up
      let parentPath = '';
      let currentParentId = file.parentId;
      
      while (currentParentId) {
        const parentFile = files.find(f => f.id === currentParentId);
        if (!parentFile) break;
        
        parentPath = join(parentFile.name, parentPath);
        currentParentId = parentFile.parentId;
      }
      
      filePath = join(deployDir, parentPath, file.name);
    } else {
      filePath = join(deployDir, file.name);
    }
    
    // Create parent directories if they don't exist
    const fileDir = filePath.substring(0, filePath.lastIndexOf('/'));
    if (fileDir && !existsSync(fileDir)) {
      await mkdir(fileDir, { recursive: true });
    }
    
    // Write file content
    await Bun.write(filePath, file.content || '');
  }
}

/**
 * Deploy a project
 */
export async function deployProject(projectId: number): Promise<{
  deployment: Deployment;
  success: boolean;
  message: string;
}> {
  try {
    // Get project details
    const project = await storage.getProject(projectId);
    if (!project) {
      throw new Error('Project not found');
    }
    
    // Create deployment record in database
    const deploymentData: InsertDeployment = {
      projectId,
      version: `v${Date.now().toString().slice(-6)}`,
      status: 'deploying',
      url: null
    };
    
    const deployment = await storage.createDeployment(deploymentData);
    
    // Create deployment directory
    const deployDir = await createDeploymentDir(projectId, deployment.id);
    
    // Copy project files to deployment directory
    await copyProjectFiles(projectId, deployDir);
    
    // Start the deployment server
    const deployResult = await startDeploymentServer(project, deployment, deployDir);
    
    return {
      deployment,
      success: true,
      message: 'Deployment started successfully'
    };
  } catch (error) {
    console.error('Deployment failed:', error);
    return {
      deployment: null as any,
      success: false,
      message: error.message || 'Deployment failed'
    };
  }
}

/**
 * Start the deployment server process
 */
async function startDeploymentServer(
  project: Project,
  deployment: Deployment,
  deployDir: string
): Promise<{
  success: boolean;
  url: string | null;
  port: number;
  process?: ChildProcess;
}> {
  // Determine command to run based on project language
  let command: string;
  let args: string[] = [];
  const port = 3000 + deployment.id; // Each deployment gets its own port
  const env = {
    ...process.env,
    PORT: port.toString(),
    NODE_ENV: 'production'
  };
  
  switch (project.language) {
    case 'nodejs':
      // Check for package.json to determine how to run
      if (existsSync(join(deployDir, 'package.json'))) {
        const pkg = JSON.parse(await Bun.file(join(deployDir, 'package.json')).text());
        
        // Install dependencies
        await new Promise<void>((resolve, reject) => {
          const installProcess = spawn('npm', ['install', '--production'], {
            cwd: deployDir,
            env
          });
          
          const logs: string[] = [];
          installProcess.stdout.on('data', (data) => {
            const log = data.toString();
            logs.push(`[npm install] ${log}`);
          });
          
          installProcess.stderr.on('data', (data) => {
            const log = data.toString();
            logs.push(`[npm install error] ${log}`);
          });
          
          installProcess.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`npm install failed with code ${code}. Logs: ${logs.join('\n')}`));
            }
          });
        });
        
        if (pkg.scripts && pkg.scripts.start) {
          command = 'npm';
          args = ['run', 'start'];
        } else if (existsSync(join(deployDir, 'index.js'))) {
          command = 'node';
          args = ['index.js'];
        } else {
          // Look for a main file
          const files = await readdir(deployDir);
          const mainFile = files.find(file => 
            file.endsWith('.js') && 
            !file.startsWith('_') && 
            !file.startsWith('.')
          );
          
          if (mainFile) {
            command = 'node';
            args = [mainFile];
          } else {
            throw new Error('Could not determine how to start Node.js project');
          }
        }
        break;
      } else {
        // No package.json, look for a main file
        const files = await readdir(deployDir);
        const mainFile = files.find(file => 
          file.endsWith('.js') && 
          !file.startsWith('_') && 
          !file.startsWith('.')
        );
        
        if (mainFile) {
          command = 'node';
          args = [mainFile];
        } else {
          throw new Error('Could not determine how to start Node.js project');
        }
      }
      break;
      
    case 'python':
      // Check for requirements.txt
      if (existsSync(join(deployDir, 'requirements.txt'))) {
        // Install dependencies
        await new Promise<void>((resolve, reject) => {
          const installProcess = spawn('pip', ['install', '-r', 'requirements.txt'], {
            cwd: deployDir,
            env
          });
          
          const logs: string[] = [];
          installProcess.stdout.on('data', (data) => {
            const log = data.toString();
            logs.push(`[pip install] ${log}`);
          });
          
          installProcess.stderr.on('data', (data) => {
            const log = data.toString();
            logs.push(`[pip install error] ${log}`);
          });
          
          installProcess.on('close', (code) => {
            if (code === 0) {
              resolve();
            } else {
              reject(new Error(`pip install failed with code ${code}. Logs: ${logs.join('\n')}`));
            }
          });
        });
      }
      
      // Look for app.py or main.py or similar
      if (existsSync(join(deployDir, 'app.py'))) {
        command = 'python';
        args = ['app.py'];
      } else if (existsSync(join(deployDir, 'main.py'))) {
        command = 'python';
        args = ['main.py'];
      } else {
        // Look for any Python file
        const files = await readdir(deployDir);
        const mainFile = files.find(file => 
          file.endsWith('.py') && 
          !file.startsWith('_') && 
          !file.startsWith('.')
        );
        
        if (mainFile) {
          command = 'python';
          args = [mainFile];
        } else {
          throw new Error('Could not determine how to start Python project');
        }
      }
      break;
      
    // Add support for other languages as needed
    
    default:
      throw new Error(`Deployment for ${project.language} is not yet supported`);
  }
  
  // Start the server process
  const serverProcess = spawn(command, args, {
    cwd: deployDir,
    env
  });
  
  // Create logs array for this deployment
  const logs: string[] = [];
  
  // Setup event listeners for process output
  serverProcess.stdout.on('data', (data) => {
    const log = data.toString();
    logs.push(log);
    
    // Store only the last 1000 logs
    if (logs.length > 1000) {
      logs.shift();
    }
  });
  
  serverProcess.stderr.on('data', (data) => {
    const log = data.toString();
    logs.push(`[ERROR] ${log}`);
    
    // Store only the last 1000 logs
    if (logs.length > 1000) {
      logs.shift();
    }
  });
  
  // Handle process exit
  serverProcess.on('exit', async (code) => {
    // Update deployment status
    if (code === 0 || code === null) {
      await storage.updateDeployment(deployment.id, { status: 'stopped' });
    } else {
      await storage.updateDeployment(deployment.id, { status: 'failed' });
    }
    
    logs.push(`[SYSTEM] Process exited with code ${code}`);
    
    // Remove from active deployments
    deployments.delete(deployment.id);
  });
  
  // Generate public URL (in a real implementation, this would involve 
  // DNS configuration, proxy setup, etc.)
  const url = `https://${project.name.replace(/\s+/g, '-').toLowerCase()}-${deployment.id}.plot.app`;
  
  // Update deployment record with URL and running status
  await storage.updateDeployment(deployment.id, {
    status: 'running',
    url
  });
  
  // Store process and logs in memory
  deployments.set(deployment.id, {
    process: serverProcess,
    logs,
    url,
    status: 'running',
    port
  });
  
  return {
    success: true,
    url,
    port,
    process: serverProcess
  };
}

/**
 * Stop a running deployment
 */
export async function stopDeployment(deploymentId: number): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    // Get deployment data
    const deploymentInfo = deployments.get(deploymentId);
    
    if (!deploymentInfo) {
      // Check if it exists in the database
      const deployment = await storage.getDeployments(null).then(
        deployments => deployments.find(d => d.id === deploymentId)
      );
      
      if (!deployment) {
        throw new Error('Deployment not found');
      }
      
      // If it exists but is not running, just update status
      await storage.updateDeployment(deploymentId, { status: 'stopped' });
      
      return {
        success: true,
        message: 'Deployment was already stopped'
      };
    }
    
    // Kill the process
    deploymentInfo.process.kill();
    
    // Update deployment record in database
    await storage.updateDeployment(deploymentId, { status: 'stopped' });
    
    // Add a log entry
    deploymentInfo.logs.push('[SYSTEM] Deployment stopped by user');
    
    return {
      success: true,
      message: 'Deployment stopped successfully'
    };
  } catch (error) {
    console.error('Failed to stop deployment:', error);
    return {
      success: false,
      message: error.message || 'Failed to stop deployment'
    };
  }
}

/**
 * Get the status of a deployment
 */
export function getDeploymentStatus(deploymentId: number): {
  status: string;
  url: string | null;
  running: boolean;
} {
  const deploymentInfo = deployments.get(deploymentId);
  
  if (!deploymentInfo) {
    return {
      status: 'stopped',
      url: null,
      running: false
    };
  }
  
  return {
    status: deploymentInfo.status,
    url: deploymentInfo.url,
    running: deploymentInfo.status === 'running'
  };
}

/**
 * Get the logs for a deployment
 */
export function getDeploymentLogs(deploymentId: number): string[] {
  const deploymentInfo = deployments.get(deploymentId);
  
  if (!deploymentInfo) {
    return ['No logs available'];
  }
  
  return deploymentInfo.logs;
}