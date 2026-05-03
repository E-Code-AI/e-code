import {
  projectWorkflows,
  securityLogs,
  workflowRuns,
  workflowTasks,
  type ProjectWorkflow,
  type WorkflowTask,
  type WorkflowWithTasks,
} from '@shared/schema';
import { ChildProcess, spawn } from 'child_process';
import { and, asc, desc, eq } from 'drizzle-orm';
import { Request, Response, Router } from 'express';
import * as net from 'net';
import { z } from 'zod';
import { db } from '../db';
import { ensureAuthenticated } from '../middleware/auth';
import { storage } from '../storage';
import { redactErrorForLog } from '../utils/error-redaction';
import { createLogger } from '../utils/logger';
import { ensureProjectDirectory } from '../utils/project-fs-sync';

const logger = createLogger('workflows-router');
const workflowsRouter = Router();

// ─── System workflow definitions ──────────────────────────────────────────────

const SYSTEM_WORKFLOW_DEFINITIONS = [
  { name: 'Start application', command: 'npm run dev', description: 'Start the dev server with hot reload', icon: 'play', isDefault: true },
  { name: 'Build', command: 'npm run build', description: 'Build the production bundle', icon: 'package' },
  { name: 'Test', command: 'npm test', description: 'Run the test suite', icon: 'test' },
  { name: 'Preview', command: 'npm run preview', description: 'Preview the production build', icon: 'globe' },
];

// ─── Process tracking ─────────────────────────────────────────────────────────

const runningProcesses = new Map<number, { pgid: number; procs: ChildProcess[] }>();

// ─── SSE clients ──────────────────────────────────────────────────────────────

const sseClients = new Map<number, Set<Response>>();

function broadcastLog(workflowId: number, chunk: string) {
  const clients = sseClients.get(workflowId);
  if (!clients?.size) return;
  const payload = `data: ${JSON.stringify({ type: 'log', text: chunk })}\n\n`;
  for (const res of clients) { try { res.write(payload); } catch { /* disconnected */ } }
}

function broadcastEvent(workflowId: number, type: string, extra?: Record<string, unknown>) {
  const clients = sseClients.get(workflowId);
  if (!clients?.size) return;
  const payload = `data: ${JSON.stringify({ type, ...extra })}\n\n`;
  for (const res of clients) { try { res.write(payload); } catch { /* disconnected */ } }
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

const projectIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^\d+$/).transform((v) => parseInt(v, 10)),
]);

const taskInputSchema = z.object({
  id: z.number().optional(),
  taskType: z.enum(['shell', 'packages', 'workflow']),
  command: z.string().nullable().optional(),
  targetWorkflowId: z.number().nullable().optional(),
  orderIndex: z.number().optional(),
  waitForPort: z.number().int().min(1).max(65535).nullable().optional(),
});

const createWorkflowSchema = z.object({
  projectId: projectIdSchema.optional().nullable(),
  name: z.string().min(1).max(255),
  executionMode: z.enum(['sequential', 'parallel']).default('sequential'),
  isRunButton: z.boolean().default(false),
  isGenerated: z.boolean().default(false),
  runOnStart: z.boolean().default(false),
  tasks: z.array(taskInputSchema).default([]),
});

const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  executionMode: z.enum(['sequential', 'parallel']).optional(),
  isRunButton: z.boolean().optional(),
  enabled: z.boolean().optional(),
  runOnStart: z.boolean().optional(),
  tasks: z.array(taskInputSchema).optional(),
});

const runCommandSchema = z.object({
  projectId: z.union([z.string(), z.number()]),
  command: z.string().min(1),
  name: z.string().optional(),
});

// ─── Access helpers ───────────────────────────────────────────────────────────

async function ensureProjectAccessById(projectId: string | number, userId: number): Promise<void> {
  const project = await storage.getProject(projectId);
  if (!project) throw new Error('PROJECT_NOT_FOUND');
  if (project.ownerId === userId) return;
  const collaborators = await storage.getProjectCollaborators(projectId);
  if (!collaborators.some((c: any) => c.userId === userId)) throw new Error('PROJECT_FORBIDDEN');
}

