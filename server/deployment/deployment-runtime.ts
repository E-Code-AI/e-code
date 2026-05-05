/**
 * DeploymentRuntime — owns the per-deployment process lifecycle that the
 * deployment manager previously stubbed out with `setTimeout`.
 *
 * Responsibilities:
 *   - allocate a free localhost port for the deployment
 *   - spawn the user's start command in the project workspace (or, for static
 *     deployments, expose the build output directory)
 *   - poll until the port is bound (so the URL we hand back is reachable)
 *   - track the child process so stop/restart actually kill it
 *   - feed `getProxyTarget` so the deployment proxy router can route traffic
 *
 * This is intentionally a single-host implementation: the rest of the
 * deployment surface (regions, autoscaling, edge) remains as it was. The goal
 * here is only to close the gap where deployments completed as "active" yet
 * served nothing reachable.
 */

import { ChildProcess, spawn } from 'child_process';
import * as net from 'net';
import * as path from 'path';

export type RuntimeKind = 'process' | 'static';

export interface RuntimeProcessHandle {
  kind: 'process';
  deploymentId: string;
  port: number;
  child: ChildProcess;
  startedAt: Date;
  lastAccessedAt: Date;
  workdir: string;
}

export interface RuntimeStaticHandle {
  kind: 'static';
  deploymentId: string;
  rootPath: string;
  startedAt: Date;
  lastAccessedAt: Date;
}

export type RuntimeHandle = RuntimeProcessHandle | RuntimeStaticHandle;

export interface StartProcessOptions {
  deploymentId: string;
  projectPath: string;
  startCommand: string;
  envVars?: Record<string, string>;
  /** Max ms to wait for the child to bind its port before failing. */
  bootTimeoutMs?: number;
  /** Optional sink for child stdout/stderr lines (e.g. WS log streaming). */
  onLog?: (line: string) => void;
}

export interface StartStaticOptions {
  deploymentId: string;
  /** Absolute path of the directory whose contents should be served. */
  rootPath: string;
}

class DeploymentRuntime {
  private handles = new Map<string, RuntimeHandle>();
  /** Ports we've handed out, so concurrent `start` calls don't collide. */
  private reservedPorts = new Set<number>();
  private readonly portRange = { min: 41000, max: 49999 };

  /**
   * Spawn the deployment's start command and wait until it accepts TCP
   * connections. Resolves with the bound port; the proxy router then routes
   * `/d/:deploymentId/*` traffic to `http://127.0.0.1:<port>`.
   */
  async startProcess(opts: StartProcessOptions): Promise<{ port: number }> {
    if (this.handles.has(opts.deploymentId)) {
      throw new Error(`Deployment ${opts.deploymentId} already has a runtime`);
    }
    if (!opts.startCommand || !opts.startCommand.trim()) {
      throw new Error('startCommand is required to launch a process deployment');
    }

    const port = await this.allocatePort();
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      ...opts.envVars,
      PORT: String(port),
      NODE_ENV: 'production',
    };

