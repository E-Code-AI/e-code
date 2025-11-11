import { OpenAI } from 'openai';
import { type IStorage } from '../storage';
import type { Project } from '@shared/schema';

/**
 * AI Plan Generator Service
 * Generates detailed execution plans using OpenAI GPT-5
 * REAL implementation - NO MOCKS
 */

export interface PlanTask {
  id: string;
  title: string;
  description: string;
  type: 'file_create' | 'file_edit' | 'command' | 'install_package' | 'config';
  estimatedTime: string;
  dependencies: string[];
  files?: {
    path: string;
    content?: string;
    language?: string;
  }[];
  commands?: string[];
  packages?: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ExecutionPlan {
  id: string;
  goal: string;
  summary: string;
  totalTasks: number;
  estimatedTime: string;
  technologies: string[];
  tasks: PlanTask[];
  riskAssessment: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  createdAt: Date;
}

export class AIPlanGeneratorService {
  private openai: OpenAI;
  private storage: IStorage;

  constructor(storage: IStorage) {
    this.storage = storage;
    
    // Initialize OpenAI client with user's API key
    const apiKey = process.env.OPENAI_API_KEY || 
                   process.env.AI_INTEGRATIONS_OPENAI_API_KEY || 
                   '_DUMMY_API_KEY_';
    
    const baseURL = process.env.OPENAI_API_KEY 
      ? undefined
      : (process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'http://localhost:1106/modelfarm/openai');
    
    this.openai = new OpenAI({
      apiKey,
      ...(baseURL && { baseURL }),
    });
  }

  /**
   * Generate a detailed execution plan from a user's prompt
   * REAL streaming implementation using OpenAI GPT-5
   */
  async *generatePlan(
    userId: string,
    projectId: string,
    goal: string,
    context?: {
      projectType?: string;
      existingFiles?: string[];
      technologies?: string[];
      constraints?: string[];
    }
  ): AsyncGenerator<{ type: 'chunk' | 'plan' | 'error'; data: any }> {
    try {
      // Get project details
      const project = await this.storage.getProject(projectId);
      if (!project) {
        yield { type: 'error', data: { message: 'Project not found' } };
        return;
      }

      // Get existing files for context
      const files = await this.storage.getProjectFiles(projectId);
      const existingFilesList = files.map(f => f.path).join('\n');

      const systemPrompt = `You are an expert software architect and project planner. Your task is to create a detailed, executable plan for building software projects.

Given a user's goal, create a comprehensive execution plan with the following:

1. **Analysis**: Understand the requirements thoroughly
2. **Technology Stack**: Recommend the best technologies
3. **Task Breakdown**: Break down the project into specific, actionable tasks
4. **Dependencies**: Identify task dependencies
5. **Risk Assessment**: Evaluate potential risks and challenges

**CRITICAL**: Respond ONLY with valid JSON in this exact format:

{
  "summary": "Brief overview of what will be built",
  "technologies": ["tech1", "tech2", "..."],
  "estimatedTime": "X hours",
  "tasks": [
    {
      "id": "task-1",
      "title": "Task title",
      "description": "Detailed description",
      "type": "file_create" | "file_edit" | "command" | "install_package" | "config",
      "estimatedTime": "X min",
      "dependencies": [],
      "priority": "high" | "medium" | "low",
      "files": [
        {
          "path": "path/to/file.ext",
          "content": "complete file content here",
          "language": "javascript"
        }
      ],
      "packages": ["package1", "package2"],
      "commands": ["npm install", "npm run build"]
    }
  ],
  "riskAssessment": {
    "level": "low" | "medium" | "high",
    "factors": ["risk1", "risk2"]
  }
}

**Requirements:**
- Generate COMPLETE, PRODUCTION-READY code for all files
- NO placeholders, NO TODOs, NO incomplete code
- Include ALL necessary configuration files (package.json, tsconfig.json, etc.)
- Specify exact package names and versions
- Order tasks by dependencies (earlier tasks should be completed before later ones)
- Be specific about file paths and content

**Project Context:**
- Language: ${project.language}
- Existing Files: ${existingFilesList || 'None (new project)'}
- Type: ${context?.projectType || 'web application'}
- Technologies: ${context?.technologies?.join(', ') || 'Auto-detect'}
- Constraints: ${context?.constraints?.join(', ') || 'None'}`;

      const userPrompt = `Create a detailed execution plan for: ${goal}

Remember:
1. Provide COMPLETE file contents (not snippets)
2. Include ALL necessary files (source, config, etc.)
3. List exact package names
4. Order tasks by dependencies
5. Respond with ONLY valid JSON`;

      // Stream response from OpenAI
      const stream = await this.openai.chat.completions.create({
        model: 'gpt-5', // Latest OpenAI model
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: true,
        max_completion_tokens: 8192,
        temperature: 0.7,
        response_format: { type: 'json_object' }
      });

      let fullResponse = '';

      // Stream chunks to client
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          yield { 
            type: 'chunk', 
            data: { content } 
          };
        }
      }

