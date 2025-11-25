# 💰 E-Code Pricing Model Documentation

## Overview

E-Code implements a **hybrid pricing model** identical to Replit's approach:
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
- Replit Agent trial included
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
- Full Replit Agent access
- $25 of monthly credits
- Private and public apps
- Access to latest models
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
- Everything included with Replit Core
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

### Example Scenarios

#### Scenario 1: Within Allowances
```
Core Plan User:
- Uses 30 GiB storage (allowance: 50 GiB)
- Uses 50 GiB bandwidth (allowance: 100 GiB)

Cost: $0 (within allowances)
Credits Used: $0
```

#### Scenario 2: Exceeds Allowance, Credits Cover
```
Core Plan User:
- Uses 150 GiB bandwidth (allowance: 100 GiB)
- Overage: 50 GiB × $0.10 = $5.00
- Credits Balance: $25

Cost: $5 deducted from credits
New Credits Balance: $20
Pay-as-you-go: $0
```

#### Scenario 3: Credits Exhausted
```
Core Plan User:
- Credits Balance: $2
- Compute usage: 50 vCPU hours = $4.50
  - $2 deducted from credits
  - $2.50 charged via pay-as-you-go

New Credits Balance: $0
Stripe Charge: $2.50
```

---

## Database Schema

### User Table Additions

```typescript
// Credits System
creditsBalance: decimal("credits_balance", { precision: 10, scale: 2 }).default('0.00'),
creditsMonthlyAllowance: decimal("credits_monthly_allowance", { precision: 10, scale: 2 }).default('0.00'),
lastCreditRefill: timestamp("last_credit_refill"),

// Resource Allowances
allowanceVcpus: integer("allowance_vcpus").default(1),
allowanceRamGb: integer("allowance_ram_gb").default(2),
allowanceStorageGb: integer("allowance_storage_gb").default(1),
allowanceBandwidthGb: integer("allowance_bandwidth_gb").default(1),

// Usage Tracking (current month)
usageComputeHours: decimal("usage_compute_hours", { precision: 10, scale: 2 }).default('0.00'),
usageStorageGb: decimal("usage_storage_gb", { precision: 10, scale: 2 }).default('0.00'),
usageBandwidthGb: decimal("usage_bandwidth_gb", { precision: 10, scale: 2 }).default('0.00'),
usageDeployments: integer("usage_deployments").default(0),
usageResetAt: timestamp("usage_reset_at"),
```

---

## API Endpoints

### Credits Management

#### GET `/api/credits/balance`
Returns current credits balance and allowances
```json
{
  "creditsBalance": 18.50,
  "creditsMonthlyAllowance": 25.00,
  "lastRefill": "2025-11-01T00:00:00Z",
  "usage": {
    "computeHours": 12.5,
    "storageGb": 35.2,
    "bandwidthGb": 78.3,
    "deployments": 5
  },
  "allowances": {
    "vcpus": 4,
    "ramGb": 8,
    "storageGb": 50,
    "bandwidthGb": 100
  },
  "plan": {
    "name": "Core",
    "tier": "core"
  }
}
```

#### POST `/api/usage/record`
Records resource usage
```json
{
  "metric": "compute",
  "quantity": 2.5
}
```

Response:
```json
{
  "success": true,
  "costBreakdown": {
    "allowanceCost": 0,
    "creditsCost": 0.225,
    "payAsYouGoCost": 0,
    "totalCost": 0.225
  },
  "remainingCredits": 18.275
}
```

---

## Implementation Services

### CreditsService

Located: `server/services/credits-service.ts`

**Methods:**
- `refillMonthlyCredits(userId)` - Refill monthly credits
- `checkAndRefillCredits(userId)` - Auto-refill if 30+ days passed
- `recordComputeUsage(userId, vcpuHours)` - Track compute usage
- `recordStorageUsage(userId, storageGb)` - Track storage usage
- `recordBandwidthUsage(userId, bandwidthGb)` - Track bandwidth usage
- `getCreditsStatus(userId)` - Get current balance and usage
- `resetMonthlyUsage(userId)` - Reset usage counters

### Pricing Constants

Located: `server/payments/pricing-constants.ts`

**Exports:**
- `METERED_PRICES` - All pay-as-you-go prices
- `PLANS` - Complete plan definitions
- `getPlanByTier(tier)` - Get plan configuration
- `exceedsAllowance(usage, allowance)` - Check if usage exceeds limit
- `calculate*Cost()` - Cost calculation helpers

---

## Integration with Stripe

### Setup Required

1. **Create Metered Prices in Stripe Dashboard**
   - One price ID per metric (compute, storage, bandwidth, etc.)
   - Configure as "usage-based" billing
   - Set appropriate unit prices

2. **Environment Variables**
   ```bash
   STRIPE_PRICE_ID_COMPUTE=price_xxx
   STRIPE_PRICE_ID_STORAGE=price_yyy
   STRIPE_PRICE_ID_BANDWIDTH=price_zzz
   STRIPE_PRICE_ID_DEPLOYMENT=price_aaa
   STRIPE_PRICE_ID_DATABASE=price_bbb
   STRIPE_PRICE_ID_AGENT_USAGE=price_ccc
   ```

3. **Subscription Creation**
   - Subscriptions include base plan price only
   - Metered items added separately when usage occurs
   - Pay-as-you-go charges reported via `stripe.subscriptionItems.createUsageRecord()`

### Pay-as-you-go Reporting

When credits exhausted:
```typescript
await stripe.subscriptionItems.createUsageRecord(itemId, {
  quantity: usage,
  timestamp: Math.floor(Date.now() / 1000),
  action: 'increment',
});
```

