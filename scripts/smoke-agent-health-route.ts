import fs from 'fs/promises';
import path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { agentOrchestrationRunner } from '../server/services/agent-orchestration-runner.service';
import { ensureProjectDirectory } from '../server/utils/project-fs-sync';

const execFileAsync = promisify(execFile);

async function waitForCompletion(sessionId: string): Promise<any> {
  const deadline = Date.now() + 120000;
  while (Date.now() < deadline) {
    const state = agentOrchestrationRunner.get(sessionId);
    if (state && ['completed', 'failed', 'stopped'].includes(state.status)) {
      return state;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Agent smoke timed out for session ${sessionId}`);
}

async function main(): Promise<void> {
  const projectId = `agent-smoke-health-${Date.now()}-${process.pid}-${Math.random().toString(36).slice(2, 8)}`;
  const projectDir = await ensureProjectDirectory(projectId);

  await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
  const tsxLoader = path.join(process.cwd(), 'node_modules/tsx/dist/loader.mjs');
  await fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify({
    type: 'module',
    scripts: {
      test: `node --import ${tsxLoader} --test test/*.test.ts`,
    },
    devDependencies: {
      tsx: '^4.21.0',
      typescript: '^5.9.3',
    },
  }, null, 2));
  await fs.writeFile(path.join(projectDir, 'tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      skipLibCheck: true,
    },
  }, null, 2));
  await fs.writeFile(path.join(projectDir, 'src/app.ts'), [
    'type Handler = () => unknown | Promise<unknown>;',
    '',
    'class SimpleApp {',
    '  private routes = new Map<string, Handler>();',
    '',
    '  get(path: string, handler: Handler): void {',
    '    this.routes.set(`GET ${path}`, handler);',
    '  }',
    '',
    "  async inject(request: { method: 'GET'; url: string }): Promise<{ statusCode: number; body: string }> {",
    '    const handler = this.routes.get(`${request.method} ${request.url}`);',
    '    if (!handler) return { statusCode: 404, body: JSON.stringify({ error: "not found" }) };',
    '    const body = await handler();',
    '    return { statusCode: 200, body: JSON.stringify(body) };',
    '  }',
    '}',
    '',
    'const app = new SimpleApp();',
    '',
    'export { app };',
    '',
  ].join('\n'));

  await execFileAsync('git', ['init'], { cwd: projectDir });
  await execFileAsync('git', ['config', 'user.email', 'smoke@example.com'], { cwd: projectDir });
  await execFileAsync('git', ['config', 'user.name', 'Smoke Test'], { cwd: projectDir });
  await execFileAsync('git', ['add', 'package.json', 'tsconfig.json', 'src/app.ts'], { cwd: projectDir });
  await execFileAsync('git', ['commit', '-m', 'chore: seed smoke project'], { cwd: projectDir });

  const session = await agentOrchestrationRunner.run({
    projectId,
    prompt: 'ajoute une route /health avec test',
    permissionMode: 'auto',
  });
  const finalState = await waitForCompletion(session.sessionId);

  if (finalState.status !== 'completed') {
    throw new Error(`Agent did not complete: ${finalState.error || finalState.status}`);
  }

  const [healthRoute, appFile, testFile] = await Promise.all([
    fs.readFile(path.join(projectDir, 'src/health.ts'), 'utf-8'),
    fs.readFile(path.join(projectDir, 'src/app.ts'), 'utf-8'),
    fs.readFile(path.join(projectDir, 'test/health.test.ts'), 'utf-8'),
  ]);

  if (!healthRoute.includes("app.get('/health'")) throw new Error('Health route was not created');
  if (!appFile.includes('registerHealthRoute(app)')) throw new Error('Health route was not wired');
  if (!testFile.includes("GET /health returns ok")) throw new Error('Health test was not created');

  await execFileAsync('npm', ['test'], { cwd: projectDir, timeout: 120000 });
  const { stdout: gitLog } = await execFileAsync('git', ['log', '--oneline', '-1'], { cwd: projectDir });
  if (!gitLog.includes('feat: add health route')) {
    throw new Error(`Agent commit missing. Last commit: ${gitLog.trim()}`);
  }

  console.log(JSON.stringify({
    success: true,
    projectId,
    sessionId: session.sessionId,
    status: finalState.status,
    steps: finalState.steps.length,
    commit: gitLog.trim(),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
