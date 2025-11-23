/**
 * React Native Deployment Service
 * Handles project deployment from mobile app
 */

import { getApiUrl } from '../../../shared/config/env';

const API_BASE = getApiUrl();

export interface DeploymentConfig {
  projectId: string | number;
  environment: 'development' | 'staging' | 'production';
  strategy?: 'rolling' | 'blue-green' | 'canary';
  autoRollback?: boolean;
  healthCheckPath?: string;
  replicas?: number;
}

export interface Deployment {
  id: string;
  projectId: string | number;
  status: 'pending' | 'building' | 'deploying' | 'deployed' | 'failed' | 'rolled-back';
  environment: string;
  strategy: string;
  url?: string;
  createdAt: Date;
  updatedAt: Date;
  logs?: string[];
  error?: string;
}

/**
 * Deploy a project
 */
export async function deployProject(
  config: DeploymentConfig,
  token: string
): Promise<Deployment> {
  const response = await fetch(`${API_BASE}/api/deployments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to deploy project');
  }

  return await response.json();
}

/**
 * Get deployment status
 */
export async function getDeploymentStatus(
  deploymentId: string,
  token: string
): Promise<Deployment> {
  const response = await fetch(`${API_BASE}/api/deployments/${deploymentId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch deployment status');
  }

  return await response.json();
}

/**
 * Get all deployments for a project
 */
export async function getProjectDeployments(
  projectId: string | number,
  token: string
): Promise<Deployment[]> {
  const response = await fetch(`${API_BASE}/api/projects/${projectId}/deployments`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch deployments');
  }

  return await response.json();
}

/**
 * Cancel a deployment
 */
export async function cancelDeployment(
  deploymentId: string,
  token: string
): Promise<void> {
  const response = await fetch(`${API_BASE}/api/deployments/${deploymentId}/cancel`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to cancel deployment');
  }
}

/**
 * Rollback a deployment
 */
export async function rollbackDeployment(
  deploymentId: string,
  token: string
): Promise<Deployment> {
  const response = await fetch(`${API_BASE}/api/deployments/${deploymentId}/rollback`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to rollback deployment');
  }

  return await response.json();
}

/**
 * Get deployment logs (streaming)
 */
export async function* streamDeploymentLogs(
  deploymentId: string,
  token: string
): AsyncGenerator<string, void, unknown> {
  const response = await fetch(`${API_BASE}/api/deployments/${deploymentId}/logs`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'text/event-stream',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to stream deployment logs');
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Response body is not readable');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          yield line;
        }
      }
    }

    // Yield remaining buffer
    if (buffer.trim()) {
      yield buffer;
    }
  } finally {
    reader.releaseLock();
  }
}
