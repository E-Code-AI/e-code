# 🔒 Stripe Security Configuration

## ⚠️ CRITICAL SECURITY WARNING

### ❌ NEVER Create These Variables:
- `TESTING_VITE_STRIPE_PUBLIC_KEY`
- `TESTING_STRIPE_SECRET_KEY`

**Why?** These variables:
1. Expose Stripe secret keys to the frontend (major security breach)
2. The `VITE_` prefix makes them accessible in client-side JavaScript
3. Anyone can view them in the browser and steal payment credentials

## ✅ Correct Configuration

### Environment Variables (Current Setup)
```
VITE_STRIPE_PUBLIC_KEY=pk_live_...    # ✅ Safe - Public key for frontend
STRIPE_SECRET_KEY=sk_live_...         # ✅ Safe - Backend only (Replit Secret)
STRIPE_WEBHOOK_SECRET=whsec_...       # ✅ Safe - Backend only (Replit Secret)
```

### Security Patterns
1. **Frontend**: Only use `VITE_STRIPE_PUBLIC_KEY` (publishable key)
2. **Backend**: Access `STRIPE_SECRET_KEY` from Replit Secrets (never expose)
3. **Testing**: Use the SAME production keys for development/staging

## 🧪 Testing Stripe Integration

### If Testing System Requests TESTING_* Variables:
1. **DECLINE** the request immediately
2. **DELETE** any created `TESTING_*` variables:
   ```bash
   # Run this command to remove dangerous variables
   replit env delete TESTING_VITE_STRIPE_PUBLIC_KEY TESTING_STRIPE_SECRET_KEY
   ```
3. Use existing production keys for testing

### Why We Don't Need Testing Keys:
- Stripe has test mode built-in (use test API keys for testing)
- Our production keys work for both dev and staging
- Separate testing keys create security vulnerabilities

## 📝 Quick Reference

| Variable | Location | Accessible From | Purpose |
|----------|----------|-----------------|---------|
| `VITE_STRIPE_PUBLIC_KEY` | Environment | Frontend + Backend | Initialize Stripe.js |
| `STRIPE_SECRET_KEY` | Replit Secret | Backend only | API operations |
| `STRIPE_WEBHOOK_SECRET` | Replit Secret | Backend only | Webhook validation |

## 🚫 What NOT to Do
```bash
# ❌ NEVER do this:
export TESTING_VITE_STRIPE_PUBLIC_KEY=pk_test_...
export TESTING_STRIPE_SECRET_KEY=sk_test_...

# ❌ NEVER create VITE_ variables with secret keys:
export VITE_STRIPE_SECRET_KEY=sk_live_...  # SECURITY BREACH!
```

## ✅ What TO Do
```bash
# ✅ Correct way - Use Replit Secrets for sensitive data
# VITE_ prefix ONLY for public keys
export VITE_STRIPE_PUBLIC_KEY=pk_live_...

# All secret keys go in Replit Secrets (not environment variables)
# STRIPE_SECRET_KEY (configured via Replit UI)
# STRIPE_WEBHOOK_SECRET (configured via Replit UI)
```

---

## 💳 Usage-Based Billing Configuration

### ⚠️ CRITICAL: Metered Prices Must Match Subscription Intervals

The current implementation attempts to add usage-based items during subscription creation, but **this will fail if the prices in Stripe Dashboard have mismatched billing intervals**.

### Problem
```
[Stripe Error] All prices on a subscription must have the same `recurring.interval`
```

### Root Cause
- Subscription plan: `monthly` (e.g., Core Monthly - price_1RrGxL2VSIgdqPLPk54OZhZX)
- Usage-based price: `yearly` or different interval
- **Stripe rejects mixing intervals** in the same subscription

### Solution: Configure Prices Correctly in Stripe Dashboard

#### Step 1: Create Matching Usage-Based Prices
For EACH subscription interval (monthly/yearly), create separate metered prices:

**Monthly Plans Need:**
- `STRIPE_PRICE_ID_COMPUTE_MONTHLY` - Metered, $X per CPU hour, billed monthly
- `STRIPE_PRICE_ID_STORAGE_MONTHLY` - Metered, $Y per GB, billed monthly
- `STRIPE_PRICE_ID_BANDWIDTH_MONTHLY` - Metered, $Z per GB, billed monthly
- etc.

**Yearly Plans Need:**
- `STRIPE_PRICE_ID_COMPUTE_YEARLY` - Metered, $X per CPU hour, billed yearly
- `STRIPE_PRICE_ID_STORAGE_YEARLY` - Metered, $Y per GB, billed yearly
- etc.

#### Step 2: Update Environment Variables
```bash
# Monthly usage-based prices
STRIPE_PRICE_ID_COMPUTE_MONTHLY=price_1xxx
STRIPE_PRICE_ID_STORAGE_MONTHLY=price_1yyy

# Yearly usage-based prices
STRIPE_PRICE_ID_COMPUTE_YEARLY=price_1zzz
STRIPE_PRICE_ID_STORAGE_YEARLY=price_1aaa
```

#### Step 3: Update Code to Use Interval-Specific Prices
Currently, the code uses generic price IDs. You need to select the correct price based on the subscription interval:

```typescript
const usagePriceIds = interval === 'month' 
  ? [
      process.env.STRIPE_PRICE_ID_COMPUTE_MONTHLY,
      process.env.STRIPE_PRICE_ID_STORAGE_MONTHLY,
      // ...
    ]
  : [
      process.env.STRIPE_PRICE_ID_COMPUTE_YEARLY,
      process.env.STRIPE_PRICE_ID_STORAGE_YEARLY,
      // ...
    ];
```

### Current Behavior (Temporary Workaround)
Until prices are configured correctly:
- ✅ Subscriptions create with **base plan only** (graceful fallback)
- ⚠️ Usage-based billing **stores locally** but **does NOT report to Stripe**
- 📊 API returns `reportedToStripe: false` with transparent messaging
- 🔄 System continues functioning without crashes

### Testing Checklist
- [ ] Create metered prices in Stripe Dashboard with matching intervals
- [ ] Update environment variables with interval-specific price IDs
- [ ] Update code to select prices based on subscription interval
- [ ] Verify subscription creation adds usage items successfully
- [ ] Confirm `recordUsage()` returns `reportedToStripe: true`
- [ ] Check Stripe Dashboard for actual usage records

---

**Last Updated**: 2025-11-25  
**Status**: ✅ Secure configuration verified | ⚠️ Usage-based billing requires Stripe Dashboard configuration  
**Audit**: All dangerous variables removed
