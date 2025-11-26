# 💰 E-Code.ai Pricing Model Documentation

> **Platform**: https://e-code.ai  
> **Last Verified**: November 26, 2025  
> **Status**: ✅ PRODUCTION-READY

## Overview

E-Code.ai implements a **hybrid pricing model** identical to Replit's approach:
1. **Fixed subscription** (monthly/yearly)
2. **Monthly credits** included in each plan
3. **Resource allowances** (vCPUs, RAM, storage, bandwidth)
4. **Pay-as-you-go** when credits exhausted

## Pricing Flow

```
User Usage → Check Allowance → Deduct from Credits → Pay-as-you-go
```

### Detailed Flow

1. **User consumes resources** (compute, storage, bandwidth, etc.)
2. **Check resource allowances**
   - If within allowance → No charge
   - If exceeds allowance → Calculate overage cost
3. **Deduct from credits balance**
   - If credits sufficient → Deduct cost from credits
   - If credits insufficient → Partial deduction + pay-as-you-go
4. **Trigger pay-as-you-go billing**
   - Charge overage via Stripe metered billing
   - Usage reported to Stripe for monthly invoice

---

## Subscription Plans

### Free (Starter)
- **Price**: $0/month
- **Credits**: $3/month
- **Allowances**:
  - 1 vCPU
  - 2 GiB RAM
  - 1 GiB storage
  - 1 GiB bandwidth
  - 1,200 development minutes (20 hours)
  - 10 public apps
  - 0 private apps
  - 1 collaborator

**Features:**
- E-Code Agent trial included
- 10 development apps (with temporary links)
- Public apps only
- Limited build time

---

### Core
- **Price**: $25/month or $20/month (billed annually)
- **Credits**: $25/month
- **Allowances**:
  - 4 vCPUs
  - 8 GiB RAM
  - 50 GiB storage
  - 100 GiB bandwidth
  - Unlimited development time
  - Unlimited public apps
  - Unlimited private apps
  - 3 collaborators

**Features:**
- Full E-Code Agent access
- $25 of monthly credits
- Private and public apps
- Access to latest AI models
- Publish and host live apps
- Pay-as-you-go for additional usage
- Autonomous long builds

---

### Teams
- **Price**: $40/user/month or $35/user/month (billed annually)
- **Credits**: $40/month per user
- **Allowances**:
  - 8 vCPUs
  - 16 GiB RAM
  - 256 GiB storage
  - 1,000 GiB bandwidth
  - Unlimited development time
  - Unlimited public apps
  - Unlimited private apps
  - Unlimited collaborators (all team members)

**Features:**
- Everything included with E-Code Core
- $40/mo in usage credits included
- Credits granted upfront on annual plan
- 50 Viewer seats
- Centralized billing
- Role-based access control
- Private deployments
- Pay-as-you-go for additional usage

---

### Enterprise
- **Price**: Custom (baseline ~$200/month)
- **Credits**: $100/month (generous allowance)
- **Allowances**:
  - Up to 64 vCPUs
  - Up to 128 GiB RAM
  - 256+ GiB storage (custom)
  - 10,000+ GiB bandwidth (custom)
  - Unlimited development time
  - Unlimited apps and collaborators

**Features:**
- Everything in Teams
- Custom Viewer Seats
- SSO/SAML
- SCIM
- Advanced privacy controls
- Custom pricing
- Dedicated support

---

## Metered Pricing (Pay-as-you-go)

### Compute
| Resource | Price |
|----------|-------|
| Compute Boost (4 vCPUs) | $0.36/hour |
| Per vCPU Hour | $0.09/hour |

### Deployments
| Type | Base Fee | Usage Charge |
|------|----------|--------------|
| Autoscale | $1/month | $1 per million compute units |
| Scheduled | $1/month | $0.000061/second |

### Storage
| Resource | Price |
|----------|-------|
| App Storage | $0.03/GB/month |
| PostgreSQL Storage | $1.50/GB/month |
| PostgreSQL Compute | $0.16/compute hour |

### Bandwidth
| Resource | Price |
|----------|-------|
| Outbound Data Transfer | $0.10/GB (beyond allowance) |

### AI Agent (effort-based)
| Complexity | Price Range |
|------------|-------------|
| Simple tasks | ~$0.25 |
| Medium complexity | ~$1.00 |
| Complex tasks | ~$5.00 |

