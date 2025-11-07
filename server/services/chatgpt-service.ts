/**
 * ChatGPT Service for Admin Users
 * Handles all ChatGPT API interactions with project context
 */

import OpenAI from "openai";
import { getStorage } from "../storage";
import { Project, File } from "@shared/schema";

// Using the latest GPT-5 model from OpenAI
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: "https://api.openai.com/v1"
});

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
  projectContext?: {
    projectId: string;
    files?: string[];
  };
}

export interface ChatSession {
  id: string;
  userId: string;
  projectId?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
  model: string;
}

// In-memory storage for chat sessions (in production, use database)
const chatSessions = new Map<string, ChatSession>();

export class ChatGPTService {
  private storage = getStorage();

  /**
   * Create a new chat session
   */
  async createSession(userId: string, projectId?: string): Promise<ChatSession> {
    const sessionId = crypto.randomUUID();
    const session: ChatSession = {
      id: sessionId,
      userId,
      projectId,
      messages: [
        {
          role: 'system',
          content: `You are ChatGPT, an AI assistant integrated into the E-Code Platform. 
You are helping an admin user build and manage projects. You have access to:
- Project files and structure
- Code generation and modification capabilities
- System architecture knowledge
- Full platform features

Be helpful, precise, and provide code examples when appropriate.
Current model: GPT-5 (latest from OpenAI)`
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
      model: 'gpt-5'
    };

    chatSessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a chat session
   */
  async getSession(sessionId: string, userId: string): Promise<ChatSession | null> {
    const session = chatSessions.get(sessionId);
    if (session && session.userId === userId) {
      return session;
    }
    return null;
  }

  /**
   * Get all sessions for a user
   */
  async getUserSessions(userId: string): Promise<ChatSession[]> {
    const sessions = Array.from(chatSessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return sessions;
  }

  /**
   * Send a message to ChatGPT with project context
   */
  async sendMessage(
    sessionId: string,
    userId: string,
    message: string,
    includeProjectContext: boolean = false
  ): Promise<ChatMessage> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add project context if requested
    let contextMessages: ChatMessage[] = [];
    if (includeProjectContext && session.projectId) {
      contextMessages = await this.buildProjectContext(session.projectId);
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    session.messages.push(userMessage);

    try {
      // Prepare messages for API call
      const apiMessages = [
        ...session.messages.slice(0, 1), // System message
        ...contextMessages, // Project context
        ...session.messages.slice(1) // Conversation history
      ];

      // Call OpenAI API
      const response = await openai.chat.completions.create({
        model: session.model,
        messages: apiMessages as any,
        max_tokens: 4096,
        temperature: 0.7
      });

      // Add assistant response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: response.choices[0].message.content || 'No response generated',
        timestamp: new Date()
      };
      session.messages.push(assistantMessage);
      session.updatedAt = new Date();

      return assistantMessage;
    } catch (error) {
      console.error('ChatGPT API error:', error);
      throw new Error(`Failed to get response: ${error.message}`);
    }
  }

  /**
   * Build project context for ChatGPT
   */
  private async buildProjectContext(projectId: string): Promise<ChatMessage[]> {
    try {
      const project = await this.storage.getProject(projectId);
      const files = await this.storage.getProjectFiles(projectId);

      if (!project) {
        return [];
      }

      // Create a context message with project information
      let contextContent = `Project Context:
Name: ${project.name}
Description: ${project.description || 'No description'}
Language: ${project.language || 'Not specified'}
`;

      // Add file structure
      if (files && files.length > 0) {
        contextContent += '\nProject Structure:\n';
        const fileTree = this.buildFileTree(files);
        contextContent += fileTree;

        // Include important files content (limit to key files)
        const keyFiles = files.filter(f => 
          f.name.endsWith('.json') || 
          f.name === 'README.md' || 
          f.name === 'index.ts' || 
          f.name === 'index.js' ||
          f.name === 'App.tsx' ||
          f.name === 'main.py'
        ).slice(0, 5);

        if (keyFiles.length > 0) {
          contextContent += '\n\nKey Files Content:\n';
          for (const file of keyFiles) {
            contextContent += `\n--- ${file.path} ---\n`;
            contextContent += file.content?.slice(0, 1000) || 'Empty file';
            if (file.content && file.content.length > 1000) {
              contextContent += '\n... (truncated)';
            }
          }
        }
      }

      return [{
        role: 'system' as const,
        content: contextContent
      }];
    } catch (error) {
      console.error('Failed to build project context:', error);
      return [];
    }
  }

  /**
   * Build a file tree structure from files
   */
  private buildFileTree(files: any[]): string {
    const tree: any = {};
    
    // Build tree structure
    files.forEach(file => {
      const parts = file.path.split('/');
      let current = tree;
      
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          current[part] = null; // File
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    });

    // Convert to string
    const treeToString = (obj: any, indent = ''): string => {
      let result = '';
      const entries = Object.entries(obj);
      
      entries.forEach(([key, value], index) => {
        const isLast = index === entries.length - 1;
        const prefix = isLast ? '└── ' : '├── ';
        result += indent + prefix + key + '\n';
        
        if (value && typeof value === 'object') {
          const nextIndent = indent + (isLast ? '    ' : '│   ');
          result += treeToString(value, nextIndent);
        }
      });
      
      return result;
    };

    return treeToString(tree);
  }

  /**
   * Generate code based on user request
   */
  async generateCode(
    sessionId: string,
    userId: string,
    request: string,
    language: string = 'typescript'
  ): Promise<{ code: string; explanation: string }> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error('Session not found');
    }

    const codePrompt = `Generate ${language} code for the following request:
${request}

Requirements:
- Use best practices and modern syntax
- Include comments for clarity
- Handle errors appropriately
- Make it production-ready

Return the code and a brief explanation of the implementation.`;

    try {
      const response = await openai.chat.completions.create({
        model: 'gpt-5',
        messages: [
          {
            role: 'system',
            content: 'You are an expert programmer. Generate clean, efficient, and well-documented code.'
          },
          {
            role: 'user',
            content: codePrompt
          }
        ],
        max_tokens: 4096
      });

      const content = response.choices[0].message.content || '';
      
      // Extract code blocks
      const codeMatch = content.match(/```[\w]*\n([\s\S]*?)```/);
      const code = codeMatch ? codeMatch[1] : content;
      
      // Extract explanation
      const explanation = content.replace(/```[\w]*\n[\s\S]*?```/g, '').trim();

      return { code, explanation };
    } catch (error) {
      console.error('Code generation error:', error);
      throw new Error(`Failed to generate code: ${error.message}`);
    }
  }

  /**
   * Clear a chat session
   */
  async clearSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.getSession(sessionId, userId);
    if (session) {
      session.messages = session.messages.slice(0, 1); // Keep only system message
      session.updatedAt = new Date();
    }
  }

