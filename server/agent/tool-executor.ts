/**
 * Agent Tool Executor
 * Executes tool calls from the AI agent autonomously
 */

import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import winston from 'winston';

const execAsync = promisify(exec);

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console({ format: winston.format.simple() })]
});

export interface ToolExecutionResult {
  success: boolean;
  output?: any;
  error?: string;
  metadata?: {
    executionTime?: number;
    filesChanged?: string[];
    commandOutput?: string;
  };
}

/**
 * Base executor class
 */
export class ToolExecutor {
  private projectRoot: string;

  constructor(projectId: string) {
    // In production, map projectId to actual project directory
    // For now, use current working directory
    this.projectRoot = process.cwd();
  }

  /**
   * Execute a tool call
   */
  async execute(toolName: string, parameters: any): Promise<ToolExecutionResult> {
    const startTime = Date.now();
    
    try {
      logger.info(`[AgentExecutor] Executing tool: ${toolName}`, { parameters });

      let result: ToolExecutionResult;

      switch (toolName) {
        case 'create_file':
          result = await this.createFile(parameters);
          break;
        
        case 'edit_file':
          result = await this.editFile(parameters);
          break;
        
        case 'read_file':
          result = await this.readFile(parameters);
          break;
        
        case 'delete_file':
          result = await this.deleteFile(parameters);
          break;
        
        case 'list_directory':
          result = await this.listDirectory(parameters);
          break;
        
        case 'run_command':
          result = await this.runCommand(parameters);
          break;
        
        case 'install_package':
          result = await this.installPackage(parameters);
          break;
        
        case 'web_search':
          result = await this.webSearch(parameters);
          break;
        
        case 'search_code':
          result = await this.searchCode(parameters);
          break;
        
        case 'get_project_structure':
          result = await this.getProjectStructure(parameters);
          break;
        
        case 'get_diagnostics':
          result = await this.getDiagnostics(parameters);
          break;
        
        default:
          result = {
            success: false,
            error: `Unknown tool: ${toolName}`
          };
      }

      const executionTime = Date.now() - startTime;
      result.metadata = { ...result.metadata, executionTime };

      logger.info(`[AgentExecutor] Tool execution completed: ${toolName}`, {
        success: result.success,
        executionTime
      });

      return result;

    } catch (error: any) {
      logger.error(`[AgentExecutor] Tool execution failed: ${toolName}`, { error: error.message });
      
      return {
        success: false,
        error: error.message,
        metadata: {
          executionTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * File Operations
   */
  private async createFile(params: { path: string; content: string; description?: string }): Promise<ToolExecutionResult> {
    const filePath = path.join(this.projectRoot, params.path);
    const dir = path.dirname(filePath);

    // Create directory if it doesn't exist
    await fs.mkdir(dir, { recursive: true });

    // Write file
    await fs.writeFile(filePath, params.content, 'utf-8');

    return {
      success: true,
      output: {
        path: params.path,
        description: params.description || 'File created successfully',
        size: params.content.length
      },
      metadata: {
        filesChanged: [params.path]
      }
    };
  }

  private async editFile(params: { path: string; old_content: string; new_content: string; description?: string }): Promise<ToolExecutionResult> {
    const filePath = path.join(this.projectRoot, params.path);

    // Read current content
    const currentContent = await fs.readFile(filePath, 'utf-8');

    // Replace old content with new content
    if (!currentContent.includes(params.old_content)) {
      return {
        success: false,
        error: 'Old content not found in file. File may have changed.'
      };
    }

    const newContent = currentContent.replace(params.old_content, params.new_content);
    await fs.writeFile(filePath, newContent, 'utf-8');

    return {
      success: true,
      output: {
        path: params.path,
        description: params.description || 'File edited successfully',
        linesChanged: params.new_content.split('\n').length
      },
      metadata: {
        filesChanged: [params.path]
      }
    };
  }

  private async readFile(params: { path: string }): Promise<ToolExecutionResult> {
    const filePath = path.join(this.projectRoot, params.path);
    const content = await fs.readFile(filePath, 'utf-8');

    return {
      success: true,
      output: {
        path: params.path,
        content,
        lines: content.split('\n').length
      }
    };
  }

  private async deleteFile(params: { path: string; reason: string }): Promise<ToolExecutionResult> {
    const filePath = path.join(this.projectRoot, params.path);
    await fs.unlink(filePath);

    return {
      success: true,
      output: {
        path: params.path,
        reason: params.reason
      },
      metadata: {
        filesChanged: [params.path]
      }
    };
  }

  private async listDirectory(params: { path: string; recursive?: boolean }): Promise<ToolExecutionResult> {
    const dirPath = path.join(this.projectRoot, params.path || '.');
    
    const listFiles = async (dir: string, prefix = ''): Promise<string[]> => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      let files: string[] = [];

      for (const entry of entries) {
        const relativePath = path.join(prefix, entry.name);
        
        if (entry.isDirectory()) {
          files.push(`${relativePath}/`);
          if (params.recursive) {
            const subFiles = await listFiles(path.join(dir, entry.name), relativePath);
            files.push(...subFiles);
          }
        } else {
          files.push(relativePath);
        }
      }

      return files;
    };

    const files = await listFiles(dirPath);

    return {
      success: true,
      output: {
        path: params.path || '.',
        files,
        count: files.length
      }
    };
  }

  /**
   * Command Execution
   */
  private async runCommand(params: { command: string; description: string; timeout?: number }): Promise<ToolExecutionResult> {
    const timeout = params.timeout || 30000;

    try {
      const { stdout, stderr } = await execAsync(params.command, {
        cwd: this.projectRoot,
        timeout
      });

      return {
        success: true,
        output: {
          command: params.command,
          description: params.description,
          stdout: stdout.trim(),
          stderr: stderr.trim()
        },
        metadata: {
          commandOutput: stdout.trim()
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        output: {
          command: params.command,
          stdout: error.stdout?.trim() || '',
          stderr: error.stderr?.trim() || error.message
        }
      };
    }
  }

  private async installPackage(params: { package_name: string; dev?: boolean; version?: string }): Promise<ToolExecutionResult> {
    const versionSpec = params.version ? `@${params.version}` : '';
    const packageSpec = `${params.package_name}${versionSpec}`;
    const devFlag = params.dev ? '--save-dev' : '';
    const command = `npm install ${packageSpec} ${devFlag}`.trim();

    return await this.runCommand({
      command,
      description: `Installing package: ${packageSpec}${params.dev ? ' (dev dependency)' : ''}`
    });
  }

  /**
   * Search Tools
   */
  private async webSearch(params: { query: string; max_results?: number }): Promise<ToolExecutionResult> {
    // In production, integrate with Tavily or Perplexity API
    // For now, return a stub indicating the feature is available
    
    return {
      success: true,
      output: {
        query: params.query,
        message: 'Web search capability requires external API key. Please configure TAVILY_API_KEY or PERPLEXITY_API_KEY.',
        results: []
      }
    };
  }

  private async searchCode(params: { pattern: string; file_pattern?: string }): Promise<ToolExecutionResult> {
    const grepCommand = params.file_pattern 
      ? `grep -r "${params.pattern}" --include="${params.file_pattern}" .`
      : `grep -r "${params.pattern}" .`;

    return await this.runCommand({
      command: grepCommand,
      description: `Searching for pattern: ${params.pattern}`
    });
  }

  /**
   * Project Context
   */
  private async getProjectStructure(params: { include_content?: boolean }): Promise<ToolExecutionResult> {
    const structure = await this.listDirectory({ path: '.', recursive: true });
    
    let packageJson: any = null;
    if (params.include_content) {
      try {
        const content = await fs.readFile(path.join(this.projectRoot, 'package.json'), 'utf-8');
        packageJson = JSON.parse(content);
      } catch (error) {
        // package.json doesn't exist or is invalid
      }
    }

    return {
      success: true,
      output: {
        files: structure.output?.files || [],
        packageJson,
        projectRoot: this.projectRoot
      }
    };
  }

  private async getDiagnostics(params: { file_path?: string }): Promise<ToolExecutionResult> {
    // In production, integrate with LSP or TypeScript compiler
    // For now, return a stub
    
    return {
      success: true,
      output: {
        message: 'Diagnostics integration requires LSP setup',
        errors: [],
        warnings: []
      }
    };
  }
}
