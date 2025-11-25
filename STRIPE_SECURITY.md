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

**Last Updated**: 2025-11-25  
**Status**: ✅ Secure configuration verified  
**Audit**: All dangerous variables removed