---

## Testing & Monitoring

### Test Scenarios

1. **Within Allowances**
   - Verify no charges
   - Credits unchanged

2. **Exceeds Allowance, Credits Cover**
   - Correct cost calculation
   - Credits deducted
   - No Stripe charge

3. **Credits Exhausted**
   - Partial credit deduction
   - Pay-as-you-go triggered
   - Stripe usage record created

4. **Monthly Refill**
   - Credits reset after 30 days
   - Usage counters reset

### Monitoring

- Track credits balance low warnings
- Monitor pay-as-you-go charges
- Alert on unusual usage spikes
- Dashboard for usage analytics

---

## Migration Guide

### For Existing Users

1. **Run database migration**
   ```bash
   npm run db:push --force
   ```

2. **Initialize credits for existing users**
   ```typescript
   await creditsService.refillMonthlyCredits(userId);
   ```

3. **Set allowances based on current plan**
   ```typescript
   const plan = getPlanByTier(user.subscriptionTier);
   await storage.updateUser(userId, {
     allowanceVcpus: plan.allowances.vcpus,
     allowanceRamGb: plan.allowances.ramGb,
     // ... etc
   });
   ```

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

## Production-Ready Implementation Status

### Phase 1-3: Core Billing Infrastructure ✅ **COMPLETE**
- ✅ **Idempotent Usage Recording**: `recordUsageIdempotent()` with SELECT FOR UPDATE locking
- ✅ **Monthly Snapshots**: `usageLedger` records for Stripe proration
- ✅ **Pay-as-you-go Queue**: `payAsYouGoQueue` table with unique constraints
- ✅ **Schema**: `usageEvents`, `usageLedger`, `payAsYouGoQueue` tables with indexes

### Phase 4: Pay-as-you-go Queue Processor ✅ **COMPLETE**
- ✅ Atomic claim with `FOR UPDATE SKIP LOCKED` (multi-instance safe)
- ✅ 3-tier invoice strategy: upcoming → search drafts → create new
- ✅ Exponential backoff retry (MAX_ATTEMPTS=3, 5min → 15min → 45min)
- ✅ AlertService integration for failed jobs
- ✅ Admin endpoints: `/api/payments/queue-health`, `/api/payments/queue-retry`

### Critical Bugs Fixed (9 total) ✅
1. **Finalized invoices**: 3-tier strategy with multi-layer matching
2. **Metadata brittleness**: metadata → description → period_end fallbacks
3. **Automated retry**: Admin endpoints + AlertService
4. **Privilege escalation**: `ensureAdmin` middleware with storage validation
5. **Date parsing**: `parseBillingPeriod` with UTC normalization
6. **Dead code**: Clear `useUpcomingInvoice` flag-based flow
7. **Invoice attachment**: Always attach when `invoiceId` exists
8. **STRIPE_SECRET_KEY resilience**: Conditional init (`stripe = null` when key missing)
9. **Stripe null-pointer safety**: Dual runtime guards prevent crashes in non-billing environments

### Database Migrations ✅

**Idempotent SQL Migration Applied** (November 25, 2025)

Added **15 billing columns** to `users` table using `ALTER TABLE ... IF NOT EXISTS`:
- **Credits**: `credits_balance`, `credits_monthly_allowance`, `last_credit_refill`
- **Allowances**: `allowance_vcpus`, `allowance_ram_gb`, `allowance_storage_gb`, `allowance_bandwidth_gb`
- **Usage**: `usage_compute_hours`, `usage_storage_gb`, `usage_bandwidth_gb`, `usage_deployments`, `usage_reset_at`
- **Last Billed** (prevents double-charging): `last_billed_compute_hours`, `last_billed_storage_gb`, `last_billed_bandwidth_gb`

**Automated Migration Script**: `migrations/apply-billing-schema.sh`
- Idempotent (uses IF NOT EXISTS)
- Safe to re-run multiple times
- Verifies all 15 columns exist after migration
- Aligns perfectly with Drizzle schema in `shared/schema.ts`

**Drizzle Note**: `npm run db:push` blocked by interactive prompt for `agent_audit_trail` table. Schema is already synchronized via SQL migration.

### Workers Status ✅
- ✅ **Stripe Usage Worker**: Active, processing billing queue every 30 seconds
- ✅ **Pay-as-you-go Worker**: Active, processing payment queue every 30 seconds with atomic claim
- ✅ **Graceful Degradation**: Workers skip processing when STRIPE_SECRET_KEY missing (no crashes)
- ✅ **No Database Errors**: All billing columns exist, workers running without crashes

### Backend Routes ✅
All routes registered at `/api/payments/*`:
- ✅ Public routes (plans, webhook)
- ✅ Protected routes (subscription CRUD, usage recording)
- ✅ Admin routes (queue health, manual retry)

### Security ✅
- ✅ All secrets via Replit Secrets (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET)
- ✅ Admin endpoints protected with `ensureAdmin` middleware
- ✅ CSRF protection in production
- ✅ Webhook signature validation

### Frontend Integration ✅
- ✅ Stripe.js loaded with `VITE_STRIPE_PUBLIC_KEY`
- ✅ Pricing page at `/pricing`
- ✅ Subscribe page at `/subscribe` with Stripe Elements
- ✅ Usage dashboard for real-time tracking

---

**Last Updated**: November 25, 2025  
**Architecture**: Replit-style Hybrid (Subscription + Credits + Pay-as-you-go)  
**Status**: ✅ **PRODUCTION-READY** (All phases complete, 9 critical bugs fixed, workers active)
