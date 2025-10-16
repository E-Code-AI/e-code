import Stripe from 'stripe';
import { storage } from '../storage';
import { getSubscriptionPeriodBoundary } from '../services/stripe-utils';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-07-30.basil',
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    projects: number;
    collaborators: number;
    storage: number; // GB
    cpuHours: number;
    deployments: number;
  };
}

export interface UsageRecord {
  userId: number;
  metric: 'cpu_hours' | 'storage' | 'bandwidth' | 'deployments' | 'ai_tokens';
  quantity: number;
  timestamp: Date;
}

export class StripePaymentService {
  private plans: Map<string, SubscriptionPlan> = new Map();

  constructor() {
    this.initializePlans();
  }

  private initializePlans() {
    // Core Plan
    this.plans.set('core', {
      id: process.env.STRIPE_PRICE_ID_CORE || 'price_core',
      name: 'Core',
      price: 20,
      interval: 'month',
      features: [
        'Unlimited public projects',
        '5 private projects', 
        '2 collaborators per project',
        '10GB storage',
        '100 CPU hours/month',
        '10 deployments/month',
      ],
      limits: {
        projects: 5,
        collaborators: 2,
        storage: 10,
        cpuHours: 100,
        deployments: 10,
      },
    });

    // Pro Plan
    this.plans.set('pro', {
      id: process.env.STRIPE_PRICE_ID_PRO || 'price_pro',
      name: 'Pro',
      price: 40,
      interval: 'month',
      features: [
        'Unlimited projects',
        'Unlimited collaborators',
        '50GB storage',
        '500 CPU hours/month',
        'Unlimited deployments',
        'Priority support',
      ],
      limits: {
        projects: -1, // Unlimited
        collaborators: -1,
        storage: 50,
        cpuHours: 500,
        deployments: -1,
      },
    });

    // Enterprise Plan
    this.plans.set('enterprise', {
      id: process.env.STRIPE_PRICE_ID_ENTERPRISE_MONTHLY || 'price_enterprise',
      name: 'Enterprise',
      price: 200,
      interval: 'month',
      features: [
        'Everything in Pro',
        'Custom domains',
        'SSO/SAML',
        'Dedicated support',
        'SLA guarantee',
        '1TB storage',
        'Unlimited CPU hours',
      ],
      limits: {
        projects: -1,
        collaborators: -1,
        storage: 1000,
        cpuHours: -1,
        deployments: -1,
      },
    });
  }

