import { EventEmitter } from 'events';
import axios from 'axios';
import crypto from 'crypto';
import { db } from '../db';
import { projects } from '@shared/schema';
import { eq } from 'drizzle-orm';

interface Webhook {
    id: string;
    projectId: number;
    name: string;
    url: string;
    secret?: string;
    events: WebhookEvent[];
    headers?: Record<string, string>;
    active: boolean;
    retryConfig: RetryConfig;
    created: Date;
    lastTriggered?: Date;
    failureCount: number;
}

interface WebhookEvent {
    type: string;
    enabled: boolean;
}

interface RetryConfig {
    maxRetries: number;
    retryDelay: number; // milliseconds
    backoffMultiplier: number;
    maxRetryDelay: number;
}

interface WebhookPayload {
    id: string;
    timestamp: string;
    event: string;
    projectId: number;
    data: any;
    signature?: string;
}

interface WebhookDelivery {
    id: string;
    webhookId: string;
    payload: WebhookPayload;
    status: 'pending' | 'success' | 'failed';
    attempts: number;
    lastAttempt?: Date;
    response?: {
        status: number;
        statusText: string;
        data?: any;
    };
    error?: string;
    created: Date;
}

// Predefined event types that can trigger webhooks
export const WEBHOOK_EVENTS = {
    // Project events
    PROJECT_CREATED: 'project.created',
    PROJECT_UPDATED: 'project.updated',
    PROJECT_DELETED: 'project.deleted',
    PROJECT_FORKED: 'project.forked',
    
    // File events
    FILE_CREATED: 'file.created',
    FILE_UPDATED: 'file.updated',
    FILE_DELETED: 'file.deleted',
    FILE_RENAMED: 'file.renamed',
    
    // Deployment events
    DEPLOYMENT_CREATED: 'deployment.created',
    DEPLOYMENT_STARTED: 'deployment.started',
    DEPLOYMENT_COMPLETED: 'deployment.completed',
    DEPLOYMENT_FAILED: 'deployment.failed',
    DEPLOYMENT_ROLLED_BACK: 'deployment.rolled_back',
    
    // Build events
    BUILD_STARTED: 'build.started',
    BUILD_COMPLETED: 'build.completed',
    BUILD_FAILED: 'build.failed',
    
    // Collaboration events
    COLLABORATOR_ADDED: 'collaborator.added',
    COLLABORATOR_REMOVED: 'collaborator.removed',
    COLLABORATOR_JOINED: 'collaborator.joined',
    COLLABORATOR_LEFT: 'collaborator.left',
    
    // Terminal events
    TERMINAL_COMMAND_EXECUTED: 'terminal.command_executed',
    TERMINAL_SESSION_STARTED: 'terminal.session_started',
    TERMINAL_SESSION_ENDED: 'terminal.session_ended',
    
    // AI events
    AI_QUERY_MADE: 'ai.query_made',
    AI_CODE_GENERATED: 'ai.code_generated',
    AI_ACTION_PERFORMED: 'ai.action_performed',
    
    // Security events
    SECURITY_SCAN_COMPLETED: 'security.scan_completed',
    SECURITY_ISSUE_FOUND: 'security.issue_found',
    SECURITY_ISSUE_RESOLVED: 'security.issue_resolved',
    
    // Error events
    ERROR_OCCURRED: 'error.occurred',
    ERROR_RATE_THRESHOLD: 'error.rate_threshold',
    
    // Custom events
    CUSTOM_EVENT: 'custom.event'
} as const;

export class WebhookService extends EventEmitter {
    private webhooks: Map<string, Webhook> = new Map();
    private deliveries: Map<string, WebhookDelivery[]> = new Map();
    private retryQueue: Map<string, NodeJS.Timeout> = new Map();

    constructor() {
        super();
        this.setupEventListeners();
    }

    async createWebhook(config: Omit<Webhook, 'id' | 'created' | 'failureCount'>): Promise<Webhook> {
        const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate URL
        try {
            new URL(config.url);
        } catch (error) {
            throw new Error('Invalid webhook URL');
        }

        // Test webhook connectivity if active
        if (config.active) {
            await this.testWebhook(config.url, config.headers, config.secret);
        }

        const webhook: Webhook = {
            ...config,
            id: webhookId,
            created: new Date(),
            failureCount: 0
        };

        this.webhooks.set(webhookId, webhook);
        this.deliveries.set(webhookId, []);
        
        this.emit('webhook:created', webhook);
        
        return webhook;
    }

    async updateWebhook(webhookId: string, updates: Partial<Webhook>): Promise<Webhook> {
        const webhook = this.webhooks.get(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }

        // Validate URL if being updated
        if (updates.url) {
            try {
                new URL(updates.url);
            } catch (error) {
                throw new Error('Invalid webhook URL');
            }
        }

        const updated = { ...webhook, ...updates };
        
        // Test webhook if URL or headers changed and webhook is active
        if ((updates.url || updates.headers) && updated.active) {
            await this.testWebhook(updated.url, updated.headers, updated.secret);
        }

        this.webhooks.set(webhookId, updated);
        this.emit('webhook:updated', updated);
        
        return updated;
    }

