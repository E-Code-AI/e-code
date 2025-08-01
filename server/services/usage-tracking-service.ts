import { DatabaseStorage } from '../storage';
import Stripe from 'stripe';

export interface UsageMetric {
  userId: number;
  projectId?: number;
  metricType: 'compute' | 'storage' | 'bandwidth' | 'deployments' | 'databases' | 'agentRequests';
  value: number;
  unit: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface ResourceLimits {
  compute: { limit: number; unit: 'hours' };
  storage: { limit: number; unit: 'GB' };
  bandwidth: { limit: number; unit: 'GB' };
  deployments: { limit: number; unit: 'deployments' };
  databases: { limit: number; unit: 'databases' };
  agentRequests: { limit: number; unit: 'requests' };
}

export class UsageTrackingService {
  private stripe: Stripe | null = null;
  private storage: DatabaseStorage;
  private computeTimers: Map<string, { startTime: Date; userId: number; projectId: number }> = new Map();
  private storageWatchers: Map<number, NodeJS.Timer> = new Map();

  constructor(storage: DatabaseStorage, stripeSecretKey?: string) {
    this.storage = storage;
    if (stripeSecretKey) {
      this.stripe = new Stripe(stripeSecretKey);
    }
  }

  // Real-time compute tracking
  async startComputeSession(userId: number, projectId: number): Promise<string> {
    const sessionId = `compute_${userId}_${projectId}_${Date.now()}`;
    this.computeTimers.set(sessionId, {
      startTime: new Date(),
      userId,
      projectId
    });
    return sessionId;
  }

  async endComputeSession(sessionId: string): Promise<void> {
    const session = this.computeTimers.get(sessionId);
    if (!session) return;

    const endTime = new Date();
    const computeHours = (endTime.getTime() - session.startTime.getTime()) / (1000 * 60 * 60);

    await this.trackUsage({
      userId: session.userId,
      projectId: session.projectId,
      metricType: 'compute',
      value: computeHours,
      unit: 'hours',
      timestamp: endTime,
      metadata: {
        sessionId,
        startTime: session.startTime,
        endTime
      }
    });

    this.computeTimers.delete(sessionId);
  }

  // Storage usage monitoring
  async trackStorageUsage(userId: number, projectId: number, sizeBytes: number): Promise<void> {
    const sizeGB = sizeBytes / (1024 * 1024 * 1024);
    
    await this.trackUsage({
      userId,
      projectId,
      metricType: 'storage',
      value: sizeGB,
      unit: 'GB',
      timestamp: new Date(),
      metadata: {
        sizeBytes,
        source: 'file_system'
      }
    });
  }

  // Bandwidth tracking
  async trackBandwidthUsage(userId: number, projectId: number, bytesTransferred: number, direction: 'inbound' | 'outbound'): Promise<void> {
    const gbTransferred = bytesTransferred / (1024 * 1024 * 1024);
    
    await this.trackUsage({
      userId,
      projectId,
      metricType: 'bandwidth',
      value: gbTransferred,
      unit: 'GB',
      timestamp: new Date(),
      metadata: {
        bytesTransferred,
        direction,
        source: 'network'
      }
    });
  }

  // Deployment tracking
  async trackDeployment(userId: number, projectId: number, deploymentType: string): Promise<void> {
    await this.trackUsage({
      userId,
      projectId,
      metricType: 'deployments',
      value: 1,
      unit: 'deployment',
      timestamp: new Date(),
      metadata: {
        deploymentType,
        source: 'deployment_service'
      }
    });
  }

  // Database usage tracking
  async trackDatabaseUsage(userId: number, databaseId: number, operationType: string, resourceCost: number): Promise<void> {
    await this.trackUsage({
      userId,
      metricType: 'databases',
      value: resourceCost,
      unit: 'operations',
      timestamp: new Date(),
      metadata: {
        databaseId,
        operationType,
        source: 'database_service'
      }
    });
  }

  // AI Agent request tracking
  async trackAgentRequest(userId: number, projectId: number, requestType: string, cost: number = 0.05): Promise<void> {
    await this.trackUsage({
      userId,
      projectId,
      metricType: 'agentRequests',
      value: 1,
      unit: 'request',
      timestamp: new Date(),
      metadata: {
        requestType,
        cost,
        source: 'ai_agent'
      }
    });

    // Report to Stripe if configured
    if (this.stripe) {
      await this.reportUsageToStripe(userId, 'agentRequests', 1);
    }
  }

