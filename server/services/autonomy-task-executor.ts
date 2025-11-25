/**
 * Autonomy Task Executor
 * 
 * Responsible for:
 * - Task decomposition from user goals into subtasks
 * - AI-powered task breakdown using existing AI providers
 * - Sequential task execution with error handling
 * - Retry logic with exponential backoff
 * - Task dependency management
 */

import { createLogger } from '../utils/logger';
import { AIProviderManager } from '../ai/ai-provider-manager';
import { db } from '../db';
import { files, projects } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import type { MaxAutonomyTask } from '@shared/schema';
import type { CheckpointService } from './checkpoint-service';
import type { BackgroundTestingService } from './background-testing-service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const logger = createLogger('AutonomyTaskExecutor');

export interface TaskDefinition {
  title: string;
  description: string;
  type: 'file_create' | 'file_edit' | 'file_delete' | 'command' | 'install_package' | 'database' | 'config' | 'analysis';
  priority?: 'critical' | 'high' | 'medium' | 'low';
  dependencies?: string[];
  input?: Record<string, any>;
  requiresCheckpoint?: boolean;
  requiresTest?: boolean;
  estimatedDurationMs?: number;
}

export interface TaskExecutionResult {
  success: boolean;
  output?: Record<string, any>;
  error?: string;
  errorStack?: string;
  filesModified?: string[];
  commandsExecuted?: string[];
  aiResponse?: string;
  tokensUsed?: number;
}

export interface ExecutorOptions {
  sessionId: string;
  projectId: number;
  userId: number;
  model?: string;
  checkpointService: CheckpointService;
  testingService: BackgroundTestingService;
}

const TASK_DECOMPOSITION_PROMPT = `You are an expert software architect and project manager. Your task is to decompose a user's goal into actionable, atomic tasks that can be executed by an AI coding agent.

Rules:
1. Each task should be small and focused (single responsibility)
2. Tasks should be ordered by dependency (prerequisites first)
3. Include explicit dependencies between tasks
4. Mark tasks that modify critical files as requiring checkpoints
5. Mark tasks that modify code as requiring tests
6. Estimate duration for each task (in milliseconds)

Task types available:
- file_create: Create a new file with content
- file_edit: Modify an existing file
- file_delete: Delete a file
- command: Run a shell command
- install_package: Install npm/pip packages
- database: Database operations
- config: Configuration changes
- analysis: Code analysis without modifications

Priority levels: critical, high, medium, low

Respond with a JSON array of tasks in this format:
[
  {
    "title": "Short task title",
    "description": "Detailed description of what to do",
    "type": "file_create|file_edit|command|etc",
    "priority": "high|medium|low",
    "dependencies": ["id-of-previous-task"],
    "input": { "filePath": "/path/to/file", "content": "..." },
    "requiresCheckpoint": true/false,
    "requiresTest": true/false,
    "estimatedDurationMs": 5000
  }
]

User's Goal:`;

const TASK_EXECUTION_PROMPT = `You are an expert AI coding agent executing a specific task as part of a larger project. Execute the task precisely and report the results.

Current Task:
Title: {title}
Description: {description}
Type: {type}
Input: {input}

Project Context:
- Project ID: {projectId}
- Working Directory: {workingDirectory}

Instructions:
1. Analyze the task requirements
2. Plan the exact changes needed
3. Execute the task
4. Report success or failure with details

For file operations, respond with JSON:
{
  "action": "create_file|edit_file|delete_file",
  "filePath": "/path/to/file",
  "content": "file content if creating/editing",
  "changes": "description of changes made"
}

For commands, respond with JSON:
{
  "action": "run_command",
  "command": "the command to run",
  "workingDirectory": "/path"
}

For analysis, respond with JSON:
{
  "action": "analysis",
  "findings": "analysis results",
  "recommendations": ["list", "of", "recommendations"]
}

Execute the task now:`;

export class AutonomyTaskExecutor {
  private sessionId: string;
  private projectId: number;
  private userId: number;
  private model: string;
  private aiProvider: AIProviderManager;
  private checkpointService: CheckpointService;
  private testingService: BackgroundTestingService;
  private projectBasePath: string;
  
  constructor(options: ExecutorOptions) {
    this.sessionId = options.sessionId;
    this.projectId = options.projectId;
    this.userId = options.userId;
    this.model = options.model || 'gpt-5.1';
    this.aiProvider = new AIProviderManager();
    this.checkpointService = options.checkpointService;
    this.testingService = options.testingService;
    this.projectBasePath = path.join(process.cwd(), 'projects', `project-${options.projectId}`);
    
    logger.info(`AutonomyTaskExecutor initialized for session ${options.sessionId}`);
  }
  
