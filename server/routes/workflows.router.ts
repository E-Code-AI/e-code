import {
projectWorkflows,
workflowRuns,
workflowTasks,
type ProjectWorkflow,
type WorkflowWithTasks
} from '@shared/schema';
import { ChildProcess,spawn } from 'child_process';
import { and,asc,desc,eq } from 'drizzle-orm';
import { Request,Response,Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { ensureAuthenticated } from '../middleware/auth';
import { storage } from '../storage';
import { createLogger } from '../utils/logger';
import { ensureProjectDirectory } from '../utils/project-fs-sync';
import { redactErrorForLog } from '../utils/error-redaction';

const logger = createLogger('workflows-router');

const workflowsRouter = Router();

// Track running processes for stop functionality
const runningProcesses = new Map<number, ChildProcess[]>();

const runCommandSchema = z.object({
  projectId: z.union([z.string(), z.number()]),
  command: z.string().min(1),
  name: z.string().optional(),
});

const projectIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/).transform((value) => parseInt(value, 10)),
]);

async function ensureProjectAccessById(projectId: string | number, userId: number): Promise<void> {
  const project = await storage.getProject(projectId);
  if (!project) {
    throw new Error('PROJECT_NOT_FOUND');
  }

  if (project.ownerId === userId) {
    return;
  }

  const collaborators = await storage.getProjectCollaborators(projectId);
  const isCollaborator = collaborators.some((c: any) => c.userId === userId);
  if (!isCollaborator) {
    throw new Error('PROJECT_FORBIDDEN');
  }
}

async function ensureWorkflowAccess(req: Request, res: Response, next: () => void | Promise<void>) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const workflowId = parseInt(req.params.id, 10);
    if (!Number.isFinite(workflowId)) {
      return res.status(400).json({ error: 'Invalid workflow ID' });
    }

    const workflow = await getWorkflowWithTasks(workflowId);
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }

    if (workflow.projectId) {
      await ensureProjectAccessById(workflow.projectId, userId);
    }

    return next();
  } catch (error: any) {
    if (error?.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (error?.message === 'PROJECT_FORBIDDEN') {
      return res.status(403).json({ error: "You don't have access to this project" });
    }
    logger.error('Failed to verify workflow access:', redactErrorForLog(error));
    return res.status(500).json({ error: 'Failed to verify workflow access' });
  }
}

async function ensureProjectAccessFromRequest(req: Request, res: Response, next: () => void | Promise<void>) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const projectId = req.query.projectId ?? req.body?.projectId;
    if (!projectId) {
      return next();
    }

    await ensureProjectAccessById(projectId as string | number, userId);
    return next();
  } catch (error: any) {
    if (error?.message === 'PROJECT_NOT_FOUND') {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (error?.message === 'PROJECT_FORBIDDEN') {
      return res.status(403).json({ error: "You don't have access to this project" });
    }
    logger.error('Failed to verify project access for workflow route:', redactErrorForLog(error));
    return res.status(500).json({ error: 'Failed to verify project access' });
  }
}

// Helper to get workflow with tasks
async function getWorkflowWithTasks(workflowId: number): Promise<WorkflowWithTasks | null> {
  const workflow = await db.select().from(projectWorkflows).where(eq(projectWorkflows.id, workflowId)).limit(1);
  if (!workflow.length) return null;
  
  const tasks = await db.select().from(workflowTasks)
    .where(eq(workflowTasks.workflowId, workflowId))
    .orderBy(asc(workflowTasks.orderIndex));
  
  return {
    ...workflow[0],
    tasks: tasks.map(t => ({
      id: t.id,
      orderIndex: t.orderIndex,
      taskType: t.taskType,
      command: t.command,
      targetWorkflowId: t.targetWorkflowId,
    })),
  };
}

