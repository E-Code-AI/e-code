import Stripe from 'stripe';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
  typescript: true,
});

export const getStripeWebhookSecret = (): string | undefined => {
  return stripeWebhookSecret;
};

export interface CreatePaymentIntentParams {
  amount: number;
  currency: string;
  customerId?: string;
  description?: string;
  metadata?: Stripe.MetadataParam;
  receiptEmail?: string;
  paymentMethodTypes?: string[];
  automaticPaymentMethods?: Stripe.PaymentIntentCreateParams.AutomaticPaymentMethods;
}

export const createPaymentIntent = async (
  params: CreatePaymentIntentParams
): Promise<Stripe.PaymentIntent> => {
  const {
    amount,
    currency,
    customerId,
    description,
    metadata,
    receiptEmail,
    paymentMethodTypes,
    automaticPaymentMethods,
  } = params;

  const createParams: Stripe.PaymentIntentCreateParams = {
    amount,
    currency,
    description,
    metadata,
    receipt_email: receiptEmail,
  };

  if (customerId) {
    createParams.customer = customerId;
  }

  if (paymentMethodTypes && paymentMethodTypes.length > 0) {
    createParams.payment_method_types = paymentMethodTypes;
  } else if (automaticPaymentMethods) {
    createParams.automatic_payment_methods = automaticPaymentMethods;
  } else {
    createParams.automatic_payment_methods = { enabled: true };
  }

  return stripe.paymentIntents.create(createParams);
};

export const retrievePaymentIntent = async (
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> => {
  return stripe.paymentIntents.retrieve(paymentIntentId);
};

export const confirmPaymentIntent = async (
  paymentIntentId: string,
  params?: Stripe.PaymentIntentConfirmParams
): Promise<Stripe.PaymentIntent> => {
  return stripe.paymentIntents.confirm(paymentIntentId, params);
};

export const cancelPaymentIntent = async (
  paymentIntentId: string,
  params?: Stripe.PaymentIntentCancelParams
): Promise<Stripe.PaymentIntent> => {
  return stripe.paymentIntents.cancel(paymentIntentId, params);
};

export interface CreateCheckoutSessionParams {
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  mode?: Stripe.Checkout.SessionCreateParams.Mode;
  metadata?: Stripe.MetadataParam;
  allowPromotionCodes?: boolean;
  automaticTaxEnabled?: boolean;
}

export const createCheckoutSession = async (
  params: CreateCheckoutSessionParams
): Promise<Stripe.Checkout.Session> => {
  const {
    successUrl,
    cancelUrl,
    customerId,
    customerEmail,
    lineItems,
    mode = 'payment',
    metadata,
    allowPromotionCodes,
    automaticTaxEnabled,
  } = params;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    success_url: successUrl,
    cancel_url: cancelUrl,
    line_items: lineItems,
    mode,
    metadata,
  };

  if (customerId) {
    sessionParams.customer = customerId;
  } else if (customerEmail) {
    sessionParams.customer_email = customerEmail;
  }

  if (typeof allowPromotionCodes === 'boolean') {
    sessionParams.allow_promotion_codes = allowPromotionCodes;
  }

  if (typeof automaticTaxEnabled === 'boolean') {
    sessionParams.automatic_tax = { enabled: automaticTaxEnabled };
  }

  return stripe.checkout.sessions.create(sessionParams);
};

export const retrieveCheckoutSession = async (
  sessionId: string
): Promise<Stripe.Checkout.Session> => {
  return stripe.checkout.sessions.retrieve(sessionId);
};

export const constructWebhookEvent = (
  payload: Buffer | string,
  signature: string | string[] | undefined
): Stripe.Event => {
  if (!stripeWebhookSecret) {
    throw new Error('Missing STRIPE_WEBHOOK_SECRET environment variable');
  }

  if (!signature || Array.isArray(signature)) {
    throw new Error('Invalid Stripe signature header');
  }

  const payloadString = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload;

  return stripe.webhooks.constructEvent(payloadString, signature, stripeWebhookSecret);
};

export const createCustomer = async (
  params: Stripe.CustomerCreateParams
): Promise<Stripe.Customer> => {
  return stripe.customers.create(params);
};

export const retrieveCustomer = async (
  customerId: string
): Promise<Stripe.Customer | Stripe.DeletedCustomer> => {
  return stripe.customers.retrieve(customerId);
};

export const updateCustomer = async (
  customerId: string,
  params: Stripe.CustomerUpdateParams
): Promise<Stripe.Customer | Stripe.DeletedCustomer> => {
  return stripe.customers.update(customerId, params);
};

export const detachPaymentMethod = async (
  paymentMethodId: string
): Promise<Stripe.PaymentMethod> => {
  return stripe.paymentMethods.detach(paymentMethodId);
};

export const listCustomerPaymentMethods = async (
  customerId: string,
  type: Stripe.PaymentMethodListParams.Type = 'card'
): Promise<Stripe.ApiList<Stripe.PaymentMethod>> => {
  return stripe.paymentMethods.list({
    customer: customerId,
    type,
  });
};

export const createRefund = async (
  params: Stripe.RefundCreateParams
): Promise<Stripe.Refund> => {
  return stripe.refunds.create(params);
};

export const retrieveRefund = async (refundId: string): Promise<Stripe.Refund> => {
  return stripe.refunds.retrieve(refundId);
};

export const getStripePublicConfig = () => {
  return {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  };
};