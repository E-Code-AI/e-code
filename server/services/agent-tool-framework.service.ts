import { EventEmitter } from 'events';
import { db } from '../db';
import {
  toolRegistry,
  toolExecutions,
  agentSessions,
  agentAuditTrail,
  type ToolRegistry,
  type ToolExecution,
  type InsertToolRegistry,
  type InsertToolExecution,
  type AgentSession
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { z } from 'zod';
import { agentFileOperations } from './agent-file-operations.service';
import { agentCommandExecution } from './agent-command-execution.service';
import { OpenAI } from 'openai';
import * as fs from 'fs/promises';
import * as path from 'path';
import fetch from 'node-fetch';

// Tool execution event for real-time feedback
export interface ToolExecutionEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  toolName: string;
  sessionId: string;
  input: any;
  output?: any;
  error?: string;
  progress?: number;
}

// Tool definition interface
export interface ToolDefinition {
  name: string;
  displayName: string;
  description: string;
  capability: 'file_system' | 'command_execution' | 'database' | 'ide_integration' | 
              'git_operations' | 'package_management' | 'testing' | 'deployment' |
              'monitoring' | 'security' | 'api_integration' | 'ai_analysis';
  inputSchema: z.ZodSchema;
  execute: (input: any, context: ToolContext) => Promise<any>;
  requiresAuth?: boolean;
  rateLimit?: number; // Requests per minute
}

// Tool execution context
export interface ToolContext {
  sessionId: string;
  userId: string;
  projectPath: string;
  environment: Record<string, string>;
}

export class AgentToolFrameworkService extends EventEmitter {
  private tools: Map<string, ToolDefinition> = new Map();
  private rateLimits: Map<string, { count: number; resetTime: number }> = new Map();
  private openai: OpenAI;

  constructor() {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    // Don't register tools at startup - will be done lazily when needed
  }

  // Register built-in tools matching Replit agent capabilities
  private registerBuiltInTools() {
    // File System Tools
    this.registerTool({
      name: 'read_file',
      displayName: 'Read File',
      description: 'Read contents of a file',
      capability: 'file_system',
      inputSchema: z.object({
        path: z.string().describe('File path to read'),
        encoding: z.string().optional().default('utf-8')
      }),
      execute: async (input, context) => {
        const result = await agentFileOperations.readFile(
          context.sessionId,
          input.path,
          context.userId
        );
        return result.content;
      }
    });

    this.registerTool({
      name: 'write_file',
      displayName: 'Write File',
      description: 'Write content to a file',
      capability: 'file_system',
      inputSchema: z.object({
        path: z.string().describe('File path to write'),
        content: z.string().describe('Content to write')
      }),
      execute: async (input, context) => {
        const result = await agentFileOperations.createOrUpdateFile(
          context.sessionId,
          input.path,
          input.content,
          context.userId
        );
        return { success: true, path: input.path };
      }
    });

    this.registerTool({
      name: 'delete_file',
      displayName: 'Delete File',
      description: 'Delete a file',
      capability: 'file_system',
      inputSchema: z.object({
        path: z.string().describe('File path to delete')
      }),
      execute: async (input, context) => {
        await agentFileOperations.deleteFile(
          context.sessionId,
          input.path,
          context.userId
        );
        return { success: true, deleted: input.path };
      }
    });

    this.registerTool({
      name: 'list_directory',
      displayName: 'List Directory',
      description: 'List contents of a directory',
      capability: 'file_system',
      inputSchema: z.object({
        path: z.string().describe('Directory path'),
        recursive: z.boolean().optional().default(false)
      }),
      execute: async (input, context) => {
        return await agentFileOperations.listDirectory(
          context.sessionId,
          input.path,
          input.recursive
        );
      }
    });

    // Command Execution Tools
    this.registerTool({
      name: 'run_command',
      displayName: 'Run Command',
      description: 'Execute a shell command',
      capability: 'command_execution',
      inputSchema: z.object({
        command: z.string().describe('Command to execute'),
        args: z.array(z.string()).optional().default([]),
        workingDirectory: z.string().optional(),
        timeout: z.number().optional()
      }),
      execute: async (input, context) => {
        const result = await agentCommandExecution.executeCommand(
          context.sessionId,
          input.command,
          input.args,
          {
            workingDirectory: input.workingDirectory,
            timeout: input.timeout
          },
          context.userId
        );
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        };
      }
    });

