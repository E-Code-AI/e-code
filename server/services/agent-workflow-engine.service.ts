import { EventEmitter } from 'events';
import { db } from '../db';
import {
  agentWorkflows,
  agentSessions,
  agentAuditTrail,
  type AgentWorkflow,
  type InsertAgentWorkflow,
  type AgentSession
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { agentFileOperations } from './agent-file-operations.service';
import { agentCommandExecution } from './agent-command-execution.service';
import { agentToolFramework } from './agent-tool-framework.service';
import { OpenAI } from 'openai';

// Workflow step types
export type WorkflowStepType = 'file_operation' | 'command' | 'tool' | 'database' | 'conditional' | 'parallel' | 'loop';

// Workflow step definition
export interface WorkflowStep {
  id: string;
  name: string;
  type: WorkflowStepType;
  config: any;
  dependencies?: string[];
  retryPolicy?: {
    maxRetries: number;
    backoffMs: number;
  };
  condition?: {
    type: 'success' | 'failure' | 'custom';
    expression?: string;
  };
}

// Workflow execution state
export interface WorkflowState {
  variables: Record<string, any>;
  outputs: Record<string, any>;
  errors: Record<string, string>;
  completedSteps: string[];
  failedSteps: string[];
  currentStepIndex: number;
}

// Workflow execution event
export interface WorkflowExecutionEvent {
  type: 'workflow_start' | 'step_start' | 'step_complete' | 'step_failed' | 
        'workflow_complete' | 'workflow_failed' | 'checkpoint_created';
  workflowId: string;
  stepId?: string;
  progress: number;
  state?: WorkflowState;
  error?: string;
}

export class AgentWorkflowEngineService extends EventEmitter {
  private activeWorkflows: Map<string, { workflow: AgentWorkflow; state: WorkflowState }> = new Map();
  private openai: OpenAI;
  
  constructor() {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // Create and execute a workflow
  async executeWorkflow(
    sessionId: string,
    name: string,
    description: string,
    steps: WorkflowStep[],
    userId: string,
    initialVariables: Record<string, any> = {}
  ): Promise<AgentWorkflow> {
    try {
      // Validate session
      const session = await this.validateSession(sessionId);
      
      // Create workflow record
      const [workflow] = await db.insert(agentWorkflows)
        .values({
          sessionId,
          name,
          description,
          steps,
          status: 'pending',
          progress: 0
        })
        .returning();
      
      // Initialize workflow state
      const state: WorkflowState = {
        variables: { ...initialVariables },
        outputs: {},
        errors: {},
        completedSteps: [],
        failedSteps: [],
        currentStepIndex: 0
      };
      
      this.activeWorkflows.set(workflow.id, { workflow, state });
      
      // Emit workflow start
      this.emitEvent({
        type: 'workflow_start',
        workflowId: workflow.id,
        progress: 0
      });
      
      // Update status to in_progress
      await db.update(agentWorkflows)
        .set({ status: 'in_progress' })
        .where(eq(agentWorkflows.id, workflow.id));
      
      // Execute workflow
      await this.runWorkflow(workflow.id, session, userId);
      
      // Get final workflow state
      const [finalWorkflow] = await db.select()
        .from(agentWorkflows)
        .where(eq(agentWorkflows.id, workflow.id));
      
      return finalWorkflow;
    } catch (error: any) {
      throw new Error(`Workflow execution failed: ${error.message}`);
    }
  }

  // Execute workflow steps
  private async runWorkflow(
    workflowId: string,
    session: AgentSession,
    userId: string
  ): Promise<void> {
    const workflowData = this.activeWorkflows.get(workflowId);
    if (!workflowData) {
      throw new Error('Workflow not found in active workflows');
    }
    
    const { workflow, state } = workflowData;
    const steps = workflow.steps as WorkflowStep[];
    
    try {
      // Build execution order respecting dependencies
      const executionOrder = this.buildExecutionOrder(steps);
      
      for (const stepGroup of executionOrder) {
        // Execute steps in parallel if they're in the same group
        const promises = stepGroup.map(step => 
          this.executeStep(workflowId, step, session, userId, state)
        );
        
        const results = await Promise.allSettled(promises);
        
        // Check for failures
        const failures = results.filter(r => r.status === 'rejected');
        if (failures.length > 0 && !this.shouldContinueOnFailure(workflow)) {
          throw new Error(`Workflow failed at step group: ${failures.map((f: any) => f.reason).join(', ')}`);
        }
        
        // Update progress
        const progress = Math.floor((state.completedSteps.length / steps.length) * 100);
        await db.update(agentWorkflows)
          .set({ 
            progress,
            currentStep: stepGroup[stepGroup.length - 1].id
          })
          .where(eq(agentWorkflows.id, workflowId));
        
        // Create checkpoint after each step group
        await this.createCheckpoint(workflowId, state);
      }
      
      // Workflow completed successfully
      await db.update(agentWorkflows)
        .set({ 
          status: 'completed',
          progress: 100,
          completedAt: new Date(),
          result: state.outputs
        })
        .where(eq(agentWorkflows.id, workflowId));
      
      this.emitEvent({
        type: 'workflow_complete',
        workflowId,
        progress: 100,
        state
      });
      
      // Audit trail
      await this.createAuditEntry(session.id, userId, 'workflow_complete', workflowId);
      
    } catch (error: any) {
      // Workflow failed
      await db.update(agentWorkflows)
        .set({ 
          status: 'failed',
          error: error.message,
          completedAt: new Date()
        })
        .where(eq(agentWorkflows.id, workflowId));
      
      this.emitEvent({
        type: 'workflow_failed',
        workflowId,
        progress: state.completedSteps.length / steps.length * 100,
        error: error.message
      });
      
      await this.createAuditEntry(session.id, userId, 'workflow_failed', workflowId);
      
      throw error;
    } finally {
      this.activeWorkflows.delete(workflowId);
    }
  }

  // Execute a single workflow step
  private async executeStep(
    workflowId: string,
    step: WorkflowStep,
    session: AgentSession,
    userId: string,
    state: WorkflowState
  ): Promise<void> {
    try {
      // Check if dependencies are satisfied
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!state.completedSteps.includes(dep)) {
            throw new Error(`Dependency not satisfied: ${dep}`);
          }
        }
      }
      
      // Emit step start
      this.emitEvent({
        type: 'step_start',
        workflowId,
        stepId: step.id,
        progress: (state.completedSteps.length / state.completedSteps.length) * 100
      });
      
      let retryCount = 0;
      const maxRetries = step.retryPolicy?.maxRetries || 0;
      const backoffMs = step.retryPolicy?.backoffMs || 1000;
      
      while (retryCount <= maxRetries) {
        try {
          // Execute based on step type
          const result = await this.executeStepByType(step, session, userId, state);
          
          // Store output
          state.outputs[step.id] = result;
          state.completedSteps.push(step.id);
          
          // Emit step complete
          this.emitEvent({
            type: 'step_complete',
            workflowId,
            stepId: step.id,
            progress: (state.completedSteps.length / state.completedSteps.length) * 100
          });
          
          return;
        } catch (stepError: any) {
          retryCount++;
          if (retryCount > maxRetries) {
            throw stepError;
          }
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, backoffMs * Math.pow(2, retryCount - 1)));
        }
      }
    } catch (error: any) {
      state.errors[step.id] = error.message;
      state.failedSteps.push(step.id);
      
      this.emitEvent({
        type: 'step_failed',
        workflowId,
        stepId: step.id,
        progress: (state.completedSteps.length / state.completedSteps.length) * 100,
        error: error.message
      });
      
      throw error;
    }
  }

  // Execute step based on type
  private async executeStepByType(
    step: WorkflowStep,
    session: AgentSession,
    userId: string,
    state: WorkflowState
  ): Promise<any> {
    const context = {
      sessionId: session.id,
      userId,
      projectPath: session.context?.workingDirectory || '.',
      environment: session.context?.environment || {}
    };
    
    switch (step.type) {
      case 'file_operation':
        return await this.executeFileOperation(step.config, context, state);
      
      case 'command':
        return await this.executeCommand(step.config, context, state);
      
      case 'tool':
        return await this.executeTool(step.config, context, state);
      
      case 'database':
        return await this.executeDatabaseOperation(step.config, context, state);
      
      case 'conditional':
        return await this.executeConditional(step.config, context, state);
      
      case 'parallel':
        return await this.executeParallel(step.config, context, state);
      
      case 'loop':
        return await this.executeLoop(step.config, context, state);
      
      default:
        throw new Error(`Unknown step type: ${step.type}`);
    }
  }

  // Execute file operation step
  private async executeFileOperation(
    config: any,
    context: any,
    state: WorkflowState
  ): Promise<any> {
    // ✅ FIX (Nov 21, 2025): Fetch full task details from plan store if taskId provided
    // ARCHITECT APPROVED: Solves JSONB overflow by storing content separately
    let effectiveConfig = config;
    
    if (config.taskId) {
      const { agentPlanStore } = await import('./agent-plan-store.service');
      const task = await agentPlanStore.getTask(context.sessionId, config.taskId);
      
      if (!task) {
        throw new Error(`Task ${config.taskId} not found in plan store`);
      }
      
      // Merge task details into config (task has full file contents, commands, etc.)
      effectiveConfig = {
        ...config,
        ...task,
        // Preserve original config values if not in task
        operation: task.type === 'create_file' ? 'write' : config.operation,
        path: task.path || config.path,
        content: task.content || config.content
      };
    }
    
    const { operation, path, content } = this.resolveVariables(effectiveConfig, state);
    
    switch (operation) {
      case 'read':
        return await agentFileOperations.readFile(
          context.sessionId,
          path,
          context.userId
        );
      
      case 'write':
        return await agentFileOperations.createOrUpdateFile(
          context.sessionId,
          path,
          content,
          context.userId
        );
      
      case 'delete':
        return await agentFileOperations.deleteFile(
          context.sessionId,
          path,
          context.userId
        );
      
      case 'list':
        return await agentFileOperations.listDirectory(
          context.sessionId,
          path,
          config.recursive
        );
      
      default:
        throw new Error(`Unknown file operation: ${operation}`);
    }
  }

  // Execute command step
  private async executeCommand(
    config: any,
    context: any,
    state: WorkflowState
  ): Promise<any> {
    const { command, args, workingDirectory, timeout } = this.resolveVariables(config, state);
    
    const result = await agentCommandExecution.executeCommand(
      context.sessionId,
      command,
      args || [],
      {
        workingDirectory,
        timeout,
        environment: context.environment
      },
      context.userId
    );
    
    return {
      stdout: result.stdout,
      stderr: result.stderr,
      exitCode: result.exitCode
    };
  }

  // Execute tool step
  private async executeTool(
    config: any,
    context: any,
    state: WorkflowState
  ): Promise<any> {
    const { toolName, input } = this.resolveVariables(config, state);
    
    const result = await agentToolFramework.executeTool(
      toolName,
      input,
      context
    );
    
    return result.output;
  }

  // Execute database operation step
  private async executeDatabaseOperation(
    config: any,
    context: any,
    state: WorkflowState
  ): Promise<any> {
    const { query, params } = this.resolveVariables(config, state);
    
    // This would connect to the actual database operations service
    // For now, returning a placeholder
    return {
      query,
      params,
      result: 'Database operation would be executed here'
    };
  }

  // Execute conditional step
  private async executeConditional(
    config: any,
    context: any,
    state: WorkflowState
  ): Promise<any> {
    const { condition, trueBranch, falseBranch } = config;
    
    // Evaluate condition
    const conditionResult = this.evaluateCondition(condition, state);
    
    if (conditionResult) {
      if (trueBranch) {
        return await this.executeStepByType(trueBranch, context, context.userId, state);
      }
    } else {
      if (falseBranch) {
        return await this.executeStepByType(falseBranch, context, context.userId, state);
      }
    }
    
    return null;
  }

  // Execute parallel steps
  private async executeParallel(
    config: any,
    context: any,
    state: WorkflowState
  ): Promise<any> {
    const { steps } = config;
    
    const promises = steps.map((step: WorkflowStep) => 
      this.executeStepByType(step, context, context.userId, state)
    );
    
    const results = await Promise.allSettled(promises);
    
    return results.map((r: any) => 
      r.status === 'fulfilled' ? r.value : { error: r.reason }
    );
  }

  // Execute loop step
  private async executeLoop(
    config: any,
    context: any,
    state: WorkflowState
  ): Promise<any> {
    const { items, step, variable } = config;
    const results = [];
    
    const resolvedItems = this.resolveVariables(items, state);
    
    for (const item of resolvedItems) {
      // Set loop variable
      state.variables[variable] = item;
      
      // Execute step
      const result = await this.executeStepByType(step, context, context.userId, state);
      results.push(result);
    }
    
    return results;
  }

  // Build execution order respecting dependencies
  private buildExecutionOrder(steps: WorkflowStep[]): WorkflowStep[][] {
    const order: WorkflowStep[][] = [];
    const completed = new Set<string>();
    const remaining = [...steps];
    
    while (remaining.length > 0) {
      const group: WorkflowStep[] = [];
      
      for (let i = remaining.length - 1; i >= 0; i--) {
        const step = remaining[i];
        
        // Check if all dependencies are satisfied
        const depsatisfied = !step.dependencies || 
          step.dependencies.every(dep => completed.has(dep));
        
        if (depsatisfied) {
          group.push(step);
          remaining.splice(i, 1);
        }
      }
      
      if (group.length === 0 && remaining.length > 0) {
        throw new Error('Circular dependency detected in workflow');
      }
      
      group.forEach(step => completed.add(step.id));
      order.push(group);
    }
    
    return order;
  }

  // Resolve variables in configuration
  private resolveVariables(config: any, state: WorkflowState): any {
    if (typeof config === 'string') {
      // Replace variable references like ${variableName}
      return config.replace(/\$\{([^}]+)\}/g, (match, varName) => {
        return this.getVariableValue(varName, state);
      });
    }
    
    if (Array.isArray(config)) {
      return config.map(item => this.resolveVariables(item, state));
    }
    
    if (typeof config === 'object' && config !== null) {
      const resolved: any = {};
      for (const [key, value] of Object.entries(config)) {
        resolved[key] = this.resolveVariables(value, state);
      }
      return resolved;
    }
    
    return config;
  }

  // Get variable value from state
  private getVariableValue(path: string, state: WorkflowState): any {
    const parts = path.split('.');
    let value: any = state.variables;
    
    // Check outputs first
    if (parts[0] === 'output' && parts.length > 1) {
      value = state.outputs;
      parts.shift();
    }
    
    for (const part of parts) {
      if (value && typeof value === 'object') {
        value = value[part];
      } else {
        return undefined;
      }
    }
    
    return value;
  }

  // Evaluate condition
  private evaluateCondition(condition: any, state: WorkflowState): boolean {
    if (typeof condition === 'boolean') {
      return condition;
    }
    
    if (typeof condition === 'string') {
      // Simple variable reference
      return !!this.getVariableValue(condition, state);
    }
    
    if (condition.type === 'expression') {
      // Evaluate JavaScript expression (safely)
      try {
        const func = new Function('state', `return ${condition.expression}`);
        return func(state);
      } catch (err) {
        return false;
      }
    }
    
    return false;
  }

  // Create checkpoint
  private async createCheckpoint(
    workflowId: string,
    state: WorkflowState
  ): Promise<void> {
    const checkpoints = await db.select()
      .from(agentWorkflows)
      .where(eq(agentWorkflows.id, workflowId));
    
    if (checkpoints.length > 0) {
      const workflow = checkpoints[0];
      const currentCheckpoints = workflow.checkpoints || [];
      
      currentCheckpoints.push({
        stepId: state.completedSteps[state.completedSteps.length - 1],
        timestamp: new Date().toISOString(),
        state: JSON.parse(JSON.stringify(state))
      });
      
      await db.update(agentWorkflows)
        .set({ checkpoints: currentCheckpoints })
        .where(eq(agentWorkflows.id, workflowId));
      
      this.emitEvent({
        type: 'checkpoint_created',
        workflowId,
        progress: (state.completedSteps.length / state.completedSteps.length) * 100
      });
    }
  }

  // Restore from checkpoint
  async restoreFromCheckpoint(
    workflowId: string,
    checkpointIndex: number,
    userId: string
  ): Promise<void> {
    const [workflow] = await db.select()
      .from(agentWorkflows)
      .where(eq(agentWorkflows.id, workflowId));
    
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    const checkpoints = workflow.checkpoints || [];
    if (checkpointIndex >= checkpoints.length) {
      throw new Error('Invalid checkpoint index');
    }
    
    const checkpoint = checkpoints[checkpointIndex];
    const state = checkpoint.state as WorkflowState;
    
    // Restore workflow state
    this.activeWorkflows.set(workflowId, { workflow, state });
    
    // Continue execution from checkpoint
    const session = await this.validateSession(workflow.sessionId);
    await this.runWorkflow(workflowId, session, userId);
  }

  // Get workflow status
  async getWorkflowStatus(workflowId: string): Promise<AgentWorkflow> {
    const [workflow] = await db.select()
      .from(agentWorkflows)
      .where(eq(agentWorkflows.id, workflowId));
    
    if (!workflow) {
      throw new Error('Workflow not found');
    }
    
    return workflow;
  }

  // Cancel workflow
  async cancelWorkflow(workflowId: string): Promise<void> {
    await db.update(agentWorkflows)
      .set({ 
        status: 'cancelled',
        completedAt: new Date()
      })
      .where(eq(agentWorkflows.id, workflowId));
    
    this.activeWorkflows.delete(workflowId);
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

  private shouldContinueOnFailure(workflow: AgentWorkflow): boolean {
    // Check workflow metadata for failure handling policy
    return workflow.metadata?.continueOnFailure || false;
  }

  private async createAuditEntry(
    sessionId: string,
    userId: string,
    action: string,
    workflowId: string
  ) {
    await db.insert(agentAuditTrail).values({
      sessionId,
      userId,
      action,
      resourceType: 'workflow',
      resourceId: workflowId,
      severity: 'info',
      details: { timestamp: new Date().toISOString() }
    });
  }

  private emitEvent(event: WorkflowExecutionEvent) {
    this.emit('workflow:event', event);
  }

  // Generate workflow from natural language
  async generateWorkflowFromPrompt(
    prompt: string,
    sessionId: string
  ): Promise<WorkflowStep[]> {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an expert at creating workflow definitions. Convert the user's request into a structured workflow with steps.
          
          Available step types:
          - file_operation: Read, write, delete, list files
          - command: Execute shell commands
          - tool: Execute registered tools
          - database: Database operations
          - conditional: Conditional branching
          - parallel: Parallel execution
          - loop: Loop over items
          
          Return a valid JSON array of WorkflowStep objects.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      response_format: { type: 'json_object' }
    });
    
    const response = JSON.parse(completion.choices[0].message.content || '{}');
    return response.steps || [];
  }
}

// Export singleton instance
export const agentWorkflowEngine = new AgentWorkflowEngineService();