    // detached:true puts the child in its own process group so we can kill
    // child + grandchildren together (npm scripts spawn additional shells).
    const child = spawn('sh', ['-c', opts.startCommand], {
      cwd: opts.projectPath,
      env,
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const handle: RuntimeProcessHandle = {
      kind: 'process',
      deploymentId: opts.deploymentId,
      port,
      child,
      startedAt: new Date(),
      lastAccessedAt: new Date(),
      workdir: opts.projectPath,
    };
    this.handles.set(opts.deploymentId, handle);

    if (opts.onLog) {
      child.stdout?.on('data', (b) => opts.onLog!(b.toString()));
      child.stderr?.on('data', (b) => opts.onLog!(b.toString()));
    }

    // If the child dies before it binds, surface the failure to waitForPort.
    const earlyExit = new Promise<never>((_resolve, reject) => {
      child.once('exit', (code, signal) => {
        this.handles.delete(opts.deploymentId);
        this.reservedPorts.delete(port);
        reject(new Error(`Child exited before binding (code=${code}, signal=${signal})`));
      });
    });

    try {
      await Promise.race([
        this.waitForPort(port, opts.bootTimeoutMs ?? 30_000),
        earlyExit,
      ]);
    } catch (err) {
      // Make sure we don't leak a half-started child if the port never opens.
      this.killHandle(handle).catch(() => {});
      this.handles.delete(opts.deploymentId);
      this.reservedPorts.delete(port);
      throw err;
    }

    return { port };
  }

  /**
   * Mark a build output directory as the "live" payload for a static
   * deployment. No process is spawned — the proxy router serves files
   * directly from `rootPath` when this handle is present.
   */
  startStatic(opts: StartStaticOptions): RuntimeStaticHandle {
    const handle: RuntimeStaticHandle = {
      kind: 'static',
      deploymentId: opts.deploymentId,
      rootPath: path.resolve(opts.rootPath),
      startedAt: new Date(),
      lastAccessedAt: new Date(),
    };
    this.handles.set(opts.deploymentId, handle);
    return handle;
  }

  /** Mark a deployment as just-accessed; used for idle-sleep accounting. */
  touch(deploymentId: string): void {
    const handle = this.handles.get(deploymentId);
    if (handle) handle.lastAccessedAt = new Date();
  }

  /** Return deployments idle longer than `idleMs` (caller decides what to do). */
  getIdleHandles(idleMs: number): RuntimeHandle[] {
    const cutoff = Date.now() - idleMs;
    return Array.from(this.handles.values()).filter((h) => h.lastAccessedAt.getTime() < cutoff);
  }

  /** Best-effort process termination. Idempotent. */
  async stop(deploymentId: string): Promise<void> {
    const handle = this.handles.get(deploymentId);
    if (!handle) return;
    if (handle.kind === 'process') {
      await this.killHandle(handle);
      this.reservedPorts.delete(handle.port);
    }
    this.handles.delete(deploymentId);
  }

  getHandle(deploymentId: string): RuntimeHandle | undefined {
    return this.handles.get(deploymentId);
  }

  /** Used by the proxy router to decide how to serve a deployment URL. */
  getProxyTarget(deploymentId: string):
    | { kind: 'process'; target: string }
    | { kind: 'static'; rootPath: string }
    | null {
    const handle = this.handles.get(deploymentId);
    if (!handle) return null;
    if (handle.kind === 'process') {
      return { kind: 'process', target: `http://127.0.0.1:${handle.port}` };
    }
    return { kind: 'static', rootPath: handle.rootPath };
  }

  list(): Array<{ deploymentId: string; kind: RuntimeKind; port?: number; rootPath?: string; startedAt: Date }> {
    return Array.from(this.handles.values()).map((h) =>
      h.kind === 'process'
        ? { deploymentId: h.deploymentId, kind: h.kind, port: h.port, startedAt: h.startedAt }
        : { deploymentId: h.deploymentId, kind: h.kind, rootPath: h.rootPath, startedAt: h.startedAt }
    );
  }

  // ──────────────────────────────────────────────────────────────────────
  // internals
  // ──────────────────────────────────────────────────────────────────────

  private async killHandle(handle: RuntimeProcessHandle): Promise<void> {
    if (!handle.child.pid || handle.child.killed) return;
    // Negative PID kills the whole process group (because we used detached:true).
    try {
      process.kill(-handle.child.pid, 'SIGTERM');
    } catch {
      try { handle.child.kill('SIGTERM'); } catch { /* ignore */ }
    }

    // Give it 5s, then SIGKILL.
    const exited = await new Promise<boolean>((resolve) => {
      const t = setTimeout(() => resolve(false), 5_000);
      handle.child.once('exit', () => { clearTimeout(t); resolve(true); });
    });
    if (!exited && handle.child.pid && !handle.child.killed) {
      try { process.kill(-handle.child.pid, 'SIGKILL'); } catch { /* ignore */ }
    }
  }

  private async allocatePort(): Promise<number> {
    const tried = new Set<number>();
    for (let attempt = 0; attempt < 50; attempt++) {
      const candidate =
        Math.floor(Math.random() * (this.portRange.max - this.portRange.min + 1)) +
        this.portRange.min;
      if (this.reservedPorts.has(candidate) || tried.has(candidate)) continue;
      tried.add(candidate);
      const free = await this.isPortFree(candidate);
      if (free) {
        this.reservedPorts.add(candidate);
        return candidate;
      }
    }
    throw new Error('Could not find a free port after 50 attempts');
  }

  private isPortFree(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const tester = net.createServer();
      tester.once('error', () => resolve(false));
      tester.once('listening', () => {
        tester.close(() => resolve(true));
      });
      tester.listen(port, '127.0.0.1');
    });
  }

  private async waitForPort(port: number, timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    const intervalMs = 250;
    // First sleep — give the child a beat to bind before our first probe.
    await new Promise((r) => setTimeout(r, intervalMs));
    while (Date.now() < deadline) {
      if (await this.canConnect(port)) return;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error(`Timed out waiting for port ${port} to accept connections`);
  }

  private canConnect(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const sock = new net.Socket();
      const done = (ok: boolean) => {
        sock.removeAllListeners();
        sock.destroy();
        resolve(ok);
      };
      sock.setTimeout(1_000);
      sock.once('connect', () => done(true));
      sock.once('error', () => done(false));
      sock.once('timeout', () => done(false));
      sock.connect(port, '127.0.0.1');
    });
  }
}

export const deploymentRuntime = new DeploymentRuntime();
