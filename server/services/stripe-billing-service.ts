import Stripe from 'stripe';
import { storage } from '../storage';
import { createLogger } from '../utils/logger';
import { resourceMonitor } from './resource-monitor';

const logger = createLogger('stripe-billing');

export class StripeBillingService {
  private stripe: Stripe;
  private priceIds: Map<string, string> = new Map();
  
  constructor() {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY is required');
    }
    
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-07-30.basil',
    });
    
    // Initialize price IDs for metered billing
    this.initializePriceIds();
  }
  
  private initializePriceIds() {
    // Map resource types to Stripe price IDs
    this.priceIds.set('compute_cpu', process.env.STRIPE_PRICE_ID_COMPUTE || '');
    this.priceIds.set('storage', process.env.STRIPE_PRICE_ID_STORAGE || '');
    this.priceIds.set('bandwidth', process.env.STRIPE_PRICE_ID_BANDWIDTH || '');
    this.priceIds.set('deployment', process.env.STRIPE_PRICE_ID_DEPLOYMENT || '');
    this.priceIds.set('database_storage', process.env.STRIPE_PRICE_ID_DATABASE || '');
    this.priceIds.set('agent_requests', process.env.STRIPE_PRICE_ID_AGENT_USAGE || '');
  }
  
  async createCustomer(userId: number, email: string, username: string): Promise<string> {
    try {
      const customer = await this.stripe.customers.create({
        email,
        name: username,
        metadata: {
          userId: userId.toString(),
        },
      });
      
      await storage.updateStripeCustomerId(userId, customer.id);
      logger.info(`Created Stripe customer ${customer.id} for user ${userId}`);
      
      return customer.id;
    } catch (error) {
      logger.error('Failed to create Stripe customer:', error);
      throw error;
    }
  }
  
  async createSubscription(userId: number, planId: string): Promise<Stripe.Subscription> {
    try {
      const user = await storage.getUser(userId);
      if (!user) throw new Error('User not found');
      
      let customerId = user.stripeCustomerId;
      if (!customerId) {
        customerId = await this.createCustomer(userId, user.email || '', user.username || '');
      }
      
      // Get base price ID for the plan
      const basePriceId = this.getBasePriceId(planId);
      
      // Create subscription with base plan and metered prices
      const subscription = await this.stripe.subscriptions.create({
        customer: customerId,
        items: [
          { price: basePriceId }, // Base subscription price
          ...this.getMeteredPriceItems(), // Add all metered price items
        ],
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          userId: userId.toString(),
          planId,
        },
      });
      
      // Update user's subscription info
      await storage.updateUserStripeInfo(userId, {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        subscriptionStatus: subscription.status,
        subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
      });
      
      logger.info(`Created subscription ${subscription.id} for user ${userId}`);
      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription:', error);
      throw error;
    }
  }
  
  private getBasePriceId(planId: string): string {
    const priceMap: Record<string, string> = {
      starter: process.env.STRIPE_PRICE_ID_STARTER || '',
      core: process.env.STRIPE_PRICE_ID_CORE || '',
      pro: process.env.STRIPE_PRICE_ID_PRO || '',
      enterprise: process.env.STRIPE_PRICE_ID_ENTERPRISE || '',
    };
    
    return priceMap[planId] || priceMap.core;
  }
  
  private getMeteredPriceItems(): Array<{ price: string }> {
    return Array.from(this.priceIds.values())
      .filter(priceId => priceId) // Only include configured prices
      .map(priceId => ({ price: priceId }));
  }
  
  async reportUsage(userId: number, metricType: string, quantity: number): Promise<void> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.stripeSubscriptionId) {
        logger.warn(`User ${userId} has no active subscription`);
        return;
      }
      
      const priceId = this.priceIds.get(metricType);
      if (!priceId) {
        logger.warn(`No price ID configured for metric type: ${metricType}`);
        return;
      }
      
      // Find the subscription item for this price
      const subscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const subscriptionItem = subscription.items.data.find(item => item.price.id === priceId);
      
      if (!subscriptionItem) {
        logger.warn(`No subscription item found for price ${priceId}`);
        return;
      }
      
      // Report usage to Stripe using the correct method
      const usageRecord = await this.stripe.billing.meters.createEvent({
        event_name: metricType,
        payload: {
          stripe_customer_id: user.stripeCustomerId!,
          value: quantity.toString(),
        },
        identifier: `${userId}-${Date.now()}`,
        timestamp: Math.floor(Date.now() / 1000),
      });
      
      logger.info(`Reported usage for user ${userId}: ${metricType} = ${quantity}`);
    } catch (error) {
      logger.error('Failed to report usage to Stripe:', error);
      // Don't throw - we don't want to break the app if usage reporting fails
    }
  }
  
  async syncAllUsageToStripe(): Promise<void> {
    try {
      logger.info('Starting usage sync to Stripe');
      
      // Get all users with active subscriptions
      const users = await storage.getAllUsers();
      
      for (const user of users) {
        if (!user.stripeSubscriptionId) continue;
        
        // Get usage for the current billing period
        const billingPeriodStart = await this.getBillingPeriodStart(user.stripeSubscriptionId);
        const usage = await storage.getUserUsage(user.id, billingPeriodStart);
        
        // Report each metric to Stripe
        for (const [metricType, data] of Object.entries(usage)) {
          if (data && typeof data === 'object' && 'used' in data && data.used > 0) {
            await this.reportUsage(user.id, metricType, data.used);
          }
        }
      }
      
      logger.info('Completed usage sync to Stripe');
    } catch (error) {
      logger.error('Failed to sync usage to Stripe:', error);
    }
  }
  
  private async getBillingPeriodStart(subscriptionId: string): Promise<Date> {
    const subscription = await this.stripe.subscriptions.retrieve(subscriptionId);
    return new Date(subscription.current_period_start * 1000);
  }
  
  async enforceUsageLimits(userId: number): Promise<boolean> {
    try {
      const user = await storage.getUser(userId);
      if (!user) return false;
      
      const plan = 'starter'; // Default plan, will be updated from subscription
      const limits = this.getPlanLimits(plan);
      const usage = await storage.getUserUsage(userId);
      
      // Check each resource against limits
      for (const [resource, limit] of Object.entries(limits)) {
        if (limit === -1) continue; // Unlimited
        
        const used = usage[resource]?.used || 0;
        if (used >= limit) {
          logger.warn(`User ${userId} exceeded ${resource} limit: ${used}/${limit}`);
          return false; // Limit exceeded
        }
      }
      
      return true; // Within limits
    } catch (error) {
      logger.error('Failed to enforce usage limits:', error);
      return true; // Allow on error to avoid blocking users
    }
  }
  
  private getPlanLimits(plan: string): Record<string, number> {
    const limits: Record<string, Record<string, number>> = {
      starter: {
        compute_cpu: 0,
        storage: 1,
        bandwidth: 10,
        deployments: 1,
        databases: 0,
        agent_requests: 0,
      },
      core: {
        compute_cpu: 100,
        storage: 10,
        bandwidth: 100,
        deployments: 10,
        databases: 3,
        agent_requests: 500,
      },
      pro: {
        compute_cpu: 500,
        storage: 50,
        bandwidth: 500,
        deployments: -1, // Unlimited
        databases: 10,
        agent_requests: 2000,
      },
      enterprise: {
        compute_cpu: -1,
        storage: -1,
        bandwidth: -1,
        deployments: -1,
        databases: -1,
        agent_requests: -1,
      },
    };
    
    return limits[plan] || limits.starter;
  }
  
  async generateInvoice(userId: number): Promise<string> {
    try {
      const user = await storage.getUser(userId);
      if (!user?.stripeCustomerId) {
        throw new Error('User has no Stripe customer ID');
      }
      
      // Create an invoice with usage details
      const invoice = await this.stripe.invoices.create({
        customer: user.stripeCustomerId,
        auto_advance: false, // Don't automatically finalize
        description: 'E-Code Platform Usage',
      });
      
      // Add custom line items for detailed breakdown
      const usage = await storage.getUserUsage(userId);
      
      for (const [metricType, data] of Object.entries(usage)) {
        if (data && typeof data === 'object' && 'used' in data && 'cost' in data && data.used > 0 && data.cost > 0) {
          await this.stripe.invoiceItems.create({
            customer: user.stripeCustomerId,
            invoice: invoice.id,
            description: `${metricType.replace(/_/g, ' ')} usage: ${data.used} ${data.unit}`,
            amount: Math.round(data.cost * 100), // Convert to cents
            currency: 'eur',
          });
        }
      }
      
      // Finalize the invoice
      const finalizedInvoice = await this.stripe.invoices.finalizeInvoice(invoice.id);
      
      logger.info(`Generated invoice ${finalizedInvoice.id} for user ${userId}`);
      return finalizedInvoice.hosted_invoice_url || '';
    } catch (error) {
      logger.error('Failed to generate invoice:', error);
      throw error;
    }
  }
  
  async handleWebhook(event: Stripe.Event): Promise<void> {
    try {
      switch (event.type) {
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionUpdate(subscription);
          break;
          
        case 'invoice.payment_succeeded':
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentSuccess(invoice);
          break;
          
        case 'invoice.payment_failed':
          const failedInvoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentFailure(failedInvoice);
          break;
      }
    } catch (error) {
      logger.error('Failed to handle webhook:', error);
      throw error;
    }
  }
  
  private async handleSubscriptionUpdate(subscription: Stripe.Subscription): Promise<void> {
    const userId = parseInt(subscription.metadata.userId);
    if (!userId) return;
    
    await storage.updateUserStripeInfo(userId, {
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });
    
    logger.info(`Updated subscription status for user ${userId}: ${subscription.status}`);
  }
  
  private async handlePaymentSuccess(invoice: Stripe.Invoice): Promise<void> {
    logger.info(`Payment succeeded for invoice ${invoice.id}`);
    // Could reset usage counters or update user status here
  }
  
  private async handlePaymentFailure(invoice: Stripe.Invoice): Promise<void> {
    logger.warn(`Payment failed for invoice ${invoice.id}`);
    // Could suspend user access or send notification
  }
}

// Export singleton instance
export const stripeBillingService = new StripeBillingService();

// Schedule periodic usage sync (every hour)
setInterval(() => {
  stripeBillingService.syncAllUsageToStripe().catch(error => {
    logger.error('Failed to sync usage in scheduled job:', error);
  });
}, 60 * 60 * 1000); // 1 hour