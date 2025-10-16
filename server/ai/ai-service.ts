// @ts-nocheck
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { apiRequest } from '../utils/api-utils';

// Initialize AI clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const gemini = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: any[];
}

export interface AIResponse {
  content: string;
  actions?: Array<{
    type: 'create_file' | 'modify_file' | 'delete_file' | 'run_command' | 'install_package';
    data: any;
  }>;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export class AIService {
  async generateResponse(
    messages: AIMessage[],
    options: {
      model: string;
      projectContext?: any;
      tools?: boolean;
      temperature?: number;
      maxTokens?: number;
    }
  ): Promise<AIResponse> {
    const { model, projectContext, tools = true, temperature = 0.7, maxTokens = 4096 } = options;

    // Route to appropriate AI provider based on model
    if (model.startsWith('gpt')) {
      return this.generateOpenAIResponse(messages, { model, tools, temperature, maxTokens, projectContext });
    } else if (model.startsWith('claude')) {
      return this.generateAnthropicResponse(messages, { model, tools, temperature, maxTokens, projectContext });
    } else if (model.startsWith('gemini') && gemini) {
      return this.generateGeminiResponse(messages, { model, temperature, maxTokens, projectContext });
    } else {
      throw new Error(`Unsupported model: ${model}`);
    }
  }

  private async generateOpenAIResponse(
    messages: AIMessage[],
    options: any
  ): Promise<AIResponse> {
    const { model, tools, temperature, maxTokens, projectContext } = options;

    // Add project context to system message
    const systemMessage = this.buildSystemMessage(projectContext);
    const messagesWithSystem = [
      { role: 'system' as const, content: systemMessage },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const toolDefinitions = tools ? this.getToolDefinitions() : undefined;

    const completion = await openai.chat.completions.create({
      model: model === 'gpt-4o' ? 'gpt-4o' : 'gpt-4-turbo-preview',
      messages: messagesWithSystem,
      temperature,
      max_tokens: maxTokens,
      tools: toolDefinitions,
      tool_choice: tools ? 'auto' : undefined,
    });

    const response = completion.choices[0];
    const actions: AIResponse['actions'] = [];

    // Process tool calls
    if (response.message.tool_calls) {
      for (const toolCall of response.message.tool_calls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        actions.push({
          type: functionName as any,
          data: args,
        });
      }
    }

    return {
      content: response.message.content || '',
      actions,
      usage: completion.usage ? {
        promptTokens: completion.usage.prompt_tokens,
        completionTokens: completion.usage.completion_tokens,
        totalTokens: completion.usage.total_tokens,
      } : undefined,
    };
  }

  private async generateAnthropicResponse(
    messages: AIMessage[],
    options: any
  ): Promise<AIResponse> {
    const { model, temperature, maxTokens, projectContext } = options;

    // Add project context to system message
    const systemMessage = this.buildSystemMessage(projectContext);

    // Convert messages to Anthropic format
    const anthropicMessages = messages.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: model === 'claude-4' ? 'claude-sonnet-4-20250514' : 'claude-3-5-sonnet-20241022',
      system: systemMessage,
      messages: anthropicMessages as any,
      temperature,
      max_tokens: maxTokens,
    });

    // Extract text content from response
    const textContent = response.content.find(c => c.type === 'text');
    const responseText = textContent && 'text' in textContent ? textContent.text : '';

    // Parse actions from response
    const actions = this.parseActionsFromContent(responseText);

    return {
      content: responseText,
      actions,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
    };
  }

