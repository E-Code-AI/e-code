import { storage } from '../storage';
import { EventEmitter } from 'events';
import type { userCredits, budgetLimits, usageAlerts } from '@shared/schema';

type UserCredits = typeof userCredits.$inferSelect;
type BudgetLimit = typeof budgetLimits.$inferSelect;
type UsageAlert = typeof usageAlerts.$inferSelect;

const logger = {
  info: (...args: any[]) => console.log('[billing-service]', ...args),
  error: (...args: any[]) => console.error('[billing-service] ERROR:', ...args),
  warn: (...args: any[]) => console.warn('[billing-service] WARN:', ...args)
};

interface BillingEvent {
  type: 'credit_depleted' | 'budget_alert' | 'credit_added' | 'credit_deducted';
  userId: number;
  amount?: number;
  remaining?: number;
  threshold?: number;
}

export class BillingService extends EventEmitter {
  // Credit costs per resource type (in credits)
  private readonly creditCosts: Record<string, number> = {
    // Compute resources
    'compute.cpu_hour': 0.1,
    'compute.memory_gb_hour': 0.05,
    'compute.gpu_hour': 2.0,
    
    // Storage resources
    'storage.gb_month': 0.01,
    'storage.bandwidth_gb': 0.1,
    'storage.object_request': 0.0001,
    
    // AI resources
    'ai.gpt4_token': 0.00003,
    'ai.claude_token': 0.00002,
    'ai.dalle_image': 0.02,
    'ai.whisper_minute': 0.006,
    
    // Deployment resources
    'deployment.autoscale': 0.5,
    'deployment.reserved_vm': 10.0,
    'deployment.scheduled_run': 0.1,
    'deployment.static_hosting': 0.01,
    
    // Database resources
    'database.postgres_hour': 0.1,
    'database.redis_hour': 0.05,
    'database.backup_gb': 0.005,
    
    // Network resources
    'network.custom_domain': 1.0,
    'network.ssl_certificate': 0.5,
    'network.cdn_gb': 0.08,
    
    // Collaboration resources
    'collab.team_member': 5.0,
    'collab.webrtc_minute': 0.01,
    'collab.screen_recording_minute': 0.02
  };

  async initializeUserBilling(userId: number): Promise<void> {
    try {
      // Check if user already has credits
      const existingCredits = await storage.getUserCredits(userId);
      if (existingCredits) return;

      // Initialize with default monthly credits
      await storage.createUserCredits({
        userId,
        monthlyCredits: 25.00,
        remainingCredits: 25.00,
        extraCredits: 0.00,
        resetDate: this.getNextResetDate()
      });

      // Initialize default budget limits
      await storage.createBudgetLimits({
        userId,
        monthlyLimit: 50.00,
        alertThreshold: 80,
        hardStop: true,
        notificationEmail: null
      });

      logger.info(`Initialized billing for user ${userId}`);
    } catch (error) {
      logger.error('Failed to initialize user billing:', error);
      throw error;
    }
  }

