import Anthropic from '@anthropic-ai/sdk';
import { type IStorage } from '../storage';
import type { File, Project } from '@shared/schema';
import { aiSecurityService, type ValidatedAction } from './ai-security.service';
import { aiApprovalQueue } from './ai-approval-queue.service';
import { aiProviderManager, type AIModel } from '../ai/ai-provider-manager';

/**
 * Project AI Agent Service
 * Handles AI-powered code generation for user projects
 * Supports multiple AI providers: OpenAI, Anthropic, Gemini, xAI, etc.
 * Fortune 500-grade multi-provider architecture
 */
export class ProjectAIAgentService {
  private storage: IStorage;
  
  // Legacy Anthropic client for backward compatibility
  private anthropic: Anthropic;

  constructor(storage: IStorage) {
    this.storage = storage;
    
    // Initialize legacy Anthropic client for backward compatibility
    const apiKey = process.env.ANTHROPIC_API_KEY || '_DUMMY_API_KEY_';
    this.anthropic = new Anthropic({ apiKey });
  }
  
  /**
   * Get available AI models across all providers
   */
  getAvailableModels(): AIModel[] {
    return aiProviderManager.getAvailableModels();
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

      // Build system prompt with file context if provided
      let systemPrompt = `You are an AI coding assistant helping to build a ${project.language} project named "${project.name}".

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

      // IMPORTANT: Merge file/code context into system prompt to preserve context
      if (context?.file && context?.code) {
        systemPrompt += `\n\nUser is currently viewing file: ${context.file}\n\nCurrent code:\n${context.code}`;
      }

      // Build messages array (no system role messages)
      const messages: any[] = [];

      // Add history if provided
      if (context?.history) {
        messages.push(...context.history.slice(-5));
      }

      // Add user message
      messages.push({
        role: 'user',
        content: message
      });

      // Stream response from Anthropic Claude
      const stream = await this.anthropic.messages.create({
        model: 'claude-3-5-haiku-20241022', // Latest available Claude model
        system: systemPrompt,
        messages: messages.filter(m => m.role !== 'system').map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content
        })),
        stream: true,
        max_tokens: 4000,
        temperature: 0.7,
      });

      let fullResponse = '';

      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const content = chunk.delta.text || '';
          if (content) {
            fullResponse += content;
            yield content;
          }
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
   * Generate build actions from prompt (for autonomous build endpoint)
   * Returns validated actions without executing them
   * Supports multi-provider model selection
   */
  async generateBuildActions(
    userId: string,
    projectId: string,
    prompt: string,
    modelId?: string
  ): Promise<{ actions: ValidatedAction[], rejected: any[] }> {
    try {
      // Get project details
      const project = await this.storage.getProject(projectId);
      if (!project) {
        throw new Error('Project not found');
      }

      // Get existing files for context
      const files = await this.storage.getProjectFiles(projectId);
      const fileList = files.map(f => f.path).join('\n');

      // Build system prompt for build mode
      const systemPrompt = `You are an AI coding assistant building a ${project.language} project named "${project.name}".

Current project files:
${fileList || 'No files yet'}

User wants to build:
${prompt}

Generate ALL necessary files with complete, working code. Respond with JSON actions:
{
  "type": "action",
  "action": {
    "type": "create_file",
    "path": "filename.ext",
    "content": "full file content"
  }
}

Generate EVERY file needed for a complete, working application. No placeholders or TODOs.`;

      // Use specified model or intelligently fallback to first available model
      let selectedModel = modelId;
      if (!selectedModel) {
        const availableModels = aiProviderManager.getAvailableModels();
        if (availableModels.length === 0) {
          throw new Error('No AI providers configured. Please set OPENAI_API_KEY, ANTHROPIC_API_KEY, GEMINI_API_KEY, or XAI_API_KEY environment variable.');
        }
        selectedModel = availableModels[0].id; // Smart fallback to first available
      }
      
      // Generate response using AIProviderManager (multi-provider support)
      const fullResponse = await aiProviderManager.generateChat(
        selectedModel,
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        {
          max_tokens: 8000,
          temperature: 0.7,
        }
      );

      // Extract and validate actions
      const { actions: validActions, rejected } = aiSecurityService.extractValidActions(
        fullResponse,
        projectId
      );

      return { actions: validActions, rejected };
    } catch (error: any) {
      console.error('[ProjectAIAgent] Error generating build actions:', error);
      throw error;
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
