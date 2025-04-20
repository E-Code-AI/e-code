/**
 * Runtime manager for PLOT
 * This module coordinates all runtime components including containers and Nix environments
 */

import * as fs from 'fs';
import * as path from 'path';
import { Language, languageConfigs, getLanguageByExtension, getDefaultFiles } from './languages';
import * as containerManager from './container-manager';
import * as nixManager from './nix-manager';
import { createLogger } from '../utils/logger';
import { Project, File } from '@shared/schema';

const logger = createLogger('runtime');

// Map to track active project runtimes
const activeRuntimes: Map<number, {
  projectId: number;
  language: Language;
  containerId?: string;
  port?: number;
  status: 'starting' | 'running' | 'stopped' | 'error';
  logs: string[];
  error?: string;
}> = new Map();

// Interface for starting a project
export interface StartProjectOptions {
  environmentVariables?: Record<string, string>;
  port?: number;
  useNix?: boolean;
  nixOptions?: {
    packages?: string[];
    buildInputs?: string[];
    shellHook?: string;
    environmentVariables?: Record<string, string>;
  };
}

/**
 * Start a project runtime
 */
export async function startProject(
  project: Project,
  files: File[],
  options: StartProjectOptions = {}
): Promise<{
  success: boolean;
  port?: number;
  containerId?: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  logs: string[];
  error?: string;
}> {
  try {
    const projectId = project.id;
    
    // Check if project is already running
    if (activeRuntimes.has(projectId)) {
      const runtime = activeRuntimes.get(projectId)!;
      
      // If it's already running, return the current status
      if (runtime.status === 'running') {
        return {
          success: true,
          port: runtime.port,
          containerId: runtime.containerId,
          status: runtime.status,
          logs: runtime.logs
        };
      }
      
      // If it's in an error state, clean it up and restart
      if (runtime.status === 'error' && runtime.containerId) {
        await containerManager.stopContainer(runtime.containerId);
        activeRuntimes.delete(projectId);
      }
    }
    
    // Create project directory
    const projectDir = await createProjectDir(project, files);
    
    // Detect language from files
    const language = detectProjectLanguage(files);
    
    if (!language) {
      const error = 'Could not detect language for project';
      log(error, 'runtime', 'error');
      
      return {
        success: false,
        status: 'error',
        logs: [error],
        error
      };
    }
    
    log(`Starting project ${projectId} with language ${language}`, 'runtime');
    
    // Initialize runtime logs
    const logs: string[] = [`Starting ${languageConfigs[language].displayName} project...`];
    
    // Set up initial runtime entry
    activeRuntimes.set(projectId, {
      projectId,
      language,
      status: 'starting',
      logs
    });
    
    // Set up Nix environment if requested
    if (options.useNix) {
      logs.push('Setting up Nix environment...');
      
      const nixResult = await nixManager.generateNixConfig(
        projectDir,
        language,
        options.nixOptions
      );
      
      if (!nixResult) {
        const error = 'Failed to generate Nix configuration';
        logs.push(`ERROR: ${error}`);
        log(error, 'runtime', 'error');
        
        activeRuntimes.set(projectId, {
          projectId,
          language,
          status: 'error',
          logs,
          error
        });
        
        return {
          success: false,
          status: 'error',
          logs,
          error
        };
      }
      
      logs.push('Applying Nix environment...');
      
      const applyResult = await nixManager.applyNixEnvironment(projectDir);
      
      if (!applyResult.success) {
        const error = 'Failed to apply Nix environment';
        logs.push(`ERROR: ${error}`);
        log(error, 'runtime', 'error');
        
        activeRuntimes.set(projectId, {
          projectId,
          language,
          status: 'error',
          logs,
          error
        });
        
        return {
          success: false,
          status: 'error',
          logs,
          error
        };
      }
      
      logs.push('Nix environment set up successfully');
    }
    
    // Start container
    logs.push(`Starting ${languageConfigs[language].displayName} container...`);
    
    const containerResult = await containerManager.createContainer({
      projectId,
      language,
      projectDir,
      environmentVariables: options.environmentVariables,
      port: options.port
    });
    
    if (containerResult.status === 'error') {
      const error = containerResult.error || 'Failed to start container';
      logs.push(...containerResult.logs);
      log(error, 'runtime', 'error');
      
      activeRuntimes.set(projectId, {
        projectId,
        language,
        status: 'error',
        logs,
        error
      });
      
      return {
        success: false,
        status: 'error',
        logs,
        error
      };
    }
    
    logs.push(...containerResult.logs);
    logs.push('Container started successfully');
    
    // Install dependencies
    logs.push('Installing dependencies...');
    
    const installResult = await containerManager.installDependencies(
      containerResult.containerId,
      language
    );
    
    if (!installResult) {
      logs.push('WARNING: Dependency installation may not have completed successfully');
      log('Dependency installation may not have completed successfully', 'runtime', 'warn');
    } else {
      logs.push('Dependencies installed successfully');
    }
    
    // Update runtime status
    activeRuntimes.set(projectId, {
      projectId,
      language,
      containerId: containerResult.containerId,
      port: containerResult.port,
      status: 'running',
      logs
    });
    
    return {
      success: true,
      port: containerResult.port,
      containerId: containerResult.containerId,
      status: 'running',
      logs
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error starting project: ${errorMessage}`, 'runtime', 'error');
    
    return {
      success: false,
      status: 'error',
      logs: [`ERROR: ${errorMessage}`],
      error: errorMessage
    };
  }
}

/**
 * Stop a project runtime
 */
export async function stopProject(projectId: number): Promise<boolean> {
  try {
    log(`Stopping project ${projectId}`, 'runtime');
    
    if (!activeRuntimes.has(projectId)) {
      log(`Project ${projectId} is not running`, 'runtime', 'warn');
      return false;
    }
    
    const runtime = activeRuntimes.get(projectId)!;
    
    if (!runtime.containerId) {
      log(`Project ${projectId} does not have a container ID`, 'runtime', 'warn');
      activeRuntimes.delete(projectId);
      return false;
    }
    
    // Stop the container
    const result = await containerManager.stopContainer(runtime.containerId);
    
    if (result) {
      log(`Project ${projectId} stopped successfully`, 'runtime');
      runtime.status = 'stopped';
      activeRuntimes.delete(projectId);
      return true;
    } else {
      log(`Failed to stop project ${projectId}`, 'runtime', 'error');
      runtime.status = 'error';
      runtime.error = 'Failed to stop container';
      return false;
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error stopping project: ${errorMessage}`, 'runtime', 'error');
    return false;
  }
}

