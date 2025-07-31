import { AxiosInstance } from 'axios';
import { APIKey, AIProviderType } from '../types';

export class APIKeyManager {
  constructor(private client: AxiosInstance) {}

  /**
   * Create new API key
   */
  async create(options: {
    name: string;
    provider: AIProviderType;
    key: string;
    usageLimit?: number;
    expiresIn?: number; // days
  }): Promise<APIKey> {
    const response = await this.client.post('/admin/api-keys', options);
    return response.data;
  }

  /**
   * Get API key by ID
   */
  async get(id: string): Promise<APIKey> {
    const response = await this.client.get(`/admin/api-keys/${id}`);
    return response.data;
  }

  /**
   * List API keys
   */
  async list(params?: {
    provider?: AIProviderType;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    keys: APIKey[];
    total: number;
    hasMore: boolean;
  }> {
    const response = await this.client.get('/admin/api-keys', { params });
    return response.data;
  }

  /**
   * Update API key
   */
  async update(id: string, updates: {
    name?: string;
    isActive?: boolean;
    usageLimit?: number;
    expiresAt?: string;
  }): Promise<APIKey> {
    const response = await this.client.put(`/admin/api-keys/${id}`, updates);
    return response.data;
  }

  /**
   * Delete API key
   */
  async delete(id: string): Promise<void> {
    await this.client.delete(`/admin/api-keys/${id}`);
  }

  /**
   * Get active API key for provider
   */
  async getActiveKey(provider: AIProviderType): Promise<APIKey | null> {
    const response = await this.client.get(`/admin/api-keys/active/${provider}`);
    return response.data;
  }

  /**
   * Set API key as active for provider
   */
  async setActive(id: string): Promise<void> {
    await this.client.post(`/admin/api-keys/${id}/activate`);
  }

  /**
   * Deactivate API key
   */
  async deactivate(id: string): Promise<void> {
    await this.client.post(`/admin/api-keys/${id}/deactivate`);
  }

  /**
   * Rotate API key
   */
  async rotate(id: string, newKey: string): Promise<APIKey> {
    const response = await this.client.post(`/admin/api-keys/${id}/rotate`, { key: newKey });
    return response.data;
  }

  /**
   * Test API key connection
   */
  async test(id: string): Promise<{
    success: boolean;
    message: string;
    latency?: number;
    provider: AIProviderType;
    model?: string;
  }> {
    const response = await this.client.post(`/admin/api-keys/${id}/test`);
    return response.data;
  }

  /**
   * Get API key usage statistics
   */
  async getUsageStats(id: string, period?: string): Promise<{
    period: string;
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    requestsByDay: { date: string; requests: number; tokens: number; cost: number }[];
    topUsers: { userId: string; requests: number; tokens: number; cost: number }[];
    averageLatency: number;
    errorRate: number;
  }> {
    const response = await this.client.get(`/admin/api-keys/${id}/usage`, {
      params: { period }
    });
    return response.data;
  }

  /**
   * Get usage statistics for all keys
   */
  async getAllUsageStats(period?: string): Promise<{
    period: string;
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byProvider: {
      provider: AIProviderType;
      requests: number;
      tokens: number;
      cost: number;
      keys: number;
    }[];
    topKeys: {
      keyId: string;
      name: string;
      provider: AIProviderType;
      requests: number;
      tokens: number;
      cost: number;
    }[];
  }> {
    const response = await this.client.get('/admin/api-keys/usage/summary', {
      params: { period }
    });
    return response.data;
  }

  /**
   * Set usage limits for API key
   */
  async setUsageLimit(id: string, limits: {
    dailyLimit?: number;
    monthlyLimit?: number;
    costLimit?: number;
  }): Promise<void> {
    await this.client.put(`/admin/api-keys/${id}/limits`, limits);
  }

  /**
   * Get usage alerts
   */
  async getUsageAlerts(id?: string): Promise<{
    id: string;
    keyId?: string;
    type: 'usage_limit' | 'cost_limit' | 'error_rate' | 'expiration';
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    threshold: number;
    currentValue: number;
    isActive: boolean;
    createdAt: string;
  }[]> {
    const response = await this.client.get('/admin/api-keys/alerts', {
      params: { keyId: id }
    });
    return response.data;
  }

  /**
   * Create usage alert
   */
  async createUsageAlert(options: {
    keyId?: string;
    type: 'usage_limit' | 'cost_limit' | 'error_rate';
    threshold: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    notificationChannels: string[];
  }): Promise<{
    id: string;
    type: string;
    threshold: number;
    severity: string;
    isActive: boolean;
    createdAt: string;
  }> {
    const response = await this.client.post('/admin/api-keys/alerts', options);
    return response.data;
  }

  /**
   * Update usage alert
   */
  async updateUsageAlert(id: string, updates: {
    threshold?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    isActive?: boolean;
    notificationChannels?: string[];
  }): Promise<void> {
    await this.client.put(`/admin/api-keys/alerts/${id}`, updates);
  }

  /**
   * Delete usage alert
   */
  async deleteUsageAlert(id: string): Promise<void> {
    await this.client.delete(`/admin/api-keys/alerts/${id}`);
  }

  /**
   * Get provider information
   */
  async getProviderInfo(): Promise<{
    provider: AIProviderType;
    name: string;
    description: string;
    documentation: string;
    keyFormat: string;
    supportedModels: string[];
    pricingUrl?: string;
  }[]> {
    const response = await this.client.get('/admin/api-keys/providers');
    return response.data;
  }

  /**
   * Validate API key format
   */
  async validateKeyFormat(provider: AIProviderType, key: string): Promise<{
    isValid: boolean;
    message: string;
    suggestions?: string[];
  }> {
    const response = await this.client.post('/admin/api-keys/validate', {
      provider,
      key
    });
    return response.data;
  }

  /**
   * Import API keys from file
   */
  async importKeys(file: File | Blob): Promise<{
    imported: number;
    failed: number;
    errors: string[];
    duplicates: number;
  }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.client.post('/admin/api-keys/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

  /**
   * Export API keys
   */
  async exportKeys(format: 'json' | 'csv' = 'json', includeKeys: boolean = false): Promise<{
    downloadUrl: string;
    filename: string;
    expiresAt: string;
  }> {
    const response = await this.client.post('/admin/api-keys/export', {
      format,
      includeKeys
    });
    return response.data;
  }
}