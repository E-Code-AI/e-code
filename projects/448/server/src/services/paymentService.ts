import Stripe from 'stripe';
import { Request } from 'express';
import dotenv from 'dotenv';

dotenv.config();

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

if (!stripeWebhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not defined in environment variables');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
});

export type Currency = 'usd' | 'eur' | 'gbp' | string;

export interface CreatePaymentIntentParams {
  amount: number;
  currency: Currency;
  customerId?: string;
  description?: string;
  metadata?: Stripe.MetadataParam;
  receiptEmail?: string;
  paymentMethodTypes?: string[];
  automaticPaymentMethods?: boolean;
}

export interface CreateCheckoutSessionParams {
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  mode: Stripe.Checkout.SessionCreateParams.Mode;
  lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
  metadata?: Stripe.MetadataParam;
  allowPromotionCodes?: boolean;
  automaticTaxEnabled?: boolean;
  clientReferenceId?: string;
}

export interface VerifyWebhookSignatureParams {
  payload: Buffer | string;
  signature: string | string[] | undefined;
}

export interface PaymentService {
  createPaymentIntent(
    params: CreatePaymentIntentParams
  ): Promise<Stripe.Response<Stripe.PaymentIntent>>;
  retrievePaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.Response<Stripe.PaymentIntent>>;
  cancelPaymentIntent(
    paymentIntentId: string
  ): Promise<Stripe.Response<Stripe.PaymentIntent>>;
  createCheckoutSession(
    params: CreateCheckoutSessionParams
  ): Promise<Stripe.Response<Stripe.Checkout.Session>>;
  retrieveCheckoutSession(
    sessionId: string
  ): Promise<Stripe.Response<Stripe.Checkout.Session>>;
  verifyWebhookSignature(
    params: VerifyWebhookSignatureParams
  ): Stripe.Event;
}

const DEFAULT_PAYMENT_METHOD_TYPES = ['card'];

const buildAutomaticPaymentMethodsConfig = (
  automaticPaymentMethods?: boolean
): Stripe.PaymentIntentCreateParams.AutomaticPaymentMethods | undefined => {
  if (automaticPaymentMethods === undefined) return undefined;
  return { enabled: automaticPaymentMethods };
};

export const paymentService: PaymentService = {
  async createPaymentIntent(params: CreatePaymentIntentParams) {
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

    if (!amount || amount <= 0) {
      throw new Error('Amount must be a positive integer representing the smallest currency unit');
    }

    if (!currency) {
      throw new Error('Currency is required to create a payment intent');
    }

    const createParams: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      description,
      metadata,
      receipt_email: receiptEmail,
      customer: customerId,
    };

    if (automaticPaymentMethods) {
      createParams.automatic_payment_methods = buildAutomaticPaymentMethodsConfig(
        automaticPaymentMethods
      );
    } else {
      createParams.payment_method_types = paymentMethodTypes || DEFAULT_PAYMENT_METHOD_TYPES;
    }

    return stripe.paymentIntents.create(createParams);
  },

  async retrievePaymentIntent(paymentIntentId: string) {
    if (!paymentIntentId) {
      throw new Error('paymentIntentId is required');
    }

    return stripe.paymentIntents.retrieve(paymentIntentId);
  },

  async cancelPaymentIntent(paymentIntentId: string) {
    if (!paymentIntentId) {
      throw new Error('paymentIntentId is required');
    }

    return stripe.paymentIntents.cancel(paymentIntentId);
  },

  async createCheckoutSession(params: CreateCheckoutSessionParams) {
    const {
      successUrl,
      cancelUrl,
      customerId,
      mode,
      lineItems,
      metadata,
      allowPromotionCodes,
      automaticTaxEnabled,
      clientReferenceId,
    } = params;

    if (!successUrl || !cancelUrl) {
      throw new Error('Both successUrl and cancelUrl are required to create a checkout session');
    }

    if (!mode) {
      throw new Error('mode is required to create a checkout session');
    }

    if (!lineItems || lineItems.length === 0) {
      throw new Error('At least one line item is required to create a checkout session');
    }

    const createParams: Stripe.Checkout.SessionCreateParams = {
      mode,
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items: lineItems,
      customer: customerId,
      metadata,
      allow_promotion_codes: allowPromotionCodes,
      automatic_tax: automaticTaxEnabled ? { enabled: true } : undefined,
      client_reference_id: clientReferenceId,
    };

    return stripe.checkout.sessions.create(createParams);
  },

  async retrieveCheckoutSession(sessionId: string) {
    if (!sessionId) {
      throw new Error('sessionId is required');
    }

    return stripe.checkout.sessions.retrieve(sessionId);
  },

  verifyWebhookSignature(params: VerifyWebhookSignatureParams): Stripe.Event {
    const { payload, signature } = params;

    if (!signature) {
      throw new Error('Missing Stripe-Signature header');
    }

    const sigHeader = Array.isArray(signature) ? signature.join(',') : signature;

    try {
      const event = stripe.webhooks.constructEvent(
        payload,
        sigHeader,
        stripeWebhookSecret as string
      );
      return event;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Webhook signature verification failed: undefined`);
      }
      throw new Error('Webhook signature verification failed');
    }
  },
};

export const createPaymentIntent = paymentService.createPaymentIntent;
export const retrievePaymentIntent = paymentService.retrievePaymentIntent;
export const cancelPaymentIntent = paymentService.cancelPaymentIntent;
export const createCheckoutSession = paymentService.createCheckoutSession;
export const retrieveCheckoutSession = paymentService.retrieveCheckoutSession;
export const verifyWebhookSignature = paymentService.verifyWebhookSignature;