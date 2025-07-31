import { AxiosInstance } from 'axios';
import { WebhookConfig, WebhookDelivery, WebhookCreateOptions, SearchResult, PaginationParams } from '../types';

export class WebhookManager {
  constructor(private client: AxiosInstance) {}

  /**
   * Create new webhook
   */
  async create(options: WebhookCreateOptions): Promise<WebhookConfig> {
    const response = await this.client.post(`/webhooks/${options.projectId}`, options);
    return response.data;
  }

  /**
   * Get webhook by ID
   */
  async get(projectId: string, webhookId: string): Promise<WebhookConfig> {
    const response = await this.client.get(`/webhooks/${projectId}/${webhookId}`);
    return response.data;
  }

  /**
   * List webhooks for project
   */
  async list(projectId: string): Promise<WebhookConfig[]> {
    const response = await this.client.get(`/webhooks/${projectId}`);
    return response.data;
  }

  /**
   * Update webhook
   */
  async update(projectId: string, webhookId: string, updates: {
    name?: string;
    url?: string;
    events?: string[];
    secret?: string;
    isActive?: boolean;
  }): Promise<WebhookConfig> {
    const response = await this.client.put(`/webhooks/${projectId}/${webhookId}`, updates);
    return response.data;
  }

  /**
   * Delete webhook
   */
  async delete(projectId: string, webhookId: string): Promise<void> {
    await this.client.delete(`/webhooks/${projectId}/${webhookId}`);
  }

  /**
   * Test webhook
   */
  async test(projectId: string, webhookId: string, payload?: any): Promise<{
    success: boolean;
    statusCode: number;
    responseBody: string;
    latency: number;
    error?: string;
  }> {
    const response = await this.client.post(`/webhooks/${projectId}/${webhookId}/test`, {
      payload
    });
    return response.data;
  }

  /**
   * Trigger webhooks for an event
   */
  async trigger(projectId: string, event: string, data: any): Promise<{
    triggered: number;
    successful: number;
    failed: number;
    deliveryIds: string[];
  }> {
    const response = await this.client.post(`/webhooks/${projectId}/trigger`, {
      event,
      data
    });
    return response.data;
  }

  /**
   * Get webhook deliveries
   */
  async getDeliveries(projectId: string, webhookId?: string, limit: number = 50): Promise<WebhookDelivery[]> {
    const response = await this.client.get(`/webhooks/${projectId}/deliveries`, {
      params: { webhookId, limit }
    });
    return response.data;
  }

  /**
   * Get delivery by ID
   */
  async getDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const response = await this.client.get(`/webhook-deliveries/${deliveryId}`);
    return response.data;
  }

  /**
   * Retry failed delivery
   */
  async retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
    const response = await this.client.post(`/webhooks/deliveries/${deliveryId}/retry`);
    return response.data;
  }

  /**
   * Get webhook statistics
   */
  async getStats(projectId: string, webhookId?: string): Promise<{
    totalDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    successRate: number;
    averageLatency: number;
    last24Hours: {
      deliveries: number;
      successful: number;
      failed: number;
    };
    last7Days: {
      deliveries: number;
      successful: number;
      failed: number;
    };
    last30Days: {
      deliveries: number;
      successful: number;
      failed: number;
    };
    deliveriesByDay: {
      date: string;
      total: number;
      successful: number;
      failed: number;
    }[];
  }> {
    const response = await this.client.get(`/webhooks/${projectId}/stats`, {
      params: { webhookId }
    });
    return response.data;
  }

  /**
   * Get supported webhook events
   */
  async getSupportedEvents(): Promise<{
    event: string;
    description: string;
    payloadExample: any;
    frequency: 'high' | 'medium' | 'low';
  }[]> {
    const response = await this.client.get('/webhooks/events/supported');
    return response.data;
  }

  /**
   * Get webhook logs
   */
  async getLogs(projectId: string, webhookId: string, params?: {
    startDate?: string;
    endDate?: string;
    status?: 'success' | 'failed';
    limit?: number;
    offset?: number;
  }): Promise<{
    logs: {
      id: string;
      timestamp: string;
      event: string;
      status: 'success' | 'failed';
      statusCode: number;
      latency: number;
      error?: string;
      requestBody: any;
      responseBody: string;
    }[];
    total: number;
    hasMore: boolean;
  }> {
    const response = await this.client.get(`/webhooks/${projectId}/${webhookId}/logs`, {
      params
    });
    return response.data;
  }

  /**
   * Enable webhook
   */
  async enable(projectId: string, webhookId: string): Promise<void> {
    await this.client.post(`/webhooks/${projectId}/${webhookId}/enable`);
  }

  /**
   * Disable webhook
   */
  async disable(projectId: string, webhookId: string): Promise<void> {
    await this.client.post(`/webhooks/${projectId}/${webhookId}/disable`);
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(projectId: string, webhookId: string): Promise<{
    secret: string;
  }> {
    const response = await this.client.post(`/webhooks/${projectId}/${webhookId}/regenerate-secret`);
    return response.data;
  }

  /**
   * Validate webhook signature
   */
  async validateSignature(payload: string, signature: string, secret: string): Promise<{
    isValid: boolean;
    expectedSignature: string;
  }> {
    const response = await this.client.post('/webhooks/validate-signature', {
      payload,
      signature,
      secret
    });
    return response.data;
  }

  /**
   * Get webhook delivery analytics
   */
  async getAnalytics(projectId: string, params?: {
    webhookId?: string;
    startDate?: string;
    endDate?: string;
    groupBy?: 'hour' | 'day' | 'week' | 'month';
  }): Promise<{
    period: string;
    totalDeliveries: number;
    successRate: number;
    averageLatency: number;
    timeline: {
      timestamp: string;
      deliveries: number;
      successful: number;
      failed: number;
      averageLatency: number;
    }[];
    eventBreakdown: {
      event: string;
      count: number;
      successRate: number;
    }[];
    statusCodeBreakdown: {
      statusCode: number;
      count: number;
      percentage: number;
    }[];
  }> {
    const response = await this.client.get(`/webhooks/${projectId}/analytics`, {
      params
    });
    return response.data;
  }

  /**
   * Bulk manage webhooks
   */
  async bulkUpdate(projectId: string, operations: {
    webhookId: string;
    action: 'enable' | 'disable' | 'delete';
  }[]): Promise<{
    successful: number;
    failed: number;
    errors: {
      webhookId: string;
      error: string;
    }[];
  }> {
    const response = await this.client.post(`/webhooks/${projectId}/bulk`, {
      operations
    });
    return response.data;
  }

  /**
   * Export webhook configuration
   */
  async exportConfig(projectId: string, format: 'json' | 'yaml' = 'json'): Promise<{
    downloadUrl: string;
    filename: string;
    expiresAt: string;
  }> {
    const response = await this.client.post(`/webhooks/${projectId}/export`, {
      format
    });
    return response.data;
  }

  /**
   * Import webhook configuration
   */
  async importConfig(projectId: string, file: File | Blob): Promise<{
    imported: number;
    failed: number;
    errors: string[];
    duplicates: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post(`/webhooks/${projectId}/import`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
}