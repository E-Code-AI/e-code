import { spawn, ChildProcess } from 'child_process';
import { log } from './vite';
import { Project, File } from '@shared/schema';
import { storage } from './storage';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Define runtime configurations for different languages
interface RuntimeConfig {
  name: string;
  fileExtensions: string[];
  mainFileNames: string[];
  startCommand: (mainFile: string, projectDir: string) => { command: string; args: string[] };
  packageFile?: string;
  installCommand?: (projectDir: string) => { command: string; args: string[] };
}

const runtimeConfigs: RuntimeConfig[] = [
  {
    name: 'javascript',
    fileExtensions: ['.js'],
    mainFileNames: ['index.js', 'server.js', 'app.js', 'main.js'],
    packageFile: 'package.json',
    startCommand: (mainFile, projectDir) => ({ 
      command: 'node', 
      args: [mainFile] 
    }),
    installCommand: (projectDir) => ({ 
      command: 'npm', 
      args: ['install', '--prefix', projectDir] 
    })
  },
  {
    name: 'typescript',
    fileExtensions: ['.ts'],
    mainFileNames: ['index.ts', 'server.ts', 'app.ts', 'main.ts'],
    packageFile: 'package.json',
    startCommand: (mainFile, projectDir) => ({ 
      command: 'npx', 
      args: ['ts-node', mainFile] 
    }),
    installCommand: (projectDir) => ({ 
      command: 'npm', 
      args: ['install', '--prefix', projectDir] 
    })
  },
  {
    name: 'python',
    fileExtensions: ['.py'],
    mainFileNames: ['main.py', 'app.py', 'index.py'],
    packageFile: 'requirements.txt',
    startCommand: (mainFile, projectDir) => ({ 
      command: 'python3', 
      args: [mainFile] 
    }),
    installCommand: (projectDir) => ({ 
      command: 'pip3', 
      args: ['install', '-r', path.join(projectDir, 'requirements.txt')] 
    })
  },
  {
    name: 'html',
    fileExtensions: ['.html', '.htm'],
    mainFileNames: ['index.html', 'main.html'],
    startCommand: (mainFile, projectDir) => ({ 
      command: 'npx', 
      args: ['serve', projectDir] 
    })
  },
  {
    name: 'nodejs',
    fileExtensions: ['.js', '.ts'],
    mainFileNames: ['index.js', 'server.js', 'app.js', 'main.js'],
    packageFile: 'package.json',
    startCommand: (mainFile, projectDir) => ({
      command: 'npm',
      args: ['start', '--prefix', projectDir]
    }),
    installCommand: (projectDir) => ({ 
      command: 'npm', 
      args: ['install', '--prefix', projectDir] 
    })
  },
  {
    name: 'react',
    fileExtensions: ['.js', '.jsx', '.ts', '.tsx'],
    mainFileNames: ['src/index.js', 'src/index.jsx', 'src/index.ts', 'src/index.tsx'],
    packageFile: 'package.json',
    startCommand: (mainFile, projectDir) => ({ 
      command: 'npm', 
      args: ['start', '--prefix', projectDir] 
    }),
    installCommand: (projectDir) => ({ 
      command: 'npm', 
      args: ['install', '--prefix', projectDir] 
    })
  },
];

// Map to store running processes by project ID
const runningProcesses = new Map<number, {
  process: ChildProcess;
  language: string;
  port?: number;
}>();

// Create a temporary project directory
async function createProjectDir(project: Project, files: File[]): Promise<string> {
  const tmpDir = path.join(os.tmpdir(), `plot-project-${project.id}-${Date.now()}`);
  
  try {
    // Create project directory
    await fs.promises.mkdir(tmpDir, { recursive: true });
    
    // Write all files to the directory
    for (const file of files) {
      if (file.isFolder) {
        await fs.promises.mkdir(path.join(tmpDir, file.name), { recursive: true });
      } else {
        await fs.promises.writeFile(
          path.join(tmpDir, file.name), 
          file.content || '',
          'utf8'
        );
      }
    }
    
    return tmpDir;
  } catch (error) {
    log(`Error creating project directory: ${error}`, 'runtime');
    throw error;
  }
}

