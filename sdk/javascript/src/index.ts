import { ECodeClient } from './client';
import { ProjectManager } from './projects';
import { DeploymentManager } from './deployments';
import { AIAssistant } from './ai';
import { RealtimeCollaboration } from './realtime';
import { SecretManager } from './secrets';
import { PackageManager } from './packages';
import { AnalyticsTracker } from './analytics';
import { WebhookManager } from './webhooks';

export interface ECodeConfig {
    apiKey?: string;
    baseUrl?: string;
    websocketUrl?: string;
}

export class ECode {
    public client: ECodeClient;
    public projects: ProjectManager;
    public deployments: DeploymentManager;
    public ai: AIAssistant;
    public realtime: RealtimeCollaboration;
    public secrets: SecretManager;
    public packages: PackageManager;
    public analytics: AnalyticsTracker;
    public webhooks: WebhookManager;

    constructor(config: ECodeConfig = {}) {
        this.client = new ECodeClient({
            apiKey: config.apiKey || process.env.ECODE_API_KEY || '',
            baseUrl: config.baseUrl || 'https://e-code.app'
        });

        // Initialize managers
        this.projects = new ProjectManager(this.client);
        this.deployments = new DeploymentManager(this.client);
        this.ai = new AIAssistant(this.client);
        this.realtime = new RealtimeCollaboration(this.client, config.websocketUrl);
        this.secrets = new SecretManager(this.client);
        this.packages = new PackageManager(this.client);
        this.analytics = new AnalyticsTracker(this.client);
        this.webhooks = new WebhookManager(this.client);
    }

    /**
     * Authenticate with username and password
     */
    async login(username: string, password: string): Promise<void> {
        const response = await this.client.post('/cli/login', { username, password });
        this.client.setApiKey(response.data.token);
    }

    /**
     * Set API key for authenticated requests
     */
    setApiKey(apiKey: string): void {
        this.client.setApiKey(apiKey);
    }

    /**
     * Get current user information
     */
    async getCurrentUser() {
        return this.client.get('/user');
    }

    /**
     * Quick start: Create and deploy a project
     */
    async quickStart(name: string, template: string = 'nodejs') {
        // Create project
        const project = await this.projects.create({
            name,
            template,
            visibility: 'private'
        });

        // Deploy it
        const deployment = await this.deployments.deploy(project.id);

        return {
            project,
            deployment,
            url: deployment.url
        };
    }
}

// Export types
export * from './types';
export * from './client';
export * from './projects';
export * from './deployments';
export * from './ai';
export * from './realtime';
export * from './secrets';
export * from './packages';
export * from './analytics';
export * from './webhooks';

// Default export
export default ECode;