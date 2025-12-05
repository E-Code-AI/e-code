import express, { Request, Response, NextFunction } from "express";
import Stripe from "stripe";
import bodyParser from "body-parser";
import { z } from "zod";

const router = express.Router();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not defined in environment variables");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

type OrderStatus = "pending" | "paid" | "failed" | "canceled";

interface Order {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  stripePaymentIntentId?: string;
  stripeCheckoutSessionId?: string;
  metadata?: Record<string, string>;
}

interface User {
  id: string;
  email: string;
}

interface AuthenticatedRequest extends Request {
  user?: User;
}

const orderStore: Map<string, Order> = new Map();

const createCheckoutSessionSchema = z.object({
  orderId: z.string().min(1),
  successUrl: z.string().url(),
  cancelUrl: z.string().url(),
});

const confirmPaymentSchema = z.object({
  orderId: z.string().min(1),
});

function asyncHandler<
  P = Record<string, unknown>,
  ResBody = unknown,
  ReqBody = unknown,
  ReqQuery = Record<string, unknown>
>(
  fn: (
    req: Request<P, ResBody, ReqBody, ReqQuery>,
    res: Response<ResBody>,
    next: NextFunction
  ) => Promise<unknown>
) {
  return (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

function getOrderById(orderId: string): Order | null {
  return orderStore.get(orderId) ?? null;
}

function updateOrder(orderId: string, updates: Partial<Order>): Order | null {
  const existing = orderStore.get(orderId);
  if (!existing) return null;
  const updated: Order = { ...existing, ...updates };
  orderStore.set(orderId, updated);
  return updated;
}

function setOrderStatus(orderId: string, status: OrderStatus): Order | null {
  return updateOrder(orderId, { status });
}

router.post(
  "/create-checkout-session",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parseResult = createCheckoutSessionSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Invalid request body",
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { orderId, successUrl, cancelUrl } = parseResult.data;

    const order = getOrderById(orderId);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (order.status !== "pending") {
      res.status(400).json({ error: "Order is not in a payable state" });
      return;
    }

    const userEmail = req.user?.email;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: order.currency,
            product_data: {
              name: `Order #undefined`,
            },
            unit_amount: Math.round(order.amount * 100),
          },
          quantity: 1,
        },
      ],
      customer_email: userEmail,
      metadata: {
        orderId: order.id,
        ...(order.metadata || {}),
      },
      success_url: `undefined?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
    });

    updateOrder(order.id, {
      stripeCheckoutSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : undefined,
    });

    res.status(200).json({
      sessionId: session.id,
      url: session.url,
    });
  })
);

router.post(
  "/webhook",
  bodyParser.raw({ type: "application/json" }),
  asyncHandler(async (req: Request, res: Response) => {
    let event: Stripe.Event;

    if (!stripeWebhookSecret) {
      res.status(500).json({ error: "Stripe webhook secret is not configured" });
      return;
    }

    const sig = req.headers["stripe-signature"];
    if (!sig || typeof sig !== "string") {
      res.status(400).json({ error: "Missing Stripe signature header" });
      return;
    }

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, stripeWebhookSecret);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      res.status(400).json({ error: `Webhook Error: undefined` });
      return;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = (session.metadata && session.metadata.orderId) || undefined;

        if (!orderId) break;

        const order = getOrderById(orderId);
        if (!order) break;

        setOrderStatus(orderId, "paid");
        updateOrder(orderId, {
          stripeCheckoutSessionId: session.id,
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : undefined,
        });
        break;
      }
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = (paymentIntent.metadata && paymentIntent.metadata.orderId) || undefined;

        if (!orderId) break;

        const order = getOrderById(orderId);
        if (!order) break;

        setOrderStatus(orderId, "paid");
        updateOrder(orderId, {
          stripePaymentIntentId: paymentIntent.id,
        });
        break;
      }
      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const orderId = (paymentIntent.metadata && paymentIntent.metadata.orderId) || undefined;

        if (!orderId) break;

        const order = getOrderById(orderId);
        if (!order) break;

        setOrderStatus(orderId, "failed");
        updateOrder(orderId, {
          stripePaymentIntentId: paymentIntent.id,
        });
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  })
);

router.get(
  "/payment-status/:orderId",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { orderId } = req.params;

    if (!orderId) {
      res.status(400).json({ error: "Missing orderId parameter" });
      return;
    }

    const order = getOrderById(orderId);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    res.status(200).json({
      orderId: order.id,
      status: order.status,
      amount: order.amount,
      currency: order.currency,
      stripePaymentIntentId: order.stripePaymentIntentId,
      stripeCheckoutSessionId: order.stripeCheckoutSessionId,
    });
  })
);

router.post(
  "/confirm-payment",
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parseResult = confirmPaymentSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({
        error: "Invalid request body",
        details: parseResult.error.flatten(),
      });
      return;
    }

    const { orderId } = parseResult.data;

    const order = getOrderById(orderId);
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    if (!order.stripePaymentIntentId && !order.stripeCheckoutSessionId) {
      res.status(400).json({
        error: "No Stripe payment information associated with this order",
      });
      return;
    }

    let paymentIntentId = order.stripePaymentIntentId;

    if (!paymentIntentId && order.stripeCheckoutSessionId) {
      const session = await stripe.checkout.sessions.retrieve(order.stripeCheckoutSessionId);
      if (typeof session.payment_intent === "string") {
        paymentIntentId = session.payment_intent;
        updateOrder(order.id, { stripePaymentIntentId: paymentIntentId });
      }
    }

    if (!paymentIntentId) {
      res.status(400).json({
        error: "Unable to determine payment intent for this order",
      });
      return;
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    let newStatus: OrderStatus = order.status;

    if (paymentIntent.status === "succeeded") {
      newStatus = "paid";
    } else if (paymentIntent.status === "requires_payment_method" || paymentIntent.status === "canceled") {
      newStatus = "failed";