/**
 * Get the status of a project runtime
 */
export function getProjectStatus(projectId: number): {
  isRunning: boolean;
  language?: Language;
  containerId?: string;
  port?: number;
  status: 'starting' | 'running' | 'stopped' | 'error' | 'unknown';
  logs: string[];
  error?: string;
} {
  if (!activeRuntimes.has(projectId)) {
    return {
      isRunning: false,
      status: 'unknown',
      logs: []
    };
  }
  
  const runtime = activeRuntimes.get(projectId)!;
  
  return {
    isRunning: runtime.status === 'running',
    language: runtime.language,
    containerId: runtime.containerId,
    port: runtime.port,
    status: runtime.status,
    logs: runtime.logs,
    error: runtime.error
  };
}

/**
 * Execute a command in a project runtime
 */
export async function executeCommand(projectId: number, command: string): Promise<{
  success: boolean;
  output: string;
}> {
  try {
    log(`Executing command in project ${projectId}: ${command}`, 'runtime');
    
    if (!activeRuntimes.has(projectId)) {
      const errorMessage = `Project ${projectId} is not running`;
      log(errorMessage, 'runtime', 'error');
      
      return {
        success: false,
        output: `ERROR: ${errorMessage}`
      };
    }
    
    const runtime = activeRuntimes.get(projectId)!;
    
    if (!runtime.containerId) {
      const errorMessage = `Project ${projectId} does not have a container ID`;
      log(errorMessage, 'runtime', 'error');
      
      return {
        success: false,
        output: `ERROR: ${errorMessage}`
      };
    }
    
    // Execute the command in the container
    const result = await containerManager.executeCommand(
      runtime.containerId,
      command
    );
    
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    log(`Error executing command: ${errorMessage}`, 'runtime', 'error');
    
    return {
      success: false,
      output: `ERROR: ${errorMessage}`
    };
  }
}

