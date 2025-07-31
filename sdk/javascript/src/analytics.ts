import { ECodeClient } from './client';
import { AnalyticsEvent } from './types';

export class AnalyticsTracker {
    constructor(private client: ECodeClient) {}

    /**
     * Track a custom event
     */
    async track(eventName: string, properties?: Record<string, any>): Promise<void> {
        const event: AnalyticsEvent = {
            name: eventName,
            properties,
            timestamp: new Date()
        };
        
        return this.client.post('/analytics/events', event);
    }

    /**
     * Get project analytics
     */
    async getProjectAnalytics(projectId: string, options?: {
        startDate?: string;
        endDate?: string;
        metrics?: string[];
    }) {
        return this.client.get(`/projects/${projectId}/analytics`, {
            params: options
        });
    }

    /**
     * Get user analytics
     */
    async getUserAnalytics(options?: {
        startDate?: string;
        endDate?: string;
    }) {
        return this.client.get('/user/analytics', {
            params: options
        });
    }

    /**
     * Get deployment analytics
     */
    async getDeploymentAnalytics(deploymentId: string, options?: {
        startDate?: string;
        endDate?: string;
        interval?: 'hour' | 'day' | 'week' | 'month';
    }) {
        return this.client.get(`/deployments/${deploymentId}/analytics`, {
            params: options
        });
    }

    /**
     * Track page view
     */
    async trackPageView(page: string, properties?: Record<string, any>): Promise<void> {
        return this.track('page_view', { page, ...properties });
    }

    /**
     * Track deployment
     */
    async trackDeployment(projectId: string, status: 'success' | 'failed', properties?: Record<string, any>): Promise<void> {
        return this.track('deployment', {
            projectId,
            status,
            ...properties
        });
    }

    /**
     * Get real-time analytics
     */
    async getRealTimeAnalytics() {
        return this.client.get('/analytics/realtime');
    }
}