      // Parse the complete response
      try {
        const planData = JSON.parse(fullResponse);
        
        const plan: ExecutionPlan = {
          id: `plan-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          goal,
          summary: planData.summary || 'Execution plan generated',
          totalTasks: planData.tasks?.length || 0,
          estimatedTime: planData.estimatedTime || 'Unknown',
          technologies: planData.technologies || [],
          tasks: (planData.tasks || []).map((task: any, index: number) => ({
            id: task.id || `task-${index + 1}`,
            title: task.title || `Task ${index + 1}`,
            description: task.description || '',
            type: task.type || 'file_create',
            estimatedTime: task.estimatedTime || '10 min',
            dependencies: task.dependencies || [],
            files: task.files || [],
            commands: task.commands || [],
            packages: task.packages || [],
            priority: task.priority || 'medium'
          })),
          riskAssessment: {
            level: planData.riskAssessment?.level || 'low',
            factors: planData.riskAssessment?.factors || []
          },
          createdAt: new Date()
        };

        yield { 
          type: 'plan', 
          data: plan 
        };

      } catch (parseError) {
        console.error('[AIPlanGenerator] Failed to parse plan JSON:', parseError);
        yield { 
          type: 'error', 
          data: { 
            message: 'Failed to parse plan. Please try again.',
            rawResponse: fullResponse.substring(0, 500)
          } 
        };
      }

    } catch (error: any) {
      console.error('[AIPlanGenerator] Error generating plan:', error);
      yield { 
        type: 'error', 
        data: { 
          message: error.message || 'Failed to generate plan',
          code: error.code
        } 
      };
    }
  }

  /**
   * Persist plan to database (aiConversations + agentMessages)
   */
  async savePlan(
    userId: string,
    projectId: string,
    plan: ExecutionPlan
  ): Promise<number> {
    try {
      // Create conversation record
      const conversation = await this.storage.createAiConversation({
        projectId,
        userId,
        messages: [],
        context: {
          plan,
          goal: plan.goal,
          technologies: plan.technologies
        },
        totalTokensUsed: 0,
        model: 'gpt-5',
        agentMode: 'build'
      });

      // Create initial message with plan
      await this.storage.createAgentMessage({
        conversationId: conversation.id,
        projectId,
        userId,
        role: 'assistant',
        content: JSON.stringify(plan, null, 2),
        model: 'gpt-5',
        metadata: {
          planId: plan.id,
          totalTasks: plan.totalTasks,
          technologies: plan.technologies
        }
      });

      return conversation.id;
    } catch (error) {
      console.error('[AIPlanGenerator] Failed to save plan:', error);
      throw error;
    }
  }
}

export const aiPlanGenerator = new AIPlanGeneratorService(
  (global as any).storage
);
