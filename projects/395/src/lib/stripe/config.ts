import Stripe from "stripe";

export type BillingInterval = "month" | "year";

export interface PriceTier {
  id: string;
  unitAmount: number;
  currency: string;
  interval: BillingInterval;
  nickname?: string;
  trialPeriodDays?: number;
  metadata?: Record<string, string>;
}

export interface PlanConfig {
  id: string;
  name: string;
  description: string;
  features: string[];
  prices: Record<BillingInterval, PriceTier>;
  isDefault?: boolean;
  isDeprecated?: boolean;
  metadata?: Record<string, string>;
}

export interface ProductConfig {
  id: string;
  name: string;
  description: string;
  plans: Record<string, PlanConfig>;
  metadata?: Record<string, string>;
}

export interface StripeConfig {
  products: Record<string, ProductConfig>;
  defaultCurrency: string;
}

const DEFAULT_CURRENCY = "usd";

const createPriceId = (envVar: string | undefined, fallback: string): string => {
  if (envVar && envVar.trim().length > 0) {
    return envVar.trim();
  }
  return fallback;
};

export const STRIPE_CONFIG: StripeConfig = {
  defaultCurrency: DEFAULT_CURRENCY,
  products: {
    core_app: {
      id: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_CORE_APP_ID || "prod_core_app_default",
      name: "Core Application Access",
      description: "Access to the core application features and workspace.",
      metadata: {
        productKey: "core_app",
      },
      plans: {
        free: {
          id: "plan_core_free",
          name: "Free",
          description: "Get started with limited usage, ideal for evaluation and small experiments.",
          isDefault: true,
          features: [
            "Single workspace",
            "Up to 3 projects",
            "Community support",
            "Basic analytics",
          ],
          prices: {
            month: {
              id: "price_core_free_monthly",
              unitAmount: 0,
              currency: DEFAULT_CURRENCY,
              interval: "month",
              nickname: "Free Monthly",
              metadata: {
                planKey: "free",
                productKey: "core_app",
              },
            },
            year: {
              id: "price_core_free_yearly",
              unitAmount: 0,
              currency: DEFAULT_CURRENCY,
              interval: "year",
              nickname: "Free Yearly",
              metadata: {
                planKey: "free",
                productKey: "core_app",
              },
            },
          },
        },
        pro: {
          id: "plan_core_pro",
          name: "Pro",
          description: "For professionals and small teams that need more capacity and collaboration.",
          features: [
            "Up to 10 workspaces",
            "Unlimited projects",
            "Priority email support",
            "Advanced analytics",
            "Role-based access control",
          ],
          prices: {
            month: {
              id: createPriceId(
                process.env.NEXT_PUBLIC_STRIPE_PRICE_CORE_PRO_MONTHLY_ID,
                "price_core_pro_monthly_default"
              ),
              unitAmount: 2900,
              currency: DEFAULT_CURRENCY,
              interval: "month",
              nickname: "Pro Monthly",
              trialPeriodDays: 14,
              metadata: {
                planKey: "pro",
                productKey: "core_app",
              },
            },
            year: {
              id: createPriceId(
                process.env.NEXT_PUBLIC_STRIPE_PRICE_CORE_PRO_YEARLY_ID,
                "price_core_pro_yearly_default"
              ),
              unitAmount: 29000,
              currency: DEFAULT_CURRENCY,
              interval: "year",
              nickname: "Pro Yearly",
              trialPeriodDays: 14,
              metadata: {
                planKey: "pro",
                productKey: "core_app",
              },
            },
          },
        },
        business: {
          id: "plan_core_business",
          name: "Business",
          description: "For growing teams that need advanced controls, security, and support.",
          features: [
            "Unlimited workspaces",
            "Unlimited projects",
            "SAML SSO",
            "Audit logs",
            "Dedicated account manager",
            "Priority support with SLA",
          ],
          prices: {
            month: {
              id: createPriceId(
                process.env.NEXT_PUBLIC_STRIPE_PRICE_CORE_BUSINESS_MONTHLY_ID,
                "price_core_business_monthly_default"
              ),
              unitAmount: 9900,
              currency: DEFAULT_CURRENCY,
              interval: "month",
              nickname: "Business Monthly",
              metadata: {
                planKey: "business",
                productKey: "core_app",
              },
            },
            year: {
              id: createPriceId(
                process.env.NEXT_PUBLIC_STRIPE_PRICE_CORE_BUSINESS_YEARLY_ID,
                "price_core_business_yearly_default"
              ),
              unitAmount: 99000,
              currency: DEFAULT_CURRENCY,
              interval: "year",
              nickname: "Business Yearly",
              metadata: {
                planKey: "business",
                productKey: "core_app",
              },
            },
          },
        },
      },
    },
    ai_addon: {
      id: process.env.NEXT_PUBLIC_STRIPE_PRODUCT_AI_ADDON_ID || "prod_ai_addon_default",
      name: "AI Add-on",
      description: "Additional AI-powered features and higher usage limits.",
      metadata: {
        productKey: "ai_addon",
      },
      plans: {
        starter: {
          id: "plan_ai_starter",
          name: "AI Starter",
          description: "Add AI capabilities for light to moderate usage.",
          features: [
            "Shared AI model access",
            "Fair-use rate limits",
            "Basic prompt templates",
          ],
          prices: {
            month: {
              id: createPriceId(
                process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_STARTER_MONTHLY_ID,
                "price_ai_starter_monthly_default"
              ),
              unitAmount: 1500,
              currency: DEFAULT_CURRENCY,
              interval: "month",
              nickname: "AI Starter Monthly",
              metadata: {
                planKey: "starter",
                productKey: "ai_addon",
              },
            },
            year: {
              id: createPriceId(
                process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_STARTER_YEARLY_ID,
                "price_ai_starter_yearly_default"
              ),
              unitAmount: 15000,
              currency: DEFAULT_CURRENCY,
              interval: "year",
              nickname: "AI Starter Yearly",
              metadata: {
                planKey: "starter",
                productKey: "ai_addon",
              },
            },
          },
        },
        scale: {
          id: "plan_ai_scale",
          name: "AI Scale",
          description: "Higher limits and performance for production AI workloads.",
          features: [
            "Higher rate limits",
            "Priority model routing",
            "Advanced prompt templates",
            "Usage analytics",
          ],
          prices: {
            month: {
              id: createPriceId(
                process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_SCALE_MONTHLY_ID,
                "price_ai_scale_monthly_default"
              ),
              unitAmount: 4900,
              currency: DEFAULT_CURRENCY,
              interval: "month",
              nickname: "AI Scale Monthly",
              metadata: {
                planKey: "scale",
                productKey: "ai_addon",
              },
            },
            year: {
              id: createPriceId(
                process.env.NEXT_PUBLIC_STRIPE_PRICE_AI_SCALE_YEARLY_ID,
                "price_ai_scale_yearly_default"
              ),
              unitAmount: 49000,
              currency: DEFAULT_CURRENCY,
              interval: "year",
              nickname: "AI Scale Yearly",
              metadata: {
                planKey: "scale",
                productKey: "ai_addon",
              },
            },
          },
        },
      },
    },
  },
};

