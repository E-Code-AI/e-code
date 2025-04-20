/**
 * Runtime health monitoring
 * This module provides health checks and monitoring for language runtimes
 */

import * as http from 'http';
import { execSync } from 'child_process';
import { createLogger } from '../utils/logger';
import * as containerManager from './container-manager';
import * as nixManager from './nix-manager';

const logger = createLogger('runtime-health');

/**
 * Check if a container is healthy by checking if it responds to HTTP requests
 */
export async function checkContainerHealth(containerId: string, port: number): Promise<{
  healthy: boolean;
  responseTime?: number;
  error?: string;
}> {
  try {
    logger.info(`Checking health of container ${containerId} on port ${port}`);
    
    // First check if container is still running
    const containerStatus = containerManager.getContainerStatus(containerId);
    
    if (containerStatus.status !== 'running') {
      logger.warn(`Container ${containerId} is not running (status: ${containerStatus.status})`);
      return {
        healthy: false,
        error: `Container is ${containerStatus.status}`
      };
    }
    
    // Try to connect to the container's port
    return new Promise((resolve) => {
      const startTime = Date.now();
      const req = http.request({
        hostname: 'localhost',
        port,
        path: '/',
        method: 'HEAD',
        timeout: 5000 // 5 second timeout
      }, (res) => {
        const responseTime = Date.now() - startTime;
        logger.info(`Container ${containerId} responded with status ${res.statusCode} in ${responseTime}ms`);
        
        // Any response is considered healthy
        resolve({
          healthy: true,
          responseTime
        });
      });
      
      req.on('error', (error) => {
        logger.warn(`Health check failed for container ${containerId}: ${error.message}`);
        resolve({
          healthy: false,
          error: error.message
        });
      });
      
      req.on('timeout', () => {
        logger.warn(`Health check timed out for container ${containerId}`);
        req.destroy();
        resolve({
          healthy: false,
          error: 'Connection timed out'
        });
      });
      
      req.end();
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error(`Error checking container health: ${errorMessage}`);
    
    return {
      healthy: false,
      error: errorMessage
    };
  }
}

/**
 * Check system-wide dependencies for language runtimes
 */
export async function checkSystemDependencies(): Promise<{
  docker: boolean;
  nix: boolean;
  languages: {
    [language: string]: boolean;
  };
}> {
  logger.info('Checking system dependencies for language runtimes');
  
  // Check Docker and Nix availability
  const [dockerAvailable, nixAvailable] = await Promise.all([
    containerManager.checkDockerAvailability(),
    nixManager.checkNixAvailability()
  ]);
  
  // Check common language interpreters/compilers
  const languages: {[language: string]: boolean} = {};
  
  const languageCommands = {
    nodejs: 'node --version',
    python: 'python --version',
    python3: 'python3 --version',
    java: 'java -version',
    go: 'go version',
    ruby: 'ruby --version',
    rust: 'rustc --version',
    php: 'php --version',
    gcc: 'gcc --version',
    dotnet: 'dotnet --version',
    swift: 'swift --version',
    kotlin: 'kotlin -version',
    dart: 'dart --version',
    typescript: 'tsc --version',
    bash: 'bash --version',
    deno: 'deno --version'
  };
  
  // Check each language
  for (const [language, command] of Object.entries(languageCommands)) {
    try {
      execSync(command, { stdio: 'ignore' });
      languages[language] = true;
    } catch (error) {
      languages[language] = false;
    }
  }
  
  return {
    docker: dockerAvailable,
    nix: nixAvailable,
    languages
  };
}

/**
 * Get health status of all active containers
 */
export async function getHealthStatus(activeContainers: Map<string, {
  port?: number;
  status: string;
}>): Promise<{
  [containerId: string]: {
    healthy: boolean;
    responseTime?: number;
    error?: string;
    status: string;
  };
}> {
  const healthStatus: {
    [containerId: string]: {
      healthy: boolean;
      responseTime?: number;
      error?: string;
      status: string;
    };
  } = {};
  
  // Check health of each container
  for (const [containerId, containerInfo] of activeContainers.entries()) {
    if (containerInfo.status === 'running' && containerInfo.port) {
      const health = await checkContainerHealth(containerId, containerInfo.port);
      
      healthStatus[containerId] = {
        ...health,
        status: containerInfo.status
      };
    } else {
      healthStatus[containerId] = {
        healthy: false,
        status: containerInfo.status,
        error: `Container is ${containerInfo.status}`
      };
    }
  }
  
  return healthStatus;
}