// Get all workflows for a project
workflowsRouter.get('/', ensureAuthenticated, ensureProjectAccessFromRequest, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const projectId =
      req.query.projectId !== undefined
        ? projectIdSchema.parse(req.query.projectId)
        : null;
    
    let workflows: ProjectWorkflow[];
    if (projectId) {
      workflows = await db.select().from(projectWorkflows)
        .where(eq(projectWorkflows.projectId, projectId))
        .orderBy(desc(projectWorkflows.isRunButton), asc(projectWorkflows.name));
    } else {
      const allWorkflows = await db.select().from(projectWorkflows)
        .orderBy(desc(projectWorkflows.isRunButton), asc(projectWorkflows.name));
      const accessibleWorkflows = await Promise.all(
        allWorkflows.map(async (workflow) => {
          if (!workflow.projectId) {
            return workflow;
          }

          try {
            await ensureProjectAccessById(workflow.projectId, userId);
            return workflow;
          } catch {
            return null;
          }
        })
      );
      workflows = accessibleWorkflows.filter((workflow): workflow is ProjectWorkflow => Boolean(workflow));
    }
    
    // Get tasks for each workflow
    const workflowsWithTasks: WorkflowWithTasks[] = await Promise.all(
      workflows.map(async (w) => {
        const tasks = await db.select().from(workflowTasks)
          .where(eq(workflowTasks.workflowId, w.id))
          .orderBy(asc(workflowTasks.orderIndex));
        return {
          ...w,
          tasks: tasks.map(t => ({
            id: t.id,
            orderIndex: t.orderIndex,
            taskType: t.taskType,
            command: t.command,
            targetWorkflowId: t.targetWorkflowId,
          })),
        };
      })
    );
    
    res.json(workflowsWithTasks);
  } catch (error) {
    logger.error('Failed to get workflows:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to get workflows' });
  }
});

// Execute a one-off command in a project's workspace without persisting a workflow
workflowsRouter.post('/run-command', ensureAuthenticated, ensureProjectAccessFromRequest, async (req: Request, res: Response) => {
  try {
    const { projectId, command, name } = runCommandSchema.parse(req.body);
    const logs: string[] = [`Starting command: ${name || command}`];
    const processes: ChildProcess[] = [];
    const workspaceCwd = await resolveProjectWorkspaceCwd(projectId, logs);

    logs.push(`Running: ${command}`);
    await executeShellCommand(command, logs, processes, workspaceCwd);
    logs.push('✓ Command completed');

    res.json({
      success: true,
      command,
      logs,
    });
  } catch (error: any) {
    logger.error('Failed to run command:', redactErrorForLog(error));
    res.status(500).json({
      error: error?.message || 'Failed to run command',
      success: false,
    });
  }
});

