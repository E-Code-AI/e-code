// @ts-nocheck
/**
 * Polyglot Container Proxy - Routes container operations to Go service
 * This replaces the TypeScript container manager with Go-based operations
 */

import axios from 'axios';
import { createLogger } from '../utils/logger';

const logger = createLogger('polyglot-container');

const GO_SERVICE_URL = process.env.GO_RUNTIME_URL || 'http://localhost:8080';

export interface ContainerConfig {
  projectId: string;
  language: string;
  command?: string[];
  env?: Record<string, string>;
  ports?: number[];
}

export interface ContainerResult {
  containerId: string;
  status: string;
  ports?: Record<string, string>;
  logs: string[];
  error?: string;
}

class PolyglotContainerProxy {
  /**
   * Create container - delegated to Go service for performance
   */
  async createContainer(config: ContainerConfig): Promise<ContainerResult> {
    try {
      logger.info(`[POLYGLOT] Creating container via Go service for project ${config.projectId}`);
      
      const response = await axios.post(`${GO_SERVICE_URL}/api/containers`, {
        image: `e-code/${config.language}:latest`,
        command: config.command || [],
        env: config.env || {},
        ports: config.ports || [],
        projectId: config.projectId
      });

      return {
        containerId: response.data.id,
        status: response.data.status,
        ports: response.data.ports,
        logs: response.data.logs || []
      };
    } catch (error: any) {
      logger.error(`[POLYGLOT] Container creation failed: ${error.message}`);
      throw new Error(`Failed to create container: ${error.message}`);
    }
  }

  /**
   * Stop container - delegated to Go service
   */
  async stopContainer(containerId: string): Promise<void> {
    try {
      await axios.post(`${GO_SERVICE_URL}/api/containers/${containerId}/stop`);
      logger.info(`[POLYGLOT] Container ${containerId} stopped via Go service`);
    } catch (error: any) {
      logger.error(`[POLYGLOT] Failed to stop container: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get container logs - streamed from Go service
   */
  async getContainerLogs(containerId: string): Promise<string[]> {
    try {
      const response = await axios.get(`${GO_SERVICE_URL}/api/containers/${containerId}`);
      return response.data.logs || [];
    } catch (error: any) {
      logger.error(`[POLYGLOT] Failed to get container logs: ${error.message}`);
      return [];
    }
  }

  /**
   * List all containers - from Go service
   */
  async listContainers(): Promise<any[]> {
    try {
      const response = await axios.get(`${GO_SERVICE_URL}/api/containers`);
      return response.data.containers || [];
    } catch (error: any) {
      logger.error(`[POLYGLOT] Failed to list containers: ${error.message}`);
      return [];
    }
  }

  /**
   * Execute command in container - via Go service
   */
  async executeInContainer(containerId: string, command: string): Promise<string> {
    try {
      const response = await axios.post(`${GO_SERVICE_URL}/api/containers/${containerId}/exec`, {
        command
      });
      return response.data.output;
    } catch (error: any) {
      logger.error(`[POLYGLOT] Failed to execute command: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build project - delegated to Go for faster builds
   */
  async buildProject(projectId: string, language: string, files: any[]): Promise<any> {
    try {
      logger.info(`[POLYGLOT] Building project ${projectId} via Go service`);
      
      const response = await axios.post(`${GO_SERVICE_URL}/api/build`, {
        projectId,
        language,
        files
      });

      return response.data;
    } catch (error: any) {
      logger.error(`[POLYGLOT] Build failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch file operations - delegated to Go for performance
   */
  async batchFileOperations(operations: any[]): Promise<any> {
    try {
      const response = await axios.post(`${GO_SERVICE_URL}/api/files/batch`, {
        operations
      });
      return response.data;
    } catch (error: any) {
      logger.error(`[POLYGLOT] Batch file operations failed: ${error.message}`);
      throw error;
    }
  }
}

// Export singleton instance
export const containerProxy = new PolyglotContainerProxy();

// Replace the old createContainer function with Go-based implementation
export async function createContainer(config: ContainerConfig): Promise<ContainerResult> {
  return containerProxy.createContainer(config);
}

// Replace the old stopContainer function
export async function stopContainer(containerId: string): Promise<void> {
  return containerProxy.stopContainer(containerId);
}

// Export other functions for backward compatibility
export const getContainerLogs = (id: string) => containerProxy.getContainerLogs(id);
export const listContainers = () => containerProxy.listContainers();
export const executeInContainer = (id: string, cmd: string) => containerProxy.executeInContainer(id, cmd);
export const buildProject = (id: string, lang: string, files: any[]) => containerProxy.buildProject(id, lang, files);