async function ensureWorkflowAccess(req: Request, res: Response, next: () => void | Promise<void>) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const workflowId = parseInt(req.params.id, 10);
    if (!Number.isFinite(workflowId)) return res.status(400).json({ error: 'Invalid workflow ID' });
    const workflow = await getWorkflowWithTasks(workflowId);
    if (!workflow) return res.status(404).json({ error: 'Workflow not found' });
    if (workflow.projectId) await ensureProjectAccessById(workflow.projectId, userId);
    return next();
  } catch (error: any) {
    if (error?.message === 'PROJECT_NOT_FOUND') return res.status(404).json({ error: 'Project not found' });
    if (error?.message === 'PROJECT_FORBIDDEN') return res.status(403).json({ error: "You don't have access to this project" });
    logger.error('Failed to verify workflow access:', redactErrorForLog(error));
    return res.status(500).json({ error: 'Failed to verify workflow access' });
  }
}

async function ensureProjectAccessFromRequest(req: Request, res: Response, next: () => void | Promise<void>) {
  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const projectId = req.query.projectId ?? req.body?.projectId;
    if (!projectId) return next();
    await ensureProjectAccessById(projectId as string | number, userId);
    return next();
  } catch (error: any) {
    if (error?.message === 'PROJECT_NOT_FOUND') return res.status(404).json({ error: 'Project not found' });
    if (error?.message === 'PROJECT_FORBIDDEN') return res.status(403).json({ error: "You don't have access to this project" });
    logger.error('Failed to verify project access:', redactErrorForLog(error));
    return res.status(500).json({ error: 'Failed to verify project access' });
  }
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

async function getWorkflowWithTasks(workflowId: number): Promise<WorkflowWithTasks | null> {
  const rows = await db.select().from(projectWorkflows).where(eq(projectWorkflows.id, workflowId)).limit(1);
  if (!rows.length) return null;
  const tasks = await db.select().from(workflowTasks)
    .where(eq(workflowTasks.workflowId, workflowId))
    .orderBy(asc(workflowTasks.orderIndex));
  return buildWorkflowWithTasks(rows[0], tasks);
}

function buildWorkflowWithTasks(wf: ProjectWorkflow, tasks: WorkflowTask[]): WorkflowWithTasks {
  return {
    id: wf.id,
    projectId: wf.projectId,
    name: wf.name,
    executionMode: wf.executionMode,
    isRunButton: wf.isRunButton,
    isGenerated: wf.isGenerated,
    isSystem: wf.isSystem,
    enabled: wf.enabled,
    runOnStart: wf.runOnStart ?? false,
    tasks: tasks.map(t => ({
      id: t.id,
      orderIndex: t.orderIndex,
      taskType: t.taskType,
      command: t.command,
      targetWorkflowId: t.targetWorkflowId,
      waitForPort: t.waitForPort ?? null,
    })),
  };
}

// Build task rows from validated schema input — fully typed, no `as any`
type TaskInput = z.infer<typeof taskInputSchema>;
function buildTaskRows(workflowId: number, tasks: TaskInput[]): (typeof workflowTasks.$inferInsert)[] {
  return tasks.map((t, i) => ({
    workflowId,
    orderIndex: t.orderIndex ?? i,
    taskType: t.taskType,
    command: t.command ?? null,
    targetWorkflowId: t.targetWorkflowId ?? null,
    waitForPort: t.waitForPort ?? null,
  }));
}

// ─── Audit helper ─────────────────────────────────────────────────────────────

