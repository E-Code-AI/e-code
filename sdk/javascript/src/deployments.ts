import { ECodeClient } from './client';
import { Deployment, DeploymentOptions } from './types';

export class DeploymentManager {
    constructor(private client: ECodeClient) {}

    /**
     * Deploy a project
     */
    async deploy(projectId: string, options: DeploymentOptions = {}): Promise<Deployment> {
        return this.client.post(`/projects/${projectId}/deploy`, options);
    }

    /**
     * Get deployment status
     */
    async getStatus(deploymentId: string) {
        return this.client.get(`/deployments/${deploymentId}/status`);
    }

    /**
     * List deployments for a project
     */
    async list(projectId: string): Promise<Deployment[]> {
        return this.client.get(`/projects/${projectId}/deployments`);
    }

    /**
     * Get deployment logs
     */
    async getLogs(deploymentId: string, lines: number = 100) {
        return this.client.get(`/deployments/${deploymentId}/logs`, {
            params: { lines }
        });
    }

    /**
     * Rollback to previous deployment
     */
    async rollback(deploymentId: string): Promise<Deployment> {
        return this.client.post(`/deployments/${deploymentId}/rollback`);
    }

    /**
     * Stop a deployment
     */
    async stop(deploymentId: string): Promise<void> {
        return this.client.post(`/deployments/${deploymentId}/stop`);
    }

    /**
     * Scale deployment
     */
    async scale(deploymentId: string, instances: number): Promise<void> {
        return this.client.post(`/deployments/${deploymentId}/scale`, { instances });
    }

    /**
     * Update deployment environment variables
     */
    async updateEnv(deploymentId: string, env: Record<string, string>): Promise<void> {
        return this.client.patch(`/deployments/${deploymentId}/env`, { env });
    }

    /**
     * Get deployment metrics
     */
    async getMetrics(deploymentId: string) {
        return this.client.get(`/deployments/${deploymentId}/metrics`);
    }

    /**
     * Create custom domain
     */
    async addDomain(deploymentId: string, domain: string) {
        return this.client.post(`/deployments/${deploymentId}/domains`, { domain });
    }

    /**
     * Remove custom domain
     */
    async removeDomain(deploymentId: string, domain: string) {
        return this.client.delete(`/deployments/${deploymentId}/domains/${domain}`);
    }
}