    // Git Operations
    this.registerTool({
      name: 'git_status',
      displayName: 'Git Status',
      description: 'Get git repository status',
      capability: 'git_operations',
      inputSchema: z.object({
        path: z.string().optional().describe('Repository path')
      }),
      execute: async (input, context) => {
        const result = await agentCommandExecution.executeCommand(
          context.sessionId,
          'git',
          ['status', '--porcelain'],
          { workingDirectory: input.path || context.projectPath },
          context.userId
        );
        return this.parseGitStatus(result.stdout || '');
      }
    });

    this.registerTool({
      name: 'git_diff',
      displayName: 'Git Diff',
      description: 'Get git diff',
      capability: 'git_operations',
      inputSchema: z.object({
        path: z.string().optional(),
        staged: z.boolean().optional().default(false)
      }),
      execute: async (input, context) => {
        const args = ['diff'];
        if (input.staged) args.push('--staged');
        
        const result = await agentCommandExecution.executeCommand(
          context.sessionId,
          'git',
          args,
          { workingDirectory: input.path || context.projectPath },
          context.userId
        );
        return result.stdout;
      }
    });

    this.registerTool({
      name: 'git_commit',
      displayName: 'Git Commit',
      description: 'Create a git commit',
      capability: 'git_operations',
      inputSchema: z.object({
        message: z.string().describe('Commit message'),
        files: z.array(z.string()).optional().describe('Specific files to commit')
      }),
      execute: async (input, context) => {
        // Stage files
        if (input.files && input.files.length > 0) {
          await agentCommandExecution.executeCommand(
            context.sessionId,
            'git',
            ['add', ...input.files],
            { workingDirectory: context.projectPath },
            context.userId
          );
        } else {
          await agentCommandExecution.executeCommand(
            context.sessionId,
            'git',
            ['add', '-A'],
            { workingDirectory: context.projectPath },
            context.userId
          );
        }
        
        // Commit
        const result = await agentCommandExecution.executeCommand(
          context.sessionId,
          'git',
          ['commit', '-m', input.message],
          { workingDirectory: context.projectPath },
          context.userId
        );
        return result.stdout;
      }
    });

    // Package Management
    this.registerTool({
      name: 'npm_install',
      displayName: 'NPM Install',
      description: 'Install npm packages',
      capability: 'package_management',
      inputSchema: z.object({
        packages: z.array(z.string()).optional(),
        dev: z.boolean().optional().default(false),
        global: z.boolean().optional().default(false)
      }),
      execute: async (input, context) => {
        const args = ['install'];
        if (input.dev) args.push('--save-dev');
        if (input.global) args.push('-g');
        if (input.packages) args.push(...input.packages);
        
        const result = await agentCommandExecution.executeCommand(
          context.sessionId,
          'npm',
          args,
          { workingDirectory: context.projectPath, timeout: 120000 },
          context.userId
        );
        return result.stdout;
      }
    });