// Get single workflow
workflowsRouter.get('/:id', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const workflow = await getWorkflowWithTasks(id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    res.json(workflow);
  } catch (error) {
    logger.error('Failed to get workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// Create workflow request schema
const createWorkflowSchema = z.object({
  projectId: projectIdSchema.optional().nullable(),
  name: z.string().min(1).max(255),
  executionMode: z.enum(['sequential', 'parallel']).default('sequential'),
  isRunButton: z.boolean().default(false),
  isGenerated: z.boolean().default(false),
  tasks: z.array(z.object({
    taskType: z.enum(['shell', 'packages', 'workflow']),
    command: z.string().nullable().optional(),
    targetWorkflowId: z.number().nullable().optional(),
    orderIndex: z.number().optional(),
  })).default([]),
});

// Create workflow
workflowsRouter.post('/', ensureAuthenticated, ensureProjectAccessFromRequest, async (req: Request, res: Response) => {
  try {
    const data = createWorkflowSchema.parse(req.body);
    
    // If setting as run button, unset any existing run button workflow
    if (data.isRunButton && data.projectId) {
      await db.update(projectWorkflows)
        .set({ isRunButton: false })
        .where(and(
          eq(projectWorkflows.projectId, data.projectId),
          eq(projectWorkflows.isRunButton, true)
        ));
    }
    
    // Create workflow
    const [workflow] = await db.insert(projectWorkflows).values({
      projectId: data.projectId ?? null,
      name: data.name,
      executionMode: data.executionMode,
      isRunButton: data.isRunButton,
      isGenerated: data.isGenerated,
      isSystem: false,
      enabled: true,
    }).returning();
    
    // Create tasks
    if (data.tasks.length > 0) {
      await db.insert(workflowTasks).values(
        data.tasks.map((t, index) => ({
          workflowId: workflow.id,
          orderIndex: t.orderIndex ?? index,
          taskType: t.taskType,
          command: t.command ?? null,
          targetWorkflowId: t.targetWorkflowId ?? null,
        }))
      );
    }
    
    const result = await getWorkflowWithTasks(workflow.id);
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid workflow data', details: error.errors });
    }
    logger.error('Failed to create workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// Update workflow schema
const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  executionMode: z.enum(['sequential', 'parallel']).optional(),
  isRunButton: z.boolean().optional(),
  enabled: z.boolean().optional(),
  tasks: z.array(z.object({
    id: z.number().optional(),
    taskType: z.enum(['shell', 'packages', 'workflow']),
    command: z.string().nullable().optional(),
    targetWorkflowId: z.number().nullable().optional(),
    orderIndex: z.number(),
  })).optional(),
});

// Update workflow
workflowsRouter.patch('/:id', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const data = updateWorkflowSchema.parse(req.body);
    
    const existing = await db.select().from(projectWorkflows).where(eq(projectWorkflows.id, id)).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // If setting as run button, unset any existing run button workflow
    if (data.isRunButton && existing[0].projectId) {
      await db.update(projectWorkflows)
        .set({ isRunButton: false })
        .where(and(
          eq(projectWorkflows.projectId, existing[0].projectId),
          eq(projectWorkflows.isRunButton, true)
        ));
    }
    
    // Update workflow
    const updateData: Partial<ProjectWorkflow> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.executionMode !== undefined) updateData.executionMode = data.executionMode;
    if (data.isRunButton !== undefined) updateData.isRunButton = data.isRunButton;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    
    if (Object.keys(updateData).length > 0) {
      await db.update(projectWorkflows)
        .set({ ...updateData, updatedAt: new Date() })
        .where(eq(projectWorkflows.id, id));
    }
    
    // Update tasks if provided
    if (data.tasks) {
      // Delete existing tasks
      await db.delete(workflowTasks).where(eq(workflowTasks.workflowId, id));
      
      // Insert new tasks
      if (data.tasks.length > 0) {
        await db.insert(workflowTasks).values(
          data.tasks.map((t, index) => ({
            workflowId: id,
            orderIndex: t.orderIndex ?? index,
            taskType: t.taskType,
            command: t.command ?? null,
            targetWorkflowId: t.targetWorkflowId ?? null,
          }))
        );
      }
    }
    
    const result = await getWorkflowWithTasks(id);
    res.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid workflow data', details: error.errors });
    }
    logger.error('Failed to update workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// Delete workflow
workflowsRouter.delete('/:id', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const existing = await db.select().from(projectWorkflows).where(eq(projectWorkflows.id, id)).limit(1);
    if (!existing.length) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // Stop any running processes
    const processes = runningProcesses.get(id);
    if (processes) {
      processes.forEach(p => {
        try { p.kill('SIGTERM'); } catch {}
      });
      runningProcesses.delete(id);
    }
    
    // Delete workflow (cascades to tasks and runs)
    await db.delete(projectWorkflows).where(eq(projectWorkflows.id, id));
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// Run workflow
workflowsRouter.post('/:id/run', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const workflow = await getWorkflowWithTasks(id);
    
    if (!workflow) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    if (!workflow.enabled) {
      return res.status(400).json({ error: 'Workflow is disabled' });
    }
    
    // Create run record
    const [run] = await db.insert(workflowRuns).values({
      workflowId: id,
      status: 'running',
      triggeredBy: 'manual',
      logs: '',
    }).returning();
    
    // Execute workflow asynchronously
    executeWorkflow(workflow, run.id);
    
    res.json({ 
      success: true, 
      runId: run.id,
      message: `Workflow "${workflow.name}" started`,
    });
  } catch (error) {
    logger.error('Failed to run workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

// Stop workflow
workflowsRouter.post('/:id/stop', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const processes = runningProcesses.get(id);
    if (processes && processes.length > 0) {
      processes.forEach(p => {
        try { p.kill('SIGTERM'); } catch {}
      });
      runningProcesses.delete(id);
      
      // Update any running runs to cancelled
      await db.update(workflowRuns)
        .set({ status: 'cancelled', completedAt: new Date() })
        .where(and(
          eq(workflowRuns.workflowId, id),
          eq(workflowRuns.status, 'running')
        ));
      
      return res.json({ success: true, message: 'Workflow stopped' });
    }
    
    res.json({ success: true, message: 'No running processes found' });
  } catch (error) {
    logger.error('Failed to stop workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to stop workflow' });
  }
});

// Get workflow runs
workflowsRouter.get('/:id/runs', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    
    const runs = await db.select().from(workflowRuns)
      .where(eq(workflowRuns.workflowId, id))
      .orderBy(desc(workflowRuns.startedAt))
      .limit(limit);
    
    res.json(runs);
  } catch (error) {
    logger.error('Failed to get workflow runs:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to get workflow runs' });
  }
});

// Set workflow as Run Button
workflowsRouter.post('/:id/set-run-button', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    
    const workflow = await db.select().from(projectWorkflows).where(eq(projectWorkflows.id, id)).limit(1);
    if (!workflow.length) {
      return res.status(404).json({ error: 'Workflow not found' });
    }
    
    // Unset any existing run button workflow for this project
    if (workflow[0].projectId) {
      await db.update(projectWorkflows)
        .set({ isRunButton: false })
        .where(eq(projectWorkflows.projectId, workflow[0].projectId));
    }
    
    // Set this workflow as run button
    await db.update(projectWorkflows)
      .set({ isRunButton: true, updatedAt: new Date() })
      .where(eq(projectWorkflows.id, id));
    
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to set run button:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to set run button' });
  }
});

