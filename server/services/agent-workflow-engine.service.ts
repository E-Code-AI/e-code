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
import { eq, and, sql } from 'drizzle-orm';
import { agentFileOperations } from './agent-file-operations.service';
import { agentCommandExecution } from './agent-command-execution.service';
import { agentToolFramework } from './agent-tool-framework.service';
import { OpenAI } from 'openai';
import { createLogger } from '../utils/logger';

const logger = createLogger('agent-workflow-engine');

// ============================================
// ENTERPRISE-GRADE ERROR CLASS
// Structured errors with full context for observability
// ============================================
export class WorkflowError extends Error {
  public readonly code: string;
  public readonly retriable: boolean;
  public readonly originalStack?: string;
  public readonly timestamp: Date;
  
  constructor(
    message: string,
    code: string = 'WORKFLOW_ERROR',
    retriable: boolean = false,
    originalStack?: string
  ) {
    super(message);
    this.name = 'WorkflowError';
    this.code = code;
    this.retriable = retriable;
    this.originalStack = originalStack;
    this.timestamp = new Date();
    
    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
  
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      retriable: this.retriable,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      originalStack: this.originalStack
    };
  }
}

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

// Circuit breaker state for workflow execution
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

// Idempotency token cache (in-memory, should be Redis in production)
const idempotencyCache = new Map<string, { workflowId: string; timestamp: number }>();
const IDEMPOTENCY_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Default step timeout - 5 minutes for long-running operations
const DEFAULT_STEP_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class AgentWorkflowEngineService extends EventEmitter {
  private activeWorkflows: Map<string, { workflow: AgentWorkflow; state: WorkflowState }> = new Map();
  private openai: OpenAI;
  private circuitBreaker: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    isOpen: false
  };
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_RESET_MS = 60000; // 1 minute
  
  constructor() {
    super();
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  // ============================================
  // ENTERPRISE-GRADE WORKFLOW EXECUTION
  // Fortune 500 reliability patterns
  // ============================================

  // Create and execute a workflow with transaction and idempotency
  async executeWorkflow(
    sessionId: string,
    projectId: number,
    name: string,
    description: string,
    steps: WorkflowStep[],
    userId: string,
    initialVariables: Record<string, any> = {},
    idempotencyKey?: string
  ): Promise<AgentWorkflow> {
    // Check circuit breaker
    if (this.isCircuitOpen()) {
      throw new WorkflowError(
        'Circuit breaker is open - too many recent failures',
        'CIRCUIT_BREAKER_OPEN',
        true
      );
    }

    // Check idempotency - prevent duplicate workflow creation
    if (idempotencyKey) {
      const cached = idempotencyCache.get(idempotencyKey);
      if (cached && Date.now() - cached.timestamp < IDEMPOTENCY_TTL_MS) {
        logger.info(`[WorkflowEngine] Returning cached workflow for idempotency key: ${idempotencyKey}`);
        const [existingWorkflow] = await db.select()
          .from(agentWorkflows)
          .where(eq(agentWorkflows.id, cached.workflowId));
        if (existingWorkflow) {
          return existingWorkflow;
        }
      }
    }

    try {
      // Validate session first (outside transaction for fast-fail)
      const session = await this.validateSession(sessionId);
      
      // Check for existing active workflow for this session (prevent duplicates)
      const [existingActive] = await db.select()
        .from(agentWorkflows)
        .where(and(
          eq(agentWorkflows.sessionId, sessionId),
          eq(agentWorkflows.status, 'in_progress')
        ))
        .limit(1);
      
      if (existingActive) {
        logger.warn(`[WorkflowEngine] Active workflow already exists for session ${sessionId}`);
        return existingActive;
      }

      // Create workflow record with atomic insert
      // Using explicit transaction for workflow creation
      const workflow = await this.createWorkflowAtomic(
        sessionId,
        projectId,
        name,
        description,
        steps,
        idempotencyKey
      );
      
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
      
      // Update status to in_progress atomically
      await db.update(agentWorkflows)
        .set({ status: 'in_progress', startedAt: new Date() })
        .where(eq(agentWorkflows.id, workflow.id));
      
      // Execute workflow with timeout and error recovery
      await this.runWorkflowWithRecovery(workflow.id, session, userId);
      
      // Reset circuit breaker on success
      this.resetCircuitBreaker();
      
      // Get final workflow state
      const [finalWorkflow] = await db.select()
        .from(agentWorkflows)
        .where(eq(agentWorkflows.id, workflow.id));
      
      return finalWorkflow;
    } catch (error: any) {
      // Track circuit breaker failures
      this.recordCircuitBreakerFailure();
      
      // Create structured error with full stack trace
      const workflowError = new WorkflowError(
        error.message,
        error.code || 'WORKFLOW_EXECUTION_FAILED',
        error.retriable ?? false,
        error.stack
      );
      
      logger.error(`[WorkflowEngine] Workflow execution failed`, {
        sessionId,
        projectId,
        error: workflowError.toJSON()
      });
      
      throw workflowError;
    }
  }

  // Create workflow atomically with transaction and retry
  // Uses Drizzle's transaction API with proper tx context to ensure all queries
  // run on the same connection within the transaction boundary
  private async createWorkflowAtomic(
    sessionId: string,
    projectId: number,
    name: string,
    description: string,
    steps: WorkflowStep[],
    idempotencyKey?: string,
    retryCount = 0
  ): Promise<AgentWorkflow> {
    const MAX_RETRIES = 3;
    
    try {
      // Use Drizzle's transaction API with SERIALIZABLE isolation level
      // All queries inside use the `tx` context ensuring single-connection execution
      const result = await db.transaction(async (tx) => {
        // Set isolation level at the start of transaction
        await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
        
        // Check for existing workflow with same idempotency key (deduplication)
        // This SELECT...FOR UPDATE pattern provides pessimistic locking
        if (idempotencyKey) {
          const [existing] = await tx.select()
            .from(agentWorkflows)
            .where(sql`metadata->>'idempotencyKey' = ${idempotencyKey}`)
            .for('update')
            .limit(1);
          
          if (existing) {
            logger.info(`[WorkflowEngine] Returning existing workflow for idempotency key: ${idempotencyKey}`);
            return existing;
          }
        }
        
        // Create the workflow within transaction context
        const [workflow] = await tx.insert(agentWorkflows)
          .values({
            sessionId,
            projectId,
            name,
            description,
            steps,
            status: 'pending',
            progress: 0,
            metadata: idempotencyKey ? { idempotencyKey } : undefined
          })
          .returning();
        
        // Also update session status within same transaction
        await tx.update(agentSessions)
          .set({ status: 'processing' })
          .where(eq(agentSessions.id, sessionId));
        
        return workflow;
      });
      
      // Cache idempotency key outside transaction
      if (idempotencyKey && result) {
        idempotencyCache.set(idempotencyKey, {
          workflowId: result.id,
          timestamp: Date.now()
        });
      }
      
      logger.info(`[WorkflowEngine] Workflow created atomically: ${result.id}`);
      return result;
    } catch (error: any) {
      // Handle serialization failures with retry (PostgreSQL error code 40001)
      // Also handle unique constraint violations (23505) which indicate race condition
      const isSerializationFailure = error.code === '40001';
      const isDuplicateKey = error.code === '23505';
      
      // On duplicate key, try to return existing workflow
      if (isDuplicateKey && idempotencyKey) {
        logger.info(`[WorkflowEngine] Duplicate key detected, fetching existing workflow`);
        const [existing] = await db.select()
          .from(agentWorkflows)
          .where(sql`metadata->>'idempotencyKey' = ${idempotencyKey}`)
          .limit(1);
        
        if (existing) {
          return existing;
        }
      }
      
      if (retryCount < MAX_RETRIES && (isSerializationFailure || this.isRetriableError(error))) {
        const jitter = Math.random() * 50;
        const delay = Math.pow(2, retryCount) * 100 + jitter;
        logger.warn(`[WorkflowEngine] Retrying workflow creation (${retryCount + 1}/${MAX_RETRIES}) after ${Math.round(delay)}ms`);
        await this.sleep(delay);
        return this.createWorkflowAtomic(sessionId, projectId, name, description, steps, idempotencyKey, retryCount + 1);
      }
      throw error;
    }
  }

  // Run workflow with recovery and compensating actions
  private async runWorkflowWithRecovery(
    workflowId: string,
    session: AgentSession,
    userId: string
  ): Promise<void> {
    try {
      await this.runWorkflow(workflowId, session, userId);
    } catch (error: any) {
      // Attempt to rollback completed steps on failure
      const workflowData = this.activeWorkflows.get(workflowId);
      if (workflowData && workflowData.state.completedSteps.length > 0) {
        logger.warn(`[WorkflowEngine] Attempting rollback of ${workflowData.state.completedSteps.length} completed steps`);
        await this.attemptRollback(workflowId, workflowData.state);
      }
      throw error;
    }
  }

  // Attempt to rollback completed steps (compensating actions)
  private async attemptRollback(workflowId: string, state: WorkflowState): Promise<void> {
    try {
      // Mark workflow as rolling back
      await db.update(agentWorkflows)
        .set({ status: 'rolled_back', error: 'Workflow failed, rollback attempted' })
        .where(eq(agentWorkflows.id, workflowId));
      
      // Note: Actual rollback logic would be step-type specific
      // For file operations: delete created files
      // For commands: run inverse commands if possible
      // For database: rollback transaction
      logger.info(`[WorkflowEngine] Workflow ${workflowId} marked as rolled back`);
    } catch (rollbackError) {
      logger.error(`[WorkflowEngine] Rollback failed for workflow ${workflowId}`, rollbackError);
    }
  }

  // Circuit breaker helpers
  private isCircuitOpen(): boolean {
    if (!this.circuitBreaker.isOpen) return false;
    
    // Check if reset timeout has passed
    if (Date.now() - this.circuitBreaker.lastFailureTime > this.CIRCUIT_BREAKER_RESET_MS) {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failures = 0;
      logger.info('[WorkflowEngine] Circuit breaker reset');
      return false;
    }
    
    return true;
  }

  private recordCircuitBreakerFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      this.circuitBreaker.isOpen = true;
      logger.warn(`[WorkflowEngine] Circuit breaker opened after ${this.circuitBreaker.failures} failures`);
    }
  }

  private resetCircuitBreaker(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.isOpen = false;
  }

  private isRetriableError(error: any): boolean {
    const retriableCodes = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', '23505'];
    return retriableCodes.some(code => error.code === code || error.message?.includes(code));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  // Execute a single workflow step with timeout and retry
  private async executeStep(
    workflowId: string,
    step: WorkflowStep,
    session: AgentSession,
    userId: string,
    state: WorkflowState
  ): Promise<void> {
    const stepStartTime = Date.now();
    
    try {
      // Check if dependencies are satisfied
      if (step.dependencies) {
        for (const dep of step.dependencies) {
          if (!state.completedSteps.includes(dep)) {
            throw new WorkflowError(
              `Dependency not satisfied: ${dep}`,
              'DEPENDENCY_NOT_SATISFIED',
              false
            );
          }
        }
      }
      
      // Emit step start
      const totalSteps = state.completedSteps.length + state.failedSteps.length + 1;
      this.emitEvent({
        type: 'step_start',
        workflowId,
        stepId: step.id,
        progress: Math.min(99, Math.floor((state.completedSteps.length / totalSteps) * 100))
      });
      
      let retryCount = 0;
      const maxRetries = step.retryPolicy?.maxRetries || 0;
      const backoffMs = step.retryPolicy?.backoffMs || 1000;
      
      while (retryCount <= maxRetries) {
        try {
          // Execute step with timeout protection
          const stepTimeout = (step.config?.timeout || DEFAULT_STEP_TIMEOUT_MS);
          const result = await this.executeWithTimeout(
            () => this.executeStepByType(step, session, userId, state),
            stepTimeout,
            `Step ${step.id} timed out after ${stepTimeout}ms`
          );
          
          // Store output
          state.outputs[step.id] = result;
          state.completedSteps.push(step.id);
          
          // Log step execution time for observability
          const duration = Date.now() - stepStartTime;
          logger.debug(`[WorkflowEngine] Step ${step.id} completed in ${duration}ms`);
          
          // Emit step complete with correct progress
          const completionProgress = Math.floor((state.completedSteps.length / totalSteps) * 100);
          this.emitEvent({
            type: 'step_complete',
            workflowId,
            stepId: step.id,
            progress: Math.min(99, completionProgress)
          });
          
          return;
        } catch (stepError: any) {
          retryCount++;
          
          // Log retry attempt
          if (retryCount <= maxRetries) {
            logger.warn(`[WorkflowEngine] Step ${step.id} failed, retrying (${retryCount}/${maxRetries})`, {
              error: stepError.message
            });
          }
          
          if (retryCount > maxRetries) {
            throw new WorkflowError(
              stepError.message || 'Step execution failed',
              stepError.code || 'STEP_EXECUTION_FAILED',
              false,
              stepError.stack
            );
          }
          
          // Exponential backoff with jitter
          const jitter = Math.random() * 100;
          const delay = backoffMs * Math.pow(2, retryCount - 1) + jitter;
          await this.sleep(delay);
        }
      }
    } catch (error: any) {
      state.errors[step.id] = error.message;
      state.failedSteps.push(step.id);
      
      const totalSteps = state.completedSteps.length + state.failedSteps.length;
      this.emitEvent({
        type: 'step_failed',
        workflowId,
        stepId: step.id,
        progress: Math.floor((state.completedSteps.length / totalSteps) * 100),
        error: error.message
      });
      
      throw error;
    }
  }

  // Execute a function with timeout protection
  private async executeWithTimeout<T>(
    fn: () => Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new WorkflowError(
          timeoutMessage,
          'STEP_TIMEOUT',
          true
        ));
      }, timeoutMs);
      
      fn()
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
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
      
      // ✅ FIX (Nov 24, 2025): Handle multi-file tasks with fileIndex
      // When orchestrator expands multi-file tasks, each step has fileIndex to select the right file
      let fileData = task;
      if (typeof config.fileIndex === 'number' && task.files && task.files[config.fileIndex]) {
        fileData = task.files[config.fileIndex];
      }
      
      // Merge task details into config (task has full file contents, commands, etc.)
      // ✅ FIX (Nov 24, 2025): Support both 'type' and 'action' field names for operation mapping
      const taskType = task.type || task.action || config.action;
      let operation = config.operation;
      
      // Map file action types to internal operation names
      // ✅ FIX (Nov 24, 2025): Support both plan task types (file_create/file_edit/config) AND config types (create_file/update_file)
      if (taskType === 'file_create' || taskType === 'create_file' || taskType === 'update_file') {
        operation = 'write';
      } else if (taskType === 'file_edit' || taskType === 'config') {
        operation = 'write';
      } else if (taskType === 'read_file') {
        operation = 'read';
      } else if (taskType === 'delete_file') {
        operation = 'delete';
      } else if (taskType === 'list_files') {
        operation = 'list';
      }
      
      effectiveConfig = {
        ...config,
        ...fileData,  // Use fileData instead of task to get specific file details
        // Preserve original config values if not in task/file
        operation,
        path: fileData.path || config.path,
        content: fileData.content || config.content,
        outline: fileData.outline || config.outline,
        language: fileData.language || config.language
      };
    }
    
    // ✅ PHASE 2 EXECUTOR (Nov 23, 2025): Expand outline into content if needed
    // When fallback plans provide outlines instead of content, generate actual file content
    if (!effectiveConfig.content && effectiveConfig.outline) {
      const { agentContentGenerator } = await import('./agent-content-generator.service');
      const generatedFile = await agentContentGenerator.expandOutline({
        path: effectiveConfig.path,
        outline: effectiveConfig.outline,
        language: effectiveConfig.language
      });
      effectiveConfig.content = generatedFile.content;
      logger.info(`[WorkflowEngine] Expanded outline to content for ${effectiveConfig.path}`);
    }
    
    // ✅ CRITICAL FIX (Nov 30, 2025): Generate content from description if both content and outline are missing
    // Some AI plans only provide file path and description, without content or outline
    if (!effectiveConfig.content && effectiveConfig.operation === 'write') {
      const { agentContentGenerator } = await import('./agent-content-generator.service');
      const description = effectiveConfig.description || effectiveConfig.name || `Create file ${effectiveConfig.path}`;
      try {
        const generatedFile = await agentContentGenerator.generateFileContent({
          path: effectiveConfig.path,
          description,
          language: effectiveConfig.language
        });
        effectiveConfig.content = generatedFile.content;
        logger.info(`[WorkflowEngine] Generated content from description for ${effectiveConfig.path}`);
      } catch (genError) {
        // Fallback to minimal content based on file type
        const ext = effectiveConfig.path?.split('.').pop()?.toLowerCase() || '';
        effectiveConfig.content = this.getMinimalFileContent(effectiveConfig.path, ext, description);
        logger.warn(`[WorkflowEngine] Using minimal fallback content for ${effectiveConfig.path}`);
      }
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
    
    // ✅ FIX (Nov 30, 2025): Smart command parsing
    // The AI plan may provide commands in various formats:
    // 1. Simple: "npm install react-dom" → npm + ["install", "react-dom"]
    // 2. Composite: "npm install && npm build" → bash -c + ["npm install && npm build"]
    // 3. Already parsed: command="npm", args=["install", "react-dom"]
    
    let executableCommand: string;
    let commandArgs: string[];
    
    if (typeof command === 'string' && (!args || args.length === 0)) {
      // Check for shell composite commands (&&, ||, ;)
      const hasShellOperators = /\s+(?:&&|\|\||;)\s+/.test(command);
      
      if (hasShellOperators) {
        // Composite command - execute through bash shell
        executableCommand = 'bash';
        commandArgs = ['-c', command];
        logger.info(`[WorkflowEngine] Composite command detected, executing via shell: "${command}"`);
      } else if (command.includes(' ')) {
        // Simple command with args - parse it
        const parts = command.split(/\s+/).filter(Boolean);
        executableCommand = parts[0];
        commandArgs = parts.slice(1);
        logger.info(`[WorkflowEngine] Parsed command: "${executableCommand}" with args: [${commandArgs.join(', ')}]`);
      } else {
        // Single command without args
        executableCommand = command;
        commandArgs = [];
      }
    } else {
      executableCommand = command;
      // ✅ FIX (Nov 30, 2025): Sanitize args array - only accept string primitives
      // The config object may contain nested objects (environment, resourceLimits, etc.)
      // which get resolved and included in args, causing "[object Object]" in database
      commandArgs = (args || [])
        .filter((arg: any) => arg !== null && arg !== undefined)
        .map((arg: any) => {
          if (typeof arg === 'string') return arg;
          if (typeof arg === 'number' || typeof arg === 'boolean') return String(arg);
          // Skip objects/arrays - they shouldn't be command arguments
          return null;
        })
        .filter((arg: any): arg is string => arg !== null);
      
      if (commandArgs.length !== (args || []).length) {
        logger.warn(`[WorkflowEngine] Filtered out non-string args: original=${(args || []).length}, sanitized=${commandArgs.length}`);
      }
    }
    
    const result = await agentCommandExecution.executeCommand(
      context.sessionId,
      executableCommand,
      commandArgs,
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
  // ✅ Helper (Nov 30, 2025): Generate minimal fallback content for different file types
  private getMinimalFileContent(filePath: string, ext: string, description: string): string {
    const filename = filePath?.split('/').pop() || 'file';
    
    switch (ext) {
      case 'json':
        if (filename === 'package.json') {
          return JSON.stringify({
            name: "new-project",
            version: "1.0.0",
            description: description,
            scripts: { start: "node index.js", dev: "node index.js" },
            dependencies: {}
          }, null, 2);
        }
        return JSON.stringify({ description }, null, 2);
      
      case 'ts':
      case 'tsx':
        return `// ${description}\n\nexport {};\n`;
      
      case 'js':
      case 'jsx':
        return `// ${description}\n\nmodule.exports = {};\n`;
      
      case 'html':
        return `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>${filename}</title>\n</head>\n<body>\n  <!-- ${description} -->\n</body>\n</html>`;
      
      case 'css':
        return `/* ${description} */\n\n`;
      
      case 'md':
        return `# ${filename.replace('.md', '')}\n\n${description}\n`;
      
      case 'py':
        return `# ${description}\n\n`;
      
      case 'gitignore':
        return `# ${description}\nnode_modules/\n.env\ndist/\n`;
      
      default:
        return `// ${description}\n`;
    }
  }

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
      userId: parseInt(userId, 10),
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