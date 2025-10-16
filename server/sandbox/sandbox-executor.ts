// @ts-nocheck
import { SandboxManager, SandboxConfig, SandboxResult } from './sandbox-manager';
import { SecurityPolicy, getPolicyByName } from './security-policy';
import { sandboxMonitor } from './sandbox-monitor';
import * as fs from 'fs/promises';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ExecutionRequest {
  language: string;
  code: string;
  files?: { [path: string]: string };
  stdin?: string;
  env?: Record<string, string>;
  args?: string[];
  timeout?: number;
  securityPolicy?: string | SecurityPolicy;
}

export interface ExecutionResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTime: number;
  memoryUsage: number;
  cpuUsage: number;
  filesCreated: string[];
  error?: string;
  securityViolations?: any[];
}

interface LanguageConfig {
  name: string;
  extensions: string[];
  runtime: string;
  compileCommand?: string;
  runCommand: string;
  dockerImage?: string; // Kept for compatibility, not used
  defaultPolicy: string;
}

const LANGUAGE_CONFIGS: Record<string, LanguageConfig> = {
  javascript: {
    name: 'JavaScript',
    extensions: ['.js', '.mjs'],
    runtime: 'node',
    runCommand: 'node {{file}}',
    defaultPolicy: 'standard'
  },
  typescript: {
    name: 'TypeScript',
    extensions: ['.ts'],
    runtime: 'node',
    compileCommand: 'tsc {{file}} --outDir /tmp/compiled',
    runCommand: 'node /tmp/compiled/{{basename}}.js',
    defaultPolicy: 'standard'
  },
  python: {
    name: 'Python',
    extensions: ['.py'],
    runtime: 'python3',
    runCommand: 'python3 {{file}}',
    defaultPolicy: 'standard'
  },
  java: {
    name: 'Java',
    extensions: ['.java'],
    runtime: 'java',
    compileCommand: 'javac -d /tmp/compiled {{file}}',
    runCommand: 'java -cp /tmp/compiled {{classname}}',
    defaultPolicy: 'standard'
  },
  cpp: {
    name: 'C++',
    extensions: ['.cpp', '.cc', '.cxx'],
    runtime: 'g++',
    compileCommand: 'g++ {{file}} -o /tmp/compiled/{{basename}}',
    runCommand: '/tmp/compiled/{{basename}}',
    defaultPolicy: 'standard'
  },
  c: {
    name: 'C',
    extensions: ['.c'],
    runtime: 'gcc',
    compileCommand: 'gcc {{file}} -o /tmp/compiled/{{basename}}',
    runCommand: '/tmp/compiled/{{basename}}',
    defaultPolicy: 'standard'
  },
  go: {
    name: 'Go',
    extensions: ['.go'],
    runtime: 'go',
    runCommand: 'go run {{file}}',
    defaultPolicy: 'standard'
  },
  rust: {
    name: 'Rust',
    extensions: ['.rs'],
    runtime: 'rustc',
    compileCommand: 'rustc {{file}} -o /tmp/compiled/{{basename}}',
    runCommand: '/tmp/compiled/{{basename}}',
    defaultPolicy: 'standard'
  },
  ruby: {
    name: 'Ruby',
    extensions: ['.rb'],
    runtime: 'ruby',
    runCommand: 'ruby {{file}}',
    defaultPolicy: 'standard'
  },
  php: {
    name: 'PHP',
    extensions: ['.php'],
    runtime: 'php',
    runCommand: 'php {{file}}',
    defaultPolicy: 'standard'
  }
};

export class SandboxExecutor {
  private sandboxManager: SandboxManager;
  private tempDir: string;

  constructor() {
    this.sandboxManager = new SandboxManager();
    this.tempDir = '/tmp/ecode-sandbox-executor';
  }

  async initialize(): Promise<void> {
    await fs.mkdir(this.tempDir, { recursive: true });
  }

  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    const startTime = Date.now();
    let sandboxId: string | null = null;