async function auditWorkflowAction(userId: number, action: string, resource: string, req: Request, result: 'success' | 'failure' = 'success') {
  try {
    await db.insert(securityLogs).values({
      userId,
      ip: (req.ip ?? req.socket?.remoteAddress ?? 'unknown').replace(/^::ffff:/, ''),
      action,
      resource,
      result,
      userAgent: req.get('user-agent') ?? null,
      metadata: { method: req.method, path: req.path },
    });
  } catch { /* audit failure must not break requests */ }
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/workflows/system
workflowsRouter.get('/system', ensureAuthenticated, (_req: Request, res: Response) => {
  res.json(SYSTEM_WORKFLOW_DEFINITIONS.map((w, i) => ({
    id: `system-${i}`,
    name: w.name,
    command: w.command,
    description: w.description,
    icon: w.icon,
    isSystem: true,
    isDefault: !!(w as any).isDefault,
    runOnStart: false,
    enabled: true,
    executionMode: 'sequential',
    tasks: [{ id: -(i + 1), orderIndex: 0, taskType: 'shell', command: w.command, targetWorkflowId: null, waitForPort: null }],
  })));
});

// GET /api/workflows
workflowsRouter.get('/', ensureAuthenticated, ensureProjectAccessFromRequest, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const projectId = req.query.projectId !== undefined ? projectIdSchema.parse(req.query.projectId) : null;

    let workflows: ProjectWorkflow[];
    if (projectId) {
      workflows = await db.select().from(projectWorkflows)
        .where(eq(projectWorkflows.projectId, projectId))
        .orderBy(desc(projectWorkflows.isRunButton), asc(projectWorkflows.name));
    } else {
      const all = await db.select().from(projectWorkflows).orderBy(desc(projectWorkflows.isRunButton), asc(projectWorkflows.name));
      const accessible = await Promise.all(all.map(async (wf) => {
        if (!wf.projectId) return wf;
        try { await ensureProjectAccessById(wf.projectId, userId); return wf; } catch { return null; }
      }));
      workflows = accessible.filter((wf): wf is ProjectWorkflow => Boolean(wf));
    }

    const result = await Promise.all(workflows.map(async (wf) => {
      const tasks = await db.select().from(workflowTasks)
        .where(eq(workflowTasks.workflowId, wf.id))
        .orderBy(asc(workflowTasks.orderIndex));
      return buildWorkflowWithTasks(wf, tasks);
    }));

    res.json(result);
  } catch (error) {
    logger.error('Failed to get workflows:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to get workflows' });
  }
});

// POST /api/workflows/run-command
workflowsRouter.post('/run-command', ensureAuthenticated, ensureProjectAccessFromRequest, async (req: Request, res: Response) => {
  try {
    const { projectId, command, name } = runCommandSchema.parse(req.body);
    const logs: string[] = [`Starting: ${name ?? command}`];
    const procs: ChildProcess[] = [];
    const cwd = await resolveProjectWorkspaceCwd(projectId, logs);
    logs.push(`$ ${command}`);
    await runShellCommand(command, logs, procs, cwd, -1, null);
    logs.push('✓ Done');
    res.json({ success: true, command, logs });
  } catch (error: any) {
    logger.error('Failed to run command:', redactErrorForLog(error));
    res.status(500).json({ error: error?.message ?? 'Failed to run command', success: false });
  }
});

// GET /api/workflows/:id
workflowsRouter.get('/:id', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const wf = await getWorkflowWithTasks(parseInt(req.params.id));
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    res.json(wf);
  } catch (error) {
    logger.error('Failed to get workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to get workflow' });
  }
});

// GET /api/workflows/:id/logs/stream — SSE
workflowsRouter.get('/:id/logs/stream', ensureAuthenticated, ensureWorkflowAccess, (req: Request, res: Response) => {
  const id = parseInt(req.params.id);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  if (!sseClients.has(id)) sseClients.set(id, new Set());
  sseClients.get(id)!.add(res);
  res.write(`data: ${JSON.stringify({ type: 'connected', running: runningProcesses.has(id) })}\n\n`);

  req.on('close', () => {
    sseClients.get(id)?.delete(res);
    if (!sseClients.get(id)?.size) sseClients.delete(id);
  });
});

// GET /api/workflows/:id/status
workflowsRouter.get('/:id/status', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const [latestRun] = await db.select().from(workflowRuns)
      .where(eq(workflowRuns.workflowId, id))
      .orderBy(desc(workflowRuns.startedAt)).limit(1);
    res.json({ isRunning: runningProcesses.has(id), latestRun: latestRun ?? null });
  } catch (error) {
    logger.error('Failed to get workflow status:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to get workflow status' });
  }
});

// GET /api/workflows/:id/runs
workflowsRouter.get('/:id/runs', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const runs = await db.select().from(workflowRuns)
      .where(eq(workflowRuns.workflowId, id))
      .orderBy(desc(workflowRuns.startedAt)).limit(limit);
    res.json(runs);
  } catch (error) {
    logger.error('Failed to get workflow runs:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to get workflow runs' });
  }
});

