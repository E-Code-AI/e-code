/**
 * Production Environment Validation Module
 * 
 * Runs at startup to ensure all critical dependencies and environment 
 * variables are correctly configured before the server starts accepting traffic.
 */

import { createCentralizedLogger } from '../logging/centralized-logger';

const logger = createCentralizedLogger('env-validation');

/**
 * Validates the environment configuration.
 * In production: Fails fast if critical variables are missing or invalid.
 * In development: Logs warnings but allows the server to start.
 */
export function validateProductionEnvironment(): void {
  const isProduction = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  logger.info(`Starting environment validation (mode: ${process.env.NODE_ENV})`);

  // 1. Validate NODE_ENV
  if (!process.env.NODE_ENV) {
    warnings.push('NODE_ENV is not set. Defaulting to development.');
  }

  // 2. Validate DATABASE_URL
  if (!process.env.DATABASE_URL) {
    if (isProduction) {
      errors.push('DATABASE_URL is missing. Production requires a valid database connection.');
    } else {
      warnings.push('DATABASE_URL is missing. Using in-memory storage or local database.');
    }
  }

  // 3. Validate SESSION_SECRET
  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    if (isProduction) {
      errors.push('SESSION_SECRET is missing. Production requires a secure session secret.');
    } else {
      warnings.push('SESSION_SECRET is missing. Using a development-only fallback.');
    }
  } else if (sessionSecret.length < 32) {
    if (isProduction) {
      errors.push('SESSION_SECRET is too weak. It must be at least 32 characters in production.');
    } else {
      warnings.push('SESSION_SECRET is weak (< 32 characters). This is only acceptable in development.');
    }
  }

  // 4. Validate Stripe Keys (if used)
  // We check if Stripe is used by checking if STRIPE_PUBLISHABLE_KEY or other stripe vars are present
  // or if we just want to ensure the secret key is there if payment features are enabled.
  if (!process.env.STRIPE_SECRET_KEY) {
    warnings.push('STRIPE_SECRET_KEY is missing. Payment features will be disabled.');
  }

  // 5. Validate AI API Keys
  const aiKeys = [
    'ANTHROPIC_API_KEY',
    'OPENAI_API_KEY',
    'GOOGLE_GENERATIVE_AI_API_KEY'
  ];
  
  const configuredAiKeys = aiKeys.filter(key => process.env[key]);
  if (configuredAiKeys.length === 0) {
    warnings.push('No AI API keys configured (Anthropic, OpenAI, or Google). AI features will be disabled.');
  }

  // Final reporting
  if (warnings.length > 0) {
    warnings.forEach(warn => logger.warn(`[Config Warning] ${warn}`));
  }

  if (errors.length > 0) {
    errors.forEach(err => logger.error(`[CRITICAL CONFIG ERROR] ${err}`));
    
    if (isProduction) {
      logger.error('FATAL: Environment validation failed in production. Server shutting down.');
      process.exit(1);
    }
  } else {
    logger.info('Environment validation successful.');
  }
}
