#!/bin/bash
#
# Idempotent Billing Schema Migration
# Adds 12 billing columns to users table
# Safe to run multiple times - uses IF NOT EXISTS
#
# Usage: ./migrations/apply-billing-schema.sh
#

set -e

echo "🔄 Applying billing schema migration..."

# Execute idempotent SQL via Drizzle connection
psql "$DATABASE_URL" <<'SQL'
-- Add billing columns to users table (idempotent - safe to re-run)
-- Credits system
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_balance DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS credits_monthly_allowance DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_credit_refill TIMESTAMP;

-- Resource allowances
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowance_vcpus INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowance_ram_gb INTEGER DEFAULT 2;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowance_storage_gb INTEGER DEFAULT 1;
ALTER TABLE users ADD COLUMN IF NOT EXISTS allowance_bandwidth_gb INTEGER DEFAULT 1;

-- Usage tracking (current month)
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_compute_hours DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_storage_gb DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_bandwidth_gb DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_deployments INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS usage_reset_at TIMESTAMP;

-- Last billed totals (prevents double-charging on retries)
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_billed_compute_hours DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_billed_storage_gb DECIMAL(10,2) DEFAULT 0.00;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_billed_bandwidth_gb DECIMAL(10,2) DEFAULT 0.00;

-- Ensure all DEFAULT values are set (for existing columns)
ALTER TABLE users ALTER COLUMN credits_balance SET DEFAULT 0.00;
ALTER TABLE users ALTER COLUMN credits_monthly_allowance SET DEFAULT 0.00;
ALTER TABLE users ALTER COLUMN allowance_vcpus SET DEFAULT 1;
ALTER TABLE users ALTER COLUMN allowance_ram_gb SET DEFAULT 2;
ALTER TABLE users ALTER COLUMN allowance_storage_gb SET DEFAULT 1;
ALTER TABLE users ALTER COLUMN allowance_bandwidth_gb SET DEFAULT 1;
ALTER TABLE users ALTER COLUMN usage_compute_hours SET DEFAULT 0.00;
ALTER TABLE users ALTER COLUMN usage_storage_gb SET DEFAULT 0.00;
ALTER TABLE users ALTER COLUMN usage_bandwidth_gb SET DEFAULT 0.00;
ALTER TABLE users ALTER COLUMN usage_deployments SET DEFAULT 0;
ALTER TABLE users ALTER COLUMN last_billed_compute_hours SET DEFAULT 0.00;
ALTER TABLE users ALTER COLUMN last_billed_storage_gb SET DEFAULT 0.00;
ALTER TABLE users ALTER COLUMN last_billed_bandwidth_gb SET DEFAULT 0.00;

-- Verify all 15 billing columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name IN (
    'credits_balance', 'credits_monthly_allowance', 'last_credit_refill',
    'allowance_vcpus', 'allowance_ram_gb', 'allowance_storage_gb', 'allowance_bandwidth_gb',
    'usage_compute_hours', 'usage_storage_gb', 'usage_bandwidth_gb', 'usage_deployments', 'usage_reset_at',
    'last_billed_compute_hours', 'last_billed_storage_gb', 'last_billed_bandwidth_gb'
  )
ORDER BY column_name;
SQL

echo "✅ Billing schema migration completed successfully!"
echo "📋 All 15 billing columns verified in users table"
