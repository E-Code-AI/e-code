// @ts-nocheck
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export interface ExecutionOptions {
  timeout?: number;
  maxMemory?: number;
  input?: string;
  files?: Record<string, string>;
}

export interface ExecutionResult {
  output: string;
  error?: string;
  executionTime: number;
  memoryUsed: number;
  exitCode: number;
}

export class CodeExecutor {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'e-code-executor');
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  async execute(language: string, code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout || 30000; // 30 seconds default
    const maxMemory = options.maxMemory || 128 * 1024 * 1024; // 128MB default

    try {
      // Create execution directory
      const execId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const execDir = path.join(this.tempDir, execId);
      mkdirSync(execDir, { recursive: true });

      // Write files
      if (options.files) {
        for (const [fileName, content] of Object.entries(options.files)) {
          const filePath = path.join(execDir, fileName);
          const fileDir = path.dirname(filePath);
          if (!existsSync(fileDir)) {
            mkdirSync(fileDir, { recursive: true });
          }
          writeFileSync(filePath, content);
        }
      }

      // Get execution command and main file
      const { command, mainFile } = this.getExecutionCommand(language, code, execDir);
      
      // Write main file
      writeFileSync(path.join(execDir, mainFile), code);

      // Execute code
      const result = await this.runCommand(command, execDir, {
        timeout,
        maxMemory,
        input: options.input
      });

      const executionTime = Date.now() - startTime;

      return {
        output: result.stdout,
        error: result.stderr || undefined,
        executionTime,
        memoryUsed: result.memoryUsed || 0,
        exitCode: result.exitCode || 0
      };

    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      return {
        output: '',
        error: error.message || 'Execution failed',
        executionTime,
        memoryUsed: 0,
        exitCode: 1
      };
    }
  }

  private getExecutionCommand(language: string, code: string, execDir: string): { command: string; mainFile: string } {
    switch (language.toLowerCase()) {
      case 'javascript':
      case 'js':
        return {
          command: 'node main.js',
          mainFile: 'main.js'
        };
      
      case 'python':
      case 'python3':
        return {
          command: 'python3 main.py',
          mainFile: 'main.py'
        };
      
      case 'java':
        return {
          command: 'javac Main.java && java Main',
          mainFile: 'Main.java'
        };
      
      case 'cpp':
      case 'c++':
        return {
          command: 'g++ -o main main.cpp && ./main',
          mainFile: 'main.cpp'
        };
      
      case 'c':
        return {
          command: 'gcc -o main main.c && ./main',
          mainFile: 'main.c'
        };
      
      case 'go':
        return {
          command: 'go run main.go',
          mainFile: 'main.go'
        };
      
      case 'rust':
        return {
          command: 'rustc main.rs && ./main',
          mainFile: 'main.rs'
        };
      
      case 'php':
        return {
          command: 'php main.php',
          mainFile: 'main.php'
        };
      
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  private async runCommand(
    command: string, 
    cwd: string, 
    options: { timeout: number; maxMemory: number; input?: string }
  ): Promise<{ stdout: string; stderr: string; exitCode: number; memoryUsed: number }> {
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout);

    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        signal: controller.signal,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        env: {
          ...process.env,
          NODE_ENV: 'sandbox'
        }
      });

      clearTimeout(timeoutId);

      return {
        stdout: stdout.toString(),
        stderr: stderr.toString(),
        exitCode: 0,
        memoryUsed: 0 // Would need process monitoring for accurate memory usage
      };

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.signal === 'SIGTERM') {
        throw new Error('Execution timed out');
      }
      
      return {
        stdout: error.stdout?.toString() || '',
        stderr: error.stderr?.toString() || error.message,
        exitCode: error.code || 1,
        memoryUsed: 0
      };
    }
  }
}