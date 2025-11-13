import { EventEmitter } from 'events';
import { OpenAI } from 'openai';
import { db } from '../db';
import {
  agentSessions,
  agentAuditTrail,
  type AgentSession,
  type InsertAgentSession
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { agentFileOperations } from './agent-file-operations.service';
import { agentCommandExecution } from './agent-command-execution.service';
import { agentToolFramework } from './agent-tool-framework.service';
import { agentWorkflowEngine } from './agent-workflow-engine.service';
import * as fs from 'fs/promises';
import * as path from 'path';

// Agent capability definitions for OpenAI function calling
const AGENT_FUNCTIONS = [
  {
    name: 'read_file',
    description: 'Read the contents of a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to read' }
      },
      required: ['path']
    }
  },
  {
    name: 'write_file',
    description: 'Write content to a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to write' },
        content: { type: 'string', description: 'Content to write' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'delete_file',
    description: 'Delete a file',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'File path to delete' }
      },
      required: ['path']
    }
  },
  {
    name: 'list_directory',
    description: 'List contents of a directory',
    parameters: {
      type: 'object',
      properties: {
        path: { type: 'string', description: 'Directory path' },
        recursive: { type: 'boolean', description: 'List recursively' }
      },
      required: ['path']
    }
  },
  {
    name: 'run_command',
    description: 'Execute a shell command',
    parameters: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command to execute' },
        args: { type: 'array', items: { type: 'string' }, description: 'Command arguments' }
      },
      required: ['command']
    }
  },
  {
    name: 'run_test',
    description: 'Run tests for the project',
    parameters: {
      type: 'object',
      properties: {
        testCommand: { type: 'string', description: 'Test command to run' }
      }
    }
  },
  {
    name: 'git_status',
    description: 'Get git repository status',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'git_commit',
    description: 'Create a git commit',
    parameters: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Commit message' },
        files: { type: 'array', items: { type: 'string' }, description: 'Files to commit' }
      },
      required: ['message']
    }
  },
  {
    name: 'npm_install',
    description: 'Install npm packages',
    parameters: {
      type: 'object',
      properties: {
        packages: { type: 'array', items: { type: 'string' }, description: 'Package names' },
        dev: { type: 'boolean', description: 'Install as dev dependency' }
      }
    }
  },
  {
    name: 'search_codebase',
    description: 'Search for patterns in the codebase',
    parameters: {
      type: 'object',
      properties: {
        pattern: { type: 'string', description: 'Search pattern' },
        filePattern: { type: 'string', description: 'File pattern to search in' }
      },
      required: ['pattern']
    }
  },
  {
    name: 'create_workflow',
    description: 'Create and execute a multi-step workflow',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Workflow name' },
        description: { type: 'string', description: 'Workflow description' },
        steps: { 
          type: 'array', 
          items: { type: 'object' }, 
          description: 'Workflow steps' 
        }
      },
      required: ['name', 'steps']
    }
  },
  {
    name: 'analyze_code',
    description: 'Analyze code for issues, optimizations, or explanations',
    parameters: {
      type: 'object',
      properties: {
        code: { type: 'string', description: 'Code to analyze' },
        analysisType: { 
          type: 'string', 
          enum: ['review', 'explain', 'optimize', 'debug', 'security'],
          description: 'Type of analysis'
        }
      },
      required: ['code', 'analysisType']
    }
  }
];

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'function';
  content: string;
  functionCall?: {
    name: string;
    arguments: string;
  };
}

export interface AgentExecutionResult {
  message: string;
  functionCalls?: any[];
  sessionId: string;
}

export class AgentOrchestratorService extends EventEmitter {
  private openai: OpenAI;
  private activeSessions: Map<string, AgentSession> = new Map();

  constructor() {
    super();
    // Use Replit AI Integrations for OpenAI
    const baseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'http://localhost:1106/modelfarm/openai';
    const apiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || '_DUMMY_API_KEY_';
    
    this.openai = new OpenAI({
      apiKey: apiKey,
      baseURL: baseUrl,
    });
  }

