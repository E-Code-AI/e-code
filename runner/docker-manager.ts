import Dockerode from 'dockerode';
import { createLogger } from './logger';
import { Writable } from 'stream';

const logger = createLogger('docker-manager');

const WORKSPACE_IMAGE = process.env.WORKSPACE_IMAGE ?? 'ecode-workspace:latest';
const DOCKER_SOCKET = process.env.DOCKER_SOCKET ?? '/var/run/docker.sock';

const DEFAULT_CPU_QUOTA = parseInt(process.env.CONTAINER_CPU_QUOTA ?? '100000', 10);
const DEFAULT_CPU_PERIOD = parseInt(process.env.CONTAINER_CPU_PERIOD ?? '100000', 10);
const DEFAULT_MEMORY_LIMIT = parseInt(process.env.CONTAINER_MEMORY_LIMIT ?? String(512 * 1024 * 1024), 10);
const DEFAULT_PIDS_LIMIT = parseInt(process.env.CONTAINER_PIDS_LIMIT ?? '64', 10);

export interface ContainerInfo {
  containerId: string;
  containerName: string;
  volumePath: string;
  ipAddress: string;
  status: 'created' | 'running' | 'stopped' | 'removed';
}

export class DockerManager {
  private docker: Dockerode;
  private containers: Map<string, ContainerInfo> = new Map();
  private imageReady = false;
  private _initialized = false;

  constructor() {
    this.docker = new Dockerode({ socketPath: DOCKER_SOCKET });
  }

  get isReady(): boolean {
    return this._initialized && this.imageReady;
  }

  async initialize(): Promise<void> {
    try {
      await this.docker.ping();
      logger.info('Docker daemon connection established');
    } catch (err) {
      logger.error(`Failed to connect to Docker daemon at ${DOCKER_SOCKET}: ${err}`);
      throw new Error(`Docker daemon not reachable: ${err}`);
    }

    this._initialized = true;
    await this.ensureImage();
  }

  private async ensureImage(): Promise<void> {
    try {
      await this.docker.getImage(WORKSPACE_IMAGE).inspect();
      logger.info(`Workspace image "${WORKSPACE_IMAGE}" found`);
      this.imageReady = true;
    } catch {
      logger.info(`Workspace image "${WORKSPACE_IMAGE}" not found, building from workspace.Dockerfile...`);
      try {
        await this.buildImage();
        this.imageReady = true;
      } catch (buildErr) {
        logger.error(`Failed to build workspace image: ${buildErr}`);
        throw buildErr;
      }
    }
  }

  private async buildImage(): Promise<void> {
    const stream = await this.docker.buildImage(
      { context: __dirname, src: ['workspace.Dockerfile'] },
      { t: WORKSPACE_IMAGE, dockerfile: 'workspace.Dockerfile' }
    );

    await new Promise<void>((resolve, reject) => {
      this.docker.modem.followProgress(stream, (err: Error | null) => {
        if (err) return reject(err);
        logger.info(`Workspace image "${WORKSPACE_IMAGE}" built successfully`);
        resolve();
      });
    });
  }