    try {
      // Get language configuration
      const langConfig = this.getLanguageConfig(request.language);
      if (!langConfig) {
        throw new Error(`Unsupported language: ${request.language}`);
      }

      // Get security policy
      const policy = this.getSecurityPolicy(request.securityPolicy || langConfig.defaultPolicy);
      
      // Convert security policy to sandbox config
      const sandboxConfig = this.policyToSandboxConfig(policy, request.timeout);
      
      // Create sandbox
      sandboxId = await this.sandboxManager.createSandbox(sandboxConfig);
      
      // Prepare execution environment
      const { mainFile, workDir } = await this.prepareEnvironment(
        sandboxId,
        request.code,
        request.files,
        langConfig
      );

      // Compile if needed
      if (langConfig.compileCommand) {
        const compileResult = await this.compile(
          sandboxId,
          mainFile,
          langConfig,
          workDir
        );
        
        if (compileResult.exitCode !== 0) {
          return {
            success: false,
            exitCode: compileResult.exitCode,
            stdout: compileResult.stdout,
            stderr: compileResult.stderr,
            executionTime: (Date.now() - startTime) / 1000,
            memoryUsage: 0,
            cpuUsage: 0,
            filesCreated: [],
            error: 'Compilation failed'
          };
        }
      }

      // Execute code
      const runCommand = this.buildRunCommand(mainFile, langConfig);
      const result = await this.sandboxManager.executeSandbox(
        sandboxId,
        runCommand.command,
        runCommand.args,
        {
          ...request.env,
          LANG: 'en_US.UTF-8',
          PATH: '/usr/local/bin:/usr/bin:/bin'
        }
      );

      return {
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        stdout: result.stdout,
        stderr: result.stderr,
        executionTime: result.executionTime,
        memoryUsage: result.memoryUsage,
        cpuUsage: result.cpuUsage,
        filesCreated: result.filesCreated,
        securityViolations: result.securityViolations.length > 0 ? result.securityViolations : undefined
      };

    } catch (error) {
      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error),
        executionTime: (Date.now() - startTime) / 1000,
        memoryUsage: 0,
        cpuUsage: 0,
        filesCreated: [],
        error: error instanceof Error ? error.message : String(error)
      };
    } finally {
      // Cleanup sandbox
      if (sandboxId) {
        await this.sandboxManager.destroySandbox(sandboxId);
      }
    }
  }

  private getLanguageConfig(language: string): LanguageConfig | null {
    return LANGUAGE_CONFIGS[language.toLowerCase()] || null;
  }

  private getSecurityPolicy(policyName: string | SecurityPolicy): SecurityPolicy {
    if (typeof policyName === 'string') {
      const policy = getPolicyByName(policyName);
      if (!policy) {
        throw new Error(`Security policy '${policyName}' not found`);
      }
      return policy;
    }
    return policyName;
  }

  private policyToSandboxConfig(policy: SecurityPolicy, timeout?: number): SandboxConfig {
    return {
      maxCpuTime: policy.resources.cpu.quota / 1000, // Convert microseconds to seconds
      maxMemory: policy.resources.memory.limit,
      maxDiskSpace: 100, // Default 100MB
      maxProcesses: policy.resources.pids.max,
      maxFileSize: 10, // Default 10MB
      maxOpenFiles: 100, // Default 100
      networkEnabled: policy.network.enabled,
      allowedHosts: policy.network.allowedDomains,
      readOnlyPaths: policy.filesystem.readOnly,
      writablePaths: policy.filesystem.writable,
      tempDirSize: policy.filesystem.tmpSize,
      allowedSyscalls: policy.syscalls.allowed,
      blockedSyscalls: policy.syscalls.denied,
      capabilities: policy.capabilities.keep,
      executionTimeout: timeout || 60,
      idleTimeout: 10
    };
  }

  private async prepareEnvironment(
    sandboxId: string,
    code: string,
    files: { [path: string]: string } | undefined,
    langConfig: LanguageConfig
  ): Promise<{ mainFile: string; workDir: string }> {
    const workDir = path.join(this.tempDir, sandboxId);
    await fs.mkdir(workDir, { recursive: true });

    // Determine main file name
    const extension = langConfig.extensions[0];
    const mainFileName = `main${extension}`;
    const mainFile = path.join(workDir, mainFileName);

    // Write main file
    await fs.writeFile(mainFile, code, 'utf-8');

    // Write additional files
    if (files) {
      for (const [filePath, content] of Object.entries(files)) {
        const fullPath = path.join(workDir, filePath);
        await fs.mkdir(path.dirname(fullPath), { recursive: true });
        await fs.writeFile(fullPath, content, 'utf-8');
      }
    }

    return { mainFile, workDir };
  }

  private async compile(
    sandboxId: string,
    mainFile: string,
    langConfig: LanguageConfig,
    workDir: string
  ): Promise<SandboxResult> {
    if (!langConfig.compileCommand) {
      throw new Error('No compile command for language');
    }

    const compileCmd = this.buildCompileCommand(mainFile, langConfig);
    
    return await this.sandboxManager.executeSandbox(
      sandboxId,
      compileCmd.command,
      compileCmd.args,
      {
        LANG: 'en_US.UTF-8',
        PATH: '/usr/local/bin:/usr/bin:/bin'
      }
    );
  }

  private buildCompileCommand(
    mainFile: string,
    langConfig: LanguageConfig
  ): { command: string; args: string[] } {
    if (!langConfig.compileCommand) {
      throw new Error('No compile command');
    }

    const basename = path.basename(mainFile, path.extname(mainFile));
    const className = basename.charAt(0).toUpperCase() + basename.slice(1);

    let command = langConfig.compileCommand
      .replace('{{file}}', mainFile)
      .replace('{{basename}}', basename)
      .replace('{{classname}}', className);

    const parts = command.split(' ');
    return {
      command: parts[0],
      args: parts.slice(1)
    };
  }

  private buildRunCommand(
    mainFile: string,
    langConfig: LanguageConfig
  ): { command: string; args: string[] } {
    const basename = path.basename(mainFile, path.extname(mainFile));
    const className = basename.charAt(0).toUpperCase() + basename.slice(1);

    let command = langConfig.runCommand
      .replace('{{file}}', mainFile)
      .replace('{{basename}}', basename)
      .replace('{{classname}}', className);

    const parts = command.split(' ');
    return {
      command: parts[0],
      args: parts.slice(1)
    };
  }

  async cleanup(): Promise<void> {
    await this.sandboxManager.destroyAllSandboxes();
    try {
      await fs.rm(this.tempDir, { recursive: true, force: true });
    } catch {
      // Ignore errors
    }
  }
}

// Export singleton instance
export const sandboxExecutor = new SandboxExecutor();