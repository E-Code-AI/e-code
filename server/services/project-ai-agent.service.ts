import { OpenAI } from 'openai';
import { type IStorage } from '../storage';
import type { File, Project } from '@shared/schema';
import { aiSecurityService, type ValidatedAction } from './ai-security.service';
import { aiApprovalQueue } from './ai-approval-queue.service';

/**
 * Project AI Agent Service
 * Handles AI-powered code generation for user projects
 * Uses Replit AI Integrations (OpenAI-compatible)
 */
export class ProjectAIAgentService {
  private openai: OpenAI;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    
    // Initialize OpenAI client with Replit AI Integrations
    // Uses AI_INTEGRATIONS_OPENAI_BASE_URL and AI_INTEGRATIONS_OPENAI_API_KEY from Replit AI Integrations
    this.openai = new OpenAI({
      baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'http://localhost:1106/modelfarm/openai',
      apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || '_DUMMY_API_KEY_',
    });
  }

  /**
   * Process a chat message and generate code/files with security controls
   * Streams responses back to client
   * 
   * Security: Rate limiting, path validation, and audit logging applied
   */
  async *processChat(
    userId: string,
    projectId: string,
    message: string,
    context?: {
      file?: string;
      code?: string;
      history?: any[];
    }
  ): AsyncGenerator<string> {
    // SECURITY: Check rate limits before processing
    const rateLimit = await aiSecurityService.checkRateLimit(userId, projectId);
    if (!rateLimit.allowed) {
      yield JSON.stringify({ 
        type: 'error', 
        content: `Rate limit exceeded. ${rateLimit.remaining} requests remaining. Try again at ${rateLimit.resetAt?.toISOString()}`
      });
      return;
    }
    try {
      // Get project details
      const project = await this.storage.getProject(projectId);
      if (!project) {
        yield JSON.stringify({ type: 'error', content: 'Project not found' });
        return;
      }

      // Get existing files for context
      const files = await this.storage.getProjectFiles(projectId);
      const fileList = files.map(f => f.path).join('\n');

      // Build system prompt
      const systemPrompt = `You are an AI coding assistant helping to build a ${project.language} project named "${project.name}".

Current project files:
${fileList || 'No files yet'}

When the user asks you to build something:
1. Analyze their request
2. Create the necessary files with complete, working code
3. Respond with JSON actions to create/edit files
4. Use this exact JSON format:

{
  "type": "action",
  "action": {
    "type": "create_file" | "edit_file",
    "path": "filename.ext",
    "content": "full file content here"
  }
}

For explanations, use:
{
  "type": "message",
  "content": "your explanation"
}

Always generate complete, production-ready code. No placeholders or TODOs.`;

      // Build messages array
      const messages: any[] = [
        { role: 'system', content: systemPrompt }
      ];

      // Add history if provided
      if (context?.history) {
        messages.push(...context.history.slice(-5));
      }

      // Add current context if provided
      if (context?.file && context?.code) {
        messages.push({
          role: 'system',
          content: `User is viewing file: ${context.file}\n\nCurrent code:\n${context.code}`
        });
      }

      // Add user message
      messages.push({
        role: 'user',
        content: message
      });

      // Stream response from OpenAI
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-5', // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
        messages,
        stream: true,
        max_completion_tokens: 4000,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield content;
        }
      }

      // Parse and execute actions from the response
      yield '\n';
      
      // SECURITY: Use strict validation to extract and validate AI actions
      // This prevents prompt injection and arbitrary file access
      const { actions: validActions, rejected } = aiSecurityService.extractValidActions(
        fullResponse,
        projectId
      );
      
      // Log rejected actions for security monitoring
      if (rejected.length > 0) {
        console.warn('[ProjectAIAgent] Rejected insecure actions');
        yield JSON.stringify({ 
          type: 'security_warning', 
          message: `${rejected.length} actions blocked by security filters`
        }) + '\n';
      }
      
      // SECURITY: Add validated actions to approval queue (database-backed)
      // User must explicitly approve before execution
      for (const action of validActions) {
        const actionId = await aiApprovalQueue.addAction(userId, projectId, action);
        
        yield JSON.stringify({ 
          type: 'action_pending_approval', 
          actionId,
          action,
          message: 'Action requires approval. Use /api/projects/:id/ai/approve/:actionId to approve.'
        }) + '\n';
      }
      
      // Log rejected actions for security monitoring AND send error to frontend
      for (const rejection of rejected) {
        await aiSecurityService.logAction(
          userId,
          projectId,
          rejection.action,
          { success: false, error: `Rejected: ${rejection.reason}` }
        );
        
        // SECURITY: Send rejection message to frontend so user sees why action was blocked
        yield JSON.stringify({ 
          type: 'security_blocked', 
          action: rejection.action,
          reason: rejection.reason,
          message: `⚠️ **Security Block**: ${rejection.reason}\n\nThis action was blocked by Fortune 500 security controls to protect your project.`
        }) + '\n';
      }

    } catch (error: any) {
      console.error('[ProjectAIAgent] Error processing chat:', error);
      yield JSON.stringify({ 
        type: 'error', 
        content: error.message || 'An error occurred while processing your request' 
      });
    }
  }

  /**
   * Execute a validated action (create file, edit file, etc.)
   * Security: Only called after action passes validation
   */
  private async executeAction(projectId: string, action: ValidatedAction): Promise<any> {
    try {
      switch (action.type) {
        case 'create_file':
          return await this.createFile(projectId, action.path, action.content);
        
        case 'edit_file':
          return await this.editFile(projectId, action.path, action.content);
        
        default:
          return { success: false, error: 'Unknown action type' };
      }
    } catch (error: any) {
      console.error('[ProjectAIAgent] Error executing action:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a new file in the project
   */
  private async createFile(projectId: string, filePath: string, content: string): Promise<any> {
    try {
      const fileName = filePath.split('/').pop() || filePath;
      const parentPath = filePath.substring(0, filePath.lastIndexOf('/')) || '/';

      const file = await this.storage.createFile({
        projectId,
        name: fileName,
        path: filePath,
        content,
        parentId: null,
        isDirectory: false,
      });
      
      return { 
        success: true, 
        file: {
          id: file.id,
          path: file.path,
          name: file.name
        }
      };
    } catch (error: any) {
      console.error('[ProjectAIAgent] Error creating file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Edit an existing file
   */
  private async editFile(projectId: string, filePath: string, content: string): Promise<any> {
    try {
      // Find the file by path
      const files = await this.storage.getProjectFiles(projectId);
      const file = files.find(f => f.path === filePath);

      if (!file) {
        // File doesn't exist, create it
        return await this.createFile(projectId, filePath, content);
      }

      // Update the file
      await this.storage.updateFile(file.id, { content });
      
      return { 
        success: true, 
        file: {
          id: file.id,
          path: file.path,
          name: file.name
        }
      };
    } catch (error: any) {
      console.error('[ProjectAIAgent] Error editing file:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Detect programming language from filename
   */
  private detectLanguage(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'js': 'javascript',
      'jsx': 'javascript',
      'ts': 'typescript',
      'tsx': 'typescript',
      'py': 'python',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'md': 'markdown',
    };
    return languageMap[ext || ''] || 'plaintext';
  }
}

// Export singleton instance
let instance: ProjectAIAgentService | null = null;

export const getProjectAIAgent = (storage: IStorage): ProjectAIAgentService => {
  if (!instance) {
    instance = new ProjectAIAgentService(storage);
  }
  return instance;
};
