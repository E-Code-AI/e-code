import { EventEmitter } from 'events';
import { WebClient as SlackWebClient } from '@slack/web-api';
import axios from 'axios';
import { db } from '../db';
import { projects, deployments } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface IntegrationConfig {
    id: string;
    projectId: number;
    type: 'slack' | 'discord';
    name: string;
    enabled: boolean;
    config: SlackConfig | DiscordConfig;
    events: NotificationEvent[];
    created: Date;
}

interface SlackConfig {
    accessToken: string;
    channelId: string;
    botUserId?: string;
    teamId?: string;
    teamName?: string;
}

interface DiscordConfig {
    webhookUrl: string;
    serverId?: string;
    channelId?: string;
    botToken?: string;
}

interface NotificationEvent {
    type: 'deployment' | 'build' | 'error' | 'collaboration' | 'security' | 'custom';
    enabled: boolean;
    customMessage?: string;
}

interface NotificationPayload {
    type: string;
    projectId: number;
    title: string;
    message: string;
    level: 'info' | 'warning' | 'error' | 'success';
    data?: any;
    timestamp: Date;
}

export class SlackDiscordService extends EventEmitter {
    private integrations: Map<string, IntegrationConfig> = new Map();
    private slackClients: Map<string, SlackWebClient> = new Map();

    constructor() {
        super();
        this.setupEventListeners();
    }