  async trackResourceUsage(
    userId: number,
    resourceType: string,
    quantity: number,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // Calculate credit cost
      const unitCost = this.creditCosts[resourceType] || 0;
      const totalCost = unitCost * quantity;

      if (totalCost === 0) return;

      // Check if user has enough credits
      const userCredits = await storage.getUserCredits(userId);
      if (!userCredits) {
        await this.initializeUserBilling(userId);
        return await this.trackResourceUsage(userId, resourceType, quantity, metadata);
      }

      // Check budget limits
      const budgetLimits = await storage.getBudgetLimits(userId);
      if (budgetLimits?.hardStop && userCredits.remainingCredits < totalCost) {
        throw new Error('Insufficient credits for this operation');
      }

      // Deduct credits
      const updatedCredits = await storage.deductCredits(userId, totalCost);
      if (!updatedCredits) throw new Error('Failed to deduct credits');

      // Track usage in storage
      await storage.trackUsage(userId, resourceType, quantity, {
        ...metadata,
        creditCost: totalCost,
        remainingCredits: updatedCredits.remainingCredits
      });

      // Check for alerts
      await this.checkAndSendAlerts(userId, updatedCredits, budgetLimits);

      // Emit events
      this.emit('usage_tracked', {
        type: 'credit_deducted',
        userId,
        amount: totalCost,
        remaining: updatedCredits.remainingCredits
      } as BillingEvent);

      logger.info(`Tracked usage for user ${userId}: ${resourceType} x${quantity} = ${totalCost} credits`);
    } catch (error) {
      logger.error('Failed to track resource usage:', error);
      throw error;
    }
  }

  async checkAndSendAlerts(
    userId: number,
    credits: UserCredits,
    limits: BudgetLimit | undefined
  ): Promise<void> {
    if (!limits) return;

    const monthlyCredits = parseFloat(credits.monthlyCredits as any) || 0;
    const extraCredits = parseFloat(credits.extraCredits as any) || 0;
    const remainingCredits = parseFloat(credits.remainingCredits as any) || 0;
    
    const totalCredits = monthlyCredits + extraCredits;
    const usedCredits = totalCredits - remainingCredits;
    const usagePercentage = (usedCredits / totalCredits) * 100;

    // Check if we need to send an alert
    if (limits.alertThreshold && usagePercentage >= limits.alertThreshold) {
      // Check if alert already sent for this threshold
      const existingAlerts = await storage.getUsageAlerts(userId);
      const alertExists = existingAlerts.some(
        alert => alert.alertType === 'budget_threshold' && 
        alert.threshold === limits.alertThreshold &&
        !alert.sent
      );

      if (!alertExists) {
        // Create alert record
        const alert = await storage.createUsageAlert({
          userId,
          alertType: 'budget_threshold',
          threshold: limits.alertThreshold,
          sent: false
        });

        // Send email if configured
        if (limits.notificationEmail) {
          try {
            // TODO: Implement email sending
            logger.info(`Would send budget alert to ${limits.notificationEmail} - ${usagePercentage}% used`);
            await storage.markAlertSent(alert.id);
          } catch (error) {
            logger.error('Failed to send budget alert email:', error);
          }
        }

        // Emit alert event
        this.emit('budget_alert', {
          type: 'budget_alert',
          userId,
          threshold: limits.alertThreshold || 0,
          remaining: remainingCredits
        } as BillingEvent);
      }
    }

    // Check for credit depletion
    if (remainingCredits <= 0) {
      this.emit('credits_depleted', {
        type: 'credit_depleted',
        userId,
        remaining: 0
      } as BillingEvent);
    }
  }

  async addCredits(userId: number, amount: number, description?: string): Promise<UserCredits> {
    try {
      const credits = await storage.addCredits(userId, amount);
      if (!credits) throw new Error('Failed to add credits');

      // Track the credit addition
      await storage.trackUsage(userId, 'billing.credit_added', amount, {
        description,
        newBalance: credits.remainingCredits
      });

      this.emit('credits_added', {
        type: 'credit_added',
        userId,
        amount,
        remaining: credits.remainingCredits
      } as BillingEvent);

      logger.info(`Added ${amount} credits to user ${userId}`);
      return credits;
    } catch (error) {
      logger.error('Failed to add credits:', error);
      throw error;
    }
  }

  async resetMonthlyCredits(userId: number): Promise<void> {
    try {
      const credits = await storage.getUserCredits(userId);
      if (!credits) return;

      // Check if reset is due
      const now = new Date();
      if (now < new Date(credits.resetDate)) return;

      // Reset credits
      await storage.updateUserCredits(userId, {
        remainingCredits: credits.monthlyCredits,
        resetDate: this.getNextResetDate()
      });

      // Clear old alerts
      const alerts = await storage.getUsageAlerts(userId);
      // TODO: Implement alert cleanup

      logger.info(`Reset monthly credits for user ${userId}`);
    } catch (error) {
      logger.error('Failed to reset monthly credits:', error);
      throw error;
    }
  }

  async getUserBillingInfo(userId: number): Promise<{
    credits: UserCredits | null;
    limits: BudgetLimit | null;
    usage: any[];
    alerts: UsageAlert[];
  }> {
    try {
      const [credits, limits, usage, alerts] = await Promise.all([
        storage.getUserCredits(userId),
        storage.getBudgetLimits(userId),
        storage.getUsageHistory(userId, this.getCurrentMonthStart(), new Date()),
        storage.getUsageAlerts(userId)
      ]);

      return {
        credits: credits || null,
        limits: limits || null,
        usage,
        alerts
      };
    } catch (error) {
      logger.error('Failed to get user billing info:', error);
      throw error;
    }
  }

  async updateBudgetLimits(
    userId: number,
    limits: Partial<{
      monthlyLimit: number;
      alertThreshold: number;
      hardStop: boolean;
      notificationEmail: string | null;
    }>
  ): Promise<BudgetLimit> {
    try {
      const existing = await storage.getBudgetLimits(userId);
      
      if (existing) {
        const updated = await storage.updateBudgetLimits(userId, limits);
        if (!updated) throw new Error('Failed to update budget limits');
        return updated;
      } else {
        return await storage.createBudgetLimits({
          userId,
          monthlyLimit: limits.monthlyLimit || 50.00,
          alertThreshold: limits.alertThreshold || 80,
          hardStop: limits.hardStop !== undefined ? limits.hardStop : true,
          notificationEmail: limits.notificationEmail || null
        });
      }
    } catch (error) {
      logger.error('Failed to update budget limits:', error);
      throw error;
    }
  }

  async getResourcePricing(): Promise<Record<string, number>> {
    return this.creditCosts;
  }

  async estimateCost(
    resources: Array<{ type: string; quantity: number }>
  ): Promise<{ total: number; breakdown: Array<{ type: string; cost: number }> }> {
    const breakdown = resources.map(resource => ({
      type: resource.type,
      cost: (this.creditCosts[resource.type] || 0) * resource.quantity
    }));

    const total = breakdown.reduce((sum, item) => sum + item.cost, 0);

    return { total, breakdown };
  }

  private getNextResetDate(): Date {
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth;
  }

  private getCurrentMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  // Background job to reset credits monthly
  async runMonthlyResetJob(): Promise<void> {
    try {
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        await this.resetMonthlyCredits(user.id);
      }
      
      logger.info('Completed monthly credit reset job');
    } catch (error) {
      logger.error('Failed to run monthly reset job:', error);
    }
  }
}

// Export singleton instance
export const billingService = new BillingService();