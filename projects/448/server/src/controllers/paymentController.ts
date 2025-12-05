import { Request, Response } from "express";
import Stripe from "stripe";
import { getRepository } from "typeorm";
import { Order } from "../entities/Order";
import { Payment } from "../entities/Payment";
import { User } from "../entities/User";
import { logger } from "../utils/logger";
import { AppError } from "../utils/AppError";
import { env } from "../config/env";

const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const FRONTEND_URL = env.FRONTEND_URL;
const WEBHOOK_SECRET = env.STRIPE_WEBHOOK_SECRET;

type CreateCheckoutSessionBody = {
  orderId: string;
  successUrl?: string;
  cancelUrl?: string;
};

export const createCheckoutSession = async (
  req: Request<unknown, unknown, CreateCheckoutSessionBody>,
  res: Response
): Promise<void> => {
  const { orderId, successUrl, cancelUrl } = req.body;

  if (!orderId) {
    throw new AppError("orderId is required", 400);
  }

  const orderRepo = getRepository(Order);
  const paymentRepo = getRepository(Payment);
  const userRepo = getRepository(User);

  const userId = (req as any).user?.id;
  if (!userId) {
    throw new AppError("Unauthorized", 401);
  }

  const order = await orderRepo.findOne({
    where: { id: orderId },
    relations: ["user"],
  });

  if (!order) {
    throw new AppError("Order not found", 404);
  }

  if (order.user.id !== userId) {
    throw new AppError("You do not have access to this order", 403);
  }

  if (order.status !== "PENDING" && order.status !== "AWAITING_PAYMENT") {
    throw new AppError("Order is not in a payable state", 400);
  }

  if (order.totalAmount <= 0) {
    throw new AppError("Order total must be greater than zero", 400);
  }

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: order.currency || "usd",
        product_data: {
          name: `Order #undefined`,
          description: `Payment for order #undefined`,
        },
        unit_amount: Math.round(order.totalAmount * 100),
      },
      quantity: 1,
    },
  ];

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: user.email,
    metadata: {
      orderId: order.id,
      userId: user.id,
    },
    success_url:
      successUrl ||
      `undefined/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:
      cancelUrl ||
      `undefined/payment/cancel?session_id={CHECKOUT_SESSION_ID}`,
  };

  const session = await stripe.checkout.sessions.create(sessionParams);

  let payment = await paymentRepo.findOne({
    where: { order: { id: order.id } },
    relations: ["order"],
  });

  if (!payment) {
    payment = paymentRepo.create({
      order,
      provider: "stripe",
      providerSessionId: session.id,
      amount: order.totalAmount,
      currency: order.currency || "usd",
      status: "PENDING",
    });
  } else {
    payment.providerSessionId = session.id;
    payment.amount = order.totalAmount;
    payment.currency = order.currency || "usd";
    payment.status = "PENDING";
  }

  await paymentRepo.save(payment);

  order.status = "AWAITING_PAYMENT";
  await orderRepo.save(order);

  res.status(201).json({
    id: session.id,
    url: session.url,
    amount: order.totalAmount,
    currency: order.currency || "usd",
  });
};

export const getCheckoutSession = async (
  req: Request<{ sessionId: string }>,
  res: Response
): Promise<void> => {
  const { sessionId } = req.params;

  if (!sessionId) {
    throw new AppError("sessionId is required", 400);
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["payment_intent"],
  });

  res.status(200).json(session);
};

export const stripeWebhook = async (req: Request, res: Response): Promise<void> => {
  const sig = req.headers["stripe-signature"];

  if (!sig || Array.isArray(sig)) {
    logger.warn("Missing or invalid Stripe signature header");
    res.status(400).send("Webhook Error: Missing signature");
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      (req as any).rawBody || req.body,
      sig,
      WEBHOOK_SECRET
    );
  } catch (err: any) {
    logger.error("Stripe webhook signature verification failed", {
      error: err?.message,
    });
    res.status(400).send(`Webhook Error: undefined`);
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_succeeded":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "checkout.session.async_payment_failed":
        await handleCheckoutSessionFailed(event.data.object as Stripe.Checkout.Session);
        break;
      case "payment_intent.payment_failed":
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        logger.info("Unhandled Stripe event type", { type: event.type });
    }

    res.json({ received: true });
  } catch (err: any) {
    logger.error("Error processing Stripe webhook", {
      type: event.type,
      error: err?.message,
    });
    res.status(500).send("Webhook handler error");
  }
};

const handleCheckoutSessionCompleted = async (
  session: Stripe.Checkout.Session
): Promise<void> => {
  const orderId = session.metadata?.orderId;
  const userId = session.metadata?.userId;
  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : session.payment_intent?.id;

  if (!orderId) {
    logger.error("checkout.session.completed missing orderId in metadata", {
      sessionId: session.id,
    });
    return;
  }

  const orderRepo = getRepository(Order);
  const paymentRepo = getRepository(Payment);

  const order = await orderRepo.findOne({
    where: { id: orderId },
    relations: ["user"],
  });

  if (!order) {
    logger.error("Order not found for checkout.session.completed", {
      orderId,
      sessionId: session.id,
    });
    return;
  }

  let payment = await paymentRepo.findOne({
    where: { order: { id: order.id } },
    relations: ["order"],
  });

  if (!payment) {
    payment = paymentRepo.create({
      order,
      provider: "stripe",
      providerSessionId: session.id,
      providerPaymentId: paymentIntentId || undefined,
      amount: (session.amount_total || 0) / 100,
      currency: session.currency || order.currency || "usd",
      status: "SUCCEEDED",
    });
  } else {
    payment.providerSessionId = session.id;
    payment.providerPaymentId = paymentIntentId || payment.providerPaymentId;
    payment.amount =
      session.amount_total != null
        ? session.amount_total / 100
        : payment.amount || order.totalAmount;
    payment.currency = session.currency || payment.currency || order.currency || "usd";
    payment.status = "SUCCEEDED";
  }

  await paymentRepo.save(payment);

  order.status = "PAID";
  order.paidAt = new Date();
  await orderRepo.save(order);

  logger.info("Order payment succeeded", {
    orderId: order.id,
    userId: userId || order.user.id,
    sessionId: session.id,
  });
};

const handleCheckoutSessionFailed = async (
  session: Stripe.Checkout.Session
): Promise<void> => {
  const orderId = session.metadata?.orderId;

  if (!orderId) {
    logger.error("checkout.session.async_payment_failed missing orderId", {
      sessionId: session.id,
    });
    return;
  }

  const orderRepo = getRepository(Order);
  const paymentRepo = getRepository(Payment);

  const order = await orderRepo.findOne({
    where: { id: orderId },
  });

  if (!order) {
    logger.error("Order not found for async_payment_failed", {
      orderId,
      sessionId: session.id,
    });
    return;
  }

  const payment = await paymentRepo.findOne({
    where: { order: { id: order.id } },
    relations: ["order"],
  });

  if (payment) {
    payment.status = "FAILED";
    await paymentRepo.save(payment);
  }

  order