    async createIntegration(config: Omit<IntegrationConfig, 'id' | 'created'>): Promise<IntegrationConfig> {
        const integrationId = `int_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate configuration
        if (config.type === 'slack') {
            const slackConfig = config.config as SlackConfig;
            if (!slackConfig.accessToken || !slackConfig.channelId) {
                throw new Error('Slack access token and channel ID are required');
            }
            
            // Initialize Slack client
            const client = new SlackWebClient(slackConfig.accessToken);
            
            // Test connection
            try {
                const authTest = await client.auth.test();
                slackConfig.botUserId = authTest.user_id as string;
                slackConfig.teamId = authTest.team_id as string;
                slackConfig.teamName = authTest.team as string;
            } catch (error) {
                throw new Error('Failed to authenticate with Slack');
            }
            
            this.slackClients.set(integrationId, client);
        } else if (config.type === 'discord') {
            const discordConfig = config.config as DiscordConfig;
            if (!discordConfig.webhookUrl) {
                throw new Error('Discord webhook URL is required');
            }
            
            // Test webhook
            try {
                await this.testDiscordWebhook(discordConfig.webhookUrl);
            } catch (error) {
                throw new Error('Invalid Discord webhook URL');
            }
        }

        const integration: IntegrationConfig = {
            ...config,
            id: integrationId,
            created: new Date()
        };

        this.integrations.set(integrationId, integration);
        this.emit('integration:created', integration);
        
        return integration;
    }

    async updateIntegration(integrationId: string, updates: Partial<IntegrationConfig>): Promise<IntegrationConfig> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        const updated = { ...integration, ...updates };
        
        // Re-validate if config changed
        if (updates.config) {
            if (updated.type === 'slack') {
                const slackConfig = updated.config as SlackConfig;
                const client = new SlackWebClient(slackConfig.accessToken);
                
                try {
                    await client.auth.test();
                } catch (error) {
                    throw new Error('Failed to authenticate with updated Slack credentials');
                }
                
                this.slackClients.set(integrationId, client);
            } else if (updated.type === 'discord') {
                const discordConfig = updated.config as DiscordConfig;
                try {
                    await this.testDiscordWebhook(discordConfig.webhookUrl);
                } catch (error) {
                    throw new Error('Invalid Discord webhook URL');
                }
            }
        }

        this.integrations.set(integrationId, updated);
        this.emit('integration:updated', updated);
        
        return updated;
    }

    async deleteIntegration(integrationId: string): Promise<void> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        this.integrations.delete(integrationId);
        this.slackClients.delete(integrationId);
        
        this.emit('integration:deleted', integrationId);
    }

    async getIntegration(integrationId: string): Promise<IntegrationConfig | undefined> {
        return this.integrations.get(integrationId);
    }

    async listIntegrations(projectId?: number): Promise<IntegrationConfig[]> {
        const integrations = Array.from(this.integrations.values());
        
        if (projectId) {
            return integrations.filter(i => i.projectId === projectId);
        }
        
        return integrations;
    }

    async sendNotification(integrationId: string, payload: NotificationPayload): Promise<void> {
        const integration = this.integrations.get(integrationId);
        if (!integration || !integration.enabled) {
            return;
        }

        // Check if this event type is enabled
        const eventConfig = integration.events.find(e => e.type === payload.type);
        if (!eventConfig || !eventConfig.enabled) {
            return;
        }

        try {
            if (integration.type === 'slack') {
                await this.sendSlackNotification(integration, payload);
            } else if (integration.type === 'discord') {
                await this.sendDiscordNotification(integration, payload);
            }
            
            this.emit('notification:sent', { integrationId, payload });
        } catch (error) {
            this.emit('notification:failed', { integrationId, payload, error });
            throw error;
        }
    }

    private async sendSlackNotification(integration: IntegrationConfig, payload: NotificationPayload): Promise<void> {
        const client = this.slackClients.get(integration.id);
        if (!client) {
            throw new Error('Slack client not initialized');
        }

        const slackConfig = integration.config as SlackConfig;
        const color = this.getSlackColor(payload.level);
        
        const blocks = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: payload.title
                }
            },
            {
                type: 'section',
                text: {
                    type: 'mrkdwn',
                    text: payload.message
                }
            }
        ];

        // Add additional data fields
        if (payload.data) {
            const fields = Object.entries(payload.data).map(([key, value]) => ({
                type: 'mrkdwn',
                text: `*${this.formatFieldName(key)}:*\n${value}`
            }));

            if (fields.length > 0) {
                blocks.push({
                    type: 'section',
                    fields: fields.slice(0, 10) // Slack limit
                });
            }
        }

        // Add timestamp
        blocks.push({
            type: 'context',
            elements: [{
                type: 'mrkdwn',
                text: `<!date^${Math.floor(payload.timestamp.getTime() / 1000)}^{date_short_pretty} at {time}|${payload.timestamp.toISOString()}>`
            }]
        });

        await client.chat.postMessage({
            channel: slackConfig.channelId,
            attachments: [{
                color,
                blocks
            }]
        });
    }

    private async sendDiscordNotification(integration: IntegrationConfig, payload: NotificationPayload): Promise<void> {
        const discordConfig = integration.config as DiscordConfig;
        const color = this.getDiscordColor(payload.level);
        
        const embed = {
            title: payload.title,
            description: payload.message,
            color,
            timestamp: payload.timestamp.toISOString(),
            fields: [] as any[]
        };

        // Add additional data fields
        if (payload.data) {
            embed.fields = Object.entries(payload.data).slice(0, 25).map(([key, value]) => ({
                name: this.formatFieldName(key),
                value: String(value).substring(0, 1024),
                inline: true
            }));
        }

        await axios.post(discordConfig.webhookUrl, {
            embeds: [embed]
        });
    }

    async notifyDeployment(projectId: number, deployment: any, status: 'started' | 'completed' | 'failed'): Promise<void> {
        const integrations = await this.listIntegrations(projectId);
        
        const payload: NotificationPayload = {
            type: 'deployment',
            projectId,
            title: `Deployment ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Deployment ${deployment.id} ${status} for project ${projectId}`,
            level: status === 'failed' ? 'error' : status === 'started' ? 'info' : 'success',
            data: {
                deploymentId: deployment.id,
                version: deployment.version,
                environment: deployment.environment,
                url: deployment.url
            },
            timestamp: new Date()
        };

        for (const integration of integrations) {
            try {
                await this.sendNotification(integration.id, payload);
            } catch (error) {
                console.error(`Failed to send notification to ${integration.type}:`, error);
            }
        }
    }

    async notifyBuildStatus(projectId: number, buildId: string, status: 'started' | 'completed' | 'failed', details?: any): Promise<void> {
        const integrations = await this.listIntegrations(projectId);
        
        const payload: NotificationPayload = {
            type: 'build',
            projectId,
            title: `Build ${status.charAt(0).toUpperCase() + status.slice(1)}`,
            message: `Build ${buildId} ${status}`,
            level: status === 'failed' ? 'error' : status === 'started' ? 'info' : 'success',
            data: {
                buildId,
                ...details
            },
            timestamp: new Date()
        };

        for (const integration of integrations) {
            try {
                await this.sendNotification(integration.id, payload);
            } catch (error) {
                console.error(`Failed to send notification to ${integration.type}:`, error);
            }
        }
    }

    async notifyError(projectId: number, error: Error, context?: any): Promise<void> {
        const integrations = await this.listIntegrations(projectId);
        
        const payload: NotificationPayload = {
            type: 'error',
            projectId,
            title: 'Error Detected',
            message: error.message,
            level: 'error',
            data: {
                stack: error.stack,
                ...context
            },
            timestamp: new Date()
        };

        for (const integration of integrations) {
            try {
                await this.sendNotification(integration.id, payload);
            } catch (error) {
                console.error(`Failed to send notification to ${integration.type}:`, error);
            }
        }
    }

    async notifyCollaboration(projectId: number, action: string, user: string, details?: any): Promise<void> {
        const integrations = await this.listIntegrations(projectId);
        
        const payload: NotificationPayload = {
            type: 'collaboration',
            projectId,
            title: 'Collaboration Activity',
            message: `${user} ${action}`,
            level: 'info',
            data: details,
            timestamp: new Date()
        };

        for (const integration of integrations) {
            try {
                await this.sendNotification(integration.id, payload);
            } catch (error) {
                console.error(`Failed to send notification to ${integration.type}:`, error);
            }
        }
    }

    async notifySecurityAlert(projectId: number, alert: string, severity: 'low' | 'medium' | 'high' | 'critical', details?: any): Promise<void> {
        const integrations = await this.listIntegrations(projectId);
        
        const payload: NotificationPayload = {
            type: 'security',
            projectId,
            title: `Security Alert: ${severity.toUpperCase()}`,
            message: alert,
            level: severity === 'critical' || severity === 'high' ? 'error' : 'warning',
            data: details,
            timestamp: new Date()
        };

        for (const integration of integrations) {
            try {
                await this.sendNotification(integration.id, payload);
            } catch (error) {
                console.error(`Failed to send notification to ${integration.type}:`, error);
            }
        }
    }

    async testIntegration(integrationId: string): Promise<boolean> {
        const integration = this.integrations.get(integrationId);
        if (!integration) {
            throw new Error('Integration not found');
        }

        try {
            const testPayload: NotificationPayload = {
                type: 'custom',
                projectId: integration.projectId,
                title: 'Test Notification',
                message: 'This is a test notification from E-Code',
                level: 'info',
                data: {
                    integration: integration.type,
                    timestamp: new Date().toISOString()
                },
                timestamp: new Date()
            };

            await this.sendNotification(integrationId, testPayload);
            return true;
        } catch (error) {
            return false;
        }
    }

    private async testDiscordWebhook(webhookUrl: string): Promise<void> {
        const match = webhookUrl.match(/discord\.com\/api\/webhooks\/(\d+)\/(.+)/);
        if (!match) {
            throw new Error('Invalid Discord webhook URL format');
        }

        // Test with a simple GET request
        try {
            await axios.get(webhookUrl);
        } catch (error: any) {
            if (error.response?.status !== 405) { // 405 is expected for GET on webhook
                throw new Error('Invalid Discord webhook');
            }
        }
    }

    private getSlackColor(level: 'info' | 'warning' | 'error' | 'success'): string {
        switch (level) {
            case 'error': return '#ff0000';
            case 'warning': return '#ffaa00';
            case 'success': return '#00ff00';
            default: return '#0088cc';
        }
    }

    private getDiscordColor(level: 'info' | 'warning' | 'error' | 'success'): number {
        switch (level) {
            case 'error': return 0xff0000;
            case 'warning': return 0xffaa00;
            case 'success': return 0x00ff00;
            default: return 0x0088cc;
        }
    }

    private formatFieldName(key: string): string {
        return key
            .replace(/([A-Z])/g, ' $1')
            .replace(/^./, str => str.toUpperCase())
            .trim();
    }

    private setupEventListeners(): void {
        // Listen for system events and forward to integrations
        this.on('system:deployment', async (data) => {
            await this.notifyDeployment(data.projectId, data.deployment, data.status);
        });

        this.on('system:build', async (data) => {
            await this.notifyBuildStatus(data.projectId, data.buildId, data.status, data.details);
        });

        this.on('system:error', async (data) => {
            await this.notifyError(data.projectId, data.error, data.context);
        });

        this.on('system:collaboration', async (data) => {
            await this.notifyCollaboration(data.projectId, data.action, data.user, data.details);
        });

        this.on('system:security', async (data) => {
            await this.notifySecurityAlert(data.projectId, data.alert, data.severity, data.details);
        });
    }
}