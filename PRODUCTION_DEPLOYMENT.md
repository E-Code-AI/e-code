# Production Deployment Guide - AI Billing System

## ⚠️ CRITICAL: Database Enum Update Required

The Pay-As-You-Go AI Billing system requires the `ai_model` enum to be updated with **18 new production models** across 5 providers (26 total values: 8 legacy + 18 new).

### 🚨 Before Deployment

The database enum **MUST** be updated or all AI requests will fail with:
```
ERROR: invalid input value for enum ai_model: "gpt-4o"
```

### ✅ Recommended: Use Drizzle Migration (Idempotent)

The project includes a Drizzle migration file: `drizzle/0001_add_ai_models.sql`

```bash
# Apply migration (recommended for fresh deployments)
npm run db:push --force
```

This migration uses `IF NOT EXISTS` guards, making it safe to run multiple times.

### Alternative: Manual SQL (One-Time)

If you prefer manual SQL execution, run this script against your production database **before** deploying:

```sql
-- Add OpenAI Models (November 2025)
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-5.1';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-5';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-5-mini';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-5-nano';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-4.1';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gpt-4o';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'o3';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'o4-mini';

-- Add Anthropic Models (Sept-Oct 2025)
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'claude-sonnet-4-5-20250929';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'claude-opus-4-1-20250805';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'claude-haiku-4-5-20251015';

-- Add Google Gemini Models (Nov 2025)
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gemini-2.5-pro';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'gemini-2.5-flash';

-- Add xAI Models (July-Sept 2025)
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'grok-4';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'grok-4-fast';

-- Add Moonshot AI Models (Nov 2025)
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'kimi-k2';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'kimi-k2-thinking';
ALTER TYPE ai_model ADD VALUE IF NOT EXISTS 'kimi-k2-turbo';
```

### 📊 Verification

After running the script, verify all 26 values exist:

```sql
SELECT enumlabel FROM pg_enum 
WHERE enumtypid = 'ai_model'::regtype 
ORDER BY enumlabel;
```

Expected count: **26 values** (9 legacy + 17 new)

### 🎯 Why This is Required

1. **Model Normalizer** (`server/utils/model-normalizer.ts`) maps all API responses to canonical enum values
2. **Metering Service** inserts these values into `ai_usage_metering` table
3. **PostgreSQL enum** rejects any value not in the enum definition

Without this update:
- ❌ All new AI requests fail at DB insert
- ❌ Zero revenue tracking
- ❌ Complete billing system failure

With this update:
- ✅ All 18 production models accepted
- ✅ Full revenue tracking
- ✅ Pay-as-you-go billing operational

### 🔄 Alternative: Drizzle Migration (TODO)

For reproducible deployments, this should be converted to a Drizzle migration:

```bash
# Generate migration (when ready)
npx drizzle-kit generate:pg

# Apply migration
npm run db:push --force
```

**Current Status:** Manual SQL script (above) is the recommended approach until Drizzle enum migrations are stable.

## 📋 Deployment Checklist

- [ ] Run enum update SQL script on production DB
- [ ] Verify 26 enum values exist
- [ ] Deploy application
- [ ] Test AI request → verify `ai_usage_metering` insert succeeds
- [ ] Monitor Stripe queue processing
- [ ] Check Alert Service for unknown model alerts

## 🆘 Troubleshooting

**Problem:** `invalid input value for enum ai_model`
**Solution:** Enum not updated → run SQL script above

**Problem:** Unknown model alerts in Slack
**Solution:** Add missing alias to `MODEL_NORMALIZATION_MAP` in `server/utils/model-normalizer.ts`

**Problem:** Stripe queue exhausted
**Solution:** Check `STRIPE_SECRET_KEY` configuration and Stripe API status