---

## Implementation Verification ✅

### Database Schema (shared/schema.ts)
```typescript
// Credits System ✅ VERIFIED (line 128)
creditsBalance: decimal("credits_balance", { precision: 10, scale: 2 }).default('0.00'),

// Resource Allowances ✅ VERIFIED (line 132)
allowanceVcpus: integer("allowance_vcpus").default(1),

// Usage Tracking ✅ VERIFIED (line 137)
usageComputeHours: decimal("usage_compute_hours", { precision: 10, scale: 2 }).default('0.00'),
```

### Backend Services ✅
| Service | File | Status |
|---------|------|--------|
| Credits Service | `server/services/credits-service.ts` | ✅ Implemented |
| Billing Service | `server/services/billing-service.ts` | ✅ Implemented |
| Stripe Billing | `server/services/stripe-billing-service.ts` | ✅ Implemented |
| Pricing Constants | `server/payments/pricing-constants.ts` | ✅ Implemented |

### Frontend Pages ✅
| Page | File | Status |
|------|------|--------|
| Pricing | `client/src/pages/Pricing.tsx` | ✅ 736 lines |
| Usage Dashboard | `client/src/pages/Usage.tsx` | ✅ Full implementation |
| Subscribe | `client/src/pages/Subscribe.tsx` | ✅ Stripe Elements |

### Features Verified ✅
- ✅ Credits balance display (Usage.tsx line 273)
- ✅ Pay-as-you-go alerts (Usage.tsx line 300)
- ✅ Real-time usage tracking
- ✅ Progress bars with allowance tracking
- ✅ Stripe integration

---

## Credits System

### How Credits Work

1. **Monthly Refill**
   - Credits automatically refill every 30 days
   - Credits do NOT roll over to next month
   - Annual plans grant credits upfront

2. **Deduction Priority**
   ```
   1. Resource Allowances (free, no cost)
   2. Monthly Credits Balance
   3. Pay-as-you-go (charged to Stripe)
   ```

3. **Balance Tracking**
   - Users can view real-time credits balance
   - Usage dashboard shows consumption per service
   - Warnings when credits running low

---

## Production Status ✅

### Core Billing Infrastructure ✅ COMPLETE
- ✅ **Idempotent Usage Recording**: `recordUsageIdempotent()` with SELECT FOR UPDATE locking
- ✅ **Monthly Snapshots**: `usageLedger` records for Stripe proration
- ✅ **Pay-as-you-go Queue**: `payAsYouGoQueue` table with unique constraints
- ✅ **Schema**: `usageEvents`, `usageLedger`, `payAsYouGoQueue` tables with indexes

### Pay-as-you-go Queue Processor ✅ COMPLETE
- ✅ Atomic claim with `FOR UPDATE SKIP LOCKED` (multi-instance safe)
- ✅ 3-tier invoice strategy: upcoming → search drafts → create new
- ✅ Exponential backoff retry (MAX_ATTEMPTS=3, 5min → 15min → 45min)
- ✅ AlertService integration for failed jobs
- ✅ Admin endpoints: `/api/payments/queue-health`, `/api/payments/queue-retry`

### Security ✅
- ✅ All secrets via Replit Secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- ✅ Admin endpoints protected with `ensureAdmin` middleware
- ✅ CSRF protection in production
- ✅ Webhook signature validation

### Frontend Integration ✅
- ✅ Stripe.js loaded with `VITE_STRIPE_PUBLIC_KEY`
- ✅ Pricing page at `/pricing`
- ✅ Subscribe page at `/subscribe` with Stripe Elements
- ✅ Usage dashboard with real-time credits tracking

---

## FAQs

### Do credits roll over?
**No.** Credits reset monthly and do not accumulate.

### What happens if I upgrade mid-month?
You immediately receive the new plan's monthly credits allocation.

### Can I purchase additional credits?
Not directly. You can upgrade your plan for more monthly credits, or additional usage triggers pay-as-you-go.

### How do annual plans work?
Annual plans grant credits upfront for the entire year (12 × monthly credits).

### When are pay-as-you-go charges billed?
Monthly, alongside your subscription invoice.

---

**Architecture**: E-Code.ai Hybrid (Subscription + Credits + Pay-as-you-go)  
**Status**: ✅ **PRODUCTION-READY** (All phases complete, workers active)  
**URL**: https://e-code.ai/pricing
