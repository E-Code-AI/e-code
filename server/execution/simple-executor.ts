import { spawn, ChildProcess } from 'child_process';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventEmitter } from 'events';
import { storage } from '../storage';
import { createLogger } from '../utils/logger';

const logger = createLogger('simple-executor');

export interface SimpleExecutionOptions {
  projectId: number;
  userId: number;
  language: string;
  mainFile?: string;
  stdin?: string;
  timeout?: number;
  env?: Record<string, string>;
}

export interface SimpleExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionTime: number;
  error?: string;
  timedOut?: boolean;
  isWebProject?: boolean;
  previewUrl?: string;
}

export class SimpleCodeExecutor extends EventEmitter {
  private executingProcesses: Map<string, {
    process: ChildProcess;
    stdout: string[];
    stderr: string[];
    startTime: number;
  }> = new Map();

  private tempDir = path.join(process.cwd(), '.temp-execution');

  constructor() {
    super();
    this.ensureTempDir();
  }

  private async ensureTempDir() {
    try {
      await fs.mkdir(this.tempDir, { recursive: true });
    } catch (error) {
      logger.error('Failed to create temp directory:', error);
    }
  }

  async execute(options: SimpleExecutionOptions): Promise<SimpleExecutionResult> {
    const { projectId, userId, language, mainFile, stdin, timeout = 30000, env = {} } = options;
    const executionId = `${projectId}-${userId}-${Date.now()}`;
    const startTime = Date.now();

    try {
      // Get project files
      const files = await storage.getFilesByProject(projectId);
      
      // Check if this is a web project (HTML/CSS/JavaScript)
      const hasHtml = files.some(f => f.name.endsWith('.html'));
      const hasWebFiles = files.some(f => 
        f.name.endsWith('.html') || 
        f.name.endsWith('.css') || 
        (f.name.endsWith('.js') && hasHtml)
      );

      if (hasWebFiles || language === 'html') {
        // For web projects, return preview URL
        const mainHtmlFile = files.find(f => f.name === 'index.html') || 
                           files.find(f => f.name.endsWith('.html'));
        
        return {
          stdout: 'Web project ready for preview',
          stderr: '',
          exitCode: 0,
          executionTime: Date.now() - startTime,
          isWebProject: true,
          previewUrl: mainHtmlFile ? `/${mainHtmlFile.name}` : '/index.html'
        };
      }

      // Create project directory
      const projectDir = path.join(this.tempDir, executionId);
      await fs.mkdir(projectDir, { recursive: true });

      // Write all files to temp directory
      for (const file of files) {
        if (!file.isFolder && file.content !== null) {
          const filePath = path.join(projectDir, file.name);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, file.content);
        }
      }

      // Get environment variables
      const projectEnvVars = await storage.getEnvironmentVariables(projectId);
      const envVars = { ...process.env, ...env };
      
      for (const envVar of projectEnvVars) {
        if (!envVar.isSecret || env[envVar.key]) {
          envVars[envVar.key] = envVar.value;
        }
      }

      // Determine the command to run based on language
      const entryFile = mainFile || this.getEntryFile(files, language);
      const command = this.getCommand(language, entryFile);

      if (!command) {
        throw new Error(`Unsupported language: ${language}`);
      }

      // Execute the code
      return await this.runCommand(
        command,
        projectDir,
        envVars,
        timeout,
        executionId,
        stdin
      );

    } catch (error) {
      logger.error(`Execution failed for ${executionId}:`, error);
      return {
        stdout: '',
        stderr: String(error),
        exitCode: 1,
        executionTime: Date.now() - startTime,
        error: String(error)
      };
    } finally {
      // Cleanup
      try {
        const projectDir = path.join(this.tempDir, executionId);
        await fs.rm(projectDir, { recursive: true, force: true });
      } catch (error) {
        logger.error('Cleanup failed:', error);
      }
    }
  }

  private async runCommand(
    command: { cmd: string; args: string[] },
    cwd: string,
    env: NodeJS.ProcessEnv,
    timeout: number,
    executionId: string,
    stdin?: string
  ): Promise<SimpleExecutionResult> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const stdout: string[] = [];
      const stderr: string[] = [];

      const child = spawn(command.cmd, command.args, {
        cwd,
        env,
        shell: false
      });

      const execution = {
        process: child,
        stdout,
        stderr,
        startTime
      };

      this.executingProcesses.set(executionId, execution);

      // Set timeout
      const timer = setTimeout(() => {
        // Attempt graceful termination
        child.kill('SIGTERM');
        
        // Use process.nextTick to check if process needs force kill
        const forceKillCheck = setInterval(() => {
          if (child.killed) {
            clearInterval(forceKillCheck);
          } else {
            child.kill('SIGKILL');
            clearInterval(forceKillCheck);
          }
        }, 100); // Check every 100ms instead of fixed 1s delay
      }, timeout);

      // Handle stdin
      if (stdin) {
        child.stdin.write(stdin);
        child.stdin.end();
      }

      // Collect output
      child.stdout.on('data', (data) => {
        const str = data.toString();
        stdout.push(str);
        this.emit('output', { executionId, type: 'stdout', data: str });
      });

      child.stderr.on('data', (data) => {
        const str = data.toString();
        stderr.push(str);
        this.emit('output', { executionId, type: 'stderr', data: str });
      });

      // Handle completion
      child.on('close', (code) => {
        clearTimeout(timer);
        this.executingProcesses.delete(executionId);

        const executionTime = Date.now() - startTime;
        const timedOut = executionTime >= timeout;

        resolve({
          stdout: stdout.join(''),
          stderr: stderr.join(''),
          exitCode: code,
          executionTime,
          timedOut
        });
      });

      child.on('error', (error) => {
        clearTimeout(timer);
        this.executingProcesses.delete(executionId);

        resolve({
          stdout: stdout.join(''),
          stderr: stderr.join('') + '\n' + error.message,
          exitCode: 1,
          executionTime: Date.now() - startTime,
          error: error.message
        });
      });
    });
  }

  async stop(executionId: string): Promise<boolean> {
    const execution = this.executingProcesses.get(executionId);
    if (!execution) {
      return false;
    }

    execution.process.kill('SIGTERM');
    
    // Use interval to check if process needs force kill
    const forceKillCheck = setInterval(() => {
      if (execution.process.killed) {
        clearInterval(forceKillCheck);
      } else {
        execution.process.kill('SIGKILL');
        clearInterval(forceKillCheck);
      }
    }, 100); // Check every 100ms for quicker response

    this.executingProcesses.delete(executionId);
    return true;
  }

  private getCommand(language: string, entryFile: string): { cmd: string; args: string[] } | null {
    const languageCommands: Record<string, (file: string) => { cmd: string; args: string[] }> = {
      javascript: (file) => ({ cmd: 'node', args: [file] }),
      nodejs: (file) => ({ cmd: 'node', args: [file] }),
      typescript: (file) => ({ cmd: 'tsx', args: [file] }),
      python: (file) => ({ cmd: 'python3', args: [file] }),
      ruby: (file) => ({ cmd: 'ruby', args: [file] }),
      go: (file) => ({ cmd: 'go', args: ['run', file] }),
      rust: (file) => ({ cmd: 'cargo', args: ['run'] }),
      java: (file) => ({ cmd: 'java', args: [file.replace('.java', '')] }),
      cpp: (file) => ({ cmd: 'g++', args: [file, '-o', 'a.out', '&&', './a.out'] }),
      c: (file) => ({ cmd: 'gcc', args: [file, '-o', 'a.out', '&&', './a.out'] }),
      php: (file) => ({ cmd: 'php', args: [file] }),
      bash: (file) => ({ cmd: 'bash', args: [file] }),
      shell: (file) => ({ cmd: 'sh', args: [file] })
    };

    const getCmd = languageCommands[language.toLowerCase()];
    return getCmd ? getCmd(entryFile) : null;
  }

  private getEntryFile(files: any[], language: string): string {
    const entryFiles: Record<string, string[]> = {
      javascript: ['index.js', 'main.js', 'app.js'],
      nodejs: ['index.js', 'main.js', 'app.js', 'server.js'],
      typescript: ['index.ts', 'main.ts', 'app.ts'],
      python: ['main.py', 'app.py', '__main__.py', 'index.py'],
      ruby: ['main.rb', 'app.rb'],
      go: ['main.go'],
      rust: ['main.rs'],
      java: ['Main.java', 'App.java'],
      cpp: ['main.cpp', 'app.cpp'],
      c: ['main.c', 'app.c'],
      php: ['index.php', 'main.php'],
      html: ['index.html'],
      bash: ['main.sh', 'run.sh'],
      shell: ['main.sh', 'run.sh']
    };

    const possibleEntries = entryFiles[language.toLowerCase()] || [];
    
    for (const entry of possibleEntries) {
      if (files.some(f => f.name === entry && !f.isFolder)) {
        return entry;
      }
    }

    // Fallback to first file with appropriate extension
    const extensions: Record<string, string[]> = {
      javascript: ['.js'],
      nodejs: ['.js'],
      typescript: ['.ts'],
      python: ['.py'],
      ruby: ['.rb'],
      go: ['.go'],
      rust: ['.rs'],
      java: ['.java'],
      cpp: ['.cpp', '.cc', '.cxx'],
      c: ['.c'],
      php: ['.php'],
      html: ['.html'],
      bash: ['.sh'],
      shell: ['.sh']
    };

    const validExts = extensions[language.toLowerCase()] || [];
    const firstValidFile = files.find(f => 
      !f.isFolder && validExts.some(ext => f.name.endsWith(ext))
    );

    return firstValidFile ? firstValidFile.name : '';
  }
}

// Export singleton instance
export const simpleCodeExecutor = new SimpleCodeExecutor();