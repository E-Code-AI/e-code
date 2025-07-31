import { ECodeClient } from './client';
import { Secret } from './types';

export class SecretManager {
    constructor(private client: ECodeClient) {}

    /**
     * Add a secret to a project
     */
    async add(projectId: string, key: string, value: string): Promise<void> {
        return this.client.post(`/projects/${projectId}/secrets`, { key, value });
    }

    /**
     * List secrets for a project (values not included)
     */
    async list(projectId: string): Promise<Secret[]> {
        return this.client.get(`/projects/${projectId}/secrets`);
    }

    /**
     * Update a secret value
     */
    async update(projectId: string, key: string, value: string): Promise<void> {
        return this.client.patch(`/projects/${projectId}/secrets/${key}`, { value });
    }

    /**
     * Delete a secret
     */
    async delete(projectId: string, key: string): Promise<void> {
        return this.client.delete(`/projects/${projectId}/secrets/${key}`);
    }

    /**
     * Bulk add secrets
     */
    async bulkAdd(projectId: string, secrets: Record<string, string>): Promise<void> {
        const promises = Object.entries(secrets).map(([key, value]) => 
            this.add(projectId, key, value)
        );
        await Promise.all(promises);
    }

    /**
     * Import secrets from .env format
     */
    async importEnv(projectId: string, envContent: string): Promise<void> {
        const secrets: Record<string, string> = {};
        
        envContent.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key) {
                    secrets[key.trim()] = valueParts.join('=').trim();
                }
            }
        });
        
        return this.bulkAdd(projectId, secrets);
    }
}