// Reorder tasks
workflowsRouter.post('/:id/reorder-tasks', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { taskIds } = req.body as { taskIds: number[] };
    
    if (!Array.isArray(taskIds)) {
      return res.status(400).json({ error: 'taskIds must be an array' });
    }
    
    // Update order index for each task
    await Promise.all(
      taskIds.map((taskId, index) =>
        db.update(workflowTasks)
          .set({ orderIndex: index })
          .where(and(
            eq(workflowTasks.id, taskId),
            eq(workflowTasks.workflowId, id)
          ))
      )
    );
    
    const result = await getWorkflowWithTasks(id);
    res.json(result);
  } catch (error) {
    logger.error('Failed to reorder tasks:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
});

// Execute workflow (internal function)
async function executeWorkflow(workflow: WorkflowWithTasks, runId: number, depth = 0): Promise<void> {
  if (depth > 5) {
    await updateRunStatus(runId, 'failed', 'Maximum workflow nesting depth exceeded');
    return;
  }
  
  const logs: string[] = [`Starting workflow: ${workflow.name} (${workflow.executionMode} mode)`];
  const processes: ChildProcess[] = [];
  runningProcesses.set(workflow.id, processes);
  
  try {
    if (workflow.executionMode === 'parallel') {
      // Execute all tasks in parallel
      await Promise.all(workflow.tasks.map(task => executeTask(task, workflow, logs, processes, depth)));
    } else {
      // Execute tasks sequentially
      for (const task of workflow.tasks.sort((a, b) => a.orderIndex - b.orderIndex)) {
        const result = await executeTask(task, workflow, logs, processes, depth);
        if (!result.success) {
          throw new Error(`Task failed: ${result.error}`);
        }
      }
    }
    
    await updateRunStatus(runId, 'success', logs.join('\n'));
  } catch (error: any) {
    logs.push(`\nWorkflow failed: ${error.message}`);
    await updateRunStatus(runId, 'failed', logs.join('\n'));
  } finally {
    runningProcesses.delete(workflow.id);
  }
}