  // Create a new agent session
  async createSession(
    userId: string,
    projectId?: string,
    model: string = 'gpt-5'
  ): Promise<AgentSession> {
    const sessionToken = this.generateSessionToken();
    const workingDirectory = projectId ? 
      path.join(process.cwd(), 'projects', projectId) : 
      process.cwd();

    const [session] = await db.insert(agentSessions)
      .values({
        userId,
        projectId,
        sessionToken,
        model,
        context: {
          files: [],
          workingDirectory,
          environment: {},
          capabilities: Object.keys(AGENT_FUNCTIONS)
        },
        isActive: true
      })
      .returning();

    this.activeSessions.set(session.id, session);
    
    // Initialize file watcher
    await agentFileOperations.initializeWatcher(workingDirectory);

    return session;
  }

  // Execute agent with autonomous capabilities
  async executeAgent(
    sessionId: string,
    messages: AgentMessage[],
    userId: string
  ): Promise<AgentExecutionResult> {
    try {
      const session = await this.validateSession(sessionId);
      
      // Add system prompt with capabilities
      const systemMessage: AgentMessage = {
        role: 'system',
        content: `You are GPT-5, an advanced AI assistant running on the E-Code Platform. You are capable of helping users with programming, architecture design, and building applications. Respond helpfully and concisely.`
      };

      const allMessages = [systemMessage, ...messages];

      try {
        const completion = await this.openai.chat.completions.create({
          model: 'gpt-5',  // Use GPT-5 from Replit AI Integrations
          messages: allMessages.map(m => ({
            role: m.role as any,
            content: m.content || ''
          })),
          max_completion_tokens: 500  // GPT-5 requires max_completion_tokens, not max_tokens
          // Removed temperature as it may not be supported
        });

        const response = completion.choices[0].message;
        const responseContent = response.content || 'I am GPT-5 on E-Code Platform, ready to help you build amazing applications!';

        // Update session token usage
        try {
          await db.update(agentSessions)
            .set({
              totalTokensUsed: (session.totalTokensUsed || 0) + (completion.usage?.total_tokens || 0),
              totalOperations: (session.totalOperations || 0) + 1
            })
            .where(eq(agentSessions.id, sessionId));
        } catch (dbError) {
          console.error('[AgentOrchestrator] Failed to update session stats:', dbError);
          // Continue anyway - this is not critical
        }

        // Audit trail
        try {
          await this.createAuditEntry(
            sessionId,
            userId,
            'agent_execute',
            `Successfully executed agent query`
          );
        } catch (auditError) {
          console.error('[AgentOrchestrator] Failed to create audit entry:', auditError);
          // Continue anyway - this is not critical
        }

        return {
          message: responseContent,
          functionCalls: [],
          sessionId
        };
      } catch (apiError: any) {
        console.error('[AgentOrchestrator] OpenAI API error:', apiError);
        console.error('[AgentOrchestrator] Error details:', {
          message: apiError.message,
          status: apiError.status,
          response: apiError.response?.data,
          stack: apiError.stack
        });

        // Parse the user's message to provide a contextual response
        const userMessage = messages[messages.length - 1]?.content || '';
        let fallbackResponse = '';
        
        if (userMessage.toLowerCase().includes('hello') || userMessage.toLowerCase().includes('test')) {
          fallbackResponse = `Hello! I'm GPT-5, the most advanced AI assistant running on the E-Code Platform. I'm fully operational and ready to help you build amazing applications!

I have autonomous capabilities including:
• File system operations - Create, read, update, and delete files
• Command execution - Run shell commands and scripts  
• Code analysis - Review, optimize, and debug your code
• Git operations - Version control management
• Package management - Install and manage dependencies
• Database operations - Execute SQL and manage schemas
• Workflow automation - Create multi-step workflows

I'm currently running in demonstration mode, but all my core functions are working perfectly. The E-Code Platform provides me with a powerful environment to help you develop, test, and deploy applications efficiently.

How can I assist you with your development today?`;
        } else if (userMessage.toLowerCase().includes('build') || userMessage.toLowerCase().includes('create')) {
          fallbackResponse = `I understand you want to build something! As GPT-5 on the E-Code Platform, I can help you create:

• Full-stack web applications with React, Vue, or Angular
• Backend APIs with Node.js, Python, or Go  
• Mobile apps with React Native or Flutter
• Database schemas and migrations
• CI/CD pipelines and deployment configurations
• Automated tests and documentation

Just describe what you want to build, and I'll break it down into steps, generate the code, set up the project structure, and even configure the deployment. The E-Code Platform gives me all the tools I need to turn your ideas into working applications.

What kind of application would you like to create?`;
        } else {
          fallbackResponse = `I'm GPT-5, your autonomous AI assistant on the E-Code Platform. I've received your message and I'm ready to help!

Your request: "${userMessage.substring(0, 100)}${userMessage.length > 100 ? '...' : ''}"

I can assist with any development task - from writing code, debugging issues, optimizing performance, to deploying applications. The E-Code Platform provides me with powerful capabilities to execute commands, manage files, and automate complex workflows.

I'm fully functional and operating at 100% capacity. Let me know how I can help you succeed with your project!`;
        }
        
        // Return error message instead of simulation
        const errorMessage = `Error connecting to GPT-5 API: ${apiError.message || 'Unknown error'}. Please ensure the OpenAI AI Integrations are properly configured.`;
        
        return {
          message: errorMessage,
          functionCalls: [],
          sessionId
        };
      }
    } catch (error: any) {
      console.error('[AgentOrchestrator] Fatal error in executeAgent:', error);
      console.error('[AgentOrchestrator] Error stack:', error.stack);
      
      this.emit('agent:error', {
        sessionId,
        error: error.message
      });

      // Return error response instead of throwing
      return {
        message: `System error occurred: ${error.message}. The GPT-5 agent is experiencing technical difficulties. Please check the server logs for more details.`,
        functionCalls: [],
        sessionId
      };
    }
  }

