#!/usr/bin/env node
import 'dotenv/config';
import Redis from 'ioredis';
import pg from 'pg';
import Stripe from 'stripe';

const { Client } = pg;

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} is required`);
  }
  return value;
}

async function validateRedis() {
  const url = requireEnv('REDIS_URL');
  const client = new Redis(url.replace('rediss://', 'redis://'), {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5000,
  });
  try {
    await client.connect();
    const pong = await client.ping();
    if (pong !== 'PONG') throw new Error(`unexpected Redis ping response: ${pong}`);
    return 'ok';
  } finally {
    client.disconnect();
  }
}

async function validateDatabase() {
  const url = requireEnv('DATABASE_URL');
  const client = new Client({
    connectionString: url,
    ssl: url.includes('sslmode=require') ? { rejectUnauthorized: false } : undefined,
  });
  try {
    await client.connect();
    await client.query('select 1');
    return 'ok';
  } finally {
    await client.end().catch(() => {});
  }
}

async function validateStripe() {
  const key = requireEnv('STRIPE_SECRET_KEY');
  if (!key.startsWith('sk_live_')) {
    throw new Error('STRIPE_SECRET_KEY must be a live key (sk_live_...)');
  }
  const stripe = new Stripe(key);
  await stripe.balance.retrieve();
  return 'ok';
}

async function validateSentry() {
  requireEnv('SENTRY_DSN');
  requireEnv('VITE_SENTRY_DSN');
  await import('@sentry/node');
  await import('@sentry/react');
  return 'ok';
}

const checks = [
  ['redis', validateRedis],
  ['database', validateDatabase],
  ['stripe', validateStripe],
  ['sentry', validateSentry],
];

let failed = false;
for (const [name, check] of checks) {
  try {
    await check();
    console.log(`${name}=ok`);
  } catch (error) {
    failed = true;
    console.log(`${name}=failed:${String(error.message || error).replace(/sk_(live|test)_[A-Za-z0-9_*]+/g, '[REDACTED]')}`);
  }
}

if (failed) {
  process.exit(1);
}