  async createContainer(workspaceId: string): Promise<ContainerInfo> {
    if (!this.imageReady) {
      throw new Error('Workspace image is not ready');
    }

    const containerName = `ecode-ws-${workspaceId}`;
    const volumeName = `ecode-vol-${workspaceId}`;

    await this.docker.createVolume({ Name: volumeName });

    const container = await this.docker.createContainer({
      Image: WORKSPACE_IMAGE,
      name: containerName,
      Hostname: 'workspace',
      User: 'runner',
      WorkingDir: '/workspace',
      HostConfig: {
        Binds: [`${volumeName}:/workspace`],
        CpuQuota: DEFAULT_CPU_QUOTA,
        CpuPeriod: DEFAULT_CPU_PERIOD,
        Memory: DEFAULT_MEMORY_LIMIT,
        MemorySwap: DEFAULT_MEMORY_LIMIT * 2,
        PidsLimit: DEFAULT_PIDS_LIMIT,
        SecurityOpt: ['no-new-privileges'],
        ReadonlyRootfs: false,
        AutoRemove: false,
        NetworkMode: 'bridge',
      },
      Labels: {
        'ecode.workspace': workspaceId,
        'ecode.managed': 'true',
      },
    });

    await container.start();

    const inspectData = await container.inspect();
    const mounts = inspectData.Mounts || [];
    const workspaceMount = mounts.find((m: any) => m.Destination === '/workspace');
    const volumePath = workspaceMount?.Source ?? '';
    const ipAddress = inspectData.NetworkSettings?.IPAddress
      || (inspectData.NetworkSettings?.Networks
        ? Object.values(inspectData.NetworkSettings.Networks)[0]?.IPAddress
        : '')
      || '';

    const info: ContainerInfo = {
      containerId: container.id,
      containerName,
      volumePath,
      ipAddress,
      status: 'running',
    };

    this.containers.set(workspaceId, info);
    logger.info(`Container ${containerName} (${container.id.slice(0, 12)}) started for workspace ${workspaceId}`);

    return info;
  }

  async stopContainer(workspaceId: string): Promise<void> {
    const info = this.containers.get(workspaceId);
    if (!info) return;

    try {
      const container = this.docker.getContainer(info.containerId);
      await container.stop({ t: 5 }).catch(() => {});
      await container.remove({ force: true }).catch(() => {});
      info.status = 'removed';
      logger.info(`Container ${info.containerName} stopped and removed`);
    } catch (err) {
      logger.warn(`Error stopping container for workspace ${workspaceId}: ${err}`);
    }

    try {
      const volumeName = `ecode-vol-${workspaceId}`;
      const volume = this.docker.getVolume(volumeName);
      await volume.remove().catch(() => {});
      logger.info(`Volume ${volumeName} removed`);
    } catch (err) {
      logger.warn(`Error removing volume for workspace ${workspaceId}: ${err}`);
    }

    this.containers.delete(workspaceId);
  }

