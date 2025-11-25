import { Router, Request, Response } from 'express';
import { StripePaymentService } from '../payments/stripe-service';
import { StripeBillingService } from '../services/stripe-billing-service';
import { ensureAuthenticated } from '../middleware/auth';
import { createLogger } from '../utils/logger';

const router = Router();
const paymentService = new StripePaymentService();
const billingService = new StripeBillingService();
const logger = createLogger('payments-router');

// Get available subscription plans
router.get('/plans', (_req: Request, res: Response) => {
  try {
    const plans = paymentService.getPlans();
    res.json(plans);
  } catch (error: any) {
    logger.error('Failed to fetch plans:', error);
    res.status(500).json({ error: 'Failed to fetch subscription plans' });
  }
});

// Create a new subscription
router.post('/create-subscription', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { tier, interval, paymentMethodId } = req.body;

    if (!tier) {
      return res.status(400).json({ error: 'Tier is required' });
    }

    // Map tier to plan ID based on interval
    let planId = tier.toLowerCase();
    if (interval === 'year') {
      planId = `${tier.toLowerCase()}_yearly`;
    }

    const subscription = await paymentService.createSubscription(
      userId,
      planId,
      paymentMethodId
    );

    // Extract client secret from payment intent
    let clientSecret = (subscription.latest_invoice as any)?.payment_intent?.client_secret;

    // If no payment intent (no payment method attached), create a setup intent for future payments
    if (!clientSecret && !paymentMethodId) {
      const { storage } = await import('../storage');
      const user = await storage.getUser(String(userId));
      
      if (user?.stripeCustomerId) {
        const setupIntent = await paymentService.createSetupIntent(user.stripeCustomerId);
        clientSecret = setupIntent.client_secret;
      }
    }

    res.json({
      subscriptionId: subscription.id,
      clientSecret: clientSecret || null,
      status: subscription.status
    });
  } catch (error: any) {
    logger.error('Failed to create subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to create subscription' });
  }
});

// Cancel subscription
router.post('/cancel-subscription', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await paymentService.cancelSubscription(userId);
    res.json({ success: true, message: 'Subscription cancelled successfully' });
  } catch (error: any) {
    logger.error('Failed to cancel subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

// Update subscription
router.post('/update-subscription', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { newPlanId } = req.body;

    if (!newPlanId) {
      return res.status(400).json({ error: 'New plan ID is required' });
    }

    const subscription = await paymentService.updateSubscription(userId, newPlanId);
    res.json({
      subscriptionId: subscription.id,
      status: subscription.status
    });
  } catch (error: any) {
    logger.error('Failed to update subscription:', error);
    res.status(500).json({ error: error.message || 'Failed to update subscription' });
  }
});

// Create payment intent for one-time payments
router.post('/create-payment-intent', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { amount, currency, description } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Valid amount is required' });
    }

    const paymentIntent = await paymentService.createPaymentIntent(
      userId,
      amount,
      currency || 'usd',
      description
    );

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error: any) {
    logger.error('Failed to create payment intent:', error);
    res.status(500).json({ error: error.message || 'Failed to create payment intent' });
  }
});

// Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const sig = req.headers['stripe-signature'];

    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }

    await paymentService.handleWebhook(req.body, sig as string);
    res.json({ received: true });
  } catch (error: any) {
    logger.error('Webhook error:', error);
    res.status(400).json({ error: error.message || 'Webhook handler failed' });
  }
});

// Get current subscription status
router.get('/subscription-status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { storage } = await import('../storage');
    const user = await storage.getUser(String(userId));

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      hasSubscription: !!user.stripeSubscriptionId,
      subscriptionId: user.stripeSubscriptionId,
      subscriptionStatus: user.subscriptionStatus,
      stripePriceId: user.stripePriceId,
      currentPeriodEnd: user.subscriptionCurrentPeriodEnd
    });
  } catch (error: any) {
    logger.error('Failed to fetch subscription status:', error);
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

// Get billing history
router.get('/billing-history', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { storage } = await import('../storage');
    const user = await storage.getUser(String(userId));

    if (!user?.stripeCustomerId) {
      return res.json({ invoices: [] });
    }

    // Fetch invoices from Stripe
    const invoices = await paymentService.getBillingHistory(user.stripeCustomerId);
    res.json({ invoices });
  } catch (error: any) {
    logger.error('Failed to fetch billing history:', error);
    res.status(500).json({ error: 'Failed to fetch billing history' });
  }
});

// Record usage for metered billing
router.post('/record-usage', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { metric, quantity } = req.body;

    if (!metric || !quantity) {
      return res.status(400).json({ error: 'Metric and quantity are required' });
    }

    await paymentService.recordUsage(userId, metric, quantity);
    res.json({ success: true });
  } catch (error: any) {
    logger.error('Failed to record usage:', error);
    res.status(500).json({ error: 'Failed to record usage' });
  }
});

export default router;