// Detect the language and main file for a project
async function detectProjectLanguage(project: Project, files: File[]): Promise<{
  language: string;
  mainFile: string;
  config: RuntimeConfig;
}> {
  // Check if project has language explicitly set
  if (project.language) {
    const config = runtimeConfigs.find(config => config.name === project.language);
    if (config) {
      // Find main file based on config
      for (const mainFileName of config.mainFileNames) {
        const mainFile = files.find(f => f.name === mainFileName && !f.isFolder);
        if (mainFile) {
          return { language: project.language, mainFile: mainFile.name, config };
        }
      }
      
      // If no main file found, look for files with matching extension
      const fileWithExt = files.find(f => 
        !f.isFolder && 
        config.fileExtensions.some(ext => f.name.endsWith(ext))
      );
      
      if (fileWithExt) {
        return { language: project.language, mainFile: fileWithExt.name, config };
      }
    }
  }
  
  // If language not set or main file not found, detect based on files
  // First, look for common package files
  const packageJson = files.find(f => f.name === 'package.json' && !f.isFolder);
  if (packageJson) {
    try {
      const content = JSON.parse(packageJson.content || '{}');
      
      // Check for React
      if (
        (content.dependencies && content.dependencies.react) ||
        (content.devDependencies && content.devDependencies.react)
      ) {
        const config = runtimeConfigs.find(config => config.name === 'react');
        if (config) {
          // Look for main file
          for (const mainFileName of config.mainFileNames) {
            // Handle nested paths
            const pathParts = mainFileName.split('/');
            let currentFiles = files;
            let found = false;
            
            for (let i = 0; i < pathParts.length; i++) {
              const part = pathParts[i];
              const isLast = i === pathParts.length - 1;
              
              if (isLast) {
                const file = currentFiles.find(f => f.name === part && !f.isFolder);
                if (file) {
                  found = true;
                  return { language: 'react', mainFile: mainFileName, config };
                }
              } else {
                const folder = currentFiles.find(f => f.name === part && f.isFolder);
                if (folder) {
                  // Get files in this folder
                  currentFiles = files.filter(f => f.parentId === folder.id);
                } else {
                  break;
                }
              }
            }
          }
        }
      }
      
      // Check if it's a Node.js project
      if (content.main || content.scripts?.start) {
        const config = runtimeConfigs.find(config => config.name === 'nodejs');
        return { language: 'nodejs', mainFile: content.main || 'index.js', config: config! };
      }
    } catch (error) {
      log(`Error parsing package.json: ${error}`, 'runtime');
    }
  }
  
  // Check for Python
  const pythonConfig = runtimeConfigs.find(config => config.name === 'python');
  if (pythonConfig) {
    for (const mainFileName of pythonConfig.mainFileNames) {
      const mainFile = files.find(f => f.name === mainFileName && !f.isFolder);
      if (mainFile) {
        return { language: 'python', mainFile: mainFile.name, config: pythonConfig };
      }
    }
  }
  
  // Check for HTML
  const htmlConfig = runtimeConfigs.find(config => config.name === 'html');
  if (htmlConfig) {
    for (const mainFileName of htmlConfig.mainFileNames) {
      const mainFile = files.find(f => f.name === mainFileName && !f.isFolder);
      if (mainFile) {
        return { language: 'html', mainFile: mainFile.name, config: htmlConfig };
      }
    }
  }
  
  // Default to JavaScript if we can't detect
  const jsConfig = runtimeConfigs.find(config => config.name === 'javascript');
  const mainFile = files.find(f => 
    !f.isFolder && jsConfig!.fileExtensions.some(ext => f.name.endsWith(ext))
  );
  
  return { 
    language: 'javascript', 
    mainFile: mainFile ? mainFile.name : 'index.js', 
    config: jsConfig! 
  };
}