/**
 * Stream project logs
 */
export function streamProjectLogs(projectId: number, callback: (log: string) => void): () => void {
  if (!activeRuntimes.has(projectId)) {
    callback(`ERROR: Project ${projectId} is not running`);
    return () => {};
  }
  
  const runtime = activeRuntimes.get(projectId)!;
  
  // Send existing logs
  runtime.logs.forEach(log => callback(log));
  
  if (!runtime.containerId) {
    callback(`ERROR: Project ${projectId} does not have a container ID`);
    return () => {};
  }
  
  // Stream container logs
  return containerManager.streamContainerLogs(runtime.containerId, callback);
}

/**
 * Check if runtime dependencies are available
 */
export async function checkRuntimeDependencies(): Promise<{
  docker: boolean;
  nix: boolean;
}> {
  const [docker, nix] = await Promise.all([
    containerManager.checkDockerAvailability(),
    nixManager.checkNixAvailability()
  ]);
  
  return { docker, nix };
}

/**
 * Create a project directory with all files
 */
async function createProjectDir(project: Project, files: File[]): Promise<string> {
  const projectDir = path.join(process.cwd(), 'projects', `project-${project.id}`);
  
  // Create project directory if it doesn't exist
  if (!fs.existsSync(projectDir)) {
    fs.mkdirSync(projectDir, { recursive: true });
  }
  
  // Write all files to the project directory
  for (const file of files) {
    // Skip folders - we'll create them when writing files
    if (file.isFolder) continue;
    
    // Make sure parent directories exist
    const filePath = path.join(projectDir, file.name);
    const fileDir = path.dirname(filePath);
    
    if (!fs.existsSync(fileDir)) {
      fs.mkdirSync(fileDir, { recursive: true });
    }
    
    // Write file content
    fs.writeFileSync(filePath, file.content || '');
  }
  
  return projectDir;
}

/**
 * Detect the primary language of a project
 */
function detectProjectLanguage(files: File[]): Language | undefined {
  // Filter out folder entries
  const nonFolderFiles = files.filter(file => !file.isFolder);
  
  // If no files, return undefined
  if (nonFolderFiles.length === 0) return undefined;
  
  // Check for common main files
  const mainFileChecks: [string, Language][] = [
    ['package.json', 'nodejs'],
    ['tsconfig.json', 'typescript'],
    ['requirements.txt', 'python'],
    ['Cargo.toml', 'rust'],
    ['pom.xml', 'java'],
    ['build.gradle', 'java'],
    ['go.mod', 'go'],
    ['Gemfile', 'ruby'],
    ['composer.json', 'php'],
    ['*.csproj', 'csharp'],
    ['CMakeLists.txt', 'cpp'],
    ['pubspec.yaml', 'dart'],
    ['*.kt', 'kotlin'],
    ['*.swift', 'swift'],
    ['index.html', 'html-css-js'],
    ['replit.nix', 'nix']
  ];
  
  for (const [pattern, language] of mainFileChecks) {
    // Handle glob patterns
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace(/\*/g, '.*'));
      
      for (const file of nonFolderFiles) {
        if (regex.test(file.name)) {
          return language;
        }
      }
    } else {
      // Direct match
      for (const file of nonFolderFiles) {
        if (file.name === pattern) {
          return language;
        }
      }
    }
  }
  
  // Count file extensions
  const extensionCounts: Record<string, number> = {};
  
  for (const file of nonFolderFiles) {
    const language = getLanguageByExtension(file.name);
    
    if (language) {
      extensionCounts[language] = (extensionCounts[language] || 0) + 1;
    }
  }
  
  // Find the most common language
  let maxCount = 0;
  let detectedLanguage: Language | undefined;
  
  for (const [language, count] of Object.entries(extensionCounts)) {
    if (count > maxCount) {
      maxCount = count;
      detectedLanguage = language as Language;
    }
  }
  
  return detectedLanguage;
}

/**
 * Create a new project with default files for a language
 */
export function createDefaultProject(language: Language): { name: string, content: string, isFolder: boolean }[] {
  return getDefaultFiles(language);
}