import { AxiosInstance } from 'axios';
import { DeploymentOptions, BuildResult, SearchResult, PaginationParams } from '../types';

export interface Deployment {
  id: string;
  name: string;
  projectId: number;
  type: 'static' | 'autoscale' | 'reserved' | 'serverless' | 'scheduled';
  status: 'building' | 'running' | 'stopped' | 'failed';
  url?: string;
  domain?: string;
  region: string;
  environment: Record<string, string>;
  resources?: {
    cpu: string;
    memory: string;
    disk: string;
  };
  scaling?: {
    minInstances: number;
    maxInstances: number;
    currentInstances: number;
  };
  metrics?: {
    requests: number;
    errors: number;
    latency: number;
    uptime: number;
  };
  createdAt: string;
  updatedAt: string;
  lastDeployedAt?: string;
}

export class DeploymentManager {
  constructor(private client: AxiosInstance) {}

  /**
   * Create a new deployment
   */
  async create(options: DeploymentOptions): Promise<Deployment> {
    const response = await this.client.post('/deployments', options);
    return response.data;
  }

  /**
   * Get deployment by ID
   */
  async get(id: string): Promise<Deployment> {
    const response = await this.client.get(`/deployments/${id}`);
    return response.data;
  }

  /**
   * List deployments
   */
  async list(params?: PaginationParams & {
    projectId?: number;
    status?: string;
    type?: string;
  }): Promise<SearchResult<Deployment>> {
    const response = await this.client.get('/deployments', { params });
    return response.data;
  }

  /**
   * Update deployment configuration
   */
  async update(id: string, updates: Partial<DeploymentOptions>): Promise<Deployment> {
    const response = await this.client.put(`/deployments/${id}`, updates);
    return response.data;
  }

  /**
   * Delete a deployment
   */
  async delete(id: string): Promise<void> {
    await this.client.delete(`/deployments/${id}`);
  }

  /**
   * Deploy/redeploy a project
   */
  async deploy(id: string): Promise<BuildResult> {
    const response = await this.client.post(`/deployments/${id}/deploy`);
    return response.data;
  }

  /**
   * Stop a deployment
   */
  async stop(id: string): Promise<void> {
    await this.client.post(`/deployments/${id}/stop`);
  }

  /**
   * Start a stopped deployment
   */
  async start(id: string): Promise<void> {
    await this.client.post(`/deployments/${id}/start`);
  }

  /**
   * Restart a deployment
   */
  async restart(id: string): Promise<void> {
    await this.client.post(`/deployments/${id}/restart`);
  }

  /**
   * Get deployment logs
   */
  async getLogs(id: string, params?: {
    since?: string;
    until?: string;
    limit?: number;
    follow?: boolean;
  }): Promise<{
    logs: {
      timestamp: string;
      level: string;
      message: string;
      source: string;
    }[];
    hasMore: boolean;
  }> {
    const response = await this.client.get(`/deployments/${id}/logs`, { params });
    return response.data;
  }

  /**
   * Get deployment metrics
   */
  async getMetrics(id: string, params?: {
    from?: string;
    to?: string;
    resolution?: string;
  }): Promise<{
    requests: { timestamp: string; value: number }[];
    errors: { timestamp: string; value: number }[];
    latency: { timestamp: string; value: number }[];
    cpu: { timestamp: string; value: number }[];
    memory: { timestamp: string; value: number }[];
  }> {
    const response = await this.client.get(`/deployments/${id}/metrics`, { params });
    return response.data;
  }

  /**
   * Scale a deployment
   */
  async scale(id: string, instances: number): Promise<void> {
    await this.client.post(`/deployments/${id}/scale`, { instances });
  }

  /**
   * Configure auto-scaling
   */
  async configureAutoScaling(id: string, config: {
    minInstances: number;
    maxInstances: number;
    targetCPU?: number;
    targetMemory?: number;
    scaleUpCooldown?: number;
    scaleDownCooldown?: number;
  }): Promise<void> {
    await this.client.put(`/deployments/${id}/autoscaling`, config);
  }

  /**
   * Set environment variables
   */
  async setEnvironment(id: string, variables: Record<string, string>): Promise<void> {
    await this.client.put(`/deployments/${id}/environment`, { variables });
  }

  /**
   * Configure custom domain
   */
  async setDomain(id: string, domain: string, ssl?: boolean): Promise<{
    domain: string;
    status: 'pending' | 'active' | 'failed';
    sslStatus?: 'pending' | 'active' | 'failed';
    dnsRecords: {
      type: string;
      name: string;
      value: string;
    }[];
  }> {
    const response = await this.client.post(`/deployments/${id}/domain`, { domain, ssl });
    return response.data;
  }

  /**
   * Remove custom domain
   */
  async removeDomain(id: string): Promise<void> {
    await this.client.delete(`/deployments/${id}/domain`);
  }

  /**
   * Get deployment status
   */
  async getStatus(id: string): Promise<{
    status: string;
    health: 'healthy' | 'unhealthy' | 'unknown';
    uptime: number;
    version: string;
    instances: {
      id: string;
      status: string;
      region: string;
      cpu: number;
      memory: number;
    }[];
  }> {
    const response = await this.client.get(`/deployments/${id}/status`);
    return response.data;
  }

  /**
   * Get build history
   */
  async getBuildHistory(id: string, params?: PaginationParams): Promise<SearchResult<BuildResult>> {
    const response = await this.client.get(`/deployments/${id}/builds`, { params });
    return response.data;
  }

  /**
   * Rollback to previous version
   */
  async rollback(id: string, buildId?: string): Promise<BuildResult> {
    const response = await this.client.post(`/deployments/${id}/rollback`, { buildId });
    return response.data;
  }

  /**
   * Enable/disable deployment
   */
  async setEnabled(id: string, enabled: boolean): Promise<void> {
    await this.client.put(`/deployments/${id}/enabled`, { enabled });
  }

  /**
   * Get available regions
   */
  async getRegions(): Promise<{
    id: string;
    name: string;
    location: string;
    availability: 'available' | 'limited' | 'unavailable';
    latency?: number;
  }[]> {
    const response = await this.client.get('/deployments/regions');
    return response.data;
  }

  /**
   * Get deployment pricing
   */
  async getPricing(type: string, region?: string): Promise<{
    type: string;
    region: string;
    pricing: {
      compute: { unit: string; price: number };
      storage: { unit: string; price: number };
      bandwidth: { unit: string; price: number };
    };
    estimatedMonthlyCost: number;
  }> {
    const response = await this.client.get('/deployments/pricing', {
      params: { type, region }
    });
    return response.data;
  }
}