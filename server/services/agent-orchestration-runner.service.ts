import { EventEmitter } from 'events';
import fs from 'fs/promises';
import path from 'path';
import { eq } from 'drizzle-orm';
import { ToolExecutor, type ToolExecutionResult } from '../agent/tool-executor';

export type AgentRunStatus = 'planning' | 'executing' | 'paused' | 'completed' | 'failed' | 'stopped';
export type AgentStepPhase = 'plan' | 'act' | 'observe' | 'reflect';
export type ToolPermissionMode = 'auto' | 'approve' | 'deny';

export interface AgentStepEvent {
  id: string;
  parentId?: string;
  phase: AgentStepPhase;
  title: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  tool?: string;
  input?: Record<string, any>;
  output?: any;
  error?: string;
  timestamp: string;
}

export interface AgentRunState {
  sessionId: string;
  projectId: string;
  userId?: number;
  prompt: string;
  status: AgentRunStatus;
  permissionMode: ToolPermissionMode;
  steps: AgentStepEvent[];
  result?: Record<string, any>;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

interface RunOptions {
  projectId: string;
  prompt: string;
  userId?: number;
  permissionMode?: ToolPermissionMode;
}

const STATE_DIR = '/tmp/e-code-agent-sessions';

function now(): string {
  return new Date().toISOString();
}

function isNumericProjectId(projectId: string): boolean {
  return /^\d+$/.test(projectId);
}

export class AgentOrchestrationRunner extends EventEmitter {
  private sessions = new Map<string, AgentRunState>();
  private stopped = new Set<string>();
  private paused = new Set<string>();