  private async generateGeminiResponse(
    messages: AIMessage[],
    options: any
  ): Promise<AIResponse> {
    const { model, temperature, maxTokens, projectContext } = options;

    const geminiModel = gemini!.getGenerativeModel({ 
      model: model === 'gemini-2.5' ? 'gemini-2.5-pro' : 'gemini-pro' 
    });

    // Build conversation history
    const history = messages.slice(0, -1).map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }));

    const chat = geminiModel.startChat({
      history,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    });

    const result = await chat.sendMessage(messages[messages.length - 1].content);
    const response = result.response;

    // Parse actions from response
    const actions = this.parseActionsFromContent(response.text());

    return {
      content: response.text(),
      actions,
    };
  }

  private buildSystemMessage(projectContext?: any): string {
    let message = `You are an AI coding assistant integrated into E-Code, a web-based IDE. 
You help users build applications by generating code, managing files, and executing commands.
You have access to the project file system and can create, modify, and delete files.`;

    if (projectContext) {
      message += `\n\nProject Context:
- Project Name: ${projectContext.name}
- Language: ${projectContext.language}
- Framework: ${projectContext.framework || 'None'}
- Description: ${projectContext.description}`;
    }

    message += `\n\nWhen suggesting code changes, format them as actions that can be executed.
For file operations, include the full file path and content.
For commands, specify the exact command to run.`;

    return message;
  }

  private getToolDefinitions() {
    return [
      {
        type: 'function' as const,
        function: {
          name: 'create_file',
          description: 'Create a new file in the project',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path relative to project root' },
              content: { type: 'string', description: 'File content' },
            },
            required: ['path', 'content'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'modify_file',
          description: 'Modify an existing file',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path relative to project root' },
              content: { type: 'string', description: 'New file content' },
            },
            required: ['path', 'content'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'delete_file',
          description: 'Delete a file from the project',
          parameters: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path relative to project root' },
            },
            required: ['path'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'run_command',
          description: 'Run a shell command in the project directory',
          parameters: {
            type: 'object',
            properties: {
              command: { type: 'string', description: 'Shell command to execute' },
            },
            required: ['command'],
          },
        },
      },
      {
        type: 'function' as const,
        function: {
          name: 'install_package',
          description: 'Install npm/pip/other packages',
          parameters: {
            type: 'object',
            properties: {
              packages: { type: 'array', items: { type: 'string' }, description: 'Package names to install' },
              manager: { type: 'string', enum: ['npm', 'pip', 'yarn', 'cargo'], description: 'Package manager to use' },
            },
            required: ['packages', 'manager'],
          },
        },
      },
    ];
  }

  private parseActionsFromContent(content: string): AIResponse['actions'] {
    const actions: AIResponse['actions'] = [];
    
    // Parse action blocks from content
    const actionRegex = /```action:(\w+)\n([\s\S]*?)```/g;
    let match;
    
    while ((match = actionRegex.exec(content)) !== null) {
      const [, actionType, actionData] = match;
      try {
        const data = JSON.parse(actionData);
        actions.push({
          type: actionType as any,
          data,
        });
      } catch (e) {
        console.error('Failed to parse action:', e);
      }
    }
    
    return actions;
  }

  async executeActions(
    actions: AIResponse['actions'],
    projectId: number
  ): Promise<{ success: boolean; results: any[] }> {
    const results = [];
    
    for (const action of actions || []) {
      try {
        switch (action.type) {
          case 'create_file':
            const createResult = await apiRequest('POST', `/api/files/create/${projectId}`, {
              path: action.data.path,
              content: action.data.content,
            });
            results.push({ type: action.type, success: true, data: createResult });
            break;
            
          case 'modify_file':
            const modifyResult = await apiRequest('PUT', `/api/files/update/${projectId}`, {
              path: action.data.path,
              content: action.data.content,
            });
            results.push({ type: action.type, success: true, data: modifyResult });
            break;
            
          case 'delete_file':
            const deleteResult = await apiRequest('DELETE', `/api/files/delete/${projectId}`, {
              path: action.data.path,
            });
            results.push({ type: action.type, success: true, data: deleteResult });
            break;
            
          case 'run_command':
            const runResult = await apiRequest('POST', `/api/runtime/execute/${projectId}`, {
              command: action.data.command,
            });
            results.push({ type: action.type, success: true, data: runResult });
            break;
            
          case 'install_package':
            const installResult = await apiRequest('POST', `/api/packages/install/${projectId}`, {
              packages: action.data.packages,
              manager: action.data.manager,
            });
            results.push({ type: action.type, success: true, data: installResult });
            break;
        }
      } catch (error) {
        results.push({ type: action.type, success: false, error: error instanceof Error ? error.message : String(error) });
      }
    }
    
    return { success: results.every(r => r.success), results };
  }
}

export const aiService = new AIService();