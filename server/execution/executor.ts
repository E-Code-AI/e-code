import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { storage } from '../storage';
import { containerOrchestrator } from '../orchestration/container-orchestrator';
import { createLogger } from '../utils/logger';
import { nixPackageManager } from '../package-management/nix-package-manager';

const logger = createLogger('executor');

export interface ExecutionOptions {
  projectId: number;
  userId: number;
  language: string;
  mainFile?: string;
  stdin?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  error?: string;
  timedOut?: boolean;
}

export interface ExecutionProcess {
  id: string;
  projectId: number;
  userId: number;
  process: ChildProcess;
  startTime: number;
  output: string[];
  errors: string[];
  isRunning: boolean;
}

export class CodeExecutor extends EventEmitter {
  private executingProcesses: Map<string, ExecutionProcess> = new Map();
  private taskToExecution: Map<string, string> = new Map(); // Maps task ID to execution ID
  private executionToTask: Map<string, string> = new Map(); // Maps execution ID to task ID
  
  constructor() {
    super();
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const { projectId, userId, language, mainFile, stdin, timeout = 30000, env = {} } = options;
    const executionId = `${projectId}-${userId}-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Initialize container orchestrator if not already done
      await containerOrchestrator.initialize();

      // Get project files
      const files = await storage.getFilesByProject(projectId);
      
      // Get environment variables for the project
      const projectEnvVars = await storage.getEnvironmentVariables(projectId);
      const envVars = { ...env };
      
      // Add project environment variables
      for (const envVar of projectEnvVars) {
        if (!envVar.isSecret || env[envVar.key]) {
          envVars[envVar.key] = envVar.value;
        }
      }
      
      // Determine the main file to execute
      const entryFile = mainFile || this.getEntryFile(files, language);
      
      // Find the main file content
      const mainFileRecord = files.find(f => f.name === entryFile);
      if (!mainFileRecord || mainFileRecord.content === null) {
        throw new Error(`Main file ${entryFile} not found or has no content`);
      }
      
      // Convert files to orchestrator format
      const taskFiles: Record<string, string> = {};
      for (const file of files) {
        if (file.name !== entryFile && !file.isFolder && file.content !== null) {
          taskFiles[file.name] = file.content;
        }
      }
      
      // Normalize language names
      let taskLanguage = language;
      if (language === 'nodejs') {
        taskLanguage = 'javascript';
      }
      
      // Get installed packages for the project
      const packages = await nixPackageManager.getInstalledPackages(String(projectId));
      const packageNames = packages.map(pkg => pkg.name);
      
      // Submit task to container orchestrator
      const taskId = await containerOrchestrator.submitTask(
        String(projectId),
        userId,
        taskLanguage,
        mainFileRecord.content,
        taskFiles,
        {
          env: envVars,
          timeout: Math.floor(timeout / 1000), // Convert to seconds
          memoryLimit: 512, // Default 512MB
          cpuLimit: 1, // Default 1 CPU
          networkEnabled: false, // Network disabled by default for security
          packages: packageNames // Pass packages for Nix environment
        }
      );
      
      // Store task mapping
      this.taskToExecution.set(taskId, executionId);
      this.executionToTask.set(executionId, taskId);
      
      // Wait for task completion
      let task = await containerOrchestrator.getTaskStatus(taskId);
      while (task && ['pending', 'scheduled', 'preparing', 'running'].includes(task.status)) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Poll every 100ms
        task = await containerOrchestrator.getTaskStatus(taskId);
      }
      
      if (!task || !task.result) {
        throw new Error('Task execution failed or was cancelled');
      }
      
      // Convert task result to execution result
      return {
        stdout: task.result.stdout,
        stderr: task.result.stderr,
        exitCode: task.result.exitCode,
        executionTime: task.result.executionTime * 1000, // Convert to milliseconds
        error: task.status === 'failed' ? task.result.stderr : undefined,
        timedOut: task.status === 'timeout'
      };
      
    } catch (error) {
      logger.error(`Execution failed for ${executionId}:`, String(error));
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      // Clean up mappings
      const taskId = this.executionToTask.get(executionId);
      if (taskId) {
        this.taskToExecution.delete(taskId);
        this.executionToTask.delete(executionId);
      }
    }
  }

  async stop(executionId: string): Promise<boolean> {
    // Get the task ID for this execution
    const taskId = this.executionToTask.get(executionId);
    if (!taskId) {
      return false;
    }

    // Cancel the task in the orchestrator
    const cancelled = await containerOrchestrator.cancelTask(taskId);
    
    if (cancelled) {
      // Clean up mappings
      this.taskToExecution.delete(taskId);
      this.executionToTask.delete(executionId);
    }

    return cancelled;
  }

  getRunningProcesses(userId?: number): ExecutionProcess[] {
    const processes = Array.from(this.executingProcesses.values());
    if (userId) {
      return processes.filter(p => p.userId === userId && p.isRunning);
    }
    return processes.filter(p => p.isRunning);
  }

  private async createTempDirectory(executionId: string): Promise<string> {
    const tempBase = path.join(process.cwd(), '.executions');
    await fs.mkdir(tempBase, { recursive: true });
    
    const tempDir = path.join(tempBase, executionId);
    await fs.mkdir(tempDir, { recursive: true });
    
    return tempDir;
  }

  private async writeFilesToDirectory(files: any[], directory: string): Promise<void> {
    // Create folder structure
    const folders = files.filter(f => f.isFolder);
    for (const folder of folders) {
      const folderPath = path.join(directory, folder.name);
      await fs.mkdir(folderPath, { recursive: true });
    }

    // Write files
    const regularFiles = files.filter(f => !f.isFolder);
    for (const file of regularFiles) {
      const filePath = path.join(directory, file.name);
      await fs.writeFile(filePath, file.content || '');
    }
  }

  private getEntryFile(files: any[], language: string): string {
    // Common entry file names by language
    const entryFiles: Record<string, string[]> = {
      nodejs: ['index.js', 'app.js', 'server.js', 'main.js'],
      python: ['main.py', 'app.py', 'index.py', '__main__.py'],
      java: ['Main.java', 'App.java'],
      go: ['main.go'],
      ruby: ['main.rb', 'app.rb'],
      rust: ['main.rs', 'lib.rs'],
      php: ['index.php', 'app.php'],
      c: ['main.c'],
      cpp: ['main.cpp', 'main.cc'],
      csharp: ['Program.cs'],
      typescript: ['index.ts', 'app.ts', 'main.ts'],
      bash: ['main.sh', 'run.sh', 'start.sh']
    };

    const possibleEntries = entryFiles[language] || [];
    
    for (const entry of possibleEntries) {
      if (files.some(f => !f.isFolder && f.name === entry)) {
        return entry;
      }
    }

    // If no standard entry file found, use the first file of that language
    const extension = this.getExtensionForLanguage(language);
    const firstFile = files.find(f => !f.isFolder && f.name.endsWith(extension));
    
    if (firstFile) {
      return firstFile.name;
    }

    throw new Error(`No entry file found for language: ${language}`);
  }

  private getExtensionForLanguage(language: string): string {
    const extensions: Record<string, string> = {
      nodejs: '.js',
      python: '.py',
      java: '.java',
      go: '.go',
      ruby: '.rb',
      rust: '.rs',
      php: '.php',
      c: '.c',
      cpp: '.cpp',
      csharp: '.cs',
      typescript: '.ts',
      bash: '.sh'
    };

    return extensions[language] || '.txt';
  }

  private async runCommand(
    command: string,
    cwd: string,
    env: Record<string, string | undefined>,
    stdin?: string,
    timeout?: number,
    executionId?: string,
    projectId?: number,
    userId?: number
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const output: string[] = [];
      const errors: string[] = [];

      const [cmd, ...args] = command.split(' ');
      const process = spawn(cmd, args, {
        cwd,
        env,
        shell: true
      });

      if (executionId && projectId !== undefined && userId !== undefined) {
        this.executingProcesses.set(executionId, {
          id: executionId,
          projectId,
          userId,
          process,
          startTime,
          output,
          errors,
          isRunning: true
        });
      }

      // Handle stdin
      if (stdin) {
        process.stdin.write(stdin);
        process.stdin.end();
      }

      // Collect stdout
      process.stdout.on('data', (data) => {
        const text = data.toString();
        output.push(text);
        this.emit('output', { executionId, type: 'stdout', data: text });
      });

      // Collect stderr
      process.stderr.on('data', (data) => {
        const text = data.toString();
        errors.push(text);
        this.emit('output', { executionId, type: 'stderr', data: text });
      });

      // Set timeout
      let timeoutId: NodeJS.Timeout | undefined;
      if (timeout) {
        timeoutId = setTimeout(() => {
          process.kill('SIGTERM');
          setTimeout(() => {
            if (process.exitCode === null) {
              process.kill('SIGKILL');
            }
          }, 1000);
        }, timeout);
      }

      // Handle process exit
      process.on('exit', (code) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const execution = executionId ? this.executingProcesses.get(executionId) : undefined;
        if (execution) {
          execution.isRunning = false;
        }

        const executionTime = Date.now() - startTime;
        const timedOut = timeout ? executionTime >= timeout : false;

        resolve({
          stdout: output.join(''),
          stderr: errors.join(''),
          exitCode: code,
          executionTime,
          timedOut
        });

        this.emit('complete', { executionId, exitCode: code });
      });

      // Handle process error
      process.on('error', (error) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        const execution = executionId ? this.executingProcesses.get(executionId) : undefined;
        if (execution) {
          execution.isRunning = false;
        }

        resolve({
          stdout: output.join(''),
          stderr: errors.join(''),
          exitCode: 1,
          executionTime: Date.now() - startTime,
          error: error.message
        });

        this.emit('error', { executionId, error: error.message });
      });
    });
  }

  private async cleanupTempDirectory(directory: string): Promise<void> {
    try {
      await fs.rm(directory, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to cleanup temp directory:', error);
    }
  }
}

// Singleton instance
export const codeExecutor = new CodeExecutor();