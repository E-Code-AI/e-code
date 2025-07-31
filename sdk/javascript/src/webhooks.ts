import { ECodeClient } from './client';
import { WebhookEvent } from './types';

export class WebhookManager {
    constructor(private client: ECodeClient) {}

    /**
     * Create a webhook
     */
    async create(options: {
        url: string;
        events: string[];
        secret?: string;
    }): Promise<WebhookEvent> {
        return this.client.post('/webhooks', options);
    }

    /**
     * List all webhooks
     */
    async list(): Promise<WebhookEvent[]> {
        return this.client.get('/webhooks');
    }

    /**
     * Get webhook by ID
     */
    async get(webhookId: string): Promise<WebhookEvent> {
        return this.client.get(`/webhooks/${webhookId}`);
    }

    /**
     * Update webhook
     */
    async update(webhookId: string, updates: Partial<WebhookEvent>): Promise<WebhookEvent> {
        return this.client.patch(`/webhooks/${webhookId}`, updates);
    }

    /**
     * Delete webhook
     */
    async delete(webhookId: string): Promise<void> {
        return this.client.delete(`/webhooks/${webhookId}`);
    }

    /**
     * Test webhook
     */
    async test(webhookId: string): Promise<void> {
        return this.client.post(`/webhooks/${webhookId}/test`);
    }

    /**
     * Get webhook deliveries
     */
    async getDeliveries(webhookId: string, limit: number = 100) {
        return this.client.get(`/webhooks/${webhookId}/deliveries`, {
            params: { limit }
        });
    }

    /**
     * Retry failed delivery
     */
    async retryDelivery(webhookId: string, deliveryId: string): Promise<void> {
        return this.client.post(`/webhooks/${webhookId}/deliveries/${deliveryId}/retry`);
    }

    /**
     * Verify webhook signature
     */
    static verifySignature(payload: string, signature: string, secret: string): boolean {
        // In a real implementation, this would use crypto to verify HMAC
        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
        
        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }
}