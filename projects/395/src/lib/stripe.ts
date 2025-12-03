import Stripe from 'stripe';

export type StripeEnvironment = 'client' | 'server';

export interface StripeConfig {
  apiKey?: string;
  apiVersion?: Stripe.LatestApiVersion;
  environment?: StripeEnvironment;
  maxNetworkRetries?: number;
  timeout?: number;
  telemetry?: boolean;
}

let stripeServerClient: Stripe | null = null;

const DEFAULT_API_VERSION: Stripe.LatestApiVersion = '2023-10-16';

const getEnvVar = (key: string): string | undefined => {
  if (typeof process === 'undefined' || !process.env) return undefined;
  return process.env[key];
};

const resolveServerApiKey = (explicitKey?: string): string => {
  const key =
    explicitKey ||
    getEnvVar('STRIPE_SECRET_KEY') ||
    getEnvVar('STRIPE_API_KEY') ||
    getEnvVar('NEXT_PUBLIC_STRIPE_SECRET_KEY'); // fallback, though secret keys should never be public

  if (!key) {
    throw new Error(
      'Stripe secret key is not configured. Set STRIPE_SECRET_KEY or STRIPE_API_KEY in your environment.'
    );
  }

  if (!key.startsWith('sk_')) {
    throw new Error(
      'Invalid Stripe secret key provided. Expected a key starting with "sk_".'
    );
  }

  return key;
};

const isServer = (): boolean => {
  return typeof window === 'undefined';
};

export const initStripeServer = (config: StripeConfig = {}): Stripe => {
  if (!isServer()) {
    throw new Error('initStripeServer can only be called in a server environment.');
  }

  if (stripeServerClient) {
    return stripeServerClient;
  }

  const apiKey = resolveServerApiKey(config.apiKey);

  stripeServerClient = new Stripe(apiKey, {
    apiVersion: config.apiVersion || DEFAULT_API_VERSION,
    maxNetworkRetries: config.maxNetworkRetries ?? 2,
    timeout: config.timeout ?? 30000,
    telemetry: config.telemetry ?? true,
  });

  return stripeServerClient;
};

export const getStripeServer = (): Stripe => {
  if (!isServer()) {
    throw new Error('getStripeServer can only be used on the server.');
  }

  if (!stripeServerClient) {
    return initStripeServer();
  }

  return stripeServerClient;
};

export interface StripeClientConfig {
  publishableKey?: string;
}

let stripePublishableKey: string | null = null;

export const initStripeClientConfig = (config: StripeClientConfig = {}): string => {
  const key =
    config.publishableKey ||
    getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') ||
    getEnvVar('STRIPE_PUBLISHABLE_KEY');

  if (!key) {
    throw new Error(
      'Stripe publishable key is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY or STRIPE_PUBLISHABLE_KEY in your environment.'
    );
  }

  if (!key.startsWith('pk_')) {
    throw new Error(
      'Invalid Stripe publishable key provided. Expected a key starting with "pk_".'
    );
  }

  stripePublishableKey = key;
  return key;
};

export const getStripePublishableKey = (): string => {
  if (stripePublishableKey) {
    return stripePublishableKey;
  }

  const key =
    getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') ||
    getEnvVar('STRIPE_PUBLISHABLE_KEY');

  if (!key) {
    throw new Error(
      'Stripe publishable key is not configured. Set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY or STRIPE_PUBLISHABLE_KEY in your environment.'
    );
  }

  if (!key.startsWith('pk_')) {
    throw new Error(
      'Invalid Stripe publishable key provided. Expected a key starting with "pk_".'
    );
  }

  stripePublishableKey = key;
  return key;
};

export const isStripeConfigured = (): boolean => {
  const hasSecret =
    !!getEnvVar('STRIPE_SECRET_KEY') ||
    !!getEnvVar('STRIPE_API_KEY') ||
    !!getEnvVar('NEXT_PUBLIC_STRIPE_SECRET_KEY');

  const hasPublishable =
    !!getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') ||
    !!getEnvVar('STRIPE_PUBLISHABLE_KEY');

  return hasSecret && hasPublishable;
};

export const stripeConfigSummary = () => {
  const secret =
    getEnvVar('STRIPE_SECRET_KEY') ||
    getEnvVar('STRIPE_API_KEY') ||
    getEnvVar('NEXT_PUBLIC_STRIPE_SECRET_KEY');

  const publishable =
    getEnvVar('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY') ||
    getEnvVar('STRIPE_PUBLISHABLE_KEY');

  return {
    serverConfigured: !!secret,
    clientConfigured: !!publishable,
    hasServerInstance: !!stripeServerClient,
  };
};