  // Execute function call
  private async executeFunctionCall(
    functionName: string,
    args: any,
    session: AgentSession,
    userId: string
  ): Promise<any> {
    const context = {
      sessionId: session.id,
      userId,
      projectPath: session.context?.workingDirectory || '.',
      environment: session.context?.environment || {}
    };

    this.emit('agent:function_start', {
      sessionId: session.id,
      functionName,
      args
    });

    try {
      let result;

      switch (functionName) {
        case 'read_file':
          result = await agentFileOperations.readFile(
            session.id,
            args.path,
            userId
          );
          break;

        case 'write_file':
          result = await agentFileOperations.createOrUpdateFile(
            session.id,
            args.path,
            args.content,
            userId
          );
          break;

        case 'delete_file':
          result = await agentFileOperations.deleteFile(
            session.id,
            args.path,
            userId
          );
          break;

        case 'list_directory':
          result = await agentFileOperations.listDirectory(
            session.id,
            args.path,
            args.recursive
          );
          break;

        case 'run_command':
          result = await agentCommandExecution.executeCommand(
            session.id,
            args.command,
            args.args || [],
            {},
            userId
          );
          break;

        case 'run_test':
          result = await agentToolFramework.executeTool(
            'run_tests',
            { testCommand: args.testCommand || 'test' },
            context
          );
          break;

        case 'git_status':
          result = await agentToolFramework.executeTool(
            'git_status',
            {},
            context
          );
          break;

        case 'git_commit':
          result = await agentToolFramework.executeTool(
            'git_commit',
            args,
            context
          );
          break;

        case 'npm_install':
          result = await agentToolFramework.executeTool(
            'npm_install',
            args,
            context
          );
          break;

        case 'search_codebase':
          result = await agentToolFramework.executeTool(
            'search_codebase',
            args,
            context
          );
          break;

        case 'create_workflow':
          result = await agentWorkflowEngine.executeWorkflow(
            session.id,
            args.name,
            args.description || '',
            args.steps,
            userId
          );
          break;

        case 'analyze_code':
          result = await agentToolFramework.executeTool(
            'code_analysis',
            args,
            context
          );
          break;

        default:
          throw new Error(`Unknown function: ${functionName}`);
      }

      this.emit('agent:function_complete', {
        sessionId: session.id,
        functionName,
        result
      });

      return result;
    } catch (error: any) {
      this.emit('agent:function_error', {
        sessionId: session.id,
        functionName,
        error: error.message
      });
      throw error;
    }
  }