  async execInContainer(
    workspaceId: string,
    command: string | string[],
    options?: {
      env?: Record<string, string>;
      workingDir?: string;
      timeout?: number;
      user?: string;
    }
  ): Promise<{ stdout: string; stderr: string; exitCode: number }> {
    const info = this.containers.get(workspaceId);
    if (!info || info.status !== 'running') {
      throw new Error(`No running container for workspace ${workspaceId}`);
    }

    const container = this.docker.getContainer(info.containerId);
    const timeoutSec = Math.ceil((options?.timeout ?? 10000) / 1000);
    const innerCmd = typeof command === 'string' ? ['sh', '-c', command] : command;
    const cmd = ['timeout', '--signal=KILL', `${timeoutSec}s`, ...innerCmd];

    const envArr = options?.env
      ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`)
      : [];

    const exec = await container.exec({
      Cmd: cmd,
      AttachStdout: true,
      AttachStderr: true,
      WorkingDir: options?.workingDir ?? '/workspace',
      Env: envArr.length > 0 ? envArr : undefined,
      User: options?.user ?? 'runner',
    });

    const execStream = await exec.start({ hijack: true, stdin: false });

    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timeoutMs = options?.timeout ?? 10000;
      const timer = setTimeout(() => {
        timedOut = true;
        execStream.destroy();
        resolve({ stdout, stderr: stderr + '\nExecution timed out', exitCode: 124 });
      }, timeoutMs);

      const stdoutStream = new Writable({
        write(chunk, _enc, cb) {
          stdout += chunk.toString();
          cb();
        },
      });
      const stderrStream = new Writable({
        write(chunk, _enc, cb) {
          stderr += chunk.toString();
          cb();
        },
      });

      this.docker.modem.demuxStream(execStream, stdoutStream, stderrStream);

      execStream.on('end', async () => {
        clearTimeout(timer);
        if (timedOut) return;

        try {
          const inspectResult = await exec.inspect();
          resolve({ stdout, stderr, exitCode: inspectResult.ExitCode ?? 0 });
        } catch {
          resolve({ stdout, stderr, exitCode: 1 });
        }
      });

      execStream.on('error', (err: Error) => {
        clearTimeout(timer);
        if (timedOut) return;
        reject(err);
      });
    });
  }

  async execInteractive(
    workspaceId: string,
    command: string[],
    options?: {
      env?: Record<string, string>;
      cols?: number;
      rows?: number;
    }
  ): Promise<{ stream: NodeJS.ReadWriteStream; execId: string; resize: (cols: number, rows: number) => Promise<void> }> {
    const info = this.containers.get(workspaceId);
    if (!info || info.status !== 'running') {
      throw new Error(`No running container for workspace ${workspaceId}`);
    }

    const container = this.docker.getContainer(info.containerId);

    const envArr = options?.env
      ? Object.entries(options.env).map(([k, v]) => `${k}=${v}`)
      : [];

    const exec = await container.exec({
      Cmd: command,
      AttachStdin: true,
      AttachStdout: true,
      AttachStderr: true,
      Tty: true,
      Env: [
        'TERM=xterm-256color',
        `COLUMNS=${options?.cols ?? 80}`,
        `LINES=${options?.rows ?? 24}`,
        ...envArr,
      ],
      User: 'runner',
      WorkingDir: '/workspace',
    });

    const stream = await exec.start({ hijack: true, stdin: true, Tty: true });

    if (options?.cols && options?.rows) {
      try {
        await exec.resize({ h: options.rows, w: options.cols });
      } catch {}
    }

    const resize = async (cols: number, rows: number) => {
      try {
        await exec.resize({ h: rows, w: cols });
      } catch {}
    };

    return { stream, execId: exec.id!, resize };
  }

  async writeFileToContainer(
    workspaceId: string,
    containerPath: string,
    content: Buffer | string
  ): Promise<void> {
    const info = this.containers.get(workspaceId);
    if (!info || info.status !== 'running') {
      throw new Error(`No running container for workspace ${workspaceId}`);
    }

    const container = this.docker.getContainer(info.containerId);
    const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;

    const { pack } = await import('tar-stream');
    const tarStream = pack();
    const fileName = containerPath.split('/').pop() || 'file';
    tarStream.entry({ name: fileName, size: buf.length }, buf);
    tarStream.finalize();

    const dir = containerPath.substring(0, containerPath.lastIndexOf('/')) || '/';

    await this.execInContainer(workspaceId, ['mkdir', '-p', dir], { timeout: 5000 });

    await container.putArchive(tarStream, { path: dir });
  }

  getContainerInfo(workspaceId: string): ContainerInfo | undefined {
    return this.containers.get(workspaceId);
  }

  async getContainerIp(workspaceId: string): Promise<string | null> {
    const info = this.containers.get(workspaceId);
    if (!info) return null;

    if (info.ipAddress) return info.ipAddress;

    try {
      const container = this.docker.getContainer(info.containerId);
      const data = await container.inspect();
      const ip = data.NetworkSettings?.IPAddress
        || (data.NetworkSettings?.Networks
          ? Object.values(data.NetworkSettings.Networks)[0]?.IPAddress
          : null)
        || null;
      if (ip) info.ipAddress = ip;
      return ip;
    } catch {
      return null;
    }
  }

  async stopAll(): Promise<void> {
    const ids = Array.from(this.containers.keys());
    await Promise.all(ids.map((id) => this.stopContainer(id)));
    logger.info(`All ${ids.length} containers stopped`);
  }

  async isContainerRunning(workspaceId: string): Promise<boolean> {
    const info = this.containers.get(workspaceId);
    if (!info) return false;

    try {
      const container = this.docker.getContainer(info.containerId);
      const data = await container.inspect();
      return data.State?.Running ?? false;
    } catch {
      return false;
    }
  }
}

let dockerManagerInstance: DockerManager | null = null;

export function getDockerManager(): DockerManager {
  if (!dockerManagerInstance) {
    dockerManagerInstance = new DockerManager();
  }
  return dockerManagerInstance;
}