    async deleteWebhook(webhookId: string): Promise<void> {
        const webhook = this.webhooks.get(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }

        // Cancel any pending retries
        const retryTimer = this.retryQueue.get(webhookId);
        if (retryTimer) {
            clearTimeout(retryTimer);
            this.retryQueue.delete(webhookId);
        }

        this.webhooks.delete(webhookId);
        this.deliveries.delete(webhookId);
        
        this.emit('webhook:deleted', webhookId);
    }

    async getWebhook(webhookId: string): Promise<Webhook | undefined> {
        return this.webhooks.get(webhookId);
    }

    async listWebhooks(projectId?: number): Promise<Webhook[]> {
        const webhooks = Array.from(this.webhooks.values());
        
        if (projectId) {
            return webhooks.filter(w => w.projectId === projectId);
        }
        
        return webhooks;
    }

    async triggerWebhook(event: string, projectId: number, data: any): Promise<void> {
        const webhooks = await this.listWebhooks(projectId);
        
        for (const webhook of webhooks) {
            if (!webhook.active) continue;
            
            const eventConfig = webhook.events.find(e => e.type === event);
            if (!eventConfig || !eventConfig.enabled) continue;
            
            const payload: WebhookPayload = {
                id: `whp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date().toISOString(),
                event,
                projectId,
                data
            };
            
            // Generate signature if secret is configured
            if (webhook.secret) {
                payload.signature = this.generateSignature(payload, webhook.secret);
            }
            
            await this.deliverWebhook(webhook, payload);
        }
    }

    async deliverWebhook(webhook: Webhook, payload: WebhookPayload): Promise<void> {
        const delivery: WebhookDelivery = {
            id: `whd_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            webhookId: webhook.id,
            payload,
            status: 'pending',
            attempts: 0,
            created: new Date()
        };

        const deliveries = this.deliveries.get(webhook.id) || [];
        deliveries.push(delivery);
        
        // Keep only last 100 deliveries
        if (deliveries.length > 100) {
            deliveries.shift();
        }
        
        this.deliveries.set(webhook.id, deliveries);
        
        await this.attemptDelivery(webhook, delivery);
    }

    private async attemptDelivery(webhook: Webhook, delivery: WebhookDelivery): Promise<void> {
        delivery.attempts++;
        delivery.lastAttempt = new Date();

        try {
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'X-E-Code-Event': delivery.payload.event,
                'X-E-Code-Delivery': delivery.id,
                'X-E-Code-Timestamp': delivery.payload.timestamp,
                ...webhook.headers
            };

            if (webhook.secret) {
                headers['X-E-Code-Signature'] = delivery.payload.signature!;
            }

            const response = await axios.post(webhook.url, delivery.payload, {
                headers,
                timeout: 30000, // 30 seconds
                validateStatus: () => true // Accept any status
            });

            delivery.response = {
                status: response.status,
                statusText: response.statusText,
                data: response.data
            };

            if (response.status >= 200 && response.status < 300) {
                delivery.status = 'success';
                
                // Reset failure count on success
                webhook.failureCount = 0;
                webhook.lastTriggered = new Date();
                this.webhooks.set(webhook.id, webhook);
                
                this.emit('webhook:delivered', { webhook, delivery });
            } else {
                delivery.status = 'failed';
                delivery.error = `HTTP ${response.status}: ${response.statusText}`;
                
                await this.handleFailedDelivery(webhook, delivery);
            }
        } catch (error: any) {
            delivery.status = 'failed';
            delivery.error = error.message;
            
            await this.handleFailedDelivery(webhook, delivery);
        }
    }

    private async handleFailedDelivery(webhook: Webhook, delivery: WebhookDelivery): Promise<void> {
        webhook.failureCount++;
        this.webhooks.set(webhook.id, webhook);
        
        this.emit('webhook:failed', { webhook, delivery });
        
        // Check if we should retry
        if (delivery.attempts < webhook.retryConfig.maxRetries) {
            const retryDelay = Math.min(
                webhook.retryConfig.retryDelay * Math.pow(webhook.retryConfig.backoffMultiplier, delivery.attempts - 1),
                webhook.retryConfig.maxRetryDelay
            );
            
            const retryTimer = setTimeout(() => {
                this.attemptDelivery(webhook, delivery);
                this.retryQueue.delete(delivery.id);
            }, retryDelay);
            
            this.retryQueue.set(delivery.id, retryTimer);
        } else {
            // Max retries reached, check if webhook should be disabled
            if (webhook.failureCount >= 10) {
                webhook.active = false;
                this.webhooks.set(webhook.id, webhook);
                this.emit('webhook:disabled', webhook);
            }
        }
    }

    async getDeliveries(webhookId: string, limit: number = 50): Promise<WebhookDelivery[]> {
        const deliveries = this.deliveries.get(webhookId) || [];
        return deliveries.slice(-limit);
    }