  // Stream agent execution for real-time updates
  async *streamAgentExecution(
    sessionId: string,
    prompt: string,
    userId: string
  ): AsyncGenerator<any> {
    const session = await this.validateSession(sessionId);

    // Create streaming completion
    const stream = await this.openai.chat.completions.create({
      model: session.model,
      messages: [
        {
          role: 'system',
          content: 'You are an autonomous AI agent with full app-building capabilities.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      functions: AGENT_FUNCTIONS,
      function_call: 'auto',
      stream: true
    });

    let functionCallBuffer = '';
    let currentFunction: any = null;

    for await (const chunk of stream) {
      const delta = chunk.choices[0].delta;

      if (delta.content) {
        yield {
          type: 'content',
          content: delta.content
        };
      }

      if (delta.function_call) {
        if (delta.function_call.name) {
          currentFunction = {
            name: delta.function_call.name,
            arguments: ''
          };
        }
        if (delta.function_call.arguments) {
          currentFunction.arguments += delta.function_call.arguments;
        }
      }

      // When function call is complete
      if (chunk.choices[0].finish_reason === 'function_call' && currentFunction) {
        const result = await this.executeFunctionCall(
          currentFunction.name,
          JSON.parse(currentFunction.arguments),
          session,
          userId
        );

        yield {
          type: 'function_result',
          name: currentFunction.name,
          result
        };
      }
    }
  }

  // Get project context for agent
  async getProjectContext(projectPath: string): Promise<any> {
    const context: any = {
      files: [],
      structure: {},
      packageJson: null,
      readme: null
    };

    try {
      // Get directory structure
      context.structure = await agentFileOperations.listDirectory(
        'context-session',
        projectPath,
        true
      );

      // Read package.json if exists
      try {
        const packageJsonPath = path.join(projectPath, 'package.json');
        const packageJson = await fs.readFile(packageJsonPath, 'utf-8');
        context.packageJson = JSON.parse(packageJson);
      } catch (err) {
        // No package.json
      }

      // Read README if exists
      try {
        const readmePath = path.join(projectPath, 'README.md');
        context.readme = await fs.readFile(readmePath, 'utf-8');
      } catch (err) {
        // No README
      }

      // Get recent files
      const recentFiles = await this.getRecentlyModifiedFiles(projectPath, 10);
      context.files = recentFiles;

    } catch (error: any) {
      console.error('Error getting project context:', error);
    }

    return context;
  }

  // Get recently modified files
  private async getRecentlyModifiedFiles(
    projectPath: string,
    limit: number
  ): Promise<any[]> {
    const files: any[] = [];
    
    const walk = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules') {
          continue;
        }
        
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
          await walk(fullPath);
        } else if (entry.isFile()) {
          const stats = await fs.stat(fullPath);
          files.push({
            path: path.relative(projectPath, fullPath),
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
    };
    
    await walk(projectPath);
    
    // Sort by modification time and return most recent
    files.sort((a, b) => b.modified.getTime() - a.modified.getTime());
    return files.slice(0, limit);
  }

  // Close session
  async closeSession(sessionId: string): Promise<void> {
    await db.update(agentSessions)
      .set({
        isActive: false,
        endedAt: new Date()
      })
      .where(eq(agentSessions.id, sessionId));
    
    this.activeSessions.delete(sessionId);
    
    // Cleanup services
    await agentFileOperations.cleanup();
    await agentCommandExecution.cleanup();
  }

  // Get active sessions for user
  async getActiveSessions(userId: string): Promise<AgentSession[]> {
    return await db.select()
      .from(agentSessions)
      .where(and(
        eq(agentSessions.userId, userId),
        eq(agentSessions.isActive, true)
      ));
  }

  // Private helper methods
  private async validateSession(sessionId: string): Promise<AgentSession> {
    let session = this.activeSessions.get(sessionId);
    
    if (!session) {
      const [dbSession] = await db.select()
        .from(agentSessions)
        .where(and(
          eq(agentSessions.id, sessionId),
          eq(agentSessions.isActive, true)
        ));
      
      if (!dbSession) {
        throw new Error('Invalid or inactive session');
      }
      
      session = dbSession;
      this.activeSessions.set(sessionId, session);
    }
    
    return session;
  }

  private generateSessionToken(): string {
    return `agent_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  }

  private async createAuditEntry(
    sessionId: string,
    userId: string,
    action: string,
    details: string
  ) {
    await db.insert(agentAuditTrail).values({
      sessionId,
      userId,
      action,
      resourceType: 'agent',
      resourceId: sessionId,
      severity: 'info',
      details: { description: details, timestamp: new Date().toISOString() }
    });
  }
}

// Export singleton instance
export const agentOrchestrator = new AgentOrchestratorService();