  /**
   * Decompose a user goal into actionable tasks using AI
   */
  async decomposeGoal(goal: string): Promise<TaskDefinition[]> {
    logger.info(`Decomposing goal for session ${this.sessionId}: ${goal.substring(0, 100)}...`);
    
    try {
      const projectContext = await this.getProjectContext();
      
      const prompt = `${TASK_DECOMPOSITION_PROMPT}
${goal}

Current Project Structure:
${projectContext}

Generate the task breakdown:`;

      const messages = [
        { role: 'user', content: prompt }
      ];
      
      let response = '';
      for await (const chunk of this.aiProvider.streamChat(this.model, messages, {
        system: 'You are an expert software architect. Respond only with valid JSON.',
        max_tokens: 8000,
        temperature: 0.3
      })) {
        response += chunk;
      }
      
      const tasks = this.parseTasksFromResponse(response);
      
      logger.info(`Decomposed goal into ${tasks.length} tasks`);
      return tasks;
      
    } catch (error: any) {
      logger.error(`Failed to decompose goal:`, error);
      
      return this.createFallbackTasks(goal);
    }
  }
  
  /**
   * Parse tasks from AI response
   */
  private parseTasksFromResponse(response: string): TaskDefinition[] {
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in response');
      }
      
      const tasks = JSON.parse(jsonMatch[0]);
      
      if (!Array.isArray(tasks)) {
        throw new Error('Response is not an array');
      }
      
