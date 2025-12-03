import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

if (!stripeWebhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2024-06-20",
});

export const config = {
  api: {
    bodyParser: false,
  },
};

type StripeEventType =
  | "customer.subscription.created"
  | "customer.subscription.updated"
  | "customer.subscription.deleted"
  | "invoice.paid"
  | "invoice.payment_failed"
  | "invoice.finalized"
  | "checkout.session.completed"
  | "customer.created"
  | "customer.updated"
  | "customer.deleted"
  | "usage_record.summary.updated";

interface SubscriptionMetadata {
  userId?: string;
  planId?: string;
  [key: string]: string | undefined;
}

async function buffer(readable: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = readable.getReader();
  const chunks: Uint8Array[] = [];

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  return Buffer.concat(chunks);
}

async function handleSubscriptionCreated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = (subscription.metadata || {}) as SubscriptionMetadata;

  const userId = metadata.userId;
  const planId = metadata.planId;
  const stripeCustomerId = subscription.customer as string;
  const stripeSubscriptionId = subscription.id;
  const status = subscription.status;
  const currentPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : null;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  // TODO: Persist subscription in your database
  // Example (pseudo-code):
  // await db.subscription.upsert({
  //   where: { stripeSubscriptionId },
  //   create: {
  //     userId,
  //     planId,
  //     stripeCustomerId,
  //     stripeSubscriptionId,
  //     status,
  //     currentPeriodStart,
  //     currentPeriodEnd,
  //   },
  //   update: {
  //     status,
  //     currentPeriodStart,
  //     currentPeriodEnd,
  //   },
  // });

  console.log("Subscription created:", {
    userId,
    planId,
    stripeCustomerId,
    stripeSubscriptionId,
    status,
    currentPeriodStart,
    currentPeriodEnd,
  });
}

async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const metadata = (subscription.metadata || {}) as SubscriptionMetadata;

  const userId = metadata.userId;
  const planId = metadata.planId;
  const stripeCustomerId = subscription.customer as string;
  const stripeSubscriptionId = subscription.id;
  const status = subscription.status;
  const cancelAtPeriodEnd = subscription.cancel_at_period_end;
  const canceledAt = subscription.canceled_at
    ? new Date(subscription.canceled_at * 1000)
    : null;
  const currentPeriodStart = subscription.current_period_start
    ? new Date(subscription.current_period_start * 1000)
    : null;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  // TODO: Update subscription in your database
  // await db.subscription.update({
  //   where: { stripeSubscriptionId },
  //   data: {
  //     userId,
  //     planId,
  //     stripeCustomerId,
  //     status,
  //     cancelAtPeriodEnd,
  //     canceledAt,
  //     currentPeriodStart,
  //     currentPeriodEnd,
  //   },
  // });

  console.log("Subscription updated:", {
    userId,
    planId,
    stripeCustomerId,
    stripeSubscriptionId,
    status,
    cancelAtPeriodEnd,
    canceledAt,
    currentPeriodStart,
    currentPeriodEnd,
  });
}

async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;
  const stripeSubscriptionId = subscription.id;
  const status = subscription.status;

  // TODO: Mark subscription as canceled/ended in your database
  // await db.subscription.update({
  //   where: { stripeSubscriptionId },
  //   data: {
  //     status,
  //     canceledAt: new Date(),
  //   },
  // });

  console.log("Subscription deleted:", {
    stripeSubscriptionId,
    status,
  });
}

async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId = invoice.customer as string | null;
  const stripeSubscriptionId = invoice.subscription as string | null;
  const amountPaid = invoice.amount_paid;
  const currency = invoice.currency;
  const invoiceId = invoice.id;

  // TODO: Record successful payment in your database
  // await db.payment.create({
  //   data: {
  //     stripeInvoiceId: invoiceId,
  //     stripeCustomerId,
  //     stripeSubscriptionId,
  //     amount: amountPaid,
  //     currency,
  //     status: "paid",
  //   },
  // });

  console.log("Invoice paid:", {
    invoiceId,
    stripeCustomerId,
    stripeSubscriptionId,
    amountPaid,
    currency,
  });
}

async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;
  const stripeCustomerId = invoice.customer as string | null;
  const stripeSubscriptionId = invoice.subscription as string | null;
  const amountDue = invoice.amount_due;
  const currency = invoice.currency;
  const invoiceId = invoice.id;

  // TODO: Record failed payment and possibly notify user
  // await db.payment.create({
  //   data: {
  //     stripeInvoiceId: invoiceId,
  //     stripeCustomerId,
  //     stripeSubscriptionId,
  //     amount: amountDue,
  //     currency,
  //     status: "failed",
  //   },
  // });

  console.log("Invoice payment failed:", {
    invoiceId,
    stripeCustomerId,
    stripeSubscriptionId,
    amountDue,
    currency,
  });
}

async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  const stripeCustomerId = session.customer as string | null;
  const stripeSubscriptionId = session.subscription as string | null;
  const clientReferenceId = session.client_reference_id || null;
  const metadata = (session.metadata || {}) as SubscriptionMetadata;

  const userId = metadata.userId || clientReferenceId || undefined;
  const planId = metadata.planId;

  // TODO: Link checkout session to user/subscription in your database
  // await db.checkoutSession.create({
  //   data: {
  //     stripeSessionId: session.id,
  //     stripeCustomerId,
  //     stripeSubscriptionId,
  //     userId,
  //     planId,
  //     status: "completed",
  //   },
  // });

  console.log("Checkout session completed:", {
    sessionId: session.id,
    stripeCustomerId,
    stripeSubscriptionId,
    userId,
    planId,
  });
}

async function handleUsageRecordSummaryUpdated(event: Stripe.Event): Promise<void> {
  const summary = event.data.object as Stripe.UsageRecordSummary;

  const subscriptionItemId = summary.subscription_item;
  const totalUsage = summary.total_usage;
  const periodStart = summary.period?.start
    ? new Date(summary.period.start * 1000)
    : null;
  const periodEnd = summary.period?.end
    ? new Date(summary.period.end * 1000)
    : null;

  // TODO: Persist usage summary in your database
  // await db.usageSummary.upsert({
  //   where: {
  //     subscriptionItemId_periodStart_periodEnd: {
  //       subscriptionItemId,
  //       periodStart,
  //       periodEnd,
  //     },
  //   },
  //   create: {
  //     subscriptionItemId,
  //     totalUsage,
  //     periodStart,
 //     periodEnd,
  //   },
  //   update: {
  //     totalUsage,
  //   },
  // });

  console.log("Usage record summary updated:", {
    subscriptionItemId,
    totalUsage,
    periodStart,
    periodEnd,
  });
}

async function handleCustomerCreated(event: Stripe.Event): Promise<void> {
  const customer = event.data.object as Stripe.Customer;

  const stripeCustomerId = customer.id;
  const email = customer.email || null;
  const metadata = (customer.metadata || {}) as SubscriptionMetadata;
  const userId = metadata.userId;

  // TODO: Persist customer in your database