import React, { useCallback, useMemo, useState } from "react";
import { loadStripe, Stripe } from "@stripe/stripe-js";

type BillingInterval = "month" | "year";

interface PricingFeature {
  label: string;
  included: boolean;
  highlight?: boolean;
}

interface PricingTier {
  id: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  description: string;
  ctaLabel: string;
  popular?: boolean;
  badge?: string;
  features: PricingFeature[];
  stripePriceIdMonthly?: string;
  stripePriceIdYearly?: string;
}

interface PricingProps {
  stripePublishableKey?: string;
  onCheckoutError?: (error: Error) => void;
  onCheckoutStart?: (tierId: string, interval: BillingInterval) => void;
  onCheckoutSuccessRedirect?: () => void;
}

let stripePromise: Promise<Stripe | null> | null = null;

const getStripe = (publishableKey: string) => {
  if (!stripePromise) {
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

const PRICING_TIERS: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    priceMonthly: 19,
    priceYearly: 190,
    description: "For individuals and small projects getting started.",
    ctaLabel: "Get Starter",
    features: [
      { label: "Up to 3 active projects", included: true },
      { label: "5,000 API calls / month", included: true },
      { label: "Basic analytics", included: true },
      { label: "Email support", included: true },
      { label: "Custom domains", included: false },
      { label: "SSO / SAML", included: false },
    ],
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_MONTHLY,
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER_YEARLY,
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthly: 49,
    priceYearly: 490,
    description: "For growing teams that need more power and flexibility.",
    ctaLabel: "Start Pro",
    popular: true,
    badge: "Most popular",
    features: [
      { label: "Unlimited projects", included: true, highlight: true },
      { label: "100,000 API calls / month", included: true },
      { label: "Advanced analytics & reporting", included: true },
      { label: "Priority email & chat support", included: true },
      { label: "Custom domains", included: true },
      { label: "Audit logs", included: true },
      { label: "SSO / SAML", included: false },
    ],
    stripePriceIdMonthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
    stripePriceIdYearly: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_YEARLY,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    priceMonthly: 0,
    priceYearly: 0,
    description: "For organizations with advanced security and scale needs.",
    ctaLabel: "Contact sales",
    badge: "Custom",
    features: [
      { label: "Unlimited projects & usage", included: true, highlight: true },
      { label: "Dedicated account manager", included: true },
      { label: "Custom SLAs & uptime guarantees", included: true },
      { label: "Onboarding & training", included: true },
      { label: "SSO / SAML & SCIM provisioning", included: true },
      { label: "Custom security review & DPA", included: true },
      { label: "Custom integrations", included: true },
    ],
  },
];

const formatCurrency = (amount: number): string => {
  if (!amount) return "Custom";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

const Pricing: React.FC<PricingProps> = ({
  stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",
  onCheckoutError,
  onCheckoutStart,
  onCheckoutSuccessRedirect,
}) => {
  const [billingInterval, setBillingInterval] = useState<BillingInterval>("month");
  const [loadingTierId, setLoadingTierId] = useState<string | null>(null);

  const handleCheckout = useCallback(
    async (tier: PricingTier) => {
      if (tier.id === "enterprise") {
        const mailto = "mailto:sales@example.com?subject=Enterprise%20Plan%20Inquiry";
        window.location.href = mailto;
        return;
      }

      const priceId =
        billingInterval === "month" ? tier.stripePriceIdMonthly : tier.stripePriceIdYearly;

      if (!priceId) {
        const error = new Error("Pricing configuration error. Please contact support.");
        if (onCheckoutError) onCheckoutError(error);
        return;
      }

      if (!stripePublishableKey) {
        const error = new Error("Stripe is not configured. Please contact support.");
        if (onCheckoutError) onCheckoutError(error);
        return;
      }

      try {
        setLoadingTierId(tier.id);
        if (onCheckoutStart) onCheckoutStart(tier.id, billingInterval);

        const stripe = await getStripe(stripePublishableKey);
        if (!stripe) {
          throw new Error("Unable to initialize Stripe.");
        }

        const { error } = await stripe.redirectToCheckout({
          lineItems: [{ price: priceId, quantity: 1 }],
          mode: "subscription",
          successUrl:
            typeof window !== "undefined"
              ? `undefined/dashboard?checkout=success`
              : "/dashboard?checkout=success",
          cancelUrl:
            typeof window !== "undefined"
              ? `undefined/pricing?checkout=cancelled`
              : "/pricing?checkout=cancelled",
        });

        if (error) {
          throw error;
        }

        if (onCheckoutSuccessRedirect) onCheckoutSuccessRedirect();
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Unknown checkout error");
        if (onCheckoutError) onCheckoutError(error);
      } finally {
        setLoadingTierId(null);
      }
    },
    [billingInterval, onCheckoutError, onCheckoutStart, onCheckoutSuccessRedirect, stripePublishableKey]
  );

  const allFeatures = useMemo(() => {
    const featureSet = new Set<string>();
    PRICING_TIERS.forEach((tier) => {
      tier.features.forEach((f) => featureSet.add(f.label));
    });
    return Array.from(featureSet);
  }, []);

  return (
    <section id="pricing" className="w-full bg-slate-950 py-20 sm:py-24">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center text-center gap-4">
          <span className="inline-flex items-center rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-sky-400 ring-1 ring-sky-500/30">
            Pricing
          </span>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Simple, transparent pricing
          </h2>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Choose the plan that fits your team. Upgrade, downgrade, or cancel at any time.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-slate-900/80 p-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700/80">
            <button
              type="button"
              onClick={() => setBillingInterval("month")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition undefined`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingInterval("year")}
              className={`flex items-center gap-1 rounded-full px-3 py-1 transition undefined`}
            >
              Yearly
              <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                Save 2 months
              </span>
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {PRICING_TIERS.map