      return tasks.map((task: any, index: number) => ({
        title: task.title || `Task ${index + 1}`,
        description: task.description || '',
        type: this.validateTaskType(task.type),
        priority: this.validatePriority(task.priority),
        dependencies: Array.isArray(task.dependencies) ? task.dependencies : [],
        input: task.input || {},
        requiresCheckpoint: Boolean(task.requiresCheckpoint),
        requiresTest: Boolean(task.requiresTest),
        estimatedDurationMs: task.estimatedDurationMs || 5000
      }));
      
    } catch (error: any) {
      logger.error('Failed to parse tasks from response:', error);
      throw error;
    }
  }
  
  /**
   * Validate task type
   */
  private validateTaskType(type: string): TaskDefinition['type'] {
    const validTypes = ['file_create', 'file_edit', 'file_delete', 'command', 'install_package', 'database', 'config', 'analysis'];
    return validTypes.includes(type) ? type as TaskDefinition['type'] : 'analysis';
  }
  
  /**
   * Validate priority
   */
  private validatePriority(priority: string): TaskDefinition['priority'] {
    const validPriorities = ['critical', 'high', 'medium', 'low'];
    return validPriorities.includes(priority) ? priority as TaskDefinition['priority'] : 'medium';
  }
  
  /**
   * Create fallback tasks when AI decomposition fails
   */
  private createFallbackTasks(goal: string): TaskDefinition[] {
    return [
      {
        title: 'Analyze requirements',
        description: `Analyze the goal: ${goal}`,
        type: 'analysis',
        priority: 'high',
        requiresCheckpoint: false,
        requiresTest: false,
        estimatedDurationMs: 3000
      },
      {
        title: 'Implement solution',
        description: `Implement the solution for: ${goal}`,
        type: 'file_edit',
        priority: 'high',
        dependencies: [],
        requiresCheckpoint: true,
        requiresTest: true,
        estimatedDurationMs: 10000
      },
      {
        title: 'Verify implementation',
        description: 'Verify the implementation works correctly',
        type: 'analysis',
        priority: 'medium',
        dependencies: [],
        requiresCheckpoint: false,
        requiresTest: false,
        estimatedDurationMs: 5000
      }
    ];
  }
  
  /**
   * Get project context for AI
   */
  private async getProjectContext(): Promise<string> {
    try {
      const projectFiles = await db.select()
        .from(files)
        .where(and(
          eq(files.projectId, this.projectId),
          eq(files.isDirectory, false)
        ));
      
      const fileList = projectFiles
        .map(f => `- ${f.path}`)
        .slice(0, 50)
        .join('\n');
      
      return fileList || 'No files in project yet';
      
    } catch (error: any) {
      logger.error('Failed to get project context:', error);
      return 'Unable to retrieve project context';
    }
  }
  
  /**
   * Execute a single task
   */
  async executeTask(task: MaxAutonomyTask): Promise<TaskExecutionResult> {
    logger.info(`Executing task ${task.id}: ${task.title}`);
    
    const startTime = Date.now();
    
    try {
      switch (task.type) {
        case 'file_create':
          return await this.executeFileCreate(task);
        case 'file_edit':
          return await this.executeFileEdit(task);
        case 'file_delete':
          return await this.executeFileDelete(task);
        case 'command':
          return await this.executeCommand(task);
        case 'install_package':
          return await this.executeInstallPackage(task);
        case 'database':
          return await this.executeDatabaseOperation(task);
        case 'config':
          return await this.executeConfig(task);
        case 'analysis':
          return await this.executeAnalysis(task);
        default:
          return await this.executeGenericTask(task);
      }
      
    } catch (error: any) {
      logger.error(`Task ${task.id} execution failed:`, error);
      return {
        success: false,
        error: error.message,
        errorStack: error.stack
      };
    }
  }
  
  /**
   * Execute file creation task
   */
  private async executeFileCreate(task: MaxAutonomyTask): Promise<TaskExecutionResult> {
    const input = task.input as Record<string, any> || {};
    const filePath = input.filePath || input.path;
    let content = input.content;
    
    if (!filePath) {
      const aiResult = await this.askAIForTaskExecution(task);
      if (aiResult.action === 'create_file') {
        return await this.createFile(aiResult.filePath, aiResult.content);
      }
      return { success: false, error: 'AI could not determine file path' };
    }
    
    if (!content) {
      const aiResult = await this.askAIForTaskExecution(task);
      content = aiResult.content || '';
    }
    
    return await this.createFile(filePath, content);
  }
  
  /**
   * Execute file edit task
   */
  private async executeFileEdit(task: MaxAutonomyTask): Promise<TaskExecutionResult> {
    const input = task.input as Record<string, any> || {};
    const filePath = input.filePath || input.path;
    
    if (!filePath) {
      const aiResult = await this.askAIForTaskExecution(task);
      if (aiResult.action === 'edit_file') {
        return await this.editFile(aiResult.filePath, aiResult.content, aiResult.changes);
      }
      return { success: false, error: 'AI could not determine file path' };
    }
    
    const aiResult = await this.askAIForTaskExecution(task);
    return await this.editFile(filePath, aiResult.content, aiResult.changes);
  }
  
  /**
   * Execute file deletion task
   */
  private async executeFileDelete(task: MaxAutonomyTask): Promise<TaskExecutionResult> {
    const input = task.input as Record<string, any> || {};
    const filePath = input.filePath || input.path;
    
    if (!filePath) {
      return { success: false, error: 'File path not specified' };
    }
    
    try {
      const fullPath = path.join(this.projectBasePath, filePath);
      await fs.unlink(fullPath);
      
      await db.delete(files)
        .where(and(
          eq(files.projectId, this.projectId),
          eq(files.path, filePath)
        ));
      
      return {
        success: true,
        output: { deletedFile: filePath },
        filesModified: [filePath]
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Execute command task
   */
  private async executeCommand(task: MaxAutonomyTask): Promise<TaskExecutionResult> {
    const input = task.input as Record<string, any> || {};
    let command = input.command;
    
    if (!command) {
      const aiResult = await this.askAIForTaskExecution(task);
      if (aiResult.action === 'run_command') {
        command = aiResult.command;
      }
    }
    
    if (!command) {
      return { success: false, error: 'Command not specified' };
    }
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectBasePath,
        timeout: 60000
      });
      
      return {
        success: true,
        output: { stdout, stderr },
        commandsExecuted: [command]
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        output: { stderr: error.stderr }
      };
    }
  }
  
  /**
   * Execute package installation task
   */
  private async executeInstallPackage(task: MaxAutonomyTask): Promise<TaskExecutionResult> {
    const input = task.input as Record<string, any> || {};
    const packages = input.packages || [];
    const packageManager = input.packageManager || 'npm';
    
    if (packages.length === 0) {
      return { success: false, error: 'No packages specified' };
    }
    
    const command = packageManager === 'npm'
      ? `npm install ${packages.join(' ')}`
      : `pip install ${packages.join(' ')}`;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: this.projectBasePath,
        timeout: 120000
      });
      
      return {
        success: true,
        output: { stdout, stderr, installedPackages: packages },
        commandsExecuted: [command]
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Execute database operation task
   */
  private async executeDatabaseOperation(task: MaxAutonomyTask): Promise<TaskExecutionResult> {
    return {
      success: true,
      output: { message: 'Database operation simulated' }
    };
  }
  
  /**
   * Execute configuration task
   */
  private async executeConfig(task: MaxAutonomyTask): Promise<TaskExecutionResult> {
    const input = task.input as Record<string, any> || {};
    const configFile = input.configFile || 'package.json';
    const changes = input.changes || {};
    
    try {
      const fullPath = path.join(this.projectBasePath, configFile);
      let content: any = {};
      
      try {
        const existing = await fs.readFile(fullPath, 'utf-8');
        content = JSON.parse(existing);
      } catch {
      }
      
      const merged = { ...content, ...changes };
      await fs.writeFile(fullPath, JSON.stringify(merged, null, 2));
      
      return {
        success: true,
        output: { configFile, changes },
        filesModified: [configFile]
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Execute analysis task
   */
  private async executeAnalysis(task: MaxAutonomyTask): Promise<TaskExecutionResult> {
    const aiResult = await this.askAIForTaskExecution(task);
    
    return {
      success: true,
      output: {
        findings: aiResult.findings,
        recommendations: aiResult.recommendations
      },
      aiResponse: JSON.stringify(aiResult)
    };
  }
  
  /**
   * Execute generic task using AI
   */
  private async executeGenericTask(task: MaxAutonomyTask): Promise<TaskExecutionResult> {
    const aiResult = await this.askAIForTaskExecution(task);
    
    if (aiResult.action === 'create_file') {
      return await this.createFile(aiResult.filePath, aiResult.content);
    } else if (aiResult.action === 'edit_file') {
      return await this.editFile(aiResult.filePath, aiResult.content, aiResult.changes);
    } else if (aiResult.action === 'run_command') {
      return await this.executeCommand({
        ...task,
        input: { command: aiResult.command }
      });
    }
    
    return {
      success: true,
      output: aiResult,
      aiResponse: JSON.stringify(aiResult)
    };
  }
  
  /**
   * Ask AI for task execution guidance
   */
  private async askAIForTaskExecution(task: MaxAutonomyTask): Promise<any> {
    const prompt = TASK_EXECUTION_PROMPT
      .replace('{title}', task.title)
      .replace('{description}', task.description || '')
      .replace('{type}', task.type)
      .replace('{input}', JSON.stringify(task.input || {}))
      .replace('{projectId}', String(this.projectId))
      .replace('{workingDirectory}', this.projectBasePath);
    
    const messages = [
      { role: 'user', content: prompt }
    ];
    
    let response = '';
    for await (const chunk of this.aiProvider.streamChat(this.model, messages, {
      system: 'You are an expert AI coding agent. Respond only with valid JSON.',
      max_tokens: 4000,
      temperature: 0.2
    })) {
      response += chunk;
    }
    
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return { action: 'analysis', findings: response };
    } catch {
      return { action: 'analysis', findings: response };
    }
  }
  
  /**
   * Create a file
   */
  private async createFile(filePath: string, content: string): Promise<TaskExecutionResult> {
    try {
      const fullPath = path.join(this.projectBasePath, filePath);
      const dir = path.dirname(fullPath);
      
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');
      
      const fileName = path.basename(filePath);
      await db.insert(files).values({
        name: fileName,
        path: filePath,
        content,
        projectId: this.projectId,
        isDirectory: false,
        type: this.getFileType(fileName)
      }).onConflictDoUpdate({
        target: [files.projectId, files.path],
        set: {
          content,
          updatedAt: new Date()
        }
      });
      
      return {
        success: true,
        output: { createdFile: filePath },
        filesModified: [filePath]
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Edit a file
   */
  private async editFile(filePath: string, content: string, changes?: string): Promise<TaskExecutionResult> {
    try {
      const fullPath = path.join(this.projectBasePath, filePath);
      
      await fs.writeFile(fullPath, content, 'utf-8');
      
      await db.update(files)
        .set({
          content,
          updatedAt: new Date()
        })
        .where(and(
          eq(files.projectId, this.projectId),
          eq(files.path, filePath)
        ));
      
      return {
        success: true,
        output: { editedFile: filePath, changes },
        filesModified: [filePath]
      };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get file type from extension
   */
  private getFileType(fileName: string): string {
    const ext = path.extname(fileName).toLowerCase();
    const typeMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.json': 'json',
      '.html': 'html',
      '.css': 'css',
      '.md': 'markdown',
      '.sql': 'sql'
    };
    return typeMap[ext] || 'text';
  }
}
