/**
 * Credits Management Service
 * Implements Replit-style credits system:
 * 1. Monthly credits included in plan
 * 2. Deduct from allowances first
 * 3. Deduct from credits when allowance exhausted
 * 4. Trigger pay-as-you-go when credits exhausted
 */

import { storage } from '../storage';
import {
  METERED_PRICES,
  PLANS,
  getPlanByTier,
  exceedsAllowance,
  calculateComputeCost,
  calculateStorageCost,
  calculateBandwidthCost,
} from '../payments/pricing-constants';

export interface UsageMetrics {
  computeHours: number;
  storageGb: number;
  bandwidthGb: number;
  deployments: number;
}

export interface CostBreakdown {
  allowanceCost: number;        // Cost covered by allowance
  creditsCost: number;          // Cost deducted from credits
  payAsYouGoCost: number;       // Cost charged via Stripe
  totalCost: number;
}

export class CreditsService {
  /**
   * Refill monthly credits for a user
   */
  async refillMonthlyCredits(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const plan = getPlanByTier(user.subscriptionTier || 'free');
    const newBalance = parseFloat(user.creditsBalance || '0') + plan.creditsMonthly;
    const now = new Date();

    await storage.updateUser(userId, {
      creditsBalance: newBalance.toFixed(2),
      lastCreditRefill: now,
      usageResetAt: now, // Reset usage tracking period
    });

    // Reset usage counters at refill
    await this.resetMonthlyUsage(userId);

    console.log(`[Credits] Refilled ${plan.creditsMonthly} credits for user ${userId}. New balance: ${newBalance}`);
  }