  async createCustomer(userId: number, email: string, name?: string): Promise<string> {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        userId: String(userId),
      },
    });

    // Save customer ID to user record
    await storage.updateUser(userId, { stripeCustomerId: customer.id });

    return customer.id;
  }

  async createSubscription(
    userId: number, 
    planId: string,
    paymentMethodId?: string
  ): Promise<Stripe.Subscription> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Create customer if doesn't exist
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      customerId = await this.createCustomer(
        userId,
        user.email ?? '',
        user.username ?? undefined
      );
    }

    // Attach payment method if provided
    if (paymentMethodId) {
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    const plan = this.plans.get(planId);
    if (!plan) {
      throw new Error('Invalid plan');
    }

    // Create subscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: plan.id }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: String(userId),
        planId,
      },
    });

    // Update user subscription info
    const periodEnd = getSubscriptionPeriodBoundary(subscription, 'current_period_end');

    await storage.updateUser(userId, {
      stripeSubscriptionId: subscription.id,
      stripePriceId: plan.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: periodEnd ?? undefined,
    });

    return subscription;
  }

  async cancelSubscription(userId: number): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user || !user.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const subscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );

    await storage.updateUser(userId, {
      subscriptionStatus: 'canceled',
    });
  }

  async updateSubscription(userId: number, newPlanId: string): Promise<Stripe.Subscription> {
    const user = await storage.getUser(userId);
    if (!user || !user.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const plan = this.plans.get(newPlanId);
    if (!plan) {
      throw new Error('Invalid plan');
    }

    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
      expand: ['items']
    });

    const primaryItem = subscription.items.data[0];
    if (!primaryItem?.id) {
      throw new Error('Unable to determine subscription item for update');
    }

    // Update subscription
    const updatedSubscription = await stripe.subscriptions.update(
      user.stripeSubscriptionId,
      {
        items: [{
          id: primaryItem.id,
          price: plan.id,
        }],
        proration_behavior: 'create_prorations',
      }
    );

    // Update user info
    await storage.updateUser(userId, {
      stripePriceId: plan.id,
      subscriptionStatus: updatedSubscription.status,
    });

    return updatedSubscription;
  }

  async createPaymentIntent(
    userId: number,
    amount: number,
    currency: string = 'usd',
    description?: string
  ): Promise<Stripe.PaymentIntent> {
    const user = await storage.getUser(userId);
    if (!user) {
      throw new Error('User not found');
    }

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      customerId = await this.createCustomer(
        userId,
        user.email ?? '',
        user.username ?? undefined
      );
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency,
      customer: customerId,
      description,
      metadata: {
        userId: String(userId),
      },
    });

    return paymentIntent;
  }

  async recordUsage(userId: number, metric: string, quantity: number): Promise<void> {
    const user = await storage.getUser(userId);
    if (!user || !user.stripeSubscriptionId) {
      return; // Free tier user
    }

    // Get usage-based price IDs from environment
    const usagePriceIds: Record<string, string> = {
      cpu_hours: process.env.STRIPE_PRICE_ID_COMPUTE || '',
      storage: process.env.STRIPE_PRICE_ID_STORAGE || '',
      bandwidth: process.env.STRIPE_PRICE_ID_BANDWIDTH || '',
      deployments: process.env.STRIPE_PRICE_ID_DEPLOYMENT || '',
      ai_tokens: process.env.STRIPE_PRICE_ID_AGENT_USAGE || '',
    };

    const priceId = usagePriceIds[metric];
    if (!priceId) {
      console.warn(`No price ID configured for metric: ${metric}`);
      return;
    }

    // Get subscription
    const subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId, {
      expand: ['items']
    });

    // Find or create usage subscription item
    let usageItem = subscription.items.data.find(item => item.price?.id === priceId);

    if (!usageItem) {
      // Add usage-based item to subscription
      usageItem = await stripe.subscriptionItems.create({
        subscription: user.stripeSubscriptionId,
        price: priceId,
      });
    }

    // Record usage
    const usageItemId = usageItem.id;
    if (!usageItemId) {
      throw new Error('Unable to determine subscription item identifier for usage record');
    }

    await (stripe.subscriptionItems as any).createUsageRecord(usageItemId, {
      quantity: Math.ceil(quantity),
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment',
    });

    // Store usage record
    const usageRecord: UsageRecord = {
      userId,
      metric: metric as any,
      quantity,
      timestamp: new Date(),
    };

    await this.saveUsageRecord(usageRecord);
  }

  async getUsageReport(userId: number, startDate: Date, endDate: Date): Promise<Record<string, number>> {
    // Get usage records from storage
    const records = await this.getUsageRecords(userId, startDate, endDate);
    
    const usage: Record<string, number> = {
      cpu_hours: 0,
      storage: 0,
      bandwidth: 0,
      deployments: 0,
      ai_tokens: 0,
    };

    for (const record of records) {
      usage[record.metric] += record.quantity;
    }

    return usage;
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('Webhook secret not configured');
    }

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Webhook signature verification failed: ${error.message}`);
    }

    // Handle different event types
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdate(event.data.object as Stripe.Subscription);
        break;
        
      case 'customer.subscription.deleted':
        await this.handleSubscriptionCanceled(event.data.object as Stripe.Subscription);
        break;
        
      case 'invoice.payment_succeeded':
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;
        
      case 'invoice.payment_failed':
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;
        
      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  private async handleSubscriptionUpdate(subscription: Stripe.Subscription) {
    const userId = parseInt(subscription.metadata.userId);
    if (!userId) return;

    await storage.updateUser(userId, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionCurrentPeriodEnd: getSubscriptionPeriodBoundary(
        subscription,
        'current_period_end'
      ) ?? undefined,
    });
  }

  private async handleSubscriptionCanceled(subscription: Stripe.Subscription) {
    const userId = parseInt(subscription.metadata.userId);
    if (!userId) return;

    await storage.updateUser(userId, {
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
      stripePriceId: null,
    });
  }

  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    console.log(`Payment succeeded for invoice: ${invoice.id}`);
    // Could send email notification, update credits, etc.
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    console.log(`Payment failed for invoice: ${invoice.id}`);
    // Could send email notification, restrict access, etc.
  }

  private async saveUsageRecord(record: UsageRecord): Promise<void> {
    // Save to database
    // In production, this would use a proper database table
    console.log('Saving usage record:', record);
  }

  private async getUsageRecords(
    userId: number, 
    startDate: Date, 
    endDate: Date
  ): Promise<UsageRecord[]> {
    // Fetch from database
    // In production, this would query a proper database table
    return [];
  }

  getPlans(): SubscriptionPlan[] {
    return Array.from(this.plans.values());
  }

  getPlan(planId: string): SubscriptionPlan | undefined {
    return this.plans.get(planId);
  }
}

export const stripeService = new StripePaymentService();