// POST /api/workflows
workflowsRouter.post('/', ensureAuthenticated, ensureProjectAccessFromRequest, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const data = createWorkflowSchema.parse(req.body);

    if (data.isRunButton && data.projectId) {
      await db.update(projectWorkflows).set({ isRunButton: false })
        .where(and(eq(projectWorkflows.projectId, data.projectId), eq(projectWorkflows.isRunButton, true)));
    }

    const [wf] = await db.insert(projectWorkflows).values({
      projectId: data.projectId ?? null,
      name: data.name,
      executionMode: data.executionMode,
      isRunButton: data.isRunButton,
      isGenerated: data.isGenerated,
      isSystem: false,
      enabled: true,
      runOnStart: data.runOnStart,
    }).returning();

    if (data.tasks.length > 0) {
      await db.insert(workflowTasks).values(buildTaskRows(wf.id, data.tasks));
    }

    await auditWorkflowAction(userId, 'workflow.create', `workflow:${wf.id}`, req);
    res.status(201).json(await getWorkflowWithTasks(wf.id));
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid workflow data', details: error.errors });
    logger.error('Failed to create workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to create workflow' });
  }
});

// PATCH /api/workflows/:id
workflowsRouter.patch('/:id', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const id = parseInt(req.params.id);
    const data = updateWorkflowSchema.parse(req.body);

    const [existing] = await db.select().from(projectWorkflows).where(eq(projectWorkflows.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });

    if (data.isRunButton && existing.projectId) {
      await db.update(projectWorkflows).set({ isRunButton: false })
        .where(and(eq(projectWorkflows.projectId, existing.projectId), eq(projectWorkflows.isRunButton, true)));
    }

    const updateData: Partial<typeof projectWorkflows.$inferInsert> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.executionMode !== undefined) updateData.executionMode = data.executionMode;
    if (data.isRunButton !== undefined) updateData.isRunButton = data.isRunButton;
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.runOnStart !== undefined) updateData.runOnStart = data.runOnStart;

    if (Object.keys(updateData).length > 0) {
      await db.update(projectWorkflows).set({ ...updateData, updatedAt: new Date() }).where(eq(projectWorkflows.id, id));
    }

    if (data.tasks) {
      await db.delete(workflowTasks).where(eq(workflowTasks.workflowId, id));
      if (data.tasks.length > 0) {
        await db.insert(workflowTasks).values(buildTaskRows(id, data.tasks));
      }
    }

    await auditWorkflowAction(userId, 'workflow.update', `workflow:${id}`, req);
    res.json(await getWorkflowWithTasks(id));
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Invalid workflow data', details: error.errors });
    logger.error('Failed to update workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to update workflow' });
  }
});

// DELETE /api/workflows/:id
workflowsRouter.delete('/:id', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(projectWorkflows).where(eq(projectWorkflows.id, id)).limit(1);
    if (!existing) return res.status(404).json({ error: 'Workflow not found' });
    killWorkflowProcesses(id);
    await db.delete(projectWorkflows).where(eq(projectWorkflows.id, id));
    await auditWorkflowAction(userId, 'workflow.delete', `workflow:${id}`, req);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to delete workflow' });
  }
});

// POST /api/workflows/:id/run
workflowsRouter.post('/:id/run', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const id = parseInt(req.params.id);
    const wf = await getWorkflowWithTasks(id);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (!wf.enabled) return res.status(400).json({ error: 'Workflow is disabled' });
    if (runningProcesses.has(id)) return res.status(409).json({ error: 'Workflow is already running' });

    const [run] = await db.insert(workflowRuns).values({
      workflowId: id, status: 'running', triggeredBy: 'manual', logs: '',
    }).returning();

    executeWorkflow(wf, run.id);
    await auditWorkflowAction(userId, 'workflow.run', `workflow:${id}`, req);
    res.json({ success: true, runId: run.id });
  } catch (error) {
    logger.error('Failed to run workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to run workflow' });
  }
});