async function executeTask(
  task: WorkflowWithTasks['tasks'][0], 
  workflow: WorkflowWithTasks,
  logs: string[], 
  processes: ChildProcess[],
  depth: number
): Promise<{ success: boolean; error?: string }> {
  logs.push(`\n=== Executing task: ${task.taskType} ===`);
  const workspaceCwd = await resolveWorkflowCwd(workflow, logs);
  
  try {
    switch (task.taskType) {
      case 'shell':
        if (!task.command) {
          logs.push('No command specified');
          return { success: true };
        }
        logs.push(`Running: ${task.command}`);
        await executeShellCommand(task.command, logs, processes, workspaceCwd);
        logs.push('✓ Command completed');
        break;
        
      case 'packages':
        const packageArg = task.command || 'all';
        logs.push(`Installing packages: ${packageArg}`);
        if (packageArg === 'all') {
          await executeShellCommand('npm install', logs, processes, workspaceCwd);
        } else {
          await executeShellCommand(`npm install ${packageArg}`, logs, processes, workspaceCwd);
        }
        logs.push('✓ Packages installed');
        break;
        
      case 'workflow':
        if (!task.targetWorkflowId) {
          logs.push('No target workflow specified');
          return { success: true };
        }
        const targetWorkflow = await getWorkflowWithTasks(task.targetWorkflowId);
        if (!targetWorkflow) {
          throw new Error(`Target workflow not found: ${task.targetWorkflowId}`);
        }
        logs.push(`Running workflow: ${targetWorkflow.name}`);
        
        // Create a sub-run for the nested workflow
        const [subRun] = await db.insert(workflowRuns).values({
          workflowId: task.targetWorkflowId,
          status: 'running',
          triggeredBy: 'workflow',
          logs: '',
        }).returning();
        
        await executeWorkflow(targetWorkflow, subRun.id, depth + 1);
        logs.push(`✓ Workflow "${targetWorkflow.name}" completed`);
        break;
    }
    
    return { success: true };
  } catch (error: any) {
    logs.push(`✗ Task failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function resolveWorkflowCwd(workflow: WorkflowWithTasks, logs: string[]): Promise<string> {
  if (!workflow.projectId) {
    return process.cwd();
  }

  return resolveProjectWorkspaceCwd(workflow.projectId, logs);
}

async function resolveProjectWorkspaceCwd(projectId: string | number, logs: string[]): Promise<string> {
  try {
    const projectDir = await ensureProjectDirectory(projectId);
    logs.push(`Workspace: ${projectDir}`);
    return projectDir;
  } catch (error: any) {
    logs.push(`Workspace fallback: ${error.message || 'unknown error'}`);
    return process.cwd();
  }
}

function executeShellCommand(command: string, logs: string[], processes: ChildProcess[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', ['-c', command], {
      cwd,
      env: { ...process.env, CI: 'true' },
    });
    
    processes.push(proc);
    
    proc.stdout?.on('data', (data) => {
      const text = data.toString();
      logs.push(text.trim());
    });
    
    proc.stderr?.on('data', (data) => {
      const text = data.toString();
      logs.push(`[stderr] ${text.trim()}`);
    });
    
    proc.on('close', (code) => {
      const index = processes.indexOf(proc);
      if (index > -1) processes.splice(index, 1);
      
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}`));
      }
    });
    
    proc.on('error', (error) => {
      const index = processes.indexOf(proc);
      if (index > -1) processes.splice(index, 1);
      reject(error);
    });
    
    // Timeout after 5 minutes
    setTimeout(() => {
      if (proc.exitCode === null) {
        proc.kill('SIGTERM');
        reject(new Error('Command timed out'));
      }
    }, 5 * 60 * 1000);
  });
}

async function updateRunStatus(runId: number, status: 'success' | 'failed' | 'cancelled', logs: string): Promise<void> {
  await db.update(workflowRuns)
    .set({ status, logs, completedAt: new Date() })
    .where(eq(workflowRuns.id, runId));
}

export default workflowsRouter;