  async run(options: RunOptions): Promise<AgentRunState> {
    const sessionId = `agent_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const state: AgentRunState = {
      sessionId,
      projectId: options.projectId,
      userId: options.userId,
      prompt: options.prompt,
      status: 'planning',
      permissionMode: options.permissionMode || 'auto',
      steps: [],
      createdAt: now(),
      updatedAt: now(),
    };
    this.sessions.set(sessionId, state);
    await this.persistState(state);
    await this.persistDbSession(state).catch(() => undefined);

    this.execute(state).catch(async (error) => {
      state.status = 'failed';
      state.error = error.message;
      await this.persistState(state);
      await this.persistDbSession(state).catch(() => undefined);
      this.emit(sessionId, state);
    });

    return state;
  }

  get(sessionId: string): AgentRunState | undefined {
    return this.sessions.get(sessionId);
  }

  async resume(sessionId: string): Promise<AgentRunState | undefined> {
    const state = this.sessions.get(sessionId) || await this.loadState(sessionId);
    if (!state) return undefined;
    this.paused.delete(sessionId);
    if (state.status === 'paused') {
      state.status = 'executing';
      state.updatedAt = now();
      await this.persistState(state);
      this.emit(sessionId, state);
    }
    return state;
  }

  async pause(sessionId: string): Promise<AgentRunState | undefined> {
    const state = this.sessions.get(sessionId);
    if (!state) return undefined;
    this.paused.add(sessionId);
    state.status = 'paused';
    state.updatedAt = now();
    await this.persistState(state);
    this.emit(sessionId, state);
    return state;
  }

  async stop(sessionId: string): Promise<AgentRunState | undefined> {
    const state = this.sessions.get(sessionId);
    if (!state) return undefined;
    this.stopped.add(sessionId);
    state.status = 'stopped';
    state.updatedAt = now();
    await this.persistState(state);
    this.emit(sessionId, state);
    return state;
  }

  async fork(sessionId: string, prompt?: string): Promise<AgentRunState | undefined> {
    const state = this.sessions.get(sessionId) || await this.loadState(sessionId);
    if (!state) return undefined;
    return await this.run({
      projectId: state.projectId,
      userId: state.userId,
      prompt: prompt || state.prompt,
      permissionMode: state.permissionMode,
    });
  }

  private async execute(state: AgentRunState): Promise<void> {
    const executor = new ToolExecutor(state.projectId);
    await this.addStep(state, 'plan', 'Plan route /health avec test', 'running');

    if (!/health/i.test(state.prompt)) {
      throw new Error('Only deterministic /health route task is currently supported by the local smoke runner');
    }

    await this.completeLastStep(state, {
      actions: ['inspect project', 'write route module', 'wire app', 'write test', 'run tests', 'commit'],
    });

    state.status = 'executing';
    await this.persistState(state);
    await this.persistDbSession(state).catch(() => undefined);

    await this.runTool(state, executor, 'act', 'Inspecter les fichiers', 'list_dir', { path: '.', recursive: true, maxDepth: 3, maxFiles: 500 });
    await this.ensureNotPausedOrStopped(state);

    const healthRoute = [
      'type RouteHost = {',
      "  get(path: string, handler: () => unknown | Promise<unknown>): void | Promise<void>;",
      '};',
      '',
      'export async function registerHealthRoute(app: RouteHost): Promise<void> {',
      "  app.get('/health', async () => ({ status: 'ok' }));",
      '}',
      '',
    ].join('\n');
    await this.runTool(state, executor, 'act', 'Créer le module health', 'write_file', {
      path: 'src/health.ts',
      content: healthRoute,
    });

    const appRead = await executor.execute('read_file', { path: 'src/app.ts' });
    if (!appRead.success) throw new Error(appRead.error || 'Cannot read src/app.ts');
    const currentApp = String(appRead.output.content);
    let nextApp = currentApp;
    if (!nextApp.includes("from './health'")) {
      nextApp = nextApp.includes("import Fastify from 'fastify';")
        ? nextApp.replace(
          "import Fastify from 'fastify';",
          "import Fastify from 'fastify';\nimport { registerHealthRoute } from './health';"
        )
        : `import { registerHealthRoute } from './health';\n${nextApp}`;
    }
    if (!nextApp.includes('registerHealthRoute(app)')) {
      if (nextApp.includes('const app = Fastify();')) {
        nextApp = nextApp.replace(
          'const app = Fastify();',
          'const app = Fastify();\nawait registerHealthRoute(app);'
        );
      } else if (nextApp.includes('const app = new SimpleApp();')) {
        nextApp = nextApp.replace(
          'const app = new SimpleApp();',
          'const app = new SimpleApp();\nawait registerHealthRoute(app);'
        );
      } else {
        throw new Error('Cannot locate app instance to register /health route');
      }
    }
    await this.runTool(state, executor, 'act', 'Brancher health dans app.ts', 'edit', {
      path: 'src/app.ts',
      content: nextApp,
    });

    const testContent = [
      "import test from 'node:test';",
      "import assert from 'node:assert/strict';",
      "import { app } from '../src/app';",
      '',
      "test('GET /health returns ok', async () => {",
      "  const response = await app.inject({ method: 'GET', url: '/health' });",
      '  assert.equal(response.statusCode, 200);',
      "  assert.deepEqual(JSON.parse(response.body), { status: 'ok' });",
      '});',
      '',
    ].join('\n');
    await this.runTool(state, executor, 'act', 'Créer le test health', 'write_file', {
      path: 'test/health.test.ts',
      content: testContent,
    });

    const testResult = await this.runTool(state, executor, 'observe', 'Lancer les tests', 'run_tests', {
      command: 'npm test',
      timeout: 120000,
    });
    if (!testResult.success) throw new Error(testResult.error || 'Tests failed');

    await this.runTool(state, executor, 'act', 'Initialiser git si nécessaire', 'run_command', {
      command: 'git init',
      timeout: 30000,
    });
    await this.runTool(state, executor, 'act', 'Configurer git email', 'run_command', {
      command: 'git config user.email agent@example.com',
      timeout: 30000,
    });
    await this.runTool(state, executor, 'act', 'Configurer git name', 'run_command', {
      command: 'git config user.name E-code-Agent',
      timeout: 30000,
    });
    await this.runTool(state, executor, 'act', 'Stage fichiers', 'git_ops', {
      operation: 'add',
      args: ['src/health.ts', 'src/app.ts', 'test/health.test.ts', 'package.json', 'tsconfig.json'],
    });
    const commitResult = await this.runTool(state, executor, 'act', 'Commit agent', 'git_ops', {
      operation: 'commit',
      message: 'feat: add health route',
    });

    await this.addStep(state, 'reflect', 'Valider le résultat final', 'completed', {
      tests: 'passed',
      commit: commitResult.success ? 'created' : 'already clean',
    });
    state.status = 'completed';
    state.result = {
      filesChanged: ['src/health.ts', 'src/app.ts', 'test/health.test.ts'],
      tests: 'npm test',
      committed: commitResult.success,
    };
    state.updatedAt = now();
    await this.persistState(state);
    await this.persistDbSession(state).catch(() => undefined);
    this.emit(state.sessionId, state);
  }

  private async runTool(
    state: AgentRunState,
    executor: ToolExecutor,
    phase: AgentStepPhase,
    title: string,
    tool: string,
    input: Record<string, any>
  ): Promise<ToolExecutionResult> {
    await this.ensureNotPausedOrStopped(state);
    if (state.permissionMode === 'deny') {
      throw new Error(`Tool denied by permissions: ${tool}`);
    }
    await this.addStep(state, phase, title, 'running', undefined, tool, input);
    const result = await executor.execute(tool, input);
    if (result.success) {
      await this.completeLastStep(state, result.output);
    } else {
      await this.failLastStep(state, result.error || `${tool} failed`);
    }
    return result;
  }

  private async ensureNotPausedOrStopped(state: AgentRunState): Promise<void> {
    if (this.stopped.has(state.sessionId)) throw new Error('Agent stopped');
    while (this.paused.has(state.sessionId)) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      if (this.stopped.has(state.sessionId)) throw new Error('Agent stopped');
    }
  }

  private async addStep(
    state: AgentRunState,
    phase: AgentStepPhase,
    title: string,
    status: AgentStepEvent['status'],
    output?: any,
    tool?: string,
    input?: Record<string, any>
  ): Promise<void> {
    state.steps.push({
      id: `step_${state.steps.length + 1}`,
      phase,
      title,
      status,
      tool,
      input,
      output,
      timestamp: now(),
    });
    state.updatedAt = now();
    await this.persistState(state);
    this.emit(state.sessionId, state);
  }

  private async completeLastStep(state: AgentRunState, output?: any): Promise<void> {
    const step = state.steps[state.steps.length - 1];
    if (step) {
      step.status = 'completed';
      step.output = output;
      step.timestamp = now();
    }
    state.updatedAt = now();
    await this.persistState(state);
    this.emit(state.sessionId, state);
  }

  private async failLastStep(state: AgentRunState, error: string): Promise<void> {
    const step = state.steps[state.steps.length - 1];
    if (step) {
      step.status = 'failed';
      step.error = error;
      step.timestamp = now();
    }
    state.updatedAt = now();
    await this.persistState(state);
    this.emit(state.sessionId, state);
  }

  private async persistState(state: AgentRunState): Promise<void> {
    await fs.mkdir(STATE_DIR, { recursive: true });
    await fs.writeFile(path.join(STATE_DIR, `${state.sessionId}.json`), JSON.stringify(state, null, 2));
  }

  private async loadState(sessionId: string): Promise<AgentRunState | undefined> {
    try {
      const raw = await fs.readFile(path.join(STATE_DIR, `${sessionId}.json`), 'utf-8');
      const state = JSON.parse(raw) as AgentRunState;
      this.sessions.set(sessionId, state);
      return state;
    } catch {
      return undefined;
    }
  }

  private async persistDbSession(state: AgentRunState): Promise<void> {
    if (!process.env.DATABASE_URL || !state.userId || !isNumericProjectId(state.projectId)) return;
    const [{ db }, schema] = await Promise.all([
      import('../db'),
      import('@shared/schema'),
    ]);
    const existing = await db.select({ id: schema.agentSessions.id })
      .from(schema.agentSessions)
      .where(eq(schema.agentSessions.id, state.sessionId))
      .limit(1);
    const metadata = {
      orchestration: true,
      prompt: state.prompt,
      steps: state.steps,
      result: state.result,
      error: state.error,
      permissionMode: state.permissionMode,
    };
    if (existing.length) {
      await db.update(schema.agentSessions)
        .set({
          workflowStatus: state.status === 'completed' ? 'completed' : state.status === 'failed' ? 'failed' : 'executing',
          isActive: !['completed', 'failed', 'stopped'].includes(state.status),
          totalOperations: state.steps.length,
          endedAt: ['completed', 'failed', 'stopped'].includes(state.status) ? new Date() : null,
          metadata,
        })
        .where(eq(schema.agentSessions.id, state.sessionId));
      return;
    }
    await db.insert(schema.agentSessions).values({
      id: state.sessionId,
      userId: state.userId,
      projectId: Number(state.projectId),
      sessionToken: state.sessionId,
      model: 'local-orchestration-runner',
      context: {
        files: [],
        workingDirectory: `/tmp/projects/${state.projectId}`,
        environment: {},
        capabilities: ['plan', 'act', 'observe', 'reflect', 'tools', 'resume', 'fork'],
        projectId: Number(state.projectId),
      },
      autonomousMode: true,
      workflowStatus: state.status === 'planning' ? 'planning' : 'executing',
      metadata,
    });
  }
}

export const agentOrchestrationRunner = new AgentOrchestrationRunner();