// POST /api/workflows/:id/stop
workflowsRouter.post('/:id/stop', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const id = parseInt(req.params.id);
    killWorkflowProcesses(id);
    await db.update(workflowRuns).set({ status: 'cancelled', completedAt: new Date() })
      .where(and(eq(workflowRuns.workflowId, id), eq(workflowRuns.status, 'running')));
    broadcastEvent(id, 'stopped');
    await auditWorkflowAction(userId, 'workflow.stop', `workflow:${id}`, req);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to stop workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to stop workflow' });
  }
});

// POST /api/workflows/:id/restart
workflowsRouter.post('/:id/restart', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const id = parseInt(req.params.id);
    const wf = await getWorkflowWithTasks(id);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (!wf.enabled) return res.status(400).json({ error: 'Workflow is disabled' });

    killWorkflowProcesses(id);
    await db.update(workflowRuns).set({ status: 'cancelled', completedAt: new Date() })
      .where(and(eq(workflowRuns.workflowId, id), eq(workflowRuns.status, 'running')));
    broadcastEvent(id, 'restarting');

    const [run] = await db.insert(workflowRuns).values({
      workflowId: id, status: 'running', triggeredBy: 'manual', logs: '',
    }).returning();

    executeWorkflow(wf, run.id);
    await auditWorkflowAction(userId, 'workflow.restart', `workflow:${id}`, req);
    res.json({ success: true, runId: run.id });
  } catch (error) {
    logger.error('Failed to restart workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to restart workflow' });
  }
});

// POST /api/workflows/:id/set-run-button
workflowsRouter.post('/:id/set-run-button', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const id = parseInt(req.params.id);
    const [wf] = await db.select().from(projectWorkflows).where(eq(projectWorkflows.id, id)).limit(1);
    if (!wf) return res.status(404).json({ error: 'Workflow not found' });
    if (wf.projectId) {
      await db.update(projectWorkflows).set({ isRunButton: false }).where(eq(projectWorkflows.projectId, wf.projectId));
    }
    await db.update(projectWorkflows).set({ isRunButton: true, updatedAt: new Date() }).where(eq(projectWorkflows.id, id));
    await auditWorkflowAction(userId, 'workflow.set-run-button', `workflow:${id}`, req);
    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to set run button:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to set run button' });
  }
});

// POST /api/workflows/:id/duplicate
workflowsRouter.post('/:id/duplicate', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const id = parseInt(req.params.id);
    const original = await getWorkflowWithTasks(id);
    if (!original) return res.status(404).json({ error: 'Workflow not found' });

    const [copy] = await db.insert(projectWorkflows).values({
      projectId: original.projectId,
      name: `${original.name} (copy)`,
      executionMode: original.executionMode,
      isRunButton: false,
      isGenerated: original.isGenerated,
      isSystem: false,
      enabled: true,
      runOnStart: false,
    }).returning();

    if (original.tasks.length > 0) {
      await db.insert(workflowTasks).values(buildTaskRows(copy.id, original.tasks.map(t => ({
        taskType: t.taskType,
        command: t.command,
        targetWorkflowId: t.targetWorkflowId,
        orderIndex: t.orderIndex,
        waitForPort: t.waitForPort,
      }))));
    }

    await auditWorkflowAction(userId, 'workflow.duplicate', `workflow:${copy.id}`, req);
    res.status(201).json(await getWorkflowWithTasks(copy.id));
  } catch (error) {
    logger.error('Failed to duplicate workflow:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to duplicate workflow' });
  }
});

// POST /api/workflows/:id/reorder-tasks
workflowsRouter.post('/:id/reorder-tasks', ensureAuthenticated, ensureWorkflowAccess, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { taskIds } = req.body as { taskIds: number[] };
    if (!Array.isArray(taskIds)) return res.status(400).json({ error: 'taskIds must be an array' });
    await Promise.all(taskIds.map((taskId, index) =>
      db.update(workflowTasks).set({ orderIndex: index })
        .where(and(eq(workflowTasks.id, taskId), eq(workflowTasks.workflowId, id)))
    ));
    res.json(await getWorkflowWithTasks(id));
  } catch (error) {
    logger.error('Failed to reorder tasks:', redactErrorForLog(error));
    res.status(500).json({ error: 'Failed to reorder tasks' });
  }
});