    this.registerTool({
      name: 'npm_run',
      displayName: 'NPM Run Script',
      description: 'Run npm script',
      capability: 'package_management',
      inputSchema: z.object({
        script: z.string().describe('Script name to run')
      }),
      execute: async (input, context) => {
        const result = await agentCommandExecution.executeCommand(
          context.sessionId,
          'npm',
          ['run', input.script],
          { workingDirectory: context.projectPath },
          context.userId
        );
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode
        };
      }
    });

    // Testing Tools
    this.registerTool({
      name: 'run_tests',
      displayName: 'Run Tests',
      description: 'Run project tests',
      capability: 'testing',
      inputSchema: z.object({
        testCommand: z.string().optional().default('test'),
        pattern: z.string().optional()
      }),
      execute: async (input, context) => {
        const args = ['run', input.testCommand];
        if (input.pattern) args.push('--', input.pattern);
        
        const result = await agentCommandExecution.executeCommand(
          context.sessionId,
          'npm',
          args,
          { workingDirectory: context.projectPath, timeout: 300000 },
          context.userId
        );
        return {
          stdout: result.stdout,
          stderr: result.stderr,
          exitCode: result.exitCode,
          success: result.exitCode === 0
        };
      }
    });

    // Database Tools
    this.registerTool({
      name: 'run_sql',
      displayName: 'Run SQL Query',
      description: 'Execute SQL query on database',
      capability: 'database',
      inputSchema: z.object({
        query: z.string().describe('SQL query to execute'),
        database: z.string().optional().default('default')
      }),
      execute: async (input, context) => {
        // This would connect to the actual database service
        // For now, returning a placeholder
        return {
          query: input.query,
          result: 'Database operation would be executed here',
          affectedRows: 0
        };
      }
    });

    // API Integration Tools
    this.registerTool({
      name: 'http_request',
      displayName: 'HTTP Request',
      description: 'Make HTTP request',
      capability: 'api_integration',
      inputSchema: z.object({
        url: z.string().describe('URL to request'),
        method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']).default('GET'),
        headers: z.record(z.string()).optional(),
        body: z.any().optional()
      }),
      execute: async (input, context) => {
        const response = await fetch(input.url, {
          method: input.method,
          headers: input.headers,
          body: input.body ? JSON.stringify(input.body) : undefined
        });
        
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType?.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        
        return {
          status: response.status,
          headers: Object.fromEntries(response.headers.entries()),
          data
        };
      }
    });

    // AI Analysis Tools
    this.registerTool({
      name: 'code_analysis',
      displayName: 'AI Code Analysis',
      description: 'Analyze code with AI',
      capability: 'ai_analysis',
      inputSchema: z.object({
        code: z.string().describe('Code to analyze'),
        analysisType: z.enum(['review', 'explain', 'optimize', 'debug', 'security'])
      }),
      execute: async (input, context) => {
        const prompts = {
          review: 'Review this code and provide feedback on quality, best practices, and potential improvements:',
          explain: 'Explain what this code does in detail:',
          optimize: 'Suggest optimizations for this code:',
          debug: 'Identify potential bugs or issues in this code:',
          security: 'Analyze this code for security vulnerabilities:'
        };
        
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: 'You are an expert code analyst.'
            },
            {
              role: 'user',
              content: `${prompts[input.analysisType]}\n\n\`\`\`\n${input.code}\n\`\`\``
            }
          ]
        });
        
        return {
          analysisType: input.analysisType,
          result: completion.choices[0].message.content
        };
      }
    });

    // Search Tools
    this.registerTool({
      name: 'search_codebase',
      displayName: 'Search Codebase',
      description: 'Search for patterns in codebase',
      capability: 'file_system',
      inputSchema: z.object({
        pattern: z.string().describe('Search pattern or regex'),
        filePattern: z.string().optional().describe('File pattern to search in'),
        maxResults: z.number().optional().default(50)
      }),
      execute: async (input, context) => {
        const args = [input.pattern, '.', '-n', '-i', '--max-count', input.maxResults.toString()];
        if (input.filePattern) {
          args.push('--include', input.filePattern);
        }
        
        const result = await agentCommandExecution.executeCommand(
          context.sessionId,
          'grep',
          args,
          { workingDirectory: context.projectPath },
          context.userId
        );
        
        return this.parseGrepResults(result.stdout || '');
      }
    });
  }

  // Register a custom tool
  async registerTool(definition: ToolDefinition): Promise<void> {
    // Validate tool definition
    if (!definition.name || !definition.execute) {
      throw new Error('Invalid tool definition');
    }
    
    // Store in memory
    this.tools.set(definition.name, definition);
    
    // Store in database
    await db.insert(toolRegistry)
      .values({
        name: definition.name,
        displayName: definition.displayName,
        description: definition.description || '',
        capability: definition.capability,
        version: '1.0.0',
        isEnabled: true,
        requiresAuth: definition.requiresAuth || false,
        inputSchema: definition.inputSchema ? 
          JSON.parse(JSON.stringify(definition.inputSchema)) : {},
        outputSchema: {},
        configuration: {
          rateLimit: definition.rateLimit
        }
      })
      .onConflictDoUpdate({
        target: toolRegistry.name,
        set: {
          displayName: definition.displayName,
          description: definition.description || '',
          capability: definition.capability,
          isEnabled: true
        }
      });
  }

  // Execute a tool
  async executeTool(
    toolName: string,
    input: any,
    context: ToolContext
  ): Promise<ToolExecution> {
    try {
      // Get tool definition
      const tool = this.tools.get(toolName);
      if (!tool) {
        throw new Error(`Tool not found: ${toolName}`);
      }
      
      // Check rate limit
      if (tool.rateLimit) {
        this.checkRateLimit(toolName, tool.rateLimit);
      }
      
      // Validate session
      await this.validateSession(context.sessionId);
      
      // Validate input
      if (tool.inputSchema) {
        input = tool.inputSchema.parse(input);
      }
      
      // Get tool registry entry
      const [toolReg] = await db.select()
        .from(toolRegistry)
        .where(eq(toolRegistry.name, toolName));
      
      if (!toolReg) {
        throw new Error(`Tool not registered: ${toolName}`);
      }
      
      // Create execution record
      const [execution] = await db.insert(toolExecutions)
        .values({
          sessionId: context.sessionId,
          toolId: toolReg.id,
          input,
          status: 'in_progress'
        })
        .returning();
      
      // Emit start event
      this.emitEvent({
        type: 'start',
        toolName,
        sessionId: context.sessionId,
        input
      });
      
      // Execute tool
      const startTime = Date.now();
      let output: any;
      let error: string | undefined;
      
      try {
        output = await tool.execute(input, context);
      } catch (err: any) {
        error = err.message;
        throw err;
      } finally {
        const executionTime = Date.now() - startTime;
        
        // Update execution record
        await db.update(toolExecutions)
          .set({
            output,
            status: error ? 'failed' : 'completed',
            error,
            executionTime,
            completedAt: new Date()
          })
          .where(eq(toolExecutions.id, execution.id));
        
        // Emit completion event
        this.emitEvent({
          type: error ? 'error' : 'complete',
          toolName,
          sessionId: context.sessionId,
          input,
          output,
          error
        });
        
        // Audit trail
        await this.createAuditEntry(
          context.sessionId,
          context.userId,
          'tool_execute',
          toolName
        );
      }
      
      const [updated] = await db.select()
        .from(toolExecutions)
        .where(eq(toolExecutions.id, execution.id));
      
      return updated;
    } catch (error: any) {
      this.emitEvent({
        type: 'error',
        toolName,
        sessionId: context.sessionId,
        input,
        error: error.message
      });
      throw error;
    }
  }

  // Get available tools
  async getAvailableTools(capability?: string): Promise<ToolRegistry[]> {
    let query = db.select()
      .from(toolRegistry)
      .where(eq(toolRegistry.isEnabled, true));
    
    if (capability) {
      query = query.where(and(
        eq(toolRegistry.isEnabled, true),
        eq(toolRegistry.capability, capability as any)
      ));
    }
    
    return await query;
  }

  // Get tool execution history
  async getExecutionHistory(
    sessionId: string,
    limit: number = 50
  ): Promise<ToolExecution[]> {
    return await db.select()
      .from(toolExecutions)
      .where(eq(toolExecutions.sessionId, sessionId))
      .orderBy(toolExecutions.startedAt)
      .limit(limit);
  }

  // Private helper methods
  private async validateSession(sessionId: string): Promise<AgentSession> {
    const [session] = await db.select()
      .from(agentSessions)
      .where(and(
        eq(agentSessions.id, sessionId),
        eq(agentSessions.isActive, true)
      ));
    
    if (!session) {
      throw new Error('Invalid or inactive session');
    }
    
    return session;
  }

  private checkRateLimit(toolName: string, limit: number) {
    const now = Date.now();
    const key = `${toolName}`;
    const rateInfo = this.rateLimits.get(key);
    
    if (rateInfo) {
      if (now < rateInfo.resetTime) {
        if (rateInfo.count >= limit) {
          throw new Error(`Rate limit exceeded for tool ${toolName}`);
        }
        rateInfo.count++;
      } else {
        this.rateLimits.set(key, { count: 1, resetTime: now + 60000 });
      }
    } else {
      this.rateLimits.set(key, { count: 1, resetTime: now + 60000 });
    }
  }

  private parseGitStatus(output: string): any {
    const lines = output.split('\n').filter(l => l.trim());
    const status = {
      modified: [],
      added: [],
      deleted: [],
      untracked: []
    };
    
    for (const line of lines) {
      const [code, ...fileParts] = line.trim().split(' ');
      const file = fileParts.join(' ');
      
      if (code.includes('M')) status.modified.push(file);
      if (code.includes('A')) status.added.push(file);
      if (code.includes('D')) status.deleted.push(file);
      if (code === '??') status.untracked.push(file);
    }
    
    return status;
  }

  private parseGrepResults(output: string): any[] {
    const lines = output.split('\n').filter(l => l.trim());
    return lines.map(line => {
      const match = line.match(/^([^:]+):(\d+):(.*)$/);
      if (match) {
        return {
          file: match[1],
          line: parseInt(match[2]),
          content: match[3]
        };
      }
      return null;
    }).filter(Boolean);
  }

  private async createAuditEntry(
    sessionId: string,
    userId: string,
    action: string,
    toolName: string
  ) {
    await db.insert(agentAuditTrail).values({
      sessionId,
      userId,
      action,
      resourceType: 'tool',
      resourceId: toolName,
      severity: 'info',
      details: { timestamp: new Date().toISOString() }
    });
  }

  private emitEvent(event: ToolExecutionEvent) {
    this.emit('tool:event', event);
  }
}

// Export singleton instance
export const agentToolFramework = new AgentToolFrameworkService();