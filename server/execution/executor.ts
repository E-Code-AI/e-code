import { spawn, execSync } from 'child_process';
import { writeFileSync, mkdirSync, existsSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';

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

// Per-language execution adapter - returns command and args without shell parsing
interface LanguageAdapter {
  cmd: string;
  args: string[];
  entryFile: string;
  compileCmd?: string;
  compileArgs?: string[];
}

// Allowed languages for validation
const ALLOWED_LANGUAGES = new Set([
  'javascript', 'js',
  'python', 'python3',
  'go',
  'cpp', 'c++',
  'c',
  'java',
  'rust',
  'php'
]);

// Maximum code size (1MB)
const MAX_CODE_SIZE = 1024 * 1024;

export class CodeExecutor {
  private tempDir: string;

  constructor() {
    this.tempDir = path.join(os.tmpdir(), 'e-code-executor');
    if (!existsSync(this.tempDir)) {
      mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Validate execution request before processing
   */
  private validateRequest(language: string, code: string): { valid: boolean; error?: string } {
    // Validate language
    if (!language || typeof language !== 'string') {
      return { valid: false, error: 'Language is required' };
    }
    
    const normalizedLang = language.toLowerCase().trim();
    if (!ALLOWED_LANGUAGES.has(normalizedLang)) {
      return { valid: false, error: `Unsupported language: ${language}. Supported: javascript, python, go, cpp, c, java, rust, php` };
    }

    // Validate code
    if (!code || typeof code !== 'string') {
      return { valid: false, error: 'Code is required' };
    }

    // Check code size
    if (code.length > MAX_CODE_SIZE) {
      return { valid: false, error: `Code size exceeds maximum (${MAX_CODE_SIZE} bytes)` };
    }

    return { valid: true };
  }

  async execute(language: string, code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const startTime = Date.now();
    const timeout = options.timeout || 30000; // 30 seconds default
    
    // Validate request first
    const validation = this.validateRequest(language, code);
    if (!validation.valid) {
      return {
        output: '',
        error: validation.error,
        executionTime: 0,
        memoryUsed: 0,
        exitCode: 1
      };
    }

    let execDir: string | null = null;

    try {
      // Create execution directory
      const execId = `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      execDir = path.join(this.tempDir, execId);
      mkdirSync(execDir, { recursive: true });

      // Write additional files if provided
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

      // Get language adapter (cmd, args, entryFile)
      const adapter = this.getLanguageAdapter(language);
      
      // Write main file
      writeFileSync(path.join(execDir, adapter.entryFile), code);

      // Compile if needed (for compiled languages)
      if (adapter.compileCmd && adapter.compileArgs) {
        const compileResult = await this.runProcess(
          adapter.compileCmd,
          adapter.compileArgs,
          execDir,
          { timeout: timeout / 2 }
        );
        
        if (compileResult.exitCode !== 0) {
          const executionTime = Date.now() - startTime;
          return {
            output: compileResult.stdout,
            error: compileResult.stderr || 'Compilation failed',
            executionTime,
            memoryUsed: 0,
            exitCode: compileResult.exitCode
          };
        }
      }

      // Execute code using spawn (no shell interpretation)
      const result = await this.runProcess(
        adapter.cmd,
        adapter.args,
        execDir,
        { timeout, input: options.input }
      );

      const executionTime = Date.now() - startTime;

      return {
        output: result.stdout,
        error: result.stderr || undefined,
        executionTime,
        memoryUsed: 0,
        exitCode: result.exitCode
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
    } finally {
      // Cleanup execution directory
      if (execDir && existsSync(execDir)) {
        try {
          rmSync(execDir, { recursive: true, force: true });
        } catch {
          // Ignore cleanup errors
        }
      }
    }
  }

  /**
   * Get language adapter with command and args array
   * Using args array prevents shell metacharacter injection
   */
  private getLanguageAdapter(language: string): LanguageAdapter {
    const normalizedLang = language.toLowerCase().trim();
    
    switch (normalizedLang) {
      case 'javascript':
      case 'js':
        return {
          cmd: 'node',
          args: ['main.js'],
          entryFile: 'main.js'
        };
      
      case 'python':
      case 'python3':
        return {
          cmd: 'python3',
          args: ['main.py'],
          entryFile: 'main.py'
        };
      
      case 'java':
        return {
          cmd: 'java',
          args: ['Main'],
          entryFile: 'Main.java',
          compileCmd: 'javac',
          compileArgs: ['Main.java']
        };
      
      case 'cpp':
      case 'c++':
        return {
          cmd: './main',
          args: [],
          entryFile: 'main.cpp',
          compileCmd: 'g++',
          compileArgs: ['-o', 'main', 'main.cpp']
        };
      
      case 'c':
        return {
          cmd: './main',
          args: [],
          entryFile: 'main.c',
          compileCmd: 'gcc',
          compileArgs: ['-o', 'main', 'main.c']
        };
      
      case 'go':
        return {
          cmd: 'go',
          args: ['run', 'main.go'],
          entryFile: 'main.go'
        };
      
      case 'rust':
        return {
          cmd: './main',
          args: [],
          entryFile: 'main.rs',
          compileCmd: 'rustc',
          compileArgs: ['main.rs', '-o', 'main']
        };
      
      case 'php':
        return {
          cmd: 'php',
          args: ['main.php'],
          entryFile: 'main.php'
        };
      
      default:
        throw new Error(`Unsupported language: ${language}`);
    }
  }

  /**
   * Run a process using spawn (not exec) to prevent shell injection
   */
  private runProcess(
    cmd: string,
    args: string[],
    cwd: string,
    options: { timeout: number; input?: string }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let killed = false;

      // Use spawn with shell: false to prevent shell metacharacter interpretation
      const proc = spawn(cmd, args, {
        cwd,
        env: {
          ...process.env,
          SANDBOX_EXECUTION: 'true',
          HOME: cwd, // Restrict HOME to execution directory
          TMPDIR: cwd
        },
        shell: false, // CRITICAL: Do not use shell - prevents injection
        stdio: ['pipe', 'pipe', 'pipe']
      });

      // Set timeout
      const timeoutId = setTimeout(() => {
        killed = true;
        proc.kill('SIGTERM');
        // Force kill after 5 seconds if SIGTERM doesn't work
        setTimeout(() => proc.kill('SIGKILL'), 5000);
      }, options.timeout);

      // Collect stdout
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
        // Limit output size to prevent memory issues
        if (stdout.length > 10 * 1024 * 1024) {
          killed = true;
          proc.kill('SIGTERM');
        }
      });

      // Collect stderr
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
        // Limit error size
        if (stderr.length > 10 * 1024 * 1024) {
          killed = true;
          proc.kill('SIGTERM');
        }
      });

      // Handle process exit
      proc.on('close', (code) => {
        clearTimeout(timeoutId);
        
        if (killed && code === null) {
          resolve({
            stdout,
            stderr: stderr || 'Execution timed out or output exceeded limit',
            exitCode: 124 // Standard timeout exit code
          });
        } else {
          resolve({
            stdout,
            stderr,
            exitCode: code ?? 1
          });
        }
      });

      // Handle spawn errors
      proc.on('error', (err) => {
        clearTimeout(timeoutId);
        reject(err);
      });

      // Write input if provided
      if (options.input) {
        proc.stdin.write(options.input);
      }
      proc.stdin.end();
    });
  }
}

// Export singleton instance for convenience
export const codeExecutor = new CodeExecutor();