// ─── Execution engine ─────────────────────────────────────────────────────────

function killWorkflowProcesses(workflowId: number): boolean {
  const entry = runningProcesses.get(workflowId);
  if (!entry) return false;
  const { pgid, procs } = entry;
  if (pgid > 0) {
    try { process.kill(-pgid, 'SIGTERM'); } catch { /* already gone */ }
    setTimeout(() => { try { process.kill(-pgid, 'SIGKILL'); } catch { /* already gone */ } }, 3000);
  } else {
    for (const p of procs) { try { p.kill('SIGTERM'); } catch { /* already gone */ } }
  }
  runningProcesses.delete(workflowId);
  return true;
}

/** Exported so preview.ts can trigger run-on-start workflows without HTTP */
export async function executeWorkflowById(workflowId: number, runId: number): Promise<void> {
  const wf = await getWorkflowWithTasks(workflowId);
  if (!wf) return;
  return executeWorkflow(wf, runId);
}

async function executeWorkflow(wf: WorkflowWithTasks, runId: number, depth = 0): Promise<void> {
  if (depth > 5) {
    await updateRunStatus(runId, 'failed', 'Maximum workflow nesting depth exceeded');
    return;
  }
  const logs: string[] = [`▶ Workflow: ${wf.name} (${wf.executionMode})`];
  const procs: ChildProcess[] = [];
  runningProcesses.set(wf.id, { pgid: 0, procs });
  broadcastEvent(wf.id, 'started', { runId });

  try {
    const sorted = [...wf.tasks].sort((a, b) => a.orderIndex - b.orderIndex);
    if (wf.executionMode === 'parallel') {
      await Promise.all(sorted.map(t => executeTask(t, wf, logs, procs, depth)));
    } else {
      for (const t of sorted) {
        const r = await executeTask(t, wf, logs, procs, depth);
        if (!r.success) throw new Error(`Task failed: ${r.error}`);
      }
    }
    await updateRunStatus(runId, 'success', logs.join('\n'));
    broadcastEvent(wf.id, 'completed', { status: 'success' });
  } catch (error: any) {
    logs.push(`\n✗ Failed: ${error.message}`);
    await updateRunStatus(runId, 'failed', logs.join('\n'));
    broadcastEvent(wf.id, 'completed', { status: 'failed', error: error.message });
  } finally {
    runningProcesses.delete(wf.id);
  }
}

async function executeTask(
  task: WorkflowWithTasks['tasks'][0],
  wf: WorkflowWithTasks,
  logs: string[],
  procs: ChildProcess[],
  depth: number,
): Promise<{ success: boolean; error?: string }> {
  const header = `=== Task ${task.orderIndex + 1}: ${task.taskType} ===`;
  logs.push(header);
  broadcastLog(wf.id, header + '\n');

  const cwd = await resolveWorkflowCwd(wf, logs);
  try {
    switch (task.taskType) {
      case 'shell': {
        if (!task.command) return { success: true };
        const cmd = `$ ${task.command}`;
        logs.push(cmd); broadcastLog(wf.id, cmd + '\n');
        await runShellCommand(task.command, logs, procs, cwd, wf.id, task.waitForPort ?? null);
        const done = '✓ Done'; logs.push(done); broadcastLog(wf.id, done + '\n');
        break;
      }
      case 'packages': {
        const pkg = task.command;
        const cmd = pkg ? `npm install ${pkg}` : 'npm install';
        logs.push(`$ ${cmd}`); broadcastLog(wf.id, `$ ${cmd}\n`);
        await runShellCommand(cmd, logs, procs, cwd, wf.id, null);
        const done = '✓ Packages installed'; logs.push(done); broadcastLog(wf.id, done + '\n');
        break;
      }
      case 'workflow': {
        if (!task.targetWorkflowId) return { success: true };
        const target = await getWorkflowWithTasks(task.targetWorkflowId);
        if (!target) throw new Error(`Target workflow not found: ${task.targetWorkflowId}`);
        const msg = `↳ Running: ${target.name}`;
        logs.push(msg); broadcastLog(wf.id, msg + '\n');
        const [subRun] = await db.insert(workflowRuns).values({
          workflowId: task.targetWorkflowId, status: 'running', triggeredBy: 'workflow', logs: '',
        }).returning();
        await executeWorkflow(target, subRun.id, depth + 1);
        const done = `✓ "${target.name}" done`; logs.push(done); broadcastLog(wf.id, done + '\n');
        break;
      }
    }
    return { success: true };
  } catch (error: any) {
    const msg = `✗ ${error.message}`;
    logs.push(msg); broadcastLog(wf.id, msg + '\n');
    return { success: false, error: error.message };
  }
}

