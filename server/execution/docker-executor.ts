/**
 * Real Docker-based code execution environment
 * Provides sandboxed, containerized runtime for user code
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { createLogger } from '../utils/logger';
import { storage } from '../storage';
import { Project, File } from '@shared/schema';
import Docker from 'dockerode';
import * as tar from 'tar';
import { Readable } from 'stream';

const logger = createLogger('docker-executor');
const docker = new Docker();

export interface ExecutionConfig {
  projectId: number;
  language: string;
  command?: string;
  files: File[];
  environmentVars?: Record<string, string>;
  port?: number;
  memoryLimit?: string; // e.g., '512m', '1g'
  cpuLimit?: number; // e.g., 0.5 for half a CPU
  timeout?: number; // in seconds
}

export interface ExecutionResult {
  containerId: string;
  status: 'starting' | 'running' | 'stopped' | 'error';
  output: string[];
  errorOutput: string[];
  exitCode?: number;
  url?: string;
  port?: number;
  stats?: {
    cpuUsage: number;
    memoryUsage: number;
    networkIO: { rx: number; tx: number };
  };
}

export class DockerExecutor extends EventEmitter {
  private activeContainers: Map<string, {
    container: Docker.Container;
    projectId: number;
    result: ExecutionResult;
  }> = new Map();

  constructor() {
    super();
    this.setupCleanup();
  }

  private setupCleanup() {
    // Clean up containers on process exit
    process.on('SIGINT', () => this.cleanup());
    process.on('SIGTERM', () => this.cleanup());
  }

  async executeProject(config: ExecutionConfig): Promise<ExecutionResult> {
    const containerId = crypto.randomUUID();
    const containerName = `project-${config.projectId}-${containerId.slice(0, 8)}`;
    
    const result: ExecutionResult = {
      containerId,
      status: 'starting',
      output: [],
      errorOutput: [],
      port: config.port
    };

    try {
      // Create container with appropriate image
      const image = await this.getOrPullImage(config.language);
      
      // Prepare project files as tar archive
      const projectTar = await this.createProjectTar(config.files);
      
      // Container configuration
      const containerConfig: Docker.ContainerCreateOptions = {
        name: containerName,
        Image: image,
        Cmd: this.getCommand(config),
        WorkingDir: '/app',
        Env: this.formatEnvironmentVars(config.environmentVars),
        HostConfig: {
          Memory: this.parseMemoryLimit(config.memoryLimit || '512m'),
          CpuQuota: config.cpuLimit ? config.cpuLimit * 100000 : undefined,
          CpuPeriod: 100000,
          NetworkMode: 'bridge',
          AutoRemove: false,
          PortBindings: config.port ? {
            [`${config.port}/tcp`]: [{ HostPort: '0' }]
          } : undefined
        },
        ExposedPorts: config.port ? {
          [`${config.port}/tcp`]: {}
        } : undefined,
        AttachStdout: true,
        AttachStderr: true,
        Tty: false
      };

      // Create and start container
      const container = await docker.createContainer(containerConfig);
      
      // Extract files into container
      await container.putArchive(projectTar, { path: '/app' });
      
      // Set up output streams
      const stream = await container.attach({
        stream: true,
        stdout: true,
        stderr: true
      });

      // Handle output
      stream.on('data', (chunk) => {
        const output = chunk.toString();
        // Docker multiplexes stdout/stderr, first byte indicates stream type
        const streamType = chunk[0];
        const message = chunk.slice(8).toString();
        
        if (streamType === 1) { // stdout
          result.output.push(message);
          this.emit('output', { containerId, type: 'stdout', message });
        } else if (streamType === 2) { // stderr
          result.errorOutput.push(message);
          this.emit('output', { containerId, type: 'stderr', message });
        }
      });

      // Start the container
      await container.start();
      result.status = 'running';

      // Get assigned port if applicable
      if (config.port) {
        const containerInfo = await container.inspect();
        const hostPort = containerInfo.NetworkSettings.Ports[`${config.port}/tcp`]?.[0]?.HostPort;
        if (hostPort) {
          result.url = `http://localhost:${hostPort}`;
          result.port = parseInt(hostPort);
        }
      }

      // Store container reference
      this.activeContainers.set(containerId, {
        container,
        projectId: config.projectId,
        result
      });

      // Set up monitoring
      this.monitorContainer(containerId, container, result);

      // Set up timeout if specified
      if (config.timeout) {
        setTimeout(() => this.stopContainer(containerId), config.timeout * 1000);
      }

      logger.info(`Container ${containerName} started successfully`);
      return result;

    } catch (error) {
      logger.error(`Failed to execute project: ${error}`);
      result.status = 'error';
      result.errorOutput.push(error.message);
      throw error;
    }
  }

  private async getOrPullImage(language: string): Promise<string> {
    const imageMap: Record<string, string> = {
      'nodejs': 'node:20-alpine',
      'python': 'python:3.11-slim',
      'java': 'openjdk:17-alpine',
      'go': 'golang:1.21-alpine',
      'rust': 'rust:1.75-alpine',
      'ruby': 'ruby:3.2-alpine',
      'php': 'php:8.2-cli-alpine',
      'csharp': 'mcr.microsoft.com/dotnet/sdk:8.0-alpine',
      'cpp': 'gcc:13-alpine',
      'swift': 'swift:5.9-slim'
    };

    const imageName = imageMap[language] || 'ubuntu:22.04';
    
    try {
      // Check if image exists locally
      await docker.getImage(imageName).inspect();
      logger.info(`Using existing image: ${imageName}`);
    } catch (error) {
      // Pull image if not found
      logger.info(`Pulling image: ${imageName}`);
      const stream = await docker.pull(imageName);
      
      // Wait for pull to complete
      await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });
    }

    return imageName;
  }

  private async createProjectTar(files: File[]): Promise<Buffer> {
    const tarStream = tar.create({
      gzip: false
    });

    const entries: Array<{ name: string; content: string }> = [];
    
    for (const file of files) {
      if (!file.isFolder && file.content) {
        entries.push({
          name: file.name,
          content: file.content
        });
      }
    }

    // Create tar buffer
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      const pack = tar.pack();
      
      // Add each file to the tar
      for (const entry of entries) {
        pack.entry({ name: entry.name }, entry.content);
      }
      
      pack.finalize();
      
      pack.on('data', (chunk) => chunks.push(chunk));
      pack.on('end', () => resolve(Buffer.concat(chunks)));
      pack.on('error', reject);
    });
  }

  private getCommand(config: ExecutionConfig): string[] | undefined {
    if (config.command) {
      return config.command.split(' ');
    }

    // Default commands based on language
    const defaultCommands: Record<string, string[]> = {
      'nodejs': ['node', 'index.js'],
      'python': ['python', 'main.py'],
      'java': ['java', 'Main'],
      'go': ['go', 'run', '.'],
      'rust': ['cargo', 'run'],
      'ruby': ['ruby', 'main.rb'],
      'php': ['php', 'index.php'],
      'csharp': ['dotnet', 'run'],
      'cpp': ['./a.out']
    };

    return defaultCommands[config.language];
  }

  private formatEnvironmentVars(vars?: Record<string, string>): string[] {
    if (!vars) return [];
    return Object.entries(vars).map(([key, value]) => `${key}=${value}`);
  }

  private parseMemoryLimit(limit: string): number {
    const units: Record<string, number> = {
      'b': 1,
      'k': 1024,
      'm': 1024 * 1024,
      'g': 1024 * 1024 * 1024
    };

    const match = limit.match(/^(\d+)([bkmg])?$/i);
    if (!match) {
      throw new Error(`Invalid memory limit: ${limit}`);
    }

    const value = parseInt(match[1]);
    const unit = match[2]?.toLowerCase() || 'b';
    
    return value * (units[unit] || 1);
  }

  private async monitorContainer(
    containerId: string, 
    container: Docker.Container, 
    result: ExecutionResult
  ) {
    const statsStream = await container.stats({ stream: true });
    
    statsStream.on('data', (chunk) => {
      try {
        const stats = JSON.parse(chunk.toString());
        
        // Calculate CPU usage percentage
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - 
                        stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage - 
                           stats.precpu_stats.system_cpu_usage;
        const cpuUsage = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;

        // Calculate memory usage
        const memoryUsage = stats.memory_stats.usage / stats.memory_stats.limit * 100;

        // Network I/O
        const networkIO = {
          rx: stats.networks?.eth0?.rx_bytes || 0,
          tx: stats.networks?.eth0?.tx_bytes || 0
        };

        result.stats = {
          cpuUsage: Math.round(cpuUsage * 100) / 100,
          memoryUsage: Math.round(memoryUsage * 100) / 100,
          networkIO
        };

        this.emit('stats', { containerId, stats: result.stats });
      } catch (error) {
        logger.error(`Failed to parse container stats: ${error}`);
      }
    });

    // Monitor container status
    container.wait((err, data) => {
      if (err) {
        logger.error(`Container wait error: ${err}`);
        result.status = 'error';
      } else {
        result.status = 'stopped';
        result.exitCode = data.StatusCode;
      }
      
      // Clean up stats stream
      statsStream.destroy();
      
      // Remove from active containers
      this.activeContainers.delete(containerId);
      
      this.emit('stopped', { containerId, exitCode: result.exitCode });
    });
  }

  async stopContainer(containerId: string): Promise<void> {
    const containerData = this.activeContainers.get(containerId);
    if (!containerData) {
      throw new Error(`Container ${containerId} not found`);
    }

    try {
      await containerData.container.stop({ t: 5 });
      logger.info(`Container ${containerId} stopped`);
    } catch (error) {
      // Force kill if stop fails
      await containerData.container.kill();
      logger.warn(`Container ${containerId} force killed`);
    }
  }

  async getContainerLogs(containerId: string): Promise<string[]> {
    const containerData = this.activeContainers.get(containerId);
    if (!containerData) {
      throw new Error(`Container ${containerId} not found`);
    }

    const logs = await containerData.container.logs({
      stdout: true,
      stderr: true,
      timestamps: true
    });

    return logs.toString().split('\n').filter(line => line.trim());
  }

  async getContainerStatus(containerId: string): Promise<ExecutionResult | null> {
    const containerData = this.activeContainers.get(containerId);
    return containerData?.result || null;
  }

  async cleanup(): Promise<void> {
    logger.info('Cleaning up all containers...');
    
    for (const [containerId, data] of this.activeContainers) {
      try {
        await data.container.stop({ t: 0 });
        await data.container.remove();
      } catch (error) {
        logger.error(`Failed to cleanup container ${containerId}: ${error}`);
      }
    }
    
    this.activeContainers.clear();
  }

  async executeCommand(
    containerId: string, 
    command: string[]
  ): Promise<{ output: string; exitCode: number }> {
    const containerData = this.activeContainers.get(containerId);
    if (!containerData) {
      throw new Error(`Container ${containerId} not found`);
    }

    const exec = await containerData.container.exec({
      Cmd: command,
      AttachStdout: true,
      AttachStderr: true
    });

    const stream = await exec.start({ Detach: false });
    
    let output = '';
    stream.on('data', (chunk) => {
      output += chunk.toString();
    });

    await new Promise((resolve) => stream.on('end', resolve));
    
    const inspectResult = await exec.inspect();
    
    return {
      output,
      exitCode: inspectResult.ExitCode || 0
    };
  }
}

export const dockerExecutor = new DockerExecutor();