// Start a project
export async function startProject(projectId: number): Promise<{
  success: boolean;
  language?: string;
  port?: number;
  error?: string;
}> {
  try {
    // Check if project is already running
    if (runningProcesses.has(projectId)) {
      return {
        success: true,
        language: runningProcesses.get(projectId)!.language,
        port: runningProcesses.get(projectId)!.port
      };
    }
    
    // Get project and files
    const project = await storage.getProject(projectId);
    if (!project) {
      return { success: false, error: 'Project not found' };
    }
    
    const files = await storage.getFilesByProject(projectId);
    if (!files || files.length === 0) {
      return { success: false, error: 'No files found in project' };
    }
    
    // Create a temporary project directory
    const projectDir = await createProjectDir(project, files);
    
    // Detect language and main file
    const { language, mainFile, config } = await detectProjectLanguage(project, files);
    
    // Run install command if necessary
    if (config.installCommand && config.packageFile) {
      const packageFileExists = files.some(f => f.name === config.packageFile && !f.isFolder);
      
      if (packageFileExists) {
        const { command, args } = config.installCommand(projectDir);
        
        log(`Installing dependencies for ${project.name} (${language})...`, 'runtime');
        
        try {
          // Run synchronously to ensure dependencies are installed before starting
          const { execSync } = require('child_process');
          execSync(`${command} ${args.join(' ')}`, {
            cwd: process.cwd(),
            stdio: 'inherit'
          });
          
          log(`Dependencies installed for ${project.name}`, 'runtime');
        } catch (error) {
          log(`Error installing dependencies: ${error}`, 'runtime');
          // Continue anyway as the project might still run
        }
      }
    }
    
    // Start the project
    const { command, args } = config.startCommand(
      path.join(projectDir, mainFile),
      projectDir
    );
    
    log(`Starting ${project.name} (${language}) with command: ${command} ${args.join(' ')}`, 'runtime');
    
    // Assign a port in the 3000-3999 range to avoid conflicts
    const port = 3000 + (projectId % 1000);
    
    // Set environment variables
    const env = {
      ...process.env,
      PORT: port.toString(),
      PROJECT_DIR: projectDir,
      NODE_ENV: 'development'
    };
    
    // Spawn the process
    const proc = spawn(command, args, {
      cwd: projectDir,
      env,
      shell: true,
      stdio: 'pipe'
    });
    
    // Store the process
    runningProcesses.set(projectId, {
      process: proc,
      language,
      port
    });
    
    // Handle process exit
    proc.on('exit', (code) => {
      log(`Project ${project.name} (${language}) exited with code ${code}`, 'runtime');
      runningProcesses.delete(projectId);
    });
    
    // Success
    return {
      success: true,
      language,
      port
    };
  } catch (error) {
    log(`Error starting project: ${error}`, 'runtime');
    return { success: false, error: String(error) };
  }
}

// Stop a running project
export async function stopProject(projectId: number): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const runningProject = runningProcesses.get(projectId);
    
    if (!runningProject) {
      return { success: false, error: 'Project is not running' };
    }
    
    // Kill the process
    if (process.platform === 'win32') {
      runningProject.process.kill();
    } else {
      // On Unix-like systems, kill the entire process group
      if (runningProject.process.pid) {
        process.kill(-runningProject.process.pid, 'SIGTERM');
      }
    }
    
    // Remove from running processes
    runningProcesses.delete(projectId);
    
    return { success: true };
  } catch (error) {
    log(`Error stopping project: ${error}`, 'runtime');
    return { success: false, error: String(error) };
  }
}

// Get status of a running project
export function getProjectStatus(projectId: number): {
  running: boolean;
  language?: string;
  port?: number;
} {
  const runningProject = runningProcesses.get(projectId);
  
  if (!runningProject) {
    return { running: false };
  }
  
  return {
    running: true,
    language: runningProject.language,
    port: runningProject.port
  };
}

// Get logs from a running project
export function attachToProjectLogs(
  projectId: number,
  onStdout: (data: string) => void,
  onStderr: (data: string) => void
): () => void {
  const runningProject = runningProcesses.get(projectId);
  
  if (!runningProject) {
    onStderr('Project is not running');
    return () => {};
  }
  
  const { process } = runningProject;
  
  // Attach listeners
  const stdoutListener = (data: Buffer) => {
    onStdout(data.toString());
  };
  
  const stderrListener = (data: Buffer) => {
    onStderr(data.toString());
  };
  
  process.stdout.on('data', stdoutListener);
  process.stderr.on('data', stderrListener);
  
  // Return function to detach listeners
  return () => {
    process.stdout.removeListener('data', stdoutListener);
    process.stderr.removeListener('data', stderrListener);
  };
}