  /**
   * Check if credits need refilling (monthly cycle)
   */
  async checkAndRefillCredits(userId: string): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user || !user.lastCreditRefill) {
      // First time - refill immediately
      await this.refillMonthlyCredits(userId);
      return;
    }

    const now = new Date();
    const lastRefill = new Date(user.lastCreditRefill);
    const daysSinceRefill = (now.getTime() - lastRefill.getTime()) / (1000 * 60 * 60 * 24);

    // Refill if more than 30 days since last refill
    if (daysSinceRefill >= 30) {
      await this.refillMonthlyCredits(userId);
    }
  }

  /**
   * Record compute usage and deduct from allowance/credits/pay-as-you-go
   */
  async recordComputeUsage(userId: string, vcpuHours: number): Promise<CostBreakdown> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const plan = getPlanByTier(user.subscriptionTier || 'free');
    const currentUsage = parseFloat(user.usageComputeHours || '0');
    const newUsage = currentUsage + vcpuHours;

    // Check allowance
    const { exceeds, overage } = exceedsAllowance(
      newUsage,
      -1 // Compute has no fixed allowance, goes straight to credits
    );

    // Calculate cost
    const cost = calculateComputeCost(vcpuHours);
    let creditsBalance = parseFloat(user.creditsBalance || '0');

    let allowanceCost = 0;
    let creditsCost = 0;
    let payAsYouGoCost = 0;

    if (creditsBalance >= cost) {
      // Deduct from credits
      creditsCost = cost;
      creditsBalance -= cost;
    } else {
      // Partially from credits, rest pay-as-you-go
      creditsCost = creditsBalance;
      payAsYouGoCost = cost - creditsBalance;
      creditsBalance = 0;
    }

    // Update user
    await storage.updateUser(userId, {
      usageComputeHours: newUsage.toFixed(2),
      creditsBalance: creditsBalance.toFixed(2),
    });

    // If pay-as-you-go triggered, record for Stripe billing
    if (payAsYouGoCost > 0) {
      await this.recordPayAsYouGoCharge(userId, 'compute', payAsYouGoCost);
    }

    return {
      allowanceCost,
      creditsCost,
      payAsYouGoCost,
      totalCost: cost,
    };
  }

  /**
   * Record storage usage (incremental billing - only charge for NEW usage beyond allowance)
   * @param storageGb - INCREMENTAL storage used (GB added, must be >= 0)
   */
  async recordStorageUsage(userId: string, storageGb: number): Promise<CostBreakdown> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validation: Reject negative increments (deletions/refunds not supported in MVP)
    if (storageGb < 0) {
      throw new Error('Negative storage increments not supported. Use absolute decrease tracking.');
    }

    const plan = getPlanByTier(user.subscriptionTier || 'free');
    const currentUsage = parseFloat(user.usageStorageGb || '0');
    
    // storageGb is INCREMENTAL - add to current total
    const newTotalUsage = currentUsage + storageGb;
    const { exceeds, overage } = exceedsAllowance(newTotalUsage, plan.allowances.storageGb);

    let allowanceCost = 0;
    let creditsCost = 0;
    let payAsYouGoCost = 0;
    let cost = 0;

    if (exceeds) {
      // Calculate cost only for NEW overage (not previously billed)
      const previousOverage = Math.max(0, currentUsage - plan.allowances.storageGb);
      const newOverage = overage - previousOverage;
      
      if (newOverage > 0) {
        cost = calculateStorageCost(newOverage);
        let creditsBalance = parseFloat(user.creditsBalance || '0');

        if (creditsBalance >= cost) {
          creditsCost = cost;
          creditsBalance -= cost;
        } else {
          creditsCost = creditsBalance;
          payAsYouGoCost = cost - creditsBalance;
          creditsBalance = 0;
        }

        await storage.updateUser(userId, {
          usageStorageGb: newTotalUsage.toFixed(2),
          creditsBalance: creditsBalance.toFixed(2),
        });

        if (payAsYouGoCost > 0) {
          await this.recordPayAsYouGoCharge(userId, 'storage', payAsYouGoCost);
        }
      } else {
        // No new overage to bill
        await storage.updateUser(userId, {
          usageStorageGb: newTotalUsage.toFixed(2),
        });
      }

      return {
        allowanceCost,
        creditsCost,
        payAsYouGoCost,
        totalCost: cost,
      };
    }

    // Within allowance - no cost
    await storage.updateUser(userId, {
      usageStorageGb: newTotalUsage.toFixed(2),
    });

    return {
      allowanceCost: 0,
      creditsCost: 0,
      payAsYouGoCost: 0,
      totalCost: 0,
    };
  }

  /**
   * Record bandwidth usage (incremental billing - only charge for NEW usage beyond allowance)
   * @param bandwidthGb - INCREMENTAL bandwidth used (GB added, must be >= 0)
   */
  async recordBandwidthUsage(userId: string, bandwidthGb: number): Promise<CostBreakdown> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Validation: Reject negative increments (prevents retry/reconciliation errors)
    if (bandwidthGb < 0) {
      throw new Error('Negative bandwidth increments not supported.');
    }

    const plan = getPlanByTier(user.subscriptionTier || 'free');
    const currentUsage = parseFloat(user.usageBandwidthGb || '0');
    
    // bandwidthGb is INCREMENTAL - add to current total
    const newUsage = currentUsage + bandwidthGb;

    const { exceeds, overage } = exceedsAllowance(newUsage, plan.allowances.bandwidthGb);

    let allowanceCost = 0;
    let creditsCost = 0;
    let payAsYouGoCost = 0;
    let cost = 0;

    if (exceeds) {
      // Calculate cost only for NEW overage (not previously billed)
      const previousOverage = Math.max(0, currentUsage - plan.allowances.bandwidthGb);
      const newOverage = overage - previousOverage;
      
      if (newOverage > 0) {
        cost = calculateBandwidthCost(newOverage);
        let creditsBalance = parseFloat(user.creditsBalance || '0');

        if (creditsBalance >= cost) {
          creditsCost = cost;
          creditsBalance -= cost;
        } else {
          creditsCost = creditsBalance;
          payAsYouGoCost = cost - creditsBalance;
          creditsBalance = 0;
        }

        await storage.updateUser(userId, {
          usageBandwidthGb: newUsage.toFixed(2),
          creditsBalance: creditsBalance.toFixed(2),
        });

        if (payAsYouGoCost > 0) {
          await this.recordPayAsYouGoCharge(userId, 'bandwidth', payAsYouGoCost);
        }
      } else {
        // No new overage to bill
        await storage.updateUser(userId, {
          usageBandwidthGb: newUsage.toFixed(2),
        });
      }

      return {
        allowanceCost,
        creditsCost,
        payAsYouGoCost,
        totalCost: cost,
      };
    }

    // Within allowance
    await storage.updateUser(userId, {
      usageBandwidthGb: newUsage.toFixed(2),
    });

    return {
      allowanceCost: 0,
      creditsCost: 0,
      payAsYouGoCost: 0,
      totalCost: 0,
    };
  }

  /**
   * Get current credits balance and usage summary
   */
  async getCreditsStatus(userId: string): Promise<{
    creditsBalance: number;
    creditsMonthlyAllowance: number;
    lastRefill: Date | null;
    usage: UsageMetrics;
    allowances: typeof PLANS.CORE.allowances;
    plan: typeof PLANS.CORE;
  }> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const plan = getPlanByTier(user.subscriptionTier || 'free');

    return {
      creditsBalance: parseFloat(user.creditsBalance || '0'),
      creditsMonthlyAllowance: parseFloat(user.creditsMonthlyAllowance || '0'),
      lastRefill: user.lastCreditRefill || null,
      usage: {
        computeHours: parseFloat(user.usageComputeHours || '0'),
        storageGb: parseFloat(user.usageStorageGb || '0'),
        bandwidthGb: parseFloat(user.usageBandwidthGb || '0'),
        deployments: user.usageDeployments || 0,
      },
      allowances: plan.allowances,
      plan,
    };
  }

  /**
   * Reset monthly usage counters
   */
  async resetMonthlyUsage(userId: string): Promise<void> {
    await storage.updateUser(userId, {
      usageComputeHours: '0.00',
      usageStorageGb: '0.00',
      usageBandwidthGb: '0.00',
      usageDeployments: 0,
      usageResetAt: new Date(),
    });

    console.log(`[Credits] Reset monthly usage for user ${userId}`);
  }

  /**
   * Update user's plan allowances and credits when subscription changes
   * Preserves existing credits balance AND current-period usage for accurate proration
   */
  async updatePlanAllowances(userId: string, tier: 'free' | 'core' | 'teams' | 'enterprise'): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const plan = getPlanByTier(tier);
    const now = new Date();
    
    // Preserve existing credits AND usage - only update allowances and monthly entitlement
    const currentBalance = parseFloat(user.creditsBalance || '0');
    
    await storage.updateUser(userId, {
      subscriptionTier: tier,
      creditsMonthlyAllowance: plan.creditsMonthly.toString(),
      // PRESERVE existing balance - don't overwrite with plan default
      // creditsBalance will be topped up on next monthly refill
      allowanceVcpus: plan.allowances.vcpus,
      allowanceRamGb: plan.allowances.ramGb,
      allowanceStorageGb: plan.allowances.storageGb,
      allowanceBandwidthGb: plan.allowances.bandwidthGb,
      // Don't reset usageResetAt - preserve current billing period
    });

    // DON'T reset usage counters - preserve for accurate proration
    // Usage will be reset on next monthly refill cycle
    // await this.resetMonthlyUsage(userId); // REMOVED

    console.log(`[Credits] Updated plan allowances for user ${userId} to ${tier} tier (preserved $${currentBalance.toFixed(2)} credits and current-period usage)`);
  }

  /**
   * Record pay-as-you-go charge for Stripe billing
   * This gets picked up by the Stripe usage worker
   */
  private async recordPayAsYouGoCharge(
    userId: string,
    metric: string,
    amount: number
  ): Promise<void> {
    // Convert dollar amount to usage quantity based on metric pricing
    let quantity = 0;
    
    switch (metric) {
      case 'compute':
        quantity = amount / METERED_PRICES.VCPU_HOUR;
        break;
      case 'storage':
        quantity = amount / METERED_PRICES.APP_STORAGE_PER_GB_MONTH;
        break;
      case 'bandwidth':
        quantity = amount / METERED_PRICES.OUTBOUND_DATA_PER_GB;
        break;
      default:
        quantity = amount; // Raw amount
    }

    console.log(
      `[Credits] Pay-as-you-go triggered for user ${userId}: ` +
      `${metric} = $${amount.toFixed(2)} (${quantity.toFixed(2)} units)`
    );

    // This will be picked up by Stripe billing
    // For now, just log - in production, this would queue for Stripe
    // You could integrate with your existing Stripe recordUsage here
  }
}

export const creditsService = new CreditsService();
