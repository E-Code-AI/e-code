import { ECodeClient } from './client';
import { Package } from './types';

export class PackageManager {
    constructor(private client: ECodeClient) {}

    /**
     * Install packages in a project
     */
    async install(projectId: string, packages: string[]): Promise<void> {
        return this.client.post(`/projects/${projectId}/packages`, {
            dependencies: packages
        });
    }

    /**
     * List installed packages
     */
    async list(projectId: string): Promise<Package[]> {
        return this.client.get(`/projects/${projectId}/packages`);
    }

    /**
     * Update packages
     */
    async update(projectId: string, packages: string[]): Promise<void> {
        return this.client.patch(`/projects/${projectId}/packages`, {
            dependencies: packages
        });
    }

    /**
     * Remove packages
     */
    async remove(projectId: string, packages: string[]): Promise<void> {
        return this.client.delete(`/projects/${projectId}/packages`, {
            data: { dependencies: packages }
        });
    }

    /**
     * Search for packages
     */
    async search(query: string): Promise<any[]> {
        return this.client.get('/packages/search', {
            params: { q: query }
        });
    }

    /**
     * Get package info
     */
    async getInfo(packageName: string) {
        return this.client.get(`/packages/info/${packageName}`);
    }

    /**
     * Check for outdated packages
     */
    async checkOutdated(projectId: string) {
        return this.client.get(`/projects/${projectId}/packages/outdated`);
    }

    /**
     * Update all packages to latest
     */
    async updateAll(projectId: string): Promise<void> {
        return this.client.post(`/projects/${projectId}/packages/update-all`);
    }
}