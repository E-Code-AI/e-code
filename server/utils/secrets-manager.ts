/**
 * Centralized Secrets Manager
 * 
 * Fortune 500-grade secret management with startup validation.
 * Provides a single source of truth for all environment secrets.
 * 
 * Features:
 * - Validates all required secrets at startup
 * - Throws clear errors in production if secrets are missing
 * - Allows development fallbacks with warnings
 * - Provides getter methods for each secret
 * 
 * Date: December 7, 2025
 * Status: Production-ready
 */

import { createLogger } from './logger';

const logger = createLogger('secrets-manager');

// Required secrets for production
const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'SESSION_SECRET',
] as const;

// Optional secrets (useful but not required)
const OPTIONAL_SECRETS = [
  'JWT_REFRESH_SECRET',
  'ENCRYPTION_KEY',
  'DATABASE_URL',
] as const;

// Development fallback values (NEVER use in production)
const DEV_FALLBACKS: Record<string, string> = {
  JWT_SECRET: 'dev-only-jwt-secret-do-not-use-in-prod',
  JWT_REFRESH_SECRET: 'dev-only-jwt-refresh-secret-do-not-use-in-prod',
  SESSION_SECRET: 'dev-only-session-secret-do-not-use-in-prod',
};

// Track if we've already shown dev warnings (avoid spam)
const warnedSecrets = new Set<string>();

/**
 * SecretsManager Singleton Class
 * 
 * Centralized management of all environment secrets with:
 * - Startup validation
 * - Production enforcement
 * - Development fallbacks with warnings
 */
class SecretsManager {
  private static instance: SecretsManager | null = null;
  private validated = false;
  private isProduction: boolean;

  private constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  static getInstance(): SecretsManager {
    if (!SecretsManager.instance) {
      SecretsManager.instance = new SecretsManager();
    }
    return SecretsManager.instance;
  }

  /**
   * Validate all required secrets at startup
   * Throws in production if any required secret is missing
   */
  validateRequiredSecrets(): void {
    if (this.validated) {
      return; // Only validate once
    }

    const missing: string[] = [];
    const warnings: string[] = [];

    for (const secretName of REQUIRED_SECRETS) {
      const value = process.env[secretName];
      if (!value) {
        if (this.isProduction) {
          missing.push(secretName);
        } else {
          warnings.push(secretName);
        }
      }
    }

    // In production, fail hard on missing required secrets
    if (this.isProduction && missing.length > 0) {
      const errorMessage = `CRITICAL SECURITY ERROR: Missing required secrets in production: ${missing.join(', ')}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // In development, warn about missing secrets
    if (!this.isProduction && warnings.length > 0) {
      logger.warn(`[SECURITY] Missing secrets (using dev fallbacks): ${warnings.join(', ')}`);
      console.warn(`\n⚠️  [SECURITY WARNING] The following secrets are missing and will use development fallbacks:`);
      console.warn(`   ${warnings.join(', ')}`);
      console.warn(`   This is ONLY acceptable in development. Never use in production!\n`);
    }

    // Check optional secrets and log info
    for (const secretName of OPTIONAL_SECRETS) {
      if (!process.env[secretName]) {
        logger.info(`[Secrets] Optional secret ${secretName} not configured`);
      }
    }

    this.validated = true;
    logger.info('[Secrets] Secrets validation completed', { 
      mode: this.isProduction ? 'production' : 'development',
      requiredSecretsConfigured: REQUIRED_SECRETS.length - warnings.length - missing.length,
      requiredSecretsTotal: REQUIRED_SECRETS.length
    });
  }

  /**
   * Get a secret value with production enforcement
   * @param name - The secret name
   * @param devFallback - Optional development fallback value
   */
  private getSecret(name: string, devFallback?: string): string {
    const value = process.env[name];
    
    if (value) {
      return value;
    }

    // No value - check if we're in production
    if (this.isProduction) {
      throw new Error(`CRITICAL: ${name} environment variable must be set in production`);
    }

    // Development fallback
    const fallback = devFallback || DEV_FALLBACKS[name];
    if (fallback) {
      // Only warn once per secret
      if (!warnedSecrets.has(name)) {
        warnedSecrets.add(name);
        console.warn(`[SECURITY] Using development fallback for ${name} - NOT FOR PRODUCTION`);
      }
      return fallback;
    }

    throw new Error(`${name} not configured and no fallback available`);
  }

  /**
   * Get JWT_SECRET
   */
  getJwtSecret(): string {
    return this.getSecret('JWT_SECRET');
  }

  /**
   * Get JWT_REFRESH_SECRET
   */
  getJwtRefreshSecret(): string {
    return this.getSecret('JWT_REFRESH_SECRET');
  }

  /**
   * Get SESSION_SECRET
   */
  getSessionSecret(): string {
    return this.getSecret('SESSION_SECRET');
  }

  /**
   * Get ENCRYPTION_KEY (optional, may return null)
   */
  getEncryptionKey(): string | null {
    try {
      return this.getSecret('ENCRYPTION_KEY');
    } catch {
      return null;
    }
  }

  /**
   * Get DATABASE_URL (optional in dev, required in prod)
   */
  getDatabaseUrl(): string | null {
    const value = process.env.DATABASE_URL;
    if (!value && this.isProduction) {
      throw new Error('DATABASE_URL must be set in production');
    }
    return value || null;
  }

  /**
   * Check if running in production mode
   */
  isProductionMode(): boolean {
    return this.isProduction;
  }

  /**
   * Get validation status
   */
  isValidated(): boolean {
    return this.validated;
  }

  /**
   * Reset for testing purposes only
   */
  reset(): void {
    this.validated = false;
    warnedSecrets.clear();
  }
}

// Export singleton instance
export const secretsManager = SecretsManager.getInstance();

// Export convenience functions for common use cases
export function getJwtSecret(): string {
  return secretsManager.getJwtSecret();
}

export function getJwtRefreshSecret(): string {
  return secretsManager.getJwtRefreshSecret();
}

export function getSessionSecret(): string {
  return secretsManager.getSessionSecret();
}

export function validateRequiredSecrets(): void {
  secretsManager.validateRequiredSecrets();
}

export function isProductionMode(): boolean {
  return secretsManager.isProductionMode();
}

// Type exports
export { SecretsManager };