async function resolveWorkflowCwd(wf: WorkflowWithTasks, logs: string[]): Promise<string> {
  if (!wf.projectId) return process.cwd();
  return resolveProjectWorkspaceCwd(wf.projectId, logs);
}

async function resolveProjectWorkspaceCwd(projectId: string | number, logs: string[]): Promise<string> {
  try {
    const dir = await ensureProjectDirectory(projectId);
    logs.push(`Workspace: ${dir}`);
    return dir;
  } catch (error: any) {
    logs.push(`Workspace fallback: ${error.message ?? 'unknown'}`);
    return process.cwd();
  }
}

function probePort(port: number, timeoutMs = 30000): Promise<void> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    function attempt() {
      if (Date.now() >= deadline) return reject(new Error(`Timed out waiting for port ${port}`));
      const s = new net.Socket();
      s.setTimeout(1000);
      s.on('connect', () => { s.destroy(); resolve(); });
      s.on('error', () => { s.destroy(); setTimeout(attempt, 500); });
      s.on('timeout', () => { s.destroy(); setTimeout(attempt, 500); });
      s.connect(port, '127.0.0.1');
    }
    attempt();
  });
}

function runShellCommand(
  command: string,
  logs: string[],
  procs: ChildProcess[],
  cwd: string,
  workflowId: number,
  portToWait: number | null,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn('bash', ['-c', command], {
      cwd,
      env: { ...process.env, CI: 'true' },
      detached: true,
    });

    if (workflowId > 0 && proc.pid) {
      const entry = runningProcesses.get(workflowId);
      if (entry && entry.pgid === 0) entry.pgid = proc.pid;
    }
    procs.push(proc);

    proc.stdout?.on('data', (d: Buffer) => {
      const text = d.toString();
      logs.push(text.trimEnd());
      if (workflowId > 0) broadcastLog(workflowId, text);
    });
    proc.stderr?.on('data', (d: Buffer) => {
      const text = d.toString();
      logs.push(`[stderr] ${text.trimEnd()}`);
      if (workflowId > 0) broadcastLog(workflowId, `\x1b[31m${text}\x1b[0m`);
    });

    let settled = false;
    const settle = (fn: () => void) => { if (!settled) { settled = true; fn(); } };

    if (portToWait) {
      probePort(portToWait)
        .then(() => {
          const msg = `✓ Port ${portToWait} ready`;
          logs.push(msg);
          if (workflowId > 0) broadcastLog(workflowId, msg + '\n');
          settle(resolve);
        })
        .catch((err) => settle(() => reject(err)));
    }

    proc.on('close', (code) => {
      procs.splice(procs.indexOf(proc), 1);
      if (portToWait) {
        if (!settled && code !== 0) settle(() => reject(new Error(`Process exited with ${code} before port was ready`)));
        return;
      }
      settle(() => (code === 0 || code === null ? resolve() : reject(new Error(`Exited with code ${code}`))));
    });
    proc.on('error', (err) => { procs.splice(procs.indexOf(proc), 1); settle(() => reject(err)); });

    if (!portToWait) {
      setTimeout(() => {
        if (!settled && proc.exitCode === null) {
          proc.kill('SIGTERM');
          settle(() => reject(new Error('Command timed out (5 min)')));
        }
      }, 5 * 60 * 1000);
    }
  });
}

async function updateRunStatus(runId: number, status: 'success' | 'failed' | 'cancelled', logs: string): Promise<void> {
  await db.update(workflowRuns).set({ status, logs, completedAt: new Date() }).where(eq(workflowRuns.id, runId));
}

export default workflowsRouter;