  /**
   * Delete a chat session
   */
  async deleteSession(sessionId: string, userId: string): Promise<void> {
    const session = chatSessions.get(sessionId);
    if (session && session.userId === userId) {
      chatSessions.delete(sessionId);
    }
  }

  /**
   * Send a streaming message to ChatGPT with project context
   */
  async *sendStreamingMessage(
    sessionId: string,
    userId: string,
    message: string,
    includeProjectContext: boolean = false
  ): AsyncGenerator<string, void, unknown> {
    const session = await this.getSession(sessionId, userId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Add project context if requested
    let contextMessages: ChatMessage[] = [];
    if (includeProjectContext && session.projectId) {
      contextMessages = await this.buildProjectContext(session.projectId);
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    session.messages.push(userMessage);

    try {
      // Prepare messages for API call
      const apiMessages = [
        ...session.messages.slice(0, 1), // System message
        ...contextMessages, // Project context
        ...session.messages.slice(1) // Conversation history
      ];

      // Call OpenAI API with streaming
      const stream = await openai.chat.completions.create({
        model: session.model,
        messages: apiMessages as any,
        max_tokens: 4096,
        temperature: 0.7,
        stream: true
      });

      let fullResponse = '';
      
      // Stream the response
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield content;
        }
      }

      // Save the complete response
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: fullResponse,
        timestamp: new Date()
      };
      session.messages.push(assistantMessage);
      session.updatedAt = new Date();
      
    } catch (error) {
      console.error('ChatGPT streaming error:', error);
      throw new Error(`Failed to stream response: ${error.message}`);
    }
  }
}