export const getStripeProductConfig = (productKey: string): ProductConfig | undefined => {
  return STRIPE_CONFIG.products[productKey];
};

export const getStripePlanConfig = (
  productKey: string,
  planKey: string
): PlanConfig | undefined => {
  const product = STRIPE_CONFIG.products[productKey];
  if (!product) return undefined;
  return product.plans[planKey];
};

export const getStripePriceConfig = (
  productKey: string,
  planKey: string,
  interval: BillingInterval
): PriceTier | undefined => {
  const plan = getStripePlanConfig(productKey, planKey);
  if (!plan) return undefined;
  return plan.prices[interval];
};

export const getDefaultPlanForProduct = (productKey: string): PlanConfig | undefined => {
  const product = STRIPE_CONFIG.products[productKey];
  if (!product) return undefined;
  const plans = Object.values(product.plans);
  return plans.find((plan) => plan.isDefault) || plans[0];
};

export const getStripePriceId = (
  productKey: string,
  planKey: string,
  interval: BillingInterval
): string | undefined => {
  const price = getStripePriceConfig(productKey, planKey, interval);
  return price?.id;
};

export const mapStripePriceToConfig = (
  price: Stripe.Price
): {
  productKey?: string;
  planKey?: string;
  interval?: BillingInterval;
} => {
  const priceId = typeof price.id === "string" ? price.id : "";
  for (const [productKey, product]