  // Core usage tracking method
  private async trackUsage(metric: UsageMetric): Promise<void> {
    try {
      await this.storage.trackUsage(
        metric.userId,
        metric.metricType,
        metric.value,
        metric.metadata || {}
      );
    } catch (error) {
      console.error('Failed to track usage:', error);
    }
  }

  // Report usage to Stripe for metered billing
  private async reportUsageToStripe(userId: number, metricType: string, quantity: number): Promise<void> {
    if (!this.stripe) return;

    try {
      const user = await this.storage.getUser(userId);
      if (!user?.stripeSubscriptionId) return;

      const subscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      
      // Map metric types to Stripe price IDs
      const stripeMetrics: Record<string, string> = {
        agentRequests: process.env.STRIPE_PRICE_ID_AGENT_USAGE || '',
        compute: process.env.STRIPE_PRICE_ID_COMPUTE || '',
        storage: process.env.STRIPE_PRICE_ID_STORAGE || '',
        bandwidth: process.env.STRIPE_PRICE_ID_BANDWIDTH || '',
        deployments: process.env.STRIPE_PRICE_ID_DEPLOYMENTS || '',
        databases: process.env.STRIPE_PRICE_ID_DATABASES || ''
      };

      const priceId = stripeMetrics[metricType];
      if (!priceId) return;

      const meteredItem = subscription.items.data.find(
        item => item.price.id === priceId
      );

      if (meteredItem) {
        await this.stripe.subscriptionItems.usageRecords.create(meteredItem.id, {
          quantity,
          timestamp: Math.floor(Date.now() / 1000),
          action: 'increment'
        });
      }
    } catch (error) {
      console.error('Failed to report usage to Stripe:', error);
    }
  }

  // Get usage stats for a user
  async getUserUsageStats(userId: number, startDate?: Date, endDate?: Date): Promise<Record<string, any>> {
    return await this.storage.getUsageStats(userId, startDate, endDate);
  }

  // Get resource limits based on subscription tier
  async getResourceLimits(userId: number): Promise<ResourceLimits> {
    const user = await this.storage.getUser(userId);
    
    // Default limits for free tier
    const limits: ResourceLimits = {
      compute: { limit: 100, unit: 'hours' },
      storage: { limit: 1, unit: 'GB' },
      bandwidth: { limit: 10, unit: 'GB' },
      deployments: { limit: 3, unit: 'deployments' },
      databases: { limit: 1, unit: 'databases' },
      agentRequests: { limit: 50, unit: 'requests' }
    };

    // Adjust limits based on subscription
    if (user?.stripePriceId) {
      // Core tier limits
      if (user.stripePriceId.includes('CORE')) {
        limits.compute.limit = 100;
        limits.storage.limit = 10;
        limits.bandwidth.limit = 100;
        limits.deployments.limit = 10;
        limits.databases.limit = 3;
        limits.agentRequests.limit = 500;
      }
      // Pro tier limits
      else if (user.stripePriceId.includes('PRO')) {
        limits.compute.limit = 500;
        limits.storage.limit = 50;
        limits.bandwidth.limit = 500;
        limits.deployments.limit = -1; // unlimited
        limits.databases.limit = 10;
        limits.agentRequests.limit = 2000;
      }
      // Enterprise tier limits
      else if (user.stripePriceId.includes('ENTERPRISE')) {
        limits.compute.limit = -1; // unlimited
        limits.storage.limit = -1; // unlimited
        limits.bandwidth.limit = -1; // unlimited
        limits.deployments.limit = -1; // unlimited
        limits.databases.limit = -1; // unlimited
        limits.agentRequests.limit = -1; // unlimited
      }
    }

    return limits;
  }

  // Check if user has exceeded limits
  async checkUsageLimits(userId: number): Promise<{ exceeded: boolean; limits: Record<string, any> }> {
    const limits = await this.getResourceLimits(userId);
    const currentUsage = await this.getUserUsageStats(userId);
    
    const exceeded: Record<string, boolean> = {};
    let hasExceeded = false;

    for (const [metric, limit] of Object.entries(limits)) {
      const usage = currentUsage[metric]?.total || 0;
      const limitValue = limit.limit;
      
      if (limitValue !== -1 && usage > limitValue) {
        exceeded[metric] = true;
        hasExceeded = true;
      } else {
        exceeded[metric] = false;
      }
    }

    return {
      exceeded: hasExceeded,
      limits: exceeded
    };
  }

  // Admin: Get all users usage stats
  async getAllUsersUsage(startDate?: Date, endDate?: Date): Promise<Record<number, any>> {
    // This would need to be implemented in the storage layer
    // For now, return empty object
    return {};
  }
}