    async retryDelivery(webhookId: string, deliveryId: string): Promise<void> {
        const webhook = this.webhooks.get(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }

        const deliveries = this.deliveries.get(webhookId) || [];
        const delivery = deliveries.find(d => d.id === deliveryId);
        
        if (!delivery) {
            throw new Error('Delivery not found');
        }

        // Reset delivery for retry
        delivery.attempts = 0;
        delivery.status = 'pending';
        
        await this.attemptDelivery(webhook, delivery);
    }

    async testWebhook(url: string, headers?: Record<string, string>, secret?: string): Promise<void> {
        const testPayload: WebhookPayload = {
            id: 'test',
            timestamp: new Date().toISOString(),
            event: 'webhook.test',
            projectId: 0,
            data: {
                message: 'This is a test webhook from E-Code'
            }
        };

        if (secret) {
            testPayload.signature = this.generateSignature(testPayload, secret);
        }

        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            'X-E-Code-Event': 'webhook.test',
            'X-E-Code-Delivery': 'test',
            'X-E-Code-Timestamp': testPayload.timestamp,
            ...headers
        };

        if (secret) {
            requestHeaders['X-E-Code-Signature'] = testPayload.signature!;
        }

        try {
            const response = await axios.post(url, testPayload, {
                headers: requestHeaders,
                timeout: 10000,
                validateStatus: () => true
            });

            if (response.status < 200 || response.status >= 300) {
                throw new Error(`Webhook test failed with status ${response.status}`);
            }
        } catch (error: any) {
            throw new Error(`Webhook test failed: ${error.message}`);
        }
    }

    private generateSignature(payload: WebhookPayload, secret: string): string {
        const data = JSON.stringify(payload);
        return crypto.createHmac('sha256', secret).update(data).digest('hex');
    }

    verifySignature(payload: any, signature: string, secret: string): boolean {
        const expectedSignature = this.generateSignature(payload, secret);
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }

    // Event emitters for different webhook triggers
    async emitProjectCreated(projectId: number, project: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.PROJECT_CREATED, projectId, { project });
    }

    async emitProjectUpdated(projectId: number, project: any, changes: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.PROJECT_UPDATED, projectId, { project, changes });
    }

    async emitFileCreated(projectId: number, file: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.FILE_CREATED, projectId, { file });
    }

    async emitFileUpdated(projectId: number, file: any, previousContent?: string): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.FILE_UPDATED, projectId, { file, previousContent });
    }

    async emitDeploymentStarted(projectId: number, deployment: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.DEPLOYMENT_STARTED, projectId, { deployment });
    }

    async emitDeploymentCompleted(projectId: number, deployment: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.DEPLOYMENT_COMPLETED, projectId, { deployment });
    }

    async emitDeploymentFailed(projectId: number, deployment: any, error: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.DEPLOYMENT_FAILED, projectId, { deployment, error });
    }

    async emitBuildStarted(projectId: number, build: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.BUILD_STARTED, projectId, { build });
    }

    async emitBuildCompleted(projectId: number, build: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.BUILD_COMPLETED, projectId, { build });
    }

    async emitBuildFailed(projectId: number, build: any, error: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.BUILD_FAILED, projectId, { build, error });
    }

    async emitSecurityScanCompleted(projectId: number, scan: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.SECURITY_SCAN_COMPLETED, projectId, { scan });
    }

    async emitErrorOccurred(projectId: number, error: any, context: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.ERROR_OCCURRED, projectId, { error, context });
    }

    async emitCustomEvent(projectId: number, eventName: string, data: any): Promise<void> {
        await this.triggerWebhook(WEBHOOK_EVENTS.CUSTOM_EVENT, projectId, { eventName, data });
    }

    private setupEventListeners(): void {
        // Set up internal event listeners that can be triggered by other services
        this.on('trigger:webhook', async ({ event, projectId, data }) => {
            await this.triggerWebhook(event, projectId, data);
        });
    }

    // Get webhook statistics
    async getWebhookStats(webhookId: string): Promise<any> {
        const webhook = this.webhooks.get(webhookId);
        if (!webhook) {
            throw new Error('Webhook not found');
        }

        const deliveries = this.deliveries.get(webhookId) || [];
        const successCount = deliveries.filter(d => d.status === 'success').length;
        const failureCount = deliveries.filter(d => d.status === 'failed').length;
        const pendingCount = deliveries.filter(d => d.status === 'pending').length;

        const recentDeliveries = deliveries.slice(-10);
        const avgResponseTime = recentDeliveries
            .filter(d => d.response && d.lastAttempt)
            .reduce((sum, d) => {
                const startTime = d.created.getTime();
                const endTime = d.lastAttempt!.getTime();
                return sum + (endTime - startTime);
            }, 0) / recentDeliveries.length || 0;

        return {
            webhook,
            totalDeliveries: deliveries.length,
            successCount,
            failureCount,
            pendingCount,
            successRate: deliveries.length > 0 ? (successCount / deliveries.length) * 100 : 0,
            avgResponseTime,
            recentDeliveries
        };
    }

    // Cleanup method
    destroy(): void {
        // Clear all retry timers
        const timers = Array.from(this.retryQueue.values());
        for (const timer of timers) {
            clearTimeout(timer);
        }
        this.retryQueue.clear();
    }
}