import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { storage } from '../storage';
import { sandboxExecutor } from '../sandbox/sandbox-executor';
// import { RuntimeManager } from '../runtimes/runtime-manager';

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
  constructor() {
    super();
  }

  async execute(options: ExecutionOptions): Promise<ExecutionResult> {
    const { projectId, userId, language, mainFile, stdin, timeout = 30000, env = {} } = options;
    const executionId = `${projectId}-${userId}-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Initialize sandbox executor if not already done
      await sandboxExecutor.initialize();

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
      
      // Convert files to sandbox format
      const sandboxFiles: { [path: string]: string } = {};
      for (const file of files) {
        if (file.name !== entryFile && !file.isFolder && file.content !== null) {
          sandboxFiles[file.name] = file.content;
        }
      }
      
      // Normalize language names for sandbox
      let sandboxLanguage = language;
      if (language === 'nodejs') {
        sandboxLanguage = 'javascript';
      }
      
      // Execute in sandbox
      const sandboxResult = await sandboxExecutor.execute({
        language: sandboxLanguage,
        code: mainFileRecord.content,
        files: sandboxFiles,
        stdin: stdin,
        env: envVars,
        timeout: Math.floor(timeout / 1000), // Convert to seconds
        securityPolicy: 'standard' // Use standard policy by default
      });
      
      // Convert sandbox result to execution result
      return {
        stdout: sandboxResult.stdout,
        stderr: sandboxResult.stderr,
        exitCode: sandboxResult.exitCode,
        executionTime: sandboxResult.executionTime * 1000, // Convert to milliseconds
        error: sandboxResult.error,
        timedOut: sandboxResult.executionTime >= (timeout / 1000)
      };
    } catch (error) {
      return {
        stdout: '',
        stderr: error instanceof Error ? error.message : 'Unknown error',
        exitCode: 1,
        executionTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async stop(executionId: string): Promise<boolean> {
    const execution = this.executingProcesses.get(executionId);
    if (!execution || !execution.isRunning) {
      return false;
    }

    execution.process.kill('SIGTERM');
    
    // Give process time to terminate gracefully
    setTimeout(() => {
      if (execution.isRunning) {
        execution.process.kill('SIGKILL');
